import { fmtTime } from "../api.js";

export default function SceneCard({ scene, image, format, onDraw }) {
  const status = image?.status ?? "idle";
  const vertical = format === "short";

  return (
    <article className="scene-card glass">
      <div className={`scene-img ${vertical ? "v" : "h"}`}>
        {status === "done" && <img src={image.url} alt={scene.title} />}
        {status === "loading" && (
          <div className="img-state">
            <span className="spinner" />
            그리는 중...
          </div>
        )}
        {status === "error" && (
          <div className="img-state err">
            ⚠️ {image.error}
            <button className="btn-mini" onClick={onDraw}>다시 시도</button>
          </div>
        )}
        {status === "idle" && (
          <button className="img-state" onClick={onDraw}>
            🎨 그림 그리기
          </button>
        )}
        <span className="cut-badge">CUT {scene.scene_no}</span>
        <span className="time-badge">
          {fmtTime(scene.start_sec)}–{fmtTime(scene.end_sec)}
        </span>
      </div>

      <div className="scene-body">
        <div className="badges">
          <span>{scene.shot_size}</span>
          <span>{scene.angle}</span>
          <span>{scene.camera_move}</span>
        </div>
        <h4>{scene.title}</h4>
        <p className="desc">{scene.description}</p>
        {scene.dialogue && <p className="dialogue">💬 “{scene.dialogue}”</p>}
        <p className="tip">📱 {scene.shooting_tip}</p>
      </div>

      <div className="scene-foot">
        <span className="meta">
          ⏱ {fmtTime(scene.duration_sec)} · {scene.transition}
        </span>
        <button className="btn-mini" onClick={onDraw} disabled={status === "loading"}>
          ↻ 다시 그리기
        </button>
      </div>
    </article>
  );
}
