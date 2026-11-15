async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요. run.bat 으로 백엔드를 켰는지 확인해 주세요.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 백엔드가 꺼져 있으면 Vite 프록시가 HTML 오류를 돌려줌
    if (!data) throw new Error("백엔드 서버가 꺼져 있어요. run.bat 으로 서버를 켜 주세요.");
    const detail = Array.isArray(data.detail) ? "입력값을 확인해 주세요." : data.detail;
    throw new Error(detail || `요청 실패 (${res.status})`);
  }
  return data;
}

export const getHealth = () => request("/api/health");

export const createPlans = (body) =>
  request("/api/plan", { method: "POST", body: JSON.stringify(body) });

export const createStoryboard = (body) =>
  request("/api/storyboard", { method: "POST", body: JSON.stringify(body) });

export const createSceneImage = (body) =>
  request("/api/storyboard/image", { method: "POST", body: JSON.stringify(body) });

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
