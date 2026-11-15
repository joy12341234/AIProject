from typing import List, Literal, Optional

from pydantic import BaseModel, Field

VideoFormat = Literal["short", "long"]


# ---------- 기획안 ----------
class PlanRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=300)
    format: VideoFormat = "short"
    style: Optional[str] = Field(default=None, max_length=50)  # 인기 포맷 선택 시


class Plan(BaseModel):
    title: str
    concept: str
    hook: str
    target: str
    mood: str
    duration_sec: int
    flow: List[str]
    point: str


class PlanResponse(BaseModel):
    plans: List[Plan]
    mock: bool


# ---------- 콘티 ----------
class StoryboardRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=300)
    format: VideoFormat = "short"
    plan: Plan


class Scene(BaseModel):
    scene_no: int
    title: str
    description: str
    shot_size: str
    angle: str
    camera_move: str
    dialogue: str
    duration_sec: int
    start_sec: int = 0
    end_sec: int = 0
    transition: str
    shooting_tip: str
    image_prompt: str


class Storyboard(BaseModel):
    title: str
    format: VideoFormat
    total_sec: int
    characters: str  # 모든 컷 그림에 공통으로 넣는 인물 묘사 (영어)
    scenes: List[Scene]
    mock: bool = False


class ImageRequest(BaseModel):
    scene: Scene
    characters: str = ""
    format: VideoFormat = "short"


class ImageResponse(BaseModel):
    image_url: str
    mock: bool
