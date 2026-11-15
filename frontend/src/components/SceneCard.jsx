import { fmtTime } from "../api.js";

// 이야기에서 특히 중요한 컷은 빨간 점으로 강조
const HOT = new Set(["훅", "반전"]);

export default function SceneCard({ scene, image, format, onDraw, readOnly = false, last = false }) {
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
            {image.error}
            {!readOnly && (
              <button className="btn-mini" onClick={onDraw}>
                다시 시도
              </button>
            )}
          </div>
        )}
        {status === "idle" &&
          (readOnly ? (
            <div className="img-state">그림 없음</div>
          ) : (
            <button className="img-state" onClick={onDraw}>
              그림 그리기 +
            </button>
          ))}
        <span className="cut-badge">CUT {scene.scene_no}</span>
        {scene.beat && <span className={`beat-badge ${HOT.has(scene.beat) ? "hot" : ""}`}>{scene.beat}</span>}
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
        {scene.dialogue && <p className="dialogue"><span className="k">자막</span> “{scene.dialogue}”</p>}
        {scene.fun && <p className="fun"><span className="k">재미</span> {scene.fun}</p>}
        <p className="tip"><span className="k">촬영</span> {scene.shooting_tip}</p>
      </div>

      {scene.link && (
        <div className="link-row">
          <span className="link-arrow" aria-hidden="true">↳</span>
          <span>
            <b>{last ? "엔딩" : `CUT ${scene.scene_no + 1}로 연결`}</b> {scene.link}
          </span>
        </div>
      )}

      <div className="scene-foot">
        <span className="meta">
          {fmtTime(scene.duration_sec)} · {scene.transition}
        </span>
        {!readOnly && (
          <button className="btn-mini" onClick={onDraw} disabled={status === "loading"}>
            ↻ 다시 그리기
          </button>
        )}
      </div>
    </article>
  );
}
