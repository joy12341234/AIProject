const STEPS = ["기획", "콘티", "촬영", "편집"];

function StatusChip({ health }) {
  if (!health) return <span className="chip chip-off">서버 꺼짐</span>;
  if (health.mock_mode) return <span className="chip chip-mock">목업 모드</span>;
  return <span className="chip chip-on">AI 연결됨</span>;
}

export default function Header({ step, health, onHome }) {
  return (
    <header className="header">
      <button className="logo" onClick={onHome}>
        <span className="logo-mark" />
        AI Video Director
      </button>

      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "active" : i < step ? "done" : ""}>
            <span className="dot">{i + 1}</span>
            <span className="label">{label}</span>
          </li>
        ))}
      </ol>

      <StatusChip health={health} />
    </header>
  );
}
