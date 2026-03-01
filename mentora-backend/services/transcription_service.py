"""Transcription Service — faster-whisper audio-to-text (Python 3.12 compatible)."""
import os
from typing import Optional

try:
    from faster_whisper import WhisperModel
    _model: WhisperModel | None = None

    def _get_model(model_size: str = "base") -> WhisperModel:
        global _model
        if _model is None:
            # Use int8 compute type for CPU; change to "float16" for GPU
            _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        return _model

    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


async def transcribe(file_path: str, language: Optional[str] = None) -> dict:
    """
    Transcribe an audio file using faster-whisper.
    Returns {"transcript": str, "language": str, "segments": list}
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if not WHISPER_AVAILABLE:
        return {
            "transcript": "[faster-whisper not installed. Run: pip install faster-whisper]",
            "language": "unknown",
            "segments": [],
        }

    model = _get_model()
    kwargs: dict = {}
    if language:
        kwargs["language"] = language

    segments_gen, info = model.transcribe(file_path, **kwargs)
    segments = []
    text_parts = []
    for seg in segments_gen:
        text_parts.append(seg.text)
        segments.append({"start": seg.start, "end": seg.end, "text": seg.text})

    return {
        "transcript": " ".join(text_parts).strip(),
        "language": info.language,
        "segments": segments,
    }
