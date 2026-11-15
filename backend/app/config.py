import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", encoding="utf-8")

STATIC_DIR = BASE_DIR / "app" / "static"
IMAGE_DIR = STATIC_DIR / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _key() -> str:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    # 예시 문구 그대로면 키가 없는 것으로 처리
    return key if key.startswith("sk-") else ""


OPENAI_API_KEY = _key()
TEXT_MODEL = os.getenv("TEXT_MODEL", "gpt-5-mini").strip()
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gpt-image-2").strip()
IMAGE_QUALITY = os.getenv("IMAGE_QUALITY", "low").strip()

# 키가 없으면 무조건 목업 모드
MOCK_MODE = _bool("MOCK_MODE", True) or not OPENAI_API_KEY

# 저장된 콘티·후기 (SQLite)
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "app.db"
