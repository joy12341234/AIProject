"""콘티 저장·갤러리·좋아요·촬영 후기"""
import json
import re
import time
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from .db import conn
from .schemas import Plan, Storyboard, VideoFormat

router = APIRouter(prefix="/api")

# 인기 점수: 후기(실제로 찍음) > 사용(가져가서 촬영 시작) > 좋아요
SCORE_SQL = "(likes + uses * 2 + reviews * 3)"


# ---------- 모델 ----------
class ProjectIn(BaseModel):
    topic: str = Field(max_length=300)
    format: VideoFormat
    plan: Plan
    storyboard: Storyboard
    images: Dict[str, str] = Field(default_factory=dict)
    shooting: Optional[dict] = None
    editing: Optional[dict] = None
    shared: bool = False

    @field_validator("images")
    @classmethod
    def _small_images(cls, v):
        if any(len(u) > 6000 for u in v.values()):
            raise ValueError("이미지 주소가 너무 깁니다.")
        return v


class ProjectOut(ProjectIn):
    id: str
    likes: int
    views: int
    uses: int
    reviews: int
    avg_rating: Optional[float]
    liked: bool
    mine: bool
    created_at: int


class GalleryItem(BaseModel):
    id: str
    title: str
    topic: str
    format: str
    thumb: Optional[str]
    shared: bool
    likes: int
    views: int
    uses: int
    reviews: int
    avg_rating: Optional[float]
    score: int
    created_at: int


class GalleryOut(BaseModel):
    items: List[GalleryItem]
    total_projects: int
    total_reviews: int
    avg_rating: Optional[float]


class ReviewIn(BaseModel):
    nickname: str = Field(min_length=1, max_length=20)
    rating: int = Field(ge=1, le=5)  # 만족도
    similarity: int = Field(ge=1, le=5)  # 콘티대로 찍혔는지
    difficulty: int = Field(ge=1, le=5)  # 촬영 난이도
    comment: str = Field(min_length=2, max_length=500)
    video_url: Optional[str] = Field(default=None, max_length=300)

    @field_validator("video_url")
    @classmethod
    def _url(cls, v):
        v = (v or "").strip()
        if not v:
            return None
        if not re.match(r"^https?://", v):
            raise ValueError("영상 링크는 http:// 또는 https:// 로 시작해야 해요.")
        return v


class ReviewOut(ReviewIn):
    id: str
    created_at: int
    mine: bool


# ---------- 공통 ----------
def client(x_client_id: str = Header(default="")) -> str:
    # 로그인 대신 브라우저마다 만든 익명 ID로 '내 것'을 구분
    if not re.fullmatch(r"[A-Za-z0-9-]{8,64}", x_client_id):
        raise HTTPException(400, "브라우저 ID가 없어요. 새로고침 후 다시 시도해 주세요.")
    return x_client_id


def _thumb(data: ProjectIn) -> Optional[str]:
    for s in data.storyboard.scenes:
        url = data.images.get(str(s.scene_no))
        if url:
            return url
    return None


_STATS = """
SELECT p.*,
  (SELECT COUNT(*) FROM likes l WHERE l.project_id = p.id) AS likes,
  (SELECT COUNT(*) FROM reviews r WHERE r.project_id = p.id) AS reviews,
  (SELECT AVG(rating) FROM reviews r WHERE r.project_id = p.id) AS avg_rating
FROM projects p
"""


def _item(row) -> GalleryItem:
    avg = row["avg_rating"]
    return GalleryItem(
        id=row["id"], title=row["title"], topic=row["topic"], format=row["format"],
        thumb=row["thumb"], shared=bool(row["shared"]), likes=row["likes"], views=row["views"],
        uses=row["uses"], reviews=row["reviews"], avg_rating=round(avg, 1) if avg else None,
        score=row["likes"] + row["uses"] * 2 + row["reviews"] * 3, created_at=row["created_at"],
    )


def _get(c, pid: str):
    row = c.execute(_STATS + " WHERE p.id = ?", (pid,)).fetchone()
    if not row:
        raise HTTPException(404, "콘티를 찾을 수 없어요.")
    return row


# ---------- 프로젝트 ----------
@router.post("/projects")
def create_project(body: ProjectIn, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    pid, now = uuid4().hex[:12], int(time.time())
    with conn() as c:
        if c.execute("SELECT COUNT(*) FROM projects WHERE owner = ?", (owner,)).fetchone()[0] >= 50:
            raise HTTPException(429, "저장할 수 있는 콘티는 50개까지예요. 안 쓰는 콘티를 지워 주세요.")
        c.execute(
            "INSERT INTO projects (id, owner, title, topic, format, thumb, data, shared, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (pid, owner, body.storyboard.title, body.topic, body.format, _thumb(body),
             body.model_dump_json(), int(body.shared), now, now),
        )
    return {"id": pid}


@router.put("/projects/{pid}")
def update_project(pid: str, body: ProjectIn, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        row = _get(c, pid)
        if row["owner"] != owner:
            raise HTTPException(403, "내가 만든 콘티만 수정할 수 있어요.")
        c.execute(
            "UPDATE projects SET title = ?, topic = ?, format = ?, thumb = ?, data = ?, shared = ?, updated_at = ?"
            " WHERE id = ?",
            (body.storyboard.title, body.topic, body.format, _thumb(body), body.model_dump_json(),
             int(body.shared), int(time.time()), pid),
        )
    return {"id": pid}


@router.get("/projects/{pid}", response_model=ProjectOut)
def get_project(pid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        row = _get(c, pid)
        mine = row["owner"] == owner
        if not row["shared"] and not mine:
            raise HTTPException(404, "콘티를 찾을 수 없어요.")
        if not mine:
            c.execute("UPDATE projects SET views = views + 1 WHERE id = ?", (pid,))
        liked = c.execute("SELECT 1 FROM likes WHERE project_id = ? AND owner = ?", (pid, owner)).fetchone()
    data = json.loads(row["data"])
    item = _item(row)
    return ProjectOut(
        **data, id=pid, likes=item.likes, views=item.views + (0 if mine else 1), uses=item.uses,
        reviews=item.reviews, avg_rating=item.avg_rating, liked=bool(liked), mine=mine,
        created_at=row["created_at"],
    )


@router.delete("/projects/{pid}")
def delete_project(pid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        if _get(c, pid)["owner"] != owner:
            raise HTTPException(403, "내가 만든 콘티만 지울 수 있어요.")
        for table, col in (("likes", "project_id"), ("reviews", "project_id"), ("projects", "id")):
            c.execute(f"DELETE FROM {table} WHERE {col} = ?", (pid,))
    return {"ok": True}


@router.get("/my", response_model=List[GalleryItem])
def my_projects(x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        rows = c.execute(_STATS + " WHERE p.owner = ? ORDER BY p.updated_at DESC", (owner,)).fetchall()
    return [_item(r) for r in rows]


# ---------- 갤러리 ----------
@router.get("/gallery", response_model=GalleryOut)
def gallery(sort: str = "popular", format: str = "all", x_client_id: str = Header(default="")):
    client(x_client_id)
    where, args = "WHERE p.shared = 1", []
    if format in ("short", "long"):
        where += " AND p.format = ?"
        args.append(format)
    order = f"{SCORE_SQL} DESC, created_at DESC" if sort == "popular" else "created_at DESC"
    with conn() as c:
        rows = c.execute(f"SELECT * FROM ({_STATS} {where}) AS t ORDER BY {order} LIMIT 60", args).fetchall()
        totals = c.execute(
            "SELECT (SELECT COUNT(*) FROM projects WHERE shared = 1),"
            " COUNT(r.id), AVG(r.rating) FROM reviews r JOIN projects p ON p.id = r.project_id AND p.shared = 1"
        ).fetchone()
    return GalleryOut(
        items=[_item(r) for r in rows],
        total_projects=totals[0],
        total_reviews=totals[1],
        avg_rating=round(totals[2], 1) if totals[2] else None,
    )


@router.post("/projects/{pid}/like")
def toggle_like(pid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        _get(c, pid)
        if c.execute("SELECT 1 FROM likes WHERE project_id = ? AND owner = ?", (pid, owner)).fetchone():
            c.execute("DELETE FROM likes WHERE project_id = ? AND owner = ?", (pid, owner))
            liked = False
        else:
            c.execute("INSERT INTO likes (project_id, owner) VALUES (?, ?)", (pid, owner))
            liked = True
        likes = c.execute("SELECT COUNT(*) FROM likes WHERE project_id = ?", (pid,)).fetchone()[0]
    return {"liked": liked, "likes": likes}


@router.post("/projects/{pid}/use")
def use_project(pid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        row = _get(c, pid)
        if row["owner"] != owner:
            c.execute("UPDATE projects SET uses = uses + 1 WHERE id = ?", (pid,))
    return {"ok": True}


# ---------- 촬영 후기 ----------
@router.get("/projects/{pid}/reviews", response_model=List[ReviewOut])
def list_reviews(pid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM reviews WHERE project_id = ? ORDER BY created_at DESC", (pid,)
        ).fetchall()
    return [
        ReviewOut(
            id=r["id"], nickname=r["nickname"], rating=r["rating"], similarity=r["similarity"],
            difficulty=r["difficulty"], comment=r["comment"], video_url=r["video_url"],
            created_at=r["created_at"], mine=r["owner"] == owner,
        )
        for r in rows
    ]


@router.post("/projects/{pid}/reviews", response_model=ReviewOut)
def add_review(pid: str, body: ReviewIn, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    rid, now = uuid4().hex[:12], int(time.time())
    with conn() as c:
        row = _get(c, pid)
        if not row["shared"] and row["owner"] != owner:
            raise HTTPException(404, "콘티를 찾을 수 없어요.")
        mine_count = c.execute(
            "SELECT COUNT(*) FROM reviews WHERE project_id = ? AND owner = ?", (pid, owner)
        ).fetchone()[0]
        if mine_count >= 3:
            raise HTTPException(429, "한 콘티에는 후기를 3개까지 남길 수 있어요.")
        c.execute(
            "INSERT INTO reviews (id, project_id, owner, nickname, rating, similarity, difficulty,"
            " comment, video_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rid, pid, owner, body.nickname.strip(), body.rating, body.similarity, body.difficulty,
             body.comment.strip(), body.video_url, now),
        )
    return ReviewOut(**body.model_dump(), id=rid, created_at=now, mine=True)


@router.delete("/reviews/{rid}")
def delete_review(rid: str, x_client_id: str = Header(default="")):
    owner = client(x_client_id)
    with conn() as c:
        row = c.execute("SELECT owner FROM reviews WHERE id = ?", (rid,)).fetchone()
        if not row:
            raise HTTPException(404, "후기를 찾을 수 없어요.")
        if row["owner"] != owner:
            raise HTTPException(403, "내가 쓴 후기만 지울 수 있어요.")
        c.execute("DELETE FROM reviews WHERE id = ?", (rid,))
    return {"ok": True}
