const TRENDS = [
  {
    name: "POV 상황극",
    desc: "1인칭 시점 + 공감 상황으로 댓글·공유가 많은 포맷",
    meta: "15–30초",
    icon: "👀",
  },
  {
    name: "Before / After 전환",
    desc: "확실한 변화를 한 번의 전환으로 보여주는 포맷",
    meta: "10–20초",
    icon: "✨",
  },
  {
    name: "3초 컷 브이로그",
    desc: "짧은 컷을 빠르게 이어 붙여 지루할 틈이 없는 포맷",
    meta: "15–30초",
    icon: "⚡",
  },
];

export default function Home({ topic, setTopic, format, setFormat, style, setStyle, onStart, loading }) {
  const canStart = topic.trim().length >= 2 && !loading;

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <span className="badge">AI 영상 제작 도우미</span>
          <h1>
            아이디어를
            <br />
            <span className="grad">멋진 영상으로</span>
          </h1>
          <p className="muted">
            기획부터 콘티, 촬영 구도, 편집 가이드까지.
            <br />
            처음 만드는 숏폼·롱폼도 AI가 함께 만들어 드려요.
          </p>
        </div>

        <div className="input-card glass">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="어떤 영상을 만들고 싶나요? (예: 친구들과 제주도 여행 브이로그)"
            maxLength={300}
            rows={3}
          />
          {style && (
            <div className="style-tag">
              참고 포맷: <b>{style}</b>
              <button onClick={() => setStyle(null)} aria-label="포맷 해제">✕</button>
            </div>
          )}
          <div className="input-actions">
            <div className="toggle">
              <button className={format === "short" ? "on" : ""} onClick={() => setFormat("short")}>
                📱 숏폼 <small>9:16</small>
              </button>
              <button className={format === "long" ? "on" : ""} onClick={() => setFormat("long")}>
                🖥️ 롱폼 <small>16:9</small>
              </button>
            </div>
            <button className="btn-primary" disabled={!canStart} onClick={onStart}>
              {loading ? "생성 중..." : "시작하기 →"}
            </button>
          </div>
        </div>
      </section>

      <section className="trends">
        <h2>
          🔥 인기 포맷 <span className="grad">TOP 3</span>
        </h2>
        <p className="muted">요즘 반응 좋은 형식을 골라 내 주제에 맞게 기획해 보세요.</p>
        <div className="trend-grid">
          {TRENDS.map((t, i) => (
            <article key={t.name} className="trend-card glass">
              <div className="trend-thumb">{t.icon}</div>
              <div className="trend-body">
                <span className="rank">#{i + 1}</span>
                <h3>{t.name}</h3>
                <p className="muted">{t.desc}</p>
                <span className="meta">⏱ {t.meta} · 9:16</span>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setStyle(t.name);
                    setFormat("short");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  이 포맷으로 만들기
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
