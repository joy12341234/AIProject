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
    format_ref: str = ""  # 활용한 포맷·연출 장치 (예전 저장본은 빈 값)
    twist: str = ""  # 끝까지 보게 만드는 재미 장치


class PlanResponse(BaseModel):
    plans: List[Plan]
    mock: bool


class PlanRefineRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=300)
    format: VideoFormat = "short"
    plans: List[Plan] = Field(min_length=1, max_length=3)  # 다른 기획안 요소를 섞을 수 있게 전체 전달
    index: int = Field(ge=0, le=2)
    feedback: str = Field(min_length=2, max_length=500)


class PlanRefineResponse(BaseModel):
    plan: Plan
    changes: List[str]
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
    beat: str = ""  # 이야기 구조상 역할 (훅·셋업·전개·고조·반전·마무리)
    fun: str = ""  # 이 컷의 재미 포인트
    link: str = ""  # 다음 컷으로 이어지는 방법


class Storyboard(BaseModel):
    title: str
    format: VideoFormat
    total_sec: int
    characters: str  # 모든 컷 그림에 공통으로 넣는 인물 묘사 (영어)
    scenes: List[Scene]
    direction: str = ""  # 콘티 전체 연출 포인트
    mock: bool = False


class ImageRequest(BaseModel):
    scene: Scene
    characters: str = ""
    format: VideoFormat = "short"


class ImageResponse(BaseModel):
    image_url: str
    mock: bool


# ---------- 촬영·편집 가이드 ----------
class ShootingRequest(BaseModel):
    storyboard: Storyboard
    people: str = Field(default="혼자", max_length=20)
    gear: List[str] = Field(default_factory=list, max_length=8)
    place: str = Field(default="실내+실외", max_length=20)


class EditRequest(BaseModel):
    storyboard: Storyboard
    app: str = Field(default="캡컷", max_length=20)
