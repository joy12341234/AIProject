import { timeAgo } from "../api.js";
import { pad } from "./PageHero.jsx";

// 갤러리·내 콘티 공용 카드: 마우스 방향으로 살짝 기울고, 올리면 뷰파인더 모서리와 컬러가 살아남
export default function FrameCard({ item, index, onOpen, cursor = "VIEW", children }) {
  function tilt(e) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }
  function reset(e) {
    e.currentTarget.style.setProperty("--tx", "0");
    e.currentTarget.style.setProperty("--ty", "0");
  }

  return (
    <article className="fcard" data-reveal style={{ "--d": index % 4 }}>
      <div
        className="fcard-media"
        role="button"
        tabIndex={0}
        data-cursor={cursor}
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(item.id)}
        onPointerMove={tilt}
        onPointerLeave={reset}
      >
        <div className="fcard-img">
          {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : <span className="micro">No image</span>}
        </div>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <span className="fcard-no">No. {pad(index + 1)}</span>
        <span className="fcard-fmt">{item.format === "short" ? "숏폼 9:16" : "롱폼 16:9"}</span>
        <div className="fcard-cap">
          <b>{item.title}</b>
          <span>{item.topic}</span>
        </div>
      </div>
      <div className="fcard-meta">
        <span title="좋아요">♥ {item.likes}</span>
        <span title="이 콘티로 촬영 시작">사용 {item.uses}</span>
        <span title="촬영 후기">후기 {item.reviews}</span>
        {item.avg_rating && <span title="평균 만족도">★ {item.avg_rating}</span>}
        <span className="fcard-time">{timeAgo(item.created_at)}</span>
      </div>
      {children}
    </article>
  );
}
