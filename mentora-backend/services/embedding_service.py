"""Embedding Service — mxbai-embed-large via Ollama."""
import httpx
from typing import List
from config import get_settings

settings = get_settings()


async def embed(text: str) -> List[float]:
    """Embed a single string using mxbai-embed-large."""
    payload = {"model": settings.embed_model, "prompt": text}
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings", json=payload
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def embed_batch(texts: List[str]) -> List[List[float]]:
    """Embed a list of strings sequentially."""
    results = []
    for text in texts:
        results.append(await embed(text))
    return results
