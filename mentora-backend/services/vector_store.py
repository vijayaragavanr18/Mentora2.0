"""Vector Store — ChromaDB operations."""
import hashlib
import logging
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from config import get_settings

settings = get_settings()
logger = logging.getLogger("mentora.vectorstore")

_client: Optional[chromadb.PersistentClient] = None


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def get_or_create_collection(collection_id: str) -> chromadb.Collection:
    client = get_client()
    return client.get_or_create_collection(
        name=collection_id,
        metadata={"hnsw:space": "cosine"},
    )


def _chunk_id(collection_id: str, chunk_index: int) -> str:
    """
    Deterministic chunk ID based on collection + position.
    Allows safe re-ingestion (upsert) without duplicates.
    """
    key = f"{collection_id}::{chunk_index}"
    return hashlib.md5(key.encode()).hexdigest()


def upsert_chunks(
    collection_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[Dict[str, Any]]] = None,
) -> None:
    """Insert or update text chunks with their embeddings."""
    collection = get_or_create_collection(collection_id)
    # Use deterministic IDs so re-ingesting the same doc doesn't create duplicates
    ids = [_chunk_id(collection_id, i) for i in range(len(chunks))]
    metas = metadatas or [{"chunk_index": i} for i in range(len(chunks))]
    logger.info("💾 [CHROMA] Upserting %d chunks → collection '%s'", len(chunks), collection_id)
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metas,
    )
    logger.info("✅ [CHROMA] Upsert complete — %d vectors stored", len(chunks))


def query_collection(
    collection_id: str,
    query_embedding: List[float],
    top_k: int = 5,
    score_threshold: float = 0.35,
) -> List[Dict[str, Any]]:
    """Return top_k chunks ranked by cosine similarity, filtered by score_threshold."""
    collection = get_or_create_collection(collection_id)
    count = collection.count()
    if count == 0:
        return []
    n = min(top_k, count)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n,
        include=["documents", "metadatas", "distances"],
    )
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    # ChromaDB uses L2 distance for cosine space; convert to [0,1] similarity
    hits = [
        {"text": doc, "metadata": meta, "score": round(1 - dist, 4),
         "collection_id": collection_id}
        for doc, meta, dist in zip(docs, metas, distances)
        if (1 - dist) >= score_threshold
    ]
    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits


def delete_collection(collection_id: str) -> None:
    try:
        get_client().delete_collection(collection_id)
    except Exception:
        pass


def list_all_collection_ids() -> List[str]:
    """Return all collection names in ChromaDB."""
    try:
        return [col.name for col in get_client().list_collections()]
    except Exception:
        return []


def query_multiple_collections(
    collection_ids: List[str],
    query_embedding: List[float],
    top_k: int = 5,
    score_threshold: float = 0.35,
) -> List[Dict[str, Any]]:
    """Query multiple collections, merge, deduplicate, sort by score."""
    all_results: List[Dict[str, Any]] = []
    per_col_k = max(3, top_k)
    for col_id in collection_ids:
        try:
            results = query_collection(col_id, query_embedding,
                                       per_col_k, score_threshold)
            for r in results:
                r["collection_id"] = col_id
            all_results.extend(results)
        except Exception:
            pass
    # Deduplicate by text (keep highest score)
    seen: Dict[str, float] = {}
    deduped = []
    for r in sorted(all_results, key=lambda x: x["score"], reverse=True):
        key = r["text"][:80]  # first 80 chars as dedup key
        if key not in seen:
            seen[key] = r["score"]
            deduped.append(r)
    return deduped[:top_k]
