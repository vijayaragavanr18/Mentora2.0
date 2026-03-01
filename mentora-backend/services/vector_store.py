"""Vector Store — ChromaDB operations."""
import uuid
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from config import get_settings

settings = get_settings()

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


def upsert_chunks(
    collection_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[Dict[str, Any]]] = None,
) -> None:
    """Insert or update text chunks with their embeddings."""
    collection = get_or_create_collection(collection_id)
    ids = [str(uuid.uuid4()) for _ in chunks]
    metas = metadatas or [{"chunk_index": i} for i in range(len(chunks))]
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metas,
    )


def query_collection(
    collection_id: str,
    query_embedding: List[float],
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    """Return top_k chunks ranked by cosine similarity."""
    collection = get_or_create_collection(collection_id)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        include=["documents", "metadatas", "distances"],
    )
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    return [
        {"text": doc, "metadata": meta, "score": 1 - dist}
        for doc, meta, dist in zip(docs, metas, distances)
    ]


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
    top_k: int = 8,
) -> List[Dict[str, Any]]:
    """Query multiple collections, merge, deduplicate, sort by score."""
    all_results: List[Dict[str, Any]] = []
    per_col_k = max(3, (top_k * 2) // max(len(collection_ids), 1))
    for col_id in collection_ids:
        try:
            results = query_collection(col_id, query_embedding, per_col_k)
            for r in results:
                r["collection_id"] = col_id
            all_results.extend(results)
        except Exception:
            pass
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return all_results[:top_k]
