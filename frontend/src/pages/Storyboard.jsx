import SceneCard from "../components/SceneCard.jsx";
import Timeline from "../components/Timeline.jsx";
import { fmtTime } from "../api.js";

export default function Storyboard({ storyboard, plan, images, onDraw, onRemake, onBack, onNext, loading, saveBar }) {
  const { scenes, format, total_sec, mock } = storyboard;
  const done = scenes.filter((s) => images[s.scene_no]?.status === "done").length;

  return (
    <main className="page wide">
      <div className="board-layout">
        <aside className="board-side glass">
          <span className="chip chip-on small-top">{format === "short" ? "숏폼 · 9:16" : "롱폼 · 16:9"}</span>
          <h3>{storyboard.title}</h3>
          <p className="muted">{plan.concept}</p>

          <ul className="side-info">
            <li><span>총 길이</span><b>{fmtTime(total_sec)}</b></li>
            <li><span>컷 수</span><b>{scenes.length}컷</b></li>
            <li><span>분위기</span><b>{plan.mood}</b></li>
            <li><span>타깃</span><b>{plan.target}</b></li>
          </ul>

          <div className="side-hook">
            <b>도입 훅</b>
            <p>{plan.hook}</p>
          </div>
          {plan.twist && (
            <div className="side-hook">
              <b>재미 장치</b>
              <p>{plan.twist}</p>
            </div>
          )}
          {storyboard.direction && (
            <div className="side-hook">
              <b>연출 포인트</b>
              <p>{storyboard.direction}</p>
            </div>
          )}

          <button className="btn-ghost full" onClick={onRemake} disabled={loading}>
            {loading ? "만드는 중..." : "↻ 콘티 다시 만들기"}
          </button>
          <button className="btn-ghost full" onClick={onBack}>
            ← 기획안 다시 고르기
          </button>
          {saveBar}
        </aside>

        <section className="board-main">
          <div className="section-head glass">
            <div>
              <span className="micro">02 — Storyboard</span>
              <h2>AI 콘티</h2>
              <p className="muted">
                훅부터 마무리까지 {scenes.length}개 컷이 이어져요. 마음에 안 드는 컷은 그림만 다시 그릴 수 있어요.
                {mock && <span className="chip chip-mock small">샘플 결과</span>}
              </p>
            </div>
            <span className="progress">
              그림 {done}/{scenes.length}
            </span>
          </div>

          <div className={`scene-grid ${format === "short" ? "v" : "h"}`}>
            {scenes.map((s, i) => (
              <SceneCard
                key={s.scene_no}
                last={i === scenes.length - 1}
                scene={s}
                format={format}
                image={images[s.scene_no]}
                onDraw={() => onDraw(s)}
              />
            ))}
          </div>

          <div className="board-bottom">
            <Timeline scenes={scenes} total={total_sec} />
            <button className="btn-primary" onClick={onNext}>
              다음: 촬영 가이드 →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
