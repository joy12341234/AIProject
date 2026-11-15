import { useEffect, useRef, useState } from "react";
import { getGallery } from "../api.js";
import FrameCard from "../components/FrameCard.jsx";
import PageHero, { CountUp, EmptyFrame, Marquee, pad } from "../components/PageHero.jsx";

function Figure({ label, value, decimals = 0, prefix = "", sub }) {
  return (
    <div className="figure">
      <span className="micro">{label}</span>
      <b>
        {prefix}
        {value == null ? "–" : <CountUp value={value} decimals={decimals} />}
      </b>
      {sub && <span className="meta">{sub}</span>}
    </div>
  );
}

// 인기 순위: 한 가지 색 막대 + 행에 올리면 마우스를 따라다니는 썸네일 미리보기
function RankList({ rows, onOpen }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.score));
  const cur = rows.find((r) => r.id === hover);

  function move(e) {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--px", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--py", `${e.clientY - r.top}px`);
  }

  return (
    <div className="rlist" ref={ref} onPointerMove={move} onPointerLeave={() => setHover(null)} role="table">
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="rrow"
          role="row"
          tabIndex={0}
          data-reveal
          data-cursor="VIEW"
          onPointerEnter={() => setHover(r.id)}
          onFocus={() => setHover(r.id)}
          onBlur={() => setHover(null)}
          onClick={() => onOpen(r.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(r.id)}
        >
          <span role="cell" className="rrow-no">{pad(i + 1)}</span>
          <span role="cell" className="rrow-title">
            <b>{r.title}</b>
            <span>
              ♥ {r.likes} · 사용 {r.uses} · 후기 {r.reviews}
            </span>
          </span>
          <span role="cell" className="rrow-track">
            <span className="rrow-bar" style={{ width: `${(r.score / max) * 100}%` }} />
          </span>
          <span role="cell" className="rrow-score">
            {r.score}
            <small>점</small>
          </span>
        </div>
      ))}
      <div className={`rprev ${cur?.thumb ? "on" : ""}`} aria-hidden="true">
        {cur?.thumb && <img src={cur.thumb} alt="" />}
      </div>
    </div>
  );
}

const FORMATS = [["all", "전체"], ["short", "숏폼 9:16"], ["long", "롱폼 16:9"]];
const SORTS = [["popular", "인기순"], ["recent", "최신순"]];

export default function Gallery({ onOpen, onCreate }) {
  const [sort, setSort] = useState("popular");
  const [format, setFormat] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    getGallery(sort, format)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sort, format]);

  const top = data ? [...data.items].sort((a, b) => b.score - a.score).filter((i) => i.score > 0).slice(0, 5) : [];

  return (
    <main className="gpage">
      <PageHero
        word="GALLERY"
        micro="Gallery — 사람들이 만든 콘티"
        title="콘티 갤러리"
        desc="다른 사람들이 AI로 만든 콘티를 구경하고, 마음에 드는 콘티로 바로 촬영해 보세요."
        hud={
          <>
            <span className="rec">
              <i />
              LIVE
            </span>
            <span>SHARED {pad(data?.total_projects ?? 0, 3)}</span>
            <span>REVIEWS {pad(data?.total_reviews ?? 0, 3)}</span>
          </>
        }
        action={
          <button className="btn-primary big" onClick={onCreate} data-cursor="NEW">
            + 내 콘티 만들기
          </button>
        }
      />
      <Marquee text="Shot on a phone — Directed with AI — " />

      <div className="page wide after-hero">
        {error && <div className="empty glass">{error}</div>}

        {data && (
          <>
            <section className="figures" data-reveal>
              <Figure label="공유된 콘티" value={data.total_projects} />
              <Figure label="촬영 후기" value={data.total_reviews} />
              <Figure label="평균 만족도" value={data.avg_rating} decimals={1} prefix="★ " sub="5점 만점" />
            </section>

            <section className="ranking">
              <div className="sec-head" data-reveal>
                <div>
                  <span className="micro">Ranking</span>
                  <h2>인기 콘티 TOP 5</h2>
                </div>
                <span className="muted small">인기 점수 = 좋아요 + 촬영 시작 × 2 + 촬영 후기 × 3</span>
              </div>
              {top.length ? (
                <RankList rows={top} onOpen={onOpen} />
              ) : (
                <p className="muted" data-reveal>
                  아직 반응을 받은 콘티가 없어요. 좋아요나 후기가 생기면 순위가 나타나요.
                </p>
              )}
            </section>

            <section className="collection">
              <div className="sec-head" data-reveal>
                <div>
                  <span className="micro">Collection</span>
                  <h2>모든 콘티</h2>
                </div>
                <div className="filter-row">
                  <div className="tabs" role="tablist" aria-label="형식">
                    {FORMATS.map(([v, l]) => (
                      <button key={v} role="tab" aria-selected={format === v} className={format === v ? "on" : ""} onClick={() => setFormat(v)}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="tabs" role="tablist" aria-label="정렬">
                    {SORTS.map(([v, l]) => (
                      <button key={v} role="tab" aria-selected={sort === v} className={sort === v ? "on" : ""} onClick={() => setSort(v)}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {data.items.length ? (
                <div className="fgrid">
                  {data.items.map((it, i) => (
                    <FrameCard key={it.id} item={it} index={i} onOpen={onOpen} />
                  ))}
                </div>
              ) : (
                <EmptyFrame
                  title="아직 공유된 콘티가 없어요"
                  desc="콘티를 만든 뒤 ‘갤러리에 공개’를 켜고 저장하면 여기에 나타나요."
                  action={
                    <button className="btn-primary" onClick={onCreate}>
                      첫 콘티 공유하기 ↗
                    </button>
                  }
                />
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
