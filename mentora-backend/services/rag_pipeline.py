"""RAG Pipeline — multi-doc ingest, retrieve, stream, summarise."""
import os
import re
import json
from typing import AsyncGenerator, List, Optional, Dict

from services.document_parser import parse_file
from services import embedding_service, vector_store, llm_service

# ─── Prompts ──────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Mentora, a helpful AI tutor for students.
Answer questions using ONLY the provided context passages below. Be concise and clear.
If the context does not contain the answer, say "I don't have that in the uploaded material."
When referencing content, cite with [Source N] notation.
"""

ANSWER_TEMPLATE = """Context passages (cite as [Source N]):
{context}

Question: {question}

Answer:"""

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
    """Parse file → embed chunks → upsert to ChromaDB."""
    text, page_count, chunks = parse_file(file_path)
    if not chunks:
        return {"status": "no_text", "page_count": 0, "chunks": 0}

    file_size_kb = os.path.getsize(file_path) // 1024
    base_meta = metadata or {}

    embeddings = await embedding_service.embed_batch(chunks)
    metas = [
        {**base_meta, "chunk_index": i, "doc_id": doc_id}
        for i in range(len(chunks))
    ]
    vector_store.upsert_chunks(doc_id, chunks, embeddings, metas)

    return {
        "status": "ready",
        "page_count": page_count,
        "chunks": len(chunks),
        "file_size_kb": file_size_kb,
        "raw_chunks": chunks,  # returned so upload router can generate summary
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
    top_k: int = 8,
) -> List[Dict]:
    """Embed query → retrieve top_k chunks from one or more ChromaDB collections."""
    if not doc_ids:
        # Fall back to ALL uploaded collections so users don't have to manually select
        doc_ids = vector_store.list_all_collection_ids()
    if not doc_ids:
        print("=> [retrieve_context] no doc_ids, returning empty")
        return []

    print(f"=> [retrieve_context] calling embed for query: {query}")
    q_embedding = await embedding_service.embed(query)
    print(f"=> [retrieve_context] embed complete, querying {len(doc_ids)} docs in chroma...")

    if len(doc_ids) == 1:
        results = vector_store.query_collection(doc_ids[0], q_embedding, top_k)
        for r in results:
            r.setdefault("collection_id", doc_ids[0])
        return results

    return vector_store.query_multiple_collections(doc_ids, q_embedding, top_k)


# ─── Stream Answer ────────────────────────────────────────────────────────────
async def stream_answer(
    question: str,
    doc_ids: Optional[List[str]] = None,
    history: Optional[List[Dict]] = None,
    top_k: int = 8,
) -> AsyncGenerator[str, None]:
    """Retrieve context → build prompt → stream LLM tokens → emit citations."""
    print(f"=> [stream_answer] calling retrieve_context for query: {question}")
    chunks = await retrieve_context(question, doc_ids, top_k)
    print(f"=> [stream_answer] retrieve_context returned {len(chunks)} chunks")

    context_text = (
        "\n\n---\n".join(
            f"[Source {i+1} | doc:{c.get('collection_id','?')}]\n{c['text']}"
            for i, c in enumerate(chunks)
        )
        if chunks
        else "(No document context — answering from general knowledge)"
    )

    citations = [
        {
            "index": i + 1,
            "score": round(c.get("score", 0), 3),
            "text": c["text"][:350],
            "doc_id": c.get("collection_id", ""),
        }
        for i, c in enumerate(chunks)
    ]

    prompt = ANSWER_TEMPLATE.format(context=context_text, question=question)

    async for token in llm_service.stream_response(prompt, system=SYSTEM_PROMPT):
        yield token

    yield f"\n\n__CITATIONS__{json.dumps(citations)}"


# ─── One-shot Answer ──────────────────────────────────────────────────────────
async def answer(
    question: str,
    doc_ids: Optional[List[str]] = None,
    top_k: int = 8,
) -> tuple[str, List[Dict]]:
    """Non-streaming answer with citations."""
    chunks = await retrieve_context(question, doc_ids, top_k)
    context_text = (
        "\n\n---\n".join(
            f"[Source {i+1}]\n{c['text']}" for i, c in enumerate(chunks)
        )
        if chunks
        else "(No document context)"
    )
    citations = [
        {
            "index": i + 1,
            "score": round(c.get("score", 0), 3),
            "text": c["text"][:350],
            "doc_id": c.get("collection_id", ""),
        }
        for i, c in enumerate(chunks)
    ]
    prompt = ANSWER_TEMPLATE.format(context=context_text, question=question)
    response = await llm_service.generate(prompt, system=SYSTEM_PROMPT)
    return response, citations
