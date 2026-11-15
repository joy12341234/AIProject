import { fmtTime } from "../api.js";

// 컷 길이에 비례한 블록 타임라인
export default function Timeline({ scenes, total }) {
  return (
    <div className="timeline glass">
      <div className="timeline-head">
        <b>전체 타임라인</b>
        <span className="grad">({fmtTime(total)})</span>
      </div>
      <div className="timeline-bar">
        {scenes.map((s, i) => (
          <div
            key={s.scene_no}
            className="tl-block"
            style={{
              flexGrow: s.duration_sec,
              opacity: 0.55 + (0.45 * (i + 1)) / scenes.length,
            }}
            title={`${s.title} (${s.duration_sec}초)`}
          >
            <span className="tl-cut">CUT {s.scene_no}</span>
            <span className="tl-time">
              {fmtTime(s.duration_sec)}
              {s.beat ? ` · ${s.beat}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
