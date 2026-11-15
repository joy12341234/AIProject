import { useState } from "react";
import { buildSrt, copyText, downloadText, fmtTime } from "../api.js";
import YouTubeUpload from "../components/YouTubeUpload.jsx";

const APPS = ["캡컷", "VLLO", "프리미어 프로", "기타"];

export default function Editing({ storyboard, images, editing, onGenerate, loading, saveBar, onShare, shared, notify }) {
  const [app, setApp] = useState(editing?.app ?? "캡컷");
  const scenes = storyboard.scenes;
  const byNo = Object.fromEntries(scenes.map((s) => [s.scene_no, s]));

  function downloadSrt() {
    const srt = buildSrt(scenes, editing);
    if (!srt) return notify("자막으로 넣을 대사가 없어요.");
    downloadText(`subtitles-${new Date().toISOString().slice(0, 10)}.srt`, srt);
  }

  async function copy(text, what) {
    notify((await copyText(text)) ? `${what} 복사했어요.` : "복사에 실패했어요. 직접 드래그해서 복사해 주세요.");
  }

  return (
    <main className="page wide">
      <div className="board-layout">
        <aside className="board-side glass">
          <h3>편집 앱</h3>
          <p className="muted">쓰는 편집 앱에 맞춰 안내해 드려요.</p>
          <div className="chips">
            {APPS.map((a) => (
              <button key={a} type="button" className={app === a ? "on" : ""} onClick={() => setApp(a)}>
                {a}
              </button>
            ))}
          </div>
          <button className="btn-primary" disabled={loading} onClick={() => onGenerate(app)}>
            {editing ? "↻ 편집 가이드 다시 만들기" : "편집 가이드 만들기"}
          </button>
          <button className="btn-ghost full" onClick={downloadSrt}>
            SRT 자막 파일 받기 ↓
          </button>
          <p className="muted small">자막 파일은 캡컷 등 편집 앱에서 ‘자막 가져오기’로 바로 불러올 수 있어요.</p>
          {saveBar}
        </aside>

        <section className="board-main">
          <div className="section-head glass">
            <div>
              <span className="micro">04 — Edit</span>
              <h2>AI 편집 가이드</h2>
              <p className="muted">
                {storyboard.title} · {fmtTime(storyboard.total_sec)}
                {editing?.mock && <span className="chip chip-mock small">샘플 결과</span>}
              </p>
            </div>
          </div>

          {!editing ? (
            <div className="empty glass">
              <p>왼쪽에서 편집 앱을 고르고 <b>편집 가이드 만들기</b>를 눌러 주세요.</p>
              <p className="muted">컷별 편집 방법, 자막 위치, 업로드용 제목·해시태그까지 만들어 드려요.</p>
            </div>
          ) : (
            <>
              <p className="callout">{editing.summary}</p>
              <div className="two-col">
                <div className="glass card-pad">
                  <h4>색감·보정</h4>
                  <p>{editing.tone}</p>
                </div>
                <div className="glass card-pad">
                  <h4>음악·효과음</h4>
                  <p>{editing.sound}</p>
                </div>
              </div>

              <h3 className="sub-title">컷별 편집 순서</h3>
              <div className="table-wrap glass">
                <table className="edit-table">
                  <thead>
                    <tr>
                      <th>컷</th>
                      <th>구간</th>
                      <th>편집 방법</th>
                      <th>전환</th>
                      <th>자막</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editing.cuts.map((c) => {
                      const s = byNo[c.scene_no];
                      const img = images[c.scene_no];
                      return (
                        <tr key={c.scene_no}>
                          <td>
                            <div className="cut-cell">
                              {img?.status === "done" && <img src={img.url} alt="" />}
                              <b>CUT {c.scene_no}</b>
                            </div>
                          </td>
                          <td className="nowrap">{s ? `${fmtTime(s.start_sec)}–${fmtTime(s.end_sec)}` : "-"}</td>
                          <td>{c.edit}</td>
                          <td>{c.transition}</td>
                          <td>
                            {c.subtitle ? (
                              <>
                                “{c.subtitle}” <span className="pos">{c.subtitle_pos}</span>
                              </>
                            ) : (
                              <span className="muted">없음</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="sub-title">업로드 패키지</h3>
              <div className="two-col">
                <div className="glass card-pad">
                  <h4>제목 후보</h4>
                  <ul className="copy-list">
                    {editing.titles.map((t, i) => (
                      <li key={i}>
                        <span>{t}</span>
                        <button className="btn-mini" onClick={() => copy(t, "제목을")}>
                          복사
                        </button>
                      </li>
                    ))}
                  </ul>
                  <h4>썸네일 문구</h4>
                  <p className="thumb-text">{editing.thumbnail_text}</p>
                </div>
                <div className="glass card-pad">
                  <h4>해시태그</h4>
                  <div className="tags">
                    {editing.hashtags.map((h) => (
                      <span key={h} className="tag">
                        {h}
                      </span>
                    ))}
                  </div>
                  <button className="btn-mini" onClick={() => copy(editing.hashtags.join(" "), "해시태그를")}>
                    해시태그 전체 복사
                  </button>
                  <h4>업로드 팁</h4>
                  <p>{editing.upload_tip}</p>
                </div>
              </div>

              <YouTubeUpload storyboard={storyboard} editing={editing} notify={notify} />

              <div className="finish glass">
                <div>
                  <h3>콘티 완성</h3>
                  <p className="muted">
                    갤러리에 공개하면 다른 사람들이 이 콘티로 촬영하고, 어떻게 찍혔는지 후기를 남길 수 있어요.
                  </p>
                </div>
                <button className="btn-primary" onClick={onShare} disabled={loading}>
                  {shared ? "갤러리에서 보기 →" : "갤러리에 공유하기"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
