"""Embedding Service — mxbai-embed-large via Ollama.

Key design:
  - Uses /api/embed (Ollama ≥ 0.1.31) which accepts a list of strings
    in one HTTP call — dramatically faster than N sequential calls.
  - Falls back automatically to legacy /api/embeddings (one call per text)
    if the batch endpoint is unavailable.
  - Pre-processes text: collapses whitespace and truncates to 400 words
    so we stay safely inside mxbai-embed-large's 512-token limit.
"""

import re
import time
import logging
import httpx
from typing import List
from config import get_settings

settings = get_settings()
logger = logging.getLogger("mentora.embed")

# mxbai-embed-large has a 512-token limit; 400 words ≈ 520 tokens worst-case
_MAX_EMBED_WORDS = 400


def _preprocess(text: str) -> str:
    """Normalise whitespace and truncate to the token-safe word limit."""
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split()
    if len(words) > _MAX_EMBED_WORDS:
        text = " ".join(words[:_MAX_EMBED_WORDS])
    return text


async def embed(text: str) -> List[float]:
    """Embed a single string (delegate to embed_batch for consistency)."""
    results = await embed_batch([text])
    return results[0]


async def embed_batch(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of strings using Ollama.

    Strategy:
      1. Try POST /api/embed  {"model": ..., "input": [list]}  — one HTTP call.
      2. If that fails/returns wrong shape, fall back to sequential
         POST /api/embeddings  {"model": ..., "prompt": text}.
    """
    if not texts:
        return []

    cleaned = [_preprocess(t) for t in texts]
    t0 = time.perf_counter()
    logger.info("🔷 [EMBED] Batch of %d chunks  model=%s", len(cleaned), settings.embed_model)

    async with httpx.AsyncClient(timeout=300) as client:
        # ── Modern batch endpoint (Ollama ≥ 0.1.31) ──────────────────
        try:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/embed",
                json={"model": settings.embed_model, "input": cleaned},
            )
            resp.raise_for_status()
            data = resp.json()
            # Response shape: {"embeddings": [[...], [...]]}
            batch_embeddings = data.get("embeddings") or []
            if len(batch_embeddings) == len(cleaned):
                logger.info("✅ [EMBED] Batch endpoint OK — %d vectors in %.2fs", len(batch_embeddings), time.perf_counter() - t0)
                return [list(e) for e in batch_embeddings]
        except Exception:
            pass  # fall through to legacy

        # ── Legacy sequential endpoint ────────────────────────────────
        logger.warning("⚠️  [EMBED] Batch endpoint failed — sequential fallback (%d calls)", len(cleaned))
        results: List[List[float]] = []
        for t in cleaned:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/embeddings",
                json={"model": settings.embed_model, "prompt": t},
            )
            resp.raise_for_status()
            results.append(list(resp.json()["embedding"]))
        logger.info("✅ [EMBED] Sequential done — %d vectors in %.2fs", len(results), time.perf_counter() - t0)
        return results
