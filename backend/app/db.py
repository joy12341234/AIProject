"""DB 연결: 내 PC에서는 SQLite 파일, 배포(Render)에서는 Supabase Postgres (DATABASE_URL이 있으면)"""
import sqlite3
import time
from contextlib import contextmanager
from functools import lru_cache

from . import config

PG = bool(config.DATABASE_URL)

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    format TEXT NOT NULL,
    thumb TEXT,
    data TEXT NOT NULL,
    shared INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    uses INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
    project_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    PRIMARY KEY (project_id, owner)
);
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    nickname TEXT NOT NULL,
    rating INTEGER NOT NULL,
    similarity INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    comment TEXT NOT NULL,
    video_url TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS images (
    name TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data {BLOB} NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner)
"""
TABLES = ("projects", "likes", "reviews", "images")


class Row(dict):
    """row["id"]처럼 이름으로도, row[0]처럼 순서로도 꺼낼 수 있는 행 (SQLite Row와 같은 사용법)"""

    def __init__(self, names, values):
        super().__init__(zip(names, values))
        self._values = tuple(values)

    def __getitem__(self, key):
        return self._values[key] if isinstance(key, int) else super().__getitem__(key)


def _pg_rows(cursor):
    names = [d.name for d in cursor.description or []]
    return lambda values: Row(names, values)


class _Pg:
    """SQLite식 '?' 자리표시자를 Postgres식 '%s'로 바꿔 실행"""

    def __init__(self, c):
        self.c = c

    def execute(self, sql, params=()):
        return self.c.execute(sql.replace("?", "%s"), params)


@contextmanager
def conn():
    if PG:
        import psycopg  # 배포 환경에서만 필요

        # prepare_threshold=None: Supabase 연결 풀러와 충돌하지 않게 미리 컴파일 끔
        c = psycopg.connect(config.DATABASE_URL, prepare_threshold=None, row_factory=_pg_rows, connect_timeout=15)
        try:
            yield _Pg(c)
            c.commit()
        finally:
            c.close()  # 커밋 전에 오류가 나면 변경은 버려짐
    else:
        c = sqlite3.connect(config.DB_PATH, timeout=10)
        c.row_factory = sqlite3.Row
        try:
            yield c
            c.commit()
        finally:
            c.close()


def init():
    if PG:
        print(f"[DB] Supabase Postgres 연결 중: ...@{config.DATABASE_HINT}", flush=True)
    with conn() as c:
        for stmt in SCHEMA.format(BLOB="BYTEA" if PG else "BLOB").split(";"):
            if stmt.strip():
                c.execute(stmt)
        if PG:
            # Supabase 공개 API로는 표를 읽을 수 없게 잠금 (우리 서버는 소유자라 영향 없음)
            for t in TABLES:
                c.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")


# ---------- 콘티 그림 (배포 서버는 파일이 지워지므로 DB에 보관) ----------
def save_image(name: str, mime: str, data: bytes):
    with conn() as c:
        c.execute(
            "INSERT INTO images (name, mime, data, created_at) VALUES (?, ?, ?, ?)",
            (name, mime, data, int(time.time())),
        )


@lru_cache(maxsize=64)
def load_image(name: str):
    with conn() as c:
        row = c.execute("SELECT mime, data FROM images WHERE name = ?", (name,)).fetchone()
    return (row["mime"], bytes(row["data"])) if row else None
