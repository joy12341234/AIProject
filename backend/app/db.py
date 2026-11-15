import sqlite3
from contextlib import contextmanager

from . import config

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
CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);
"""


@contextmanager
def conn():
    c = sqlite3.connect(config.DB_PATH, timeout=10)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with conn() as c:
        c.executescript(SCHEMA)
