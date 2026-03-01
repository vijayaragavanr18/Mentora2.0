from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "phi4-mini"
    embed_model: str = "mxbai-embed-large"

    # Database
    database_url: str = "postgresql://mentora_user:mentora_pass@localhost:5432/mentora"
    supabase_url: str = ""
    supabase_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # ChromaDB
    chroma_path: str = "./chroma_db"

    # JWT
    secret_key: str = "change-me-to-a-random-64-char-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    # Files
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 500

    # TTS
    tts_model: str = "tts_models/en/ljspeech/tacotron2-DDC"

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Environment
    env: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
