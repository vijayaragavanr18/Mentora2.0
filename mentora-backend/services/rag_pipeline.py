"""RAG Pipeline — multi-doc ingest, retrieve, stream, summarise.

Design decisions:
  • ingest_document  – embeds chunks in one batch call (fast), stores page metadata.
  • retrieve_context – embeds query once, filters by score ≥ SCORE_THRESHOLD,
                       skips embedding entirely for general (non-document) chats.
  • stream_answer    – builds a tight context block with page citations, then
                       streams from the LLM.
  • answer           – non-streaming variant of the above.
"""
import os
import re
import json
import time
import logging
from typing import AsyncGenerator, List, Optional, Dict, Any

from services.document_parser import parse_file
from services import embedding_service, vector_store, llm_service

logger = logging.getLogger("mentora.rag")

# ─── Constants ────────────────────────────────────────────────────────────────
SCORE_THRESHOLD = 0.38   # chunks below this cosine similarity are noise
MAX_CHUNKS      = 4      # maximum context chunks sent to the LLM
MAX_CHUNK_CHARS = 400    # characters per chunk shown in the prompt

# ─── Prompts ──────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are Mentora, a knowledgeable AI tutor for students. "
    "Always be concise (3-5 sentences). "
    "Only cite a page number if the source explicitly shows it (e.g. [Source 1 p.3]). "
    "NEVER write [p.N] or any placeholder — omit page citations entirely when no page is shown. "
    "If the provided context does not contain the answer, say so clearly and answer from general knowledge."
)

SUMMARY_SYSTEM = "You are an expert study assistant. Extract key information clearly and concisely."

SUMMARY_PROMPT = """Document title: "{title}"

Content sample:
{sample}

Write exactly in this format (no extra text):
SUMMARY: <2-3 sentence overview of what this document covers>
FAQ:
1. Q: <key question from this material> A: <concise answer>
2. Q: <key question from this material> A: <concise answer>
3. Q: <key question from this material> A: <concise answer>
4. Q: <key question from this material> A: <concise answer>
5. Q: <key question from this material> A: <concise answer>"""


# ─── Ingest ───────────────────────────────────────────────────────────────────
async def ingest_document(
    file_path: str,
    doc_id: str,
    metadata: Optional[Dict] = None,
) -> Dict:
    """Parse file → embed chunks in one batch → upsert to ChromaDB."""
    t_start = time.perf_counter()
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("🚀 [RAG] ingest_document  doc_id=%s  file=%s", doc_id, os.path.basename(file_path))
    text, page_count, chunks = parse_file(file_path)  # chunks = List[Dict]
    if not chunks:
        logger.warning("⚠️  [RAG] No extractable text in %s — aborting", os.path.basename(file_path))
        return {"status": "no_text", "page_count": 0, "chunks": 0}
    logger.info("📑 [RAG] Parsed: %d chunks across %d pages", len(chunks), page_count)

    file_size_kb = os.path.getsize(file_path) // 1024
    base_meta = metadata or {}

    # Extract plain text for embedding and build per-chunk metadata
    texts = [c["text"] for c in chunks]
    chunk_metas: List[Dict[str, Any]] = [
        {
            **base_meta,
            "chunk_index":  c["chunk_index"],
            "page":         c.get("page", 0),
            "source_type":  c.get("source_type", ""),
            "doc_id":       doc_id,
        }
        for c in chunks
    ]

    # Single batch HTTP call to Ollama (vs N sequential calls before)
    logger.info("⏳ [RAG] Sending %d texts to embedding model ...", len(texts))
    t_embed = time.perf_counter()
    embeddings = await embedding_service.embed_batch(texts)
    logger.info("✅ [RAG] Embeddings received in %.2fs", time.perf_counter() - t_embed)
    vector_store.upsert_chunks(doc_id, texts, embeddings, chunk_metas)

    elapsed = time.perf_counter() - t_start
    logger.info("🎉 [RAG] Ingest COMPLETE  chunks=%d  pages=%d  size=%dKB  total_time=%.2fs",
                len(chunks), page_count, file_size_kb, elapsed)
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return {
        "status":       "ready",
        "page_count":   page_count,
        "chunks":       len(chunks),
        "file_size_kb": file_size_kb,
        "raw_chunks":   texts,   # plain strings for summary generation
    }


# ─── Summary + FAQ ────────────────────────────────────────────────────────────
async def generate_summary_and_faq(chunks: List[str], title: str) -> Dict:
    """Generate a 3-sentence summary and 5 FAQs from document chunks."""
    sample = "\n\n".join(chunks[:6])[:2800]
    prompt = SUMMARY_PROMPT.format(title=title or "Untitled", sample=sample)

    try:
        text = await llm_service.generate(prompt, system=SUMMARY_SYSTEM)
    except Exception as e:
        return {"summary": f"Summary unavailable: {e}", "faq": []}

    summary = ""
    faq: List[Dict] = []

    for line in text.strip().splitlines():
        line = line.strip()
        if line.upper().startswith("SUMMARY:"):
            summary = line[8:].strip()
        else:
            m = re.match(r"\d+\.\s*Q:\s*(.+?)\s+A:\s*(.+)", line, re.IGNORECASE)
            if m:
                faq.append({"q": m.group(1).strip(), "a": m.group(2).strip()})

    if not summary:
        # fallback: first non-FAQ line
        for line in text.strip().splitlines():
            l = line.strip()
            if l and not l.startswith("FAQ") and not re.match(r"\d+\.", l):
                summary = l[:400]
                break

    return {"summary": summary, "faq": faq[:5]}


# ─── Retrieve ─────────────────────────────────────────────────────────────────
async def retrieve_context(
    query: str,
    doc_ids: Optional[List[str]] = None,
    top_k: int = MAX_CHUNKS,
) -> List[Dict]:
    """
    Embed query → retrieve top_k relevant chunks → filter by SCORE_THRESHOLD.

    Falls back to all uploaded collections only when doc_ids is None
    AND the caller explicitly wants RAG (i.e. not plain chat).
    """
    if not doc_ids:
        doc_ids = vector_store.list_all_collection_ids()
    if not doc_ids:
        return []

    q_embedding = await embedding_service.embed(query)

    if len(doc_ids) == 1:
        results = vector_store.query_collection(
            doc_ids[0], q_embedding, top_k, score_threshold=SCORE_THRESHOLD
        )
        for r in results:
            r.setdefault("collection_id", doc_ids[0])
        return results

    return vector_store.query_multiple_collections(
        doc_ids, q_embedding, top_k, score_threshold=SCORE_THRESHOLD
    )


def _build_context_block(chunks: List[Dict]) -> str:
    """Format retrieved chunks into a clean context block with page numbers."""
    parts = []
    for i, c in enumerate(chunks, 1):
        meta = c.get("metadata") or {}
        page = meta.get("page") or c.get("page")
        page_tag = f" [p.{page}]" if page and str(page) not in ("0", "None") else ""
        text = c["text"][:MAX_CHUNK_CHARS].rstrip()
        parts.append(f"[Source {i}{page_tag}]\n{text}")
    return "\n\n".join(parts)


# ─── Stream Answer ────────────────────────────────────────────────────────────
async def stream_answer(
    question: str,
    doc_ids: Optional[List[str]] = None,
    history: Optional[List[Dict]] = None,
    top_k: int = MAX_CHUNKS,
) -> AsyncGenerator[str, None]:
    """Retrieve context → build prompt → stream LLM tokens → emit citations."""
    chunks: List[Dict] = []
    if doc_ids:
        chunks = await retrieve_context(question, doc_ids, top_k)

    citations = [
        {
            "index":  i + 1,
            "score":  round(c.get("score", 0), 3),
            "text":   c["text"][:200],
            "doc_id": c.get("collection_id", ""),
            "page":   c.get("metadata", {}).get("page") or c.get("page", 0),
        }
        for i, c in enumerate(chunks)
    ]

    if chunks:
        context_block = _build_context_block(chunks)
        prompt = (
            f"Document context (use it, cite pages like [p.N]):\n"
            f"{context_block}\n\n"
            f"Question: {question}\nAnswer:"
        )
    else:
        prompt = question

    async for token in llm_service.stream_response(prompt, system=SYSTEM_PROMPT):
        yield token

    yield f"\n\n__CITATIONS__{json.dumps(citations)}"


# ─── One-shot Answer ──────────────────────────────────────────────────────────
async def answer(
    question: str,
    doc_ids: Optional[List[str]] = None,
    top_k: int = MAX_CHUNKS,
) -> tuple[str, List[Dict]]:
    """Non-streaming answer with citations."""
    chunks: List[Dict] = []
    if doc_ids:
        chunks = await retrieve_context(question, doc_ids, top_k)

    citations = [
        {
            "index":  i + 1,
            "score":  round(c.get("score", 0), 3),
            "text":   c["text"][:200],
            "doc_id": c.get("collection_id", ""),
            "page":   c.get("metadata", {}).get("page") or c.get("page", 0),
        }
        for i, c in enumerate(chunks)
    ]

    if chunks:
        context_block = _build_context_block(chunks)
        prompt = (
            f"Document context (use it, cite pages like [p.N]):\n"
            f"{context_block}\n\n"
            f"Question: {question}\nAnswer:"
        )
    else:
        prompt = question

    response = await llm_service.generate(prompt, system=SYSTEM_PROMPT)
    return response, citations
