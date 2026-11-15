// 한 가지 색의 가로 막대 (순위·분포용). 행에 마우스를 올리면 세부 수치 표시
export function RankChart({ rows, unit = "", onSelect }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rank-chart" role="table">
      {rows.map((r) => (
        <div
          key={r.key}
          role="row"
          className={`rank-row ${onSelect ? "clickable" : ""}`}
          onClick={onSelect ? () => onSelect(r.key) : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={onSelect ? (e) => e.key === "Enter" && onSelect(r.key) : undefined}
        >
          <span role="cell" className="rank-label" title={r.label}>
            {r.label}
          </span>
          <span role="cell" className="rank-track">
            {r.value > 0 && <span className="rank-bar" style={{ width: `${(r.value / max) * 100}%` }} />}
            {r.tip && <span className="rank-tip">{r.tip}</span>}
          </span>
          <span role="cell" className="rank-value">
            {r.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatTiles({ items }) {
  return (
    <div className="stat-row">
      {items.map((i) => (
        <div key={i.label} className="stat glass">
          <span className="stat-label">{i.label}</span>
          <b className="stat-value">{i.value}</b>
          {i.sub && <span className="stat-sub">{i.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, onChange, label }) {
  return (
    <span className="stars" aria-label={label ? `${label} ${value}점` : `${value}점`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button type="button" key={n} className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n}점`}>
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? "on" : ""}>
            ★
          </span>
        )
      )}
    </span>
  );
}
