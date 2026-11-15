// 로그인 대신 브라우저마다 익명 ID를 만들어 '내 콘티'를 구분
function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let memoryId = null;
function clientId() {
  try {
    let id = localStorage.getItem("aivd_client_id");
    if (!id) {
      id = makeId();
      localStorage.setItem("aivd_client_id", id);
    }
    return id;
  } catch {
    memoryId ??= makeId();
    return memoryId;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Client-Id": clientId() },
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요. run.bat 으로 백엔드를 켰는지 확인해 주세요.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 백엔드가 꺼져 있으면 Vite 프록시가 HTML 오류를 돌려줌
    if (!data) throw new Error("백엔드 서버가 꺼져 있어요. run.bat 으로 서버를 켜 주세요.");
    const detail = Array.isArray(data.detail)
      ? (data.detail[0]?.msg ?? "입력값을 확인해 주세요.").replace(/^Value error, /, "")
      : data.detail;
    throw new Error(detail || `요청 실패 (${res.status})`);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const getHealth = () => request("/api/health");
export const createPlans = (body) => post("/api/plan", body);
export const refinePlan = (body) => post("/api/plan/refine", body);
export const createStoryboard = (body) => post("/api/storyboard", body);
export const createSceneImage = (body) => post("/api/storyboard/image", body);
export const createShootingGuide = (body) => post("/api/shooting-guide", body);
export const createEditGuide = (body) => post("/api/edit-guide", body);

// 저장·갤러리·후기
export const saveProject = (id, body) =>
  id
    ? request(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(body) })
    : post("/api/projects", body);
export const getProject = (id) => request(`/api/projects/${id}`);
export const deleteProject = (id) => request(`/api/projects/${id}`, { method: "DELETE" });
export const getMyProjects = () => request("/api/my");
export const getGallery = (sort, format) => request(`/api/gallery?sort=${sort}&format=${format}`);
export const toggleLike = (id) => post(`/api/projects/${id}/like`);
export const markUse = (id) => post(`/api/projects/${id}/use`);
export const getReviews = (id) => request(`/api/projects/${id}/reviews`);
export const addReview = (id, body) => post(`/api/projects/${id}/reviews`, body);
export const deleteReview = (id) => request(`/api/reviews/${id}`, { method: "DELETE" });

// 동시에 limit개씩만 실행 (공용 키 사용량 제한 대비)
export async function runQueue(items, limit, worker) {
  let i = 0;
  const next = async () => {
    while (i < items.length) await worker(items[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}

export function fmtTime(sec) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- SRT 자막 ----------
function srtTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${h}:${m}:${s},000`;
}

const cleanSub = (t) => (t ?? "").replace(/^\(?\s*자막\s*\)?\s*[:：]?\s*/, "").replace(/^["“]|["”]$/g, "").trim();

// 편집 가이드 자막이 있으면 그걸, 없으면 콘티 대사를 사용
export function buildSrt(scenes, editing) {
  const subs = Object.fromEntries((editing?.cuts ?? []).map((c) => [c.scene_no, c.subtitle]));
  let n = 0;
  return scenes
    .map((s) => {
      const text = cleanSub(editing ? subs[s.scene_no] : s.dialogue);
      if (!text) return null;
      n += 1;
      return `${n}\n${srtTime(s.start_sec)} --> ${srtTime(s.end_sec)}\n${text}\n`;
    })
    .filter(Boolean)
    .join("\n");
}

export function downloadText(filename, text) {
  const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  // 바로 해제하면 파일 이름이 사라지는 경우가 있어 잠시 뒤 정리
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function timeAgo(ts) {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return "방금";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return `${Math.floor(d / 86400)}일 전`;
}

// 유튜브 링크면 썸네일 주소를 만들어 줌
export function youtubeThumb(url) {
  const m = (url ?? "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
