from uuid import uuid4

import re

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config, db
from .ai import chat_json, generate_image, image_ext
from .community import router as community_router
from .mock import mock_editing, mock_image, mock_plans, mock_refine, mock_shooting, mock_storyboard
from .prompts import (
    EDIT_SCHEMA,
    IMAGE_SIZE,
    PLAN_SCHEMA,
    REFINE_SCHEMA,
    SHOOTING_SCHEMA,
    STORYBOARD_SCHEMA,
    edit_messages,
    image_prompt,
    plan_messages,
    refine_messages,
    shooting_messages,
    storyboard_messages,
)
from .schemas import (
    EditRequest,
    ImageRequest,
    ImageResponse,
    Plan,
    PlanRefineRequest,
    PlanRefineResponse,
    PlanRequest,
    PlanResponse,
    Scene,
    ShootingRequest,
    Storyboard,
    StoryboardRequest,
)

app = FastAPI(title="AI Video Director API")
db.init()
app.include_router(community_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MIME = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


# 콘티 그림: DB에서 꺼내 주고, 예전에 파일로 저장된 그림도 그대로 보여줌
@app.get("/static/images/{name}")
def scene_image(name: str):
    if not re.fullmatch(r"[0-9a-f]{32}\.(jpg|png|webp)", name):
        raise HTTPException(404, "그림을 찾을 수 없어요.")
    found = db.load_image(name)
    if found:
        mime, data = found
        return Response(data, media_type=mime, headers={"Cache-Control": "public, max-age=31536000, immutable"})
    path = config.IMAGE_DIR / name
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(404, "그림을 찾을 수 없어요.")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "mock_mode": config.MOCK_MODE,
        "key_loaded": bool(config.OPENAI_API_KEY),
        "text_model": config.TEXT_MODEL,
        "image_model": config.IMAGE_MODEL,
        "database": "postgres" if db.PG else "sqlite",
    }


@app.get("/api/config")
def public_config():
    # 화면에서 쓰는 공개 설정 (비밀값은 절대 넣지 않음)
    return {"google_client_id": config.GOOGLE_CLIENT_ID}


@app.post("/api/plan", response_model=PlanResponse)
def create_plan(req: PlanRequest):
    if config.MOCK_MODE:
        return PlanResponse(plans=mock_plans(req), mock=True)

    data = chat_json(plan_messages(req), "video_plans", PLAN_SCHEMA)
    plans = [Plan(**p) for p in data["plans"]]
    return PlanResponse(plans=plans, mock=False)


@app.post("/api/plan/refine", response_model=PlanRefineResponse)
def refine_plan(req: PlanRefineRequest):
    if req.index >= len(req.plans):
        raise HTTPException(400, "다듬을 기획안을 찾을 수 없어요.")
    if config.MOCK_MODE:
        plan, changes = mock_refine(req)
        return PlanRefineResponse(plan=plan, changes=changes, mock=True)

    data = chat_json(refine_messages(req), "plan_refine", REFINE_SCHEMA)
    return PlanRefineResponse(plan=Plan(**data["plan"]), changes=data["changes"][:4], mock=False)


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
        direction=data["direction"],
        scenes=scenes,
    )
    return _with_timeline(sb)


@app.post("/api/storyboard/image", response_model=ImageResponse)
def create_scene_image(req: ImageRequest):
    if config.MOCK_MODE:
        return ImageResponse(image_url=mock_image(req.scene, req.format), mock=True)

    prompt = image_prompt(req.scene, req.characters, req.format)
    data = generate_image(prompt, IMAGE_SIZE[req.format])
    ext = image_ext(data)
    name = f"{uuid4().hex}.{ext}"
    db.save_image(name, MIME[ext], data)
    return ImageResponse(image_url=f"/static/images/{name}", mock=False)


def _by_scene(items: list, sb: Storyboard) -> list:
    # AI가 빠뜨리거나 순서를 바꾼 컷이 있어도 콘티 순서에 맞춤
    found = {i.get("scene_no"): i for i in items}
    return [found[s.scene_no] for s in sb.scenes if s.scene_no in found]


@app.post("/api/shooting-guide")
def create_shooting_guide(req: ShootingRequest):
    if config.MOCK_MODE:
        return {**mock_shooting(req), "mock": True}
    data = chat_json(shooting_messages(req), "shooting_guide", SHOOTING_SCHEMA)
    data["scenes"] = _by_scene(data["scenes"], req.storyboard)
    return {**data, "mock": False}


@app.post("/api/edit-guide")
def create_edit_guide(req: EditRequest):
    if config.MOCK_MODE:
        return {**mock_editing(req), "mock": True}
    data = chat_json(edit_messages(req), "edit_guide", EDIT_SCHEMA)
    data["cuts"] = _by_scene(data["cuts"], req.storyboard)
    return {**data, "mock": False}


# 배포: 빌드된 화면(frontend/dist)을 같은 주소에서 제공. 반드시 맨 마지막에 등록
if config.FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=config.FRONTEND_DIST, html=True), name="web")
