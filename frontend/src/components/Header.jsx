const STEPS = ["기획", "콘티", "촬영", "편집"];
const NAV = [
  ["create", "만들기"],
  ["gallery", "갤러리"],
  ["my", "내 콘티"],
];

function Status({ health }) {
  const [cls, text] = !health ? ["off", "Offline"] : health.mock_mode ? ["mock", "Mock mode"] : ["on", "AI online"];
  return (
    <span className={`status ${cls}`} title={!health ? "백엔드 서버가 꺼져 있어요" : health.mock_mode ? "목업 모드 (API 미사용)" : "실제 AI 연결됨"}>
      <i />
      {text}
    </span>
  );
}

export default function Header({ view, onNav, stage, canStage, onStage, showSteps, health, onHome }) {
  return (
    <header className="header">
      <button className="logo" onClick={onHome} data-cursor="HOME">
        <span className="logo-mark" />
        <span className="logo-text">AI Video Director</span>
      </button>

      <nav className="nav">
        {NAV.map(([v, label]) => (
          <button
            key={v}
            className={view === v || (v === "gallery" && view === "detail") ? "on" : ""}
            onClick={() => onNav(v)}
          >
            {label}
          </button>
        ))}
      </nav>

      {showSteps ? (
        <ol className="stepper">
          {STEPS.map((label, i) => (
            <li key={label} className={i === stage ? "active" : i < stage ? "done" : ""}>
              <button disabled={!canStage(i)} onClick={() => onStage(i)}>
                <span className="dot">{String(i + 1).padStart(2, "0")}</span>
                <span className="label">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <span className="header-spacer" />
      )}

      <Status health={health} />
      <span className="scroll-line" aria-hidden="true" />
    </header>
  );
}
