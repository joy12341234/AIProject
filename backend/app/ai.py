import base64
import json

from fastapi import HTTPException
from openai import (
    APIConnectionError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    OpenAI,
    PermissionDeniedError,
    RateLimitError,
)

from . import config

_client = None


def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def _to_http_error(e: Exception) -> HTTPException:
    # OpenAI 오류를 화면에 보여줄 한국어 메시지로 변환
    if isinstance(e, AuthenticationError):
        return HTTPException(401, "API 키가 올바르지 않아요. backend/.env 의 키를 확인해 주세요.")
    if isinstance(e, PermissionDeniedError):
        return HTTPException(403, "이 키로는 해당 모델을 쓸 수 없어요. check_key.bat 결과를 확인해 주세요.")
    if isinstance(e, NotFoundError):
        return HTTPException(400, "모델 이름을 찾을 수 없어요. .env 의 TEXT_MODEL / IMAGE_MODEL 을 확인해 주세요.")
    if isinstance(e, RateLimitError):
        return HTTPException(429, "사용량 한도에 걸렸어요. 잠시 후 다시 시도하거나 MOCK_MODE=true 로 작업해 주세요.")
    if isinstance(e, APIConnectionError):
        return HTTPException(503, "OpenAI 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.")
    if isinstance(e, BadRequestError):
        msg = str(e).lower()
        if "safety" in msg or "moderation" in msg:
            return HTTPException(400, "안전 정책 때문에 이 장면은 그릴 수 없어요. 장면 설명을 바꿔 다시 시도해 주세요.")
        return HTTPException(400, f"요청 형식 오류: {e}")
    return HTTPException(500, f"AI 처리 중 오류가 발생했어요: {e}")


def chat_json(messages: list, name: str, schema: dict) -> dict:
    """JSON 스키마를 강제해서 구조화된 결과를 받음. 파싱 실패 시 1회 재시도."""
    for attempt in range(2):
        try:
            res = client().chat.completions.create(
                model=config.TEXT_MODEL,
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": name, "strict": True, "schema": schema},
                },
            )
            return json.loads(res.choices[0].message.content)
        except json.JSONDecodeError:
            if attempt == 1:
                raise HTTPException(502, "AI 응답 형식이 올바르지 않아요. 다시 시도해 주세요.")
        except HTTPException:
            raise
        except Exception as e:
            raise _to_http_error(e)


def generate_image(prompt: str, size: str) -> bytes:
    """이미지 1장 생성. 용량을 줄이려고 jpeg 요청, 지원 안 하는 모델이면 기본 형식으로 재시도."""
    kwargs = dict(model=config.IMAGE_MODEL, prompt=prompt, size=size, quality=config.IMAGE_QUALITY)
    try:
        try:
            res = client().images.generate(**kwargs, output_format="jpeg", output_compression=85)
        except BadRequestError as e:
            if "output_" not in str(e):
                raise
            res = client().images.generate(**kwargs)
        return base64.b64decode(res.data[0].b64_json)
    except HTTPException:
        raise
    except Exception as e:
        raise _to_http_error(e)


def image_ext(data: bytes) -> str:
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return "png"
