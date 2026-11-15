function formatDuration(sec) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

export default function PlanSelect({ topic, format, plans, mock, selected, setSelected, onRetry, onNext, loading }) {
  return (
    <main className="page">
      <section className="section-head glass">
        <div>
          <h2>🧠 AI 기획안</h2>
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
        {plans.map((p, i) => (
          <article
            key={i}
            className={`plan-card glass ${selected === i ? "selected" : ""}`}
            onClick={() => setSelected(i)}
          >
            <div className="plan-top">
              <span className="rank">기획 {i + 1}</span>
              <span className="meta">⏱ {formatDuration(p.duration_sec)}</span>
            </div>
            <h3>{p.title}</h3>
            <p>{p.concept}</p>

            <div className="plan-hook">
              <b>🎣 도입 훅</b>
              <span>{p.hook}</span>
            </div>

            <ol className="flow">
              {p.flow.map((f, j) => (
                <li key={j}>{f}</li>
              ))}
            </ol>

            <div className="tags">
              <span className="tag">🎯 {p.target}</span>
              <span className="tag">🎨 {p.mood}</span>
            </div>
            <p className="point">💡 {p.point}</p>
          </article>
        ))}
      </div>

      <div className="bottom-bar">
        <button className="btn-primary" disabled={selected === null || loading} onClick={onNext}>
          {selected === null ? "기획안을 하나 골라 주세요" : "이 기획으로 콘티 만들기 →"}
        </button>
      </div>
    </main>
  );
}
