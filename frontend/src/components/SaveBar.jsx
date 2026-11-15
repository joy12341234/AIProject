export default function SaveBar({ projectId, shared, setShared, onSave, saving, savedAt }) {
  const status = savedAt
    ? `저장됨 · ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
    : projectId
      ? "저장된 콘티"
      : "아직 저장 전";

  return (
    <div className="save-bar">
      <label className="switch">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        <span className="switch-ui" />
        갤러리에 공개
      </label>
      <span className="save-status">{status}</span>
      <button className="btn-ghost full" onClick={() => onSave()} disabled={saving}>
        {saving ? "저장 중..." : "저장하기"}
      </button>
    </div>
  );
}
