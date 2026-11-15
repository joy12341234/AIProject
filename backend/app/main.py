from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .ai import chat_json, generate_image, image_ext
from .mock import mock_image, mock_plans, mock_storyboard
from .prompts import (
    IMAGE_SIZE,
    PLAN_SCHEMA,
    STORYBOARD_SCHEMA,
    image_prompt,
    plan_messages,
    storyboard_messages,
)
from .schemas import (
    ImageRequest,
    ImageResponse,
    Plan,
    PlanRequest,
    PlanResponse,
    Scene,
    Storyboard,
    StoryboardRequest,
)

app = FastAPI(title="AI Video Director API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 생성된 콘티 이미지 제공용
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "mock_mode": config.MOCK_MODE,
        "key_loaded": bool(config.OPENAI_API_KEY),
        "text_model": config.TEXT_MODEL,
        "image_model": config.IMAGE_MODEL,
    }


@app.post("/api/plan", response_model=PlanResponse)
def create_plan(req: PlanRequest):
    if config.MOCK_MODE:
        return PlanResponse(plans=mock_plans(req), mock=True)

    data = chat_json(plan_messages(req), "video_plans", PLAN_SCHEMA)
    plans = [Plan(**p) for p in data["plans"]]
    return PlanResponse(plans=plans, mock=False)


def _with_timeline(sb: Storyboard) -> Storyboard:
    # 컷 시작/끝 시간은 AI 대신 서버에서 계산 (합계 오류 방지)
    t = 0
    for s in sb.scenes:
        s.duration_sec = max(1, s.duration_sec)
        s.start_sec, s.end_sec = t, t + s.duration_sec
        t = s.end_sec
    sb.total_sec = t
    return sb


@app.post("/api/storyboard", response_model=Storyboard)
def create_storyboard(req: StoryboardRequest):
    if config.MOCK_MODE:
        return _with_timeline(mock_storyboard(req))

    data = chat_json(storyboard_messages(req), "storyboard", STORYBOARD_SCHEMA)
    scenes = [Scene(scene_no=i + 1, **s) for i, s in enumerate(data["scenes"])]
    sb = Storyboard(
        title=req.plan.title,
        format=req.format,
        total_sec=0,
        characters=data["characters"],
        scenes=scenes,
    )
    return _with_timeline(sb)


@app.post("/api/storyboard/image", response_model=ImageResponse)
def create_scene_image(req: ImageRequest):
    if config.MOCK_MODE:
        return ImageResponse(image_url=mock_image(req.scene, req.format), mock=True)

    prompt = image_prompt(req.scene, req.characters, req.format)
    data = generate_image(prompt, IMAGE_SIZE[req.format])
    name = f"{uuid4().hex}.{image_ext(data)}"
    (config.IMAGE_DIR / name).write_bytes(data)
    return ImageResponse(image_url=f"/static/images/{name}", mock=False)
