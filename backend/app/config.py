import os
from pathlib import Path
from urllib.parse import quote, unquote

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

# 배포(Render)용: Supabase Postgres 연결 주소. 비어 있으면 위 SQLite 사용
def _db_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
    if "://" not in url or "@" not in url:
        return url
    # 비밀번호에 ? # @ / & 같은 특수문자가 있어도 연결되도록 비밀번호만 안전한 형태로 바꿈
    scheme, rest = url.split("://", 1)
    userinfo, host = rest.rsplit("@", 1)
    if ":" in userinfo:
        user, pw = userinfo.split(":", 1)
        if pw.startswith("[") and pw.endswith("]"):  # 대괄호를 안 지운 경우
            pw = pw[1:-1]
        userinfo = f"{user}:{quote(unquote(pw), safe='')}"
    return f"{scheme}://{userinfo}@{host}"


DATABASE_URL = _db_url()
# 로그 확인용 (비밀번호는 가림)
DATABASE_HINT = DATABASE_URL.split("@", 1)[-1] if "@" in DATABASE_URL else ""

# 유튜브 업로드용 Google OAuth 클라이언트 ID (공개돼도 되는 값, secret 아님)
GOOGLE_CLIENT_ID = (os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID") or "").strip()

# 배포 시 백엔드가 함께 보여줄 프론트 빌드 결과물
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
