import { useEffect, useState } from "react";

function formatDuration(sec) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

// 클릭하면 의견 칸에 덧붙는 빠른 의견
const QUICK = ["더 웃기게", "반전을 더 세게", "길이를 더 짧게", "감성적으로", "정보를 더 많이", "친구 리액션 추가", "혼자서 찍을 수 있게"];

// 기획안을 고른 뒤 추가 의견을 적어 다듬는 패널
function DirectorNote({ index, plans, revision, onRefine, onUndo, loading }) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [index]);

  const add = (text) => setNote((n) => (n.trim() ? `${n.trim().replace(/[,.]$/, "")}, ${text}` : text));
  const others = plans.map((_, j) => j).filter((j) => j !== index);
  const version = (revision?.history.length ?? 0) + 1;

  async function submit() {
    if ((await onRefine(note.trim())) === true) setNote("");
  }

  return (
    <section className="note glass">
      <div className="note-main">
        <div className="note-head">
          <span className="micro">Director&apos;s note — 기획 {index + 1}</span>
          <h3>이 기획, 조금 더 내 스타일로</h3>
          <p className="muted">마음에 드는 부분은 그대로 두고, 빼거나 더하고 싶은 점만 적어 주세요. 다른 기획안의 장점을 섞을 수도 있어요.</p>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 친구 소개 장면은 빼고, 기획 2의 반전을 넣어 주세요. 음식 먹는 장면을 더 길게."
          maxLength={500}
          rows={3}
        />

        <div className="note-chips">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => add(q)}>
              + {q}
            </button>
          ))}
          {others.map((j) => (
            <button key={j} type="button" className="mix" onClick={() => add(`기획 ${j + 1}의 장점 섞기`)}>
              + 기획 {j + 1} 섞기
            </button>
          ))}
        </div>

        <div className="note-actions">
          <span className="meta">{note.length}/500</span>
          <button className="btn-ghost" disabled={note.trim().length < 2 || loading} onClick={submit} data-cursor="수정">
            {loading ? "다듬는 중..." : "의견 반영해서 다듬기 ↻"}
          </button>
        </div>
      </div>

      <aside className="note-log">
        <span className="micro">Version</span>
        <b className="note-ver">v{version}</b>
        {revision?.changes ? (
          <>
            <span className="micro">바뀐 점</span>
            <ul>
              {revision.changes.map((c, k) => (
                <li key={k}>{c}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted small">
            {version > 1 ? "이전 버전으로 돌아왔어요." : "아직 다듬지 않은 원본이에요. 의견을 반영하면 바뀐 점이 여기에 정리돼요."}
          </p>
        )}
        {version > 1 && (
          <button className="btn-mini" onClick={onUndo} disabled={loading}>
            ↶ 이전 버전으로
          </button>
        )}
      </aside>
    </section>
  );
}

export default function PlanSelect({
  topic, format, plans, mock, selected, setSelected, onRetry, onNext, loading, revisions, onRefine, onUndo,
}) {
  return (
    <main className="page">
      <section className="section-head glass">
        <div>
          <span className="micro">01 — Plan</span>
          <h2>AI 기획안</h2>
          <p className="muted">
            “{topic}” · {format === "short" ? "숏폼 9:16" : "롱폼 16:9"}
            {mock && <span className="chip chip-mock small">샘플 결과</span>}
          </p>
        </div>
        <button className="btn-ghost" onClick={onRetry} disabled={loading}>
          {loading ? "생성 중..." : "↻ 다시 생성"}
        </button>
      </section>

      <div className="plan-grid">
        {plans.map((p, i) => {
          const ver = (revisions[i]?.history.length ?? 0) + 1;
          return (
            <article
              key={i}
              className={`plan-card glass ${selected === i ? "selected" : ""}`}
              onClick={() => setSelected(i)}
              data-cursor={selected === i ? "" : "선택"}
            >
              <div className="plan-top">
                <span className="rank">
                  기획 {i + 1}
                  {ver > 1 && <em className="ver">v{ver} 수정본</em>}
                </span>
                <span className="meta">{formatDuration(p.duration_sec)}</span>
              </div>
              {p.format_ref && <span className="format-ref">{p.format_ref}</span>}
              <h3>{p.title}</h3>
              <p>{p.concept}</p>

              <div className="plan-hook">
                <b>도입 훅</b>
                <span>{p.hook}</span>
              </div>
              {p.twist && (
                <div className="plan-twist">
                  <b>재미 장치</b>
                  <span>{p.twist}</span>
                </div>
              )}

              <ol className="flow">
                {p.flow.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ol>

              <div className="tags">
                <span className="tag">{p.target}</span>
                <span className="tag">{p.mood}</span>
              </div>
              <p className="point">{p.point}</p>
            </article>
          );
        })}
      </div>

      {selected !== null && (
        <DirectorNote
          index={selected}
          plans={plans}
          revision={revisions[selected]}
          onRefine={onRefine}
          onUndo={onUndo}
          loading={loading}
        />
      )}

      <div className="bottom-bar">
        <button className="btn-primary" disabled={selected === null || loading} onClick={onNext}>
          {selected === null ? "기획안을 하나 골라 주세요" : `기획 ${selected + 1}로 콘티 만들기 →`}
        </button>
      </div>
    </main>
  );
}
