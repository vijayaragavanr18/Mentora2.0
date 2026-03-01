"""TTS Service — Coqui TTS for podcast audio generation."""
import os
import uuid
from pathlib import Path
from config import get_settings

settings = get_settings()

try:
    from TTS.api import TTS as CoquiTTS
    _tts_model: CoquiTTS | None = None

    def _get_tts() -> CoquiTTS:
        global _tts_model
        if _tts_model is None:
            _tts_model = CoquiTTS(model_name=settings.tts_model, progress_bar=False)
        return _tts_model

    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False


async def synthesize(text: str, output_dir: str = "uploads/audio") -> str:
    """Convert text → WAV/MP3, return relative URL path."""
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.wav"
    filepath = os.path.join(output_dir, filename)

    if TTS_AVAILABLE:
        tts = _get_tts()
        tts.tts_to_file(text=text, file_path=filepath)
    else:
        # Fallback: write empty placeholder so the API still responds
        Path(filepath).touch()

    return f"/uploads/audio/{filename}"


async def generate_podcast_audio(script: str, output_dir: str = "uploads/podcasts") -> str:
    """Generate podcast from a multi-paragraph script.
    Splits into segments and concatenates (currently single pass)."""
    os.makedirs(output_dir, exist_ok=True)
    # Truncate very long scripts to avoid memory issues
    segment = script[:4000] if len(script) > 4000 else script
    return await synthesize(segment, output_dir)
