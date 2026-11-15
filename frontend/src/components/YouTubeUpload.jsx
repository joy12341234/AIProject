import { useEffect, useState } from "react";
import { copyText } from "../api.js";
import { loadGoogle, loadYoutubeConfig, signOutGoogle, uploadToYoutube, youtubeReady } from "../youtube.js";

const PRIVACY = [
  ["private", "비공개"],
  ["unlisted", "일부 공개"],
  ["public", "공개"],
];

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

// 편집을 마친 영상을 내 유튜브 채널에 바로 올리기
export default function YouTubeUpload({ storyboard, editing, notify }) {
  const [ready, setReady] = useState(youtubeReady());
  const short = storyboard.format === "short";
  const tags = (editing?.hashtags ?? []).map((h) => h.replace(/^#/, "")).filter(Boolean);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState(editing?.titles?.[0] ?? storyboard.title);
  const [desc, setDesc] = useState(
    [storyboard.title, (editing?.hashtags ?? []).join(" ") + (short ? " #Shorts" : "")].filter((s) => s.trim()).join("\n\n")
  );
  const [privacy, setPrivacy] = useState("private");
  const [kids, setKids] = useState(false);
  const [progress, setProgress] = useState(null); // null: 대기, 0~1: 업로드 중
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // 로그인 도구를 미리 불러 둬야 버튼을 눌렀을 때 팝업이 막히지 않음
  useEffect(() => {
    loadYoutubeConfig().then((ok) => {
      setReady(ok);
      if (ok) loadGoogle().catch((e) => setError(e.message));
    });
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("영상 파일(mp4, mov 등)만 올릴 수 있어요.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }

  async function upload() {
    setError("");
    setResult(null);
    setProgress(0);
    try {
      const video = await uploadToYoutube({ file, title, description: desc, tags, privacy, kids, onProgress: setProgress });
      setResult(video);
      notify("유튜브에 올렸어요. 처리가 끝나면 볼 수 있어요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  const url = result?.id ? `https://youtu.be/${result.id}` : "";

  return (
    <section className="yt glass">
      <div className="yt-head">
        <span className="micro">05 — Upload</span>
        <h3>유튜브에 바로 올리기</h3>
        <p className="muted">
          편집을 마친 영상을 고르면 제목·설명·해시태그를 채워 내 채널에 올려 드려요. 영상은 우리 서버에 저장되지 않고 유튜브로 바로 전송돼요.
        </p>
      </div>

      {!ready ? (
        <div className="yt-setup">
          <span className="rec">
            <i />
            SETUP
          </span>
          <p>
            아직 Google 연결 설정이 안 됐어요. 내 PC에서는 <b>setup_youtube.bat</b>으로 클라이언트 ID를 넣고 프론트엔드 서버를 다시 켜 주세요.
            배포 사이트에서는 Render 환경 변수 <b>GOOGLE_CLIENT_ID</b>를 확인해 주세요.
          </p>
        </div>
      ) : (
        <div className="yt-body">
          <label className={`yt-drop ${file ? "has" : ""}`} data-cursor="선택">
            <input type="file" accept="video/*" onChange={pick} disabled={busy} />
            {file ? (
              <>
                <video src={preview} muted playsInline controls className={short ? "v" : "h"} />
                <span className="meta">
                  {file.name} · {mb(file.size)} · 다른 영상으로 바꾸려면 여기를 클릭
                </span>
              </>
            ) : (
              <span className="yt-pick">
                <b>편집 완료한 영상 선택 +</b>
                <span className="muted small">mp4, mov 등 · {short ? "세로 9:16, 3분 이하면 쇼츠로 올라가요" : "가로 16:9"}</span>
              </span>
            )}
          </label>

          <div className="yt-form">
            <label>
              <span className="k-label">
                제목 <em>{title.length}/100</em>
              </span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={busy} />
            </label>
            <label>
              <span className="k-label">설명</span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} maxLength={4900} disabled={busy} />
            </label>
            <div className="yt-row">
              <div className="seg" role="radiogroup" aria-label="공개 범위">
                {PRIVACY.map(([v, l]) => (
                  <button key={v} type="button" className={privacy === v ? "on" : ""} onClick={() => setPrivacy(v)} disabled={busy}>
                    {l}
                  </button>
                ))}
              </div>
              <label className="check">
                <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} disabled={busy} />
                어린이용으로 만든 영상이에요
              </label>
            </div>

            {busy && (
              <div className="yt-progress">
                <span className="rec">
                  <i />
                  UPLOADING {Math.round(progress * 100)}%
                </span>
                <span className="meter">
                  <span style={{ width: `${progress * 100}%` }} />
                </span>
              </div>
            )}

            {error && <p className="yt-error">{error}</p>}

            {result && (
              <div className="yt-done">
                <b>업로드 완료</b>
                <span className="muted small">유튜브에서 처리(인코딩)가 끝나면 볼 수 있어요. 공개 범위: {PRIVACY.find(([v]) => v === privacy)?.[1]}</span>
                <div className="yt-links">
                  <a className="btn-mini" href={url} target="_blank" rel="noopener noreferrer">
                    유튜브에서 보기 ↗
                  </a>
                  <a className="btn-mini" href={`https://studio.youtube.com/video/${result.id}/edit`} target="_blank" rel="noopener noreferrer">
                    YouTube Studio ↗
                  </a>
                  <button className="btn-mini" onClick={async () => notify((await copyText(url)) ? "영상 링크를 복사했어요." : "복사에 실패했어요.")}>
                    링크 복사
                  </button>
                </div>
              </div>
            )}

            <div className="yt-actions">
              <button className="btn-primary" disabled={!file || !title.trim() || busy || !!result} onClick={upload} data-cursor="UPLOAD">
                {busy ? "올리는 중..." : result ? "업로드 완료 ✓" : "Google 로그인 후 업로드 ↑"}
              </button>
              <button className="btn-mini" onClick={() => (signOutGoogle(), notify("Google 연결을 끊었어요. 다음 업로드 때 계정을 다시 고를 수 있어요."))} disabled={busy}>
                계정 바꾸기
              </button>
            </div>
            <p className="muted small">
              처음 한 번은 ‘Google에서 확인하지 않은 앱’ 경고가 떠요. 테스트 중인 앱이라 정상이며, ‘계속’을 누르면 돼요. 15분이 넘는 영상은 유튜브 계정 인증이 필요할 수 있어요.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
