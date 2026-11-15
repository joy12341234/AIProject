// 유튜브 업로드
// Google 로그인 토큰은 브라우저에서 받고, 영상은 브라우저 → 유튜브로 바로 전송 (우리 서버에 저장하지 않음)
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const API = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export const youtubeReady = () => CLIENT_ID.endsWith(".apps.googleusercontent.com");

let gis = null;
export function loadGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gis ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gis = null;
      reject(new Error("Google 로그인 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요."));
    };
    document.head.appendChild(s);
  });
  return gis;
}

let token = null; // 메모리에만 보관 (새로고침하면 다시 로그인)

// 버튼 클릭 안에서 불러야 로그인 팝업이 차단되지 않음
export function getToken() {
  if (token && token.exp > Date.now() + 60_000) return Promise.resolve(token.value);
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) return Promise.reject(new Error("Google 로그인 도구가 아직 준비되지 않았어요. 잠시 후 다시 눌러 주세요."));

  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (res) => {
        if (res.error) return reject(new Error(res.error === "access_denied" ? "업로드 권한을 허용하지 않았어요." : `Google 로그인 오류: ${res.error}`));
        if (!oauth.hasGrantedAllScopes(res, SCOPE)) return reject(new Error("‘YouTube 동영상 관리’ 권한에 체크해야 올릴 수 있어요."));
        token = { value: res.access_token, exp: Date.now() + (Number(res.expires_in) || 3600) * 1000 };
        resolve(token.value);
      },
      error_callback: (err) =>
        reject(new Error(err?.type === "popup_closed" ? "로그인 창이 닫혔어요." : "로그인 창을 열지 못했어요. 브라우저의 팝업 차단을 해제해 주세요.")),
    });
    client.requestAccessToken();
  });
}

// 다른 계정으로 올리고 싶을 때
export function signOutGoogle() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value, () => {});
  token = null;
}

// 유튜브 오류를 한국어로
function explain(status, text) {
  let reason = "";
  let message = "";
  try {
    const e = JSON.parse(text).error;
    reason = e?.errors?.[0]?.reason ?? "";
    message = e?.message ?? "";
  } catch {
    /* 본문이 JSON이 아님 */
  }
  if (status === 401 && reason === "youtubeSignupRequired") return "이 구글 계정에는 유튜브 채널이 없어요. 유튜브에서 채널을 먼저 만들어 주세요.";
  if (status === 401) {
    token = null;
    return "로그인이 만료됐어요. 버튼을 다시 눌러 주세요.";
  }
  if (reason === "quotaExceeded" || reason === "uploadLimitExceeded") return "오늘 올릴 수 있는 횟수를 넘었어요. 내일 다시 시도해 주세요.";
  if (status === 403) return `유튜브가 업로드를 거부했어요. (${reason || message || status})`;
  if (status === 400) return `입력 내용을 확인해 주세요. (${message || reason || status})`;
  return `업로드에 실패했어요. (${status} ${message || reason})`;
}

// 제목·설명에 유튜브가 허용하지 않는 꺾쇠 괄호 제거
const clean = (s) => s.replace(/[<>]/g, "");

export async function uploadToYoutube({ file, title, description, tags, privacy, kids, onProgress }) {
  const accessToken = await getToken();
  const type = file.type?.startsWith("video/") ? file.type : "application/octet-stream";

  // 1) 업로드 세션 시작: 제목·설명·공개 범위 전달
  const init = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(file.size),
      "X-Upload-Content-Type": type,
    },
    body: JSON.stringify({
      snippet: { title: clean(title).slice(0, 100), description: clean(description).slice(0, 4900), tags, categoryId: "22" },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: kids },
    }),
  }).catch(() => {
    throw new Error("유튜브 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.");
  });
  if (!init.ok) throw new Error(explain(init.status, await init.text()));
  const session = init.headers.get("Location");
  if (!session) throw new Error("업로드 주소를 받지 못했어요. 다시 시도해 주세요.");

  // 2) 영상 파일 전송 (진행률 표시를 위해 XHR 사용)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", session);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("업로드는 됐지만 결과를 읽지 못했어요. YouTube Studio에서 확인해 주세요."));
        }
      } else reject(new Error(explain(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => reject(new Error("업로드 중 연결이 끊겼어요. 다시 시도해 주세요."));
    xhr.send(file);
  });
}
