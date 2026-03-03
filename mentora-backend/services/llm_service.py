"""LLM Service — Ollama phi4-mini wrapper with streaming and one-shot."""
import httpx
import json
from typing import AsyncGenerator, Optional
from config import get_settings

settings = get_settings()


async def stream_response(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream tokens from Ollama chat API."""
    llm_model = model or settings.llm_model
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": llm_model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": 0.7, "num_ctx": 2048, "num_predict": 512},
    }

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    continue


async def generate(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    temperature: float = 0.7,
) -> str:
    """Non-streaming generation — returns full response string."""
    llm_model = model or settings.llm_model
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": llm_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "num_ctx": 2048, "num_predict": 512},
    }

    async with httpx.AsyncClient(timeout=None) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat", json=payload
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")


async def complete(
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """Raw /api/generate completion (for structured JSON tasks)."""
    llm_model = model or settings.llm_model
    payload = {
        "model": llm_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "num_ctx": 2048, "num_predict": 1024},
    }
    async with httpx.AsyncClient(timeout=None) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate", json=payload
        )
        resp.raise_for_status()
        return resp.json().get("response", "")
