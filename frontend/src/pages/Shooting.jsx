import { useState } from "react";

const PEOPLE = ["혼자", "2명", "3명 이상"];
const GEAR = ["손으로 들고", "삼각대", "셀카봉", "짐벌", "조명", "외장 마이크"];
const PLACES = ["실내", "실외", "실내+실외"];

function Chips({ options, value, onChange, multi = false }) {
  const on = (o) => (multi ? value.includes(o) : value === o);
  const toggle = (o) => (multi ? onChange(on(o) ? value.filter((v) => v !== o) : [...value, o]) : onChange(o));
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className={on(o) ? "on" : ""} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function Shooting({ storyboard, images, shooting, setShooting, onGenerate, loading, onNext, saveBar }) {
  const env = shooting?.env;
  const [people, setPeople] = useState(env?.people ?? "2명");
  const [gear, setGear] = useState(env?.gear ?? ["손으로 들고", "삼각대"]);
  const [place, setPlace] = useState(env?.place ?? "실내+실외");

  const scenes = storyboard.scenes;
  const byNo = Object.fromEntries(scenes.map((s) => [s.scene_no, s]));
  const progress = shooting?.progress ?? { done: {}, checks: {}, prep: {} };
  const doneCount = scenes.filter((s) => progress.done[s.scene_no]).length;

  // 체크 상태도 저장되도록 가이드 데이터 안에 함께 보관
  const toggle = (group, key) =>
    setShooting((g) => ({
      ...g,
      progress: { ...progress, [group]: { ...progress[group], [key]: !progress[group][key] } },
    }));

  return (
    <main className="page wide">
      <div className="board-layout">
        <aside className="board-side glass">
          <h3>촬영 환경</h3>
          <p className="muted">환경에 맞춰 AI가 촬영 순서와 방법을 짜 드려요.</p>
          <div className="field">
            <b>촬영 인원</b>
            <Chips options={PEOPLE} value={people} onChange={setPeople} />
          </div>
          <div className="field">
            <b>장비 (여러 개 선택)</b>
            <Chips options={GEAR} value={gear} onChange={setGear} multi />
          </div>
          <div className="field">
            <b>장소</b>
            <Chips options={PLACES} value={place} onChange={setPlace} />
          </div>
          <button className="btn-primary" disabled={loading} onClick={() => onGenerate({ people, gear, place })}>
            {shooting ? "↻ 촬영 가이드 다시 만들기" : "촬영 가이드 만들기"}
          </button>
          {saveBar}
        </aside>

        <section className="board-main">
          <div className="section-head glass">
            <div>
              <span className="micro">03 — Shoot</span>
              <h2>AI 촬영 가이드</h2>
              <p className="muted">
                {storyboard.title} · {scenes.length}컷
                {shooting?.mock && <span className="chip chip-mock small">샘플 결과</span>}
              </p>
            </div>
            {shooting && (
              <div className="progress-box">
                <span>
                  촬영 완료 <b>{doneCount}</b>/{scenes.length}
                </span>
                <span className="meter">
                  <span style={{ width: `${(doneCount / scenes.length) * 100}%` }} />
                </span>
              </div>
            )}
          </div>

          {!shooting ? (
            <div className="empty glass">
              <p>왼쪽에서 촬영 환경을 고르고 <b>촬영 가이드 만들기</b>를 눌러 주세요.</p>
              <p className="muted">콘티 순서가 아니라, 같은 장소끼리 묶은 효율적인 촬영 순서를 알려 드려요.</p>
            </div>
          ) : (
            <>
              <p className="callout">{shooting.summary}</p>

              <div className="two-col">
                <div className="glass card-pad">
                  <h4>준비물</h4>
                  <ul className="checklist">
                    {shooting.prep.map((p, i) => (
                      <li key={i}>
                        <label>
                          <input type="checkbox" checked={!!progress.prep[i]} onChange={() => toggle("prep", i)} />
                          {p}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="glass card-pad">
                  <h4>추천 촬영 순서</h4>
                  <ol className="order-list">
                    {shooting.order.map((g, i) => (
                      <li key={i}>
                        <b>{g.place}</b>
                        <div className="cut-chips">
                          {g.scene_nos.map((n) => (
                            <span key={n} className="cut-chip">
                              CUT {n}
                              {byNo[n] && <small> {byNo[n].title}</small>}
                            </span>
                          ))}
                        </div>
                        <span className="muted small">{g.reason}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <h3 className="sub-title">컷별 촬영 체크리스트</h3>
              <div className={`shot-grid ${storyboard.format === "short" ? "v" : "h"}`}>
                {shooting.scenes.map((g) => {
                  const s = byNo[g.scene_no];
                  if (!s) return null;
                  const img = images[s.scene_no];
                  const done = !!progress.done[s.scene_no];
                  return (
                    <article key={s.scene_no} className={`shot-card glass ${done ? "is-done" : ""}`}>
                      <div className="shot-top">
                        <div className="shot-thumb">
                          {img?.status === "done" ? <img src={img.url} alt="" /> : <span>CUT {s.scene_no}</span>}
                        </div>
                        <div>
                          <span className="cut-badge static">CUT {s.scene_no}</span>
                          <h4>{s.title}</h4>
                          <div className="badges">
                            <span>{s.shot_size}</span>
                            <span>{s.angle}</span>
                            <span>{s.camera_move}</span>
                          </div>
                        </div>
                      </div>
                      <p className="setup"><span className="k">세팅</span> {g.setup}</p>
                      <ul className="checklist">
                        {g.checks.map((c, i) => {
                          const key = `${s.scene_no}-${i}`;
                          return (
                            <li key={key}>
                              <label>
                                <input type="checkbox" checked={!!progress.checks[key]} onChange={() => toggle("checks", key)} />
                                {c}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="caution"><span className="k">주의</span> {g.caution}</p>
                      <button className={`btn-done ${done ? "on" : ""}`} onClick={() => toggle("done", s.scene_no)}>
                        {done ? "● 촬영 완료" : "촬영 완료로 표시"}
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="glass card-pad">
                <h4>촬영 팁</h4>
                <ul className="tips">
                  {shooting.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="bottom-bar">
            <button className="btn-primary" onClick={onNext}>
              다음: 편집 가이드 →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
