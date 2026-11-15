import { useEffect, useRef, useState } from "react";
import { getGallery } from "../api.js";
import { scrollToTop, useScrollProgress } from "../fx.js";

const pad = (n) => String(n).padStart(2, "0");

const STEPS = [
  { no: "01", en: "Plan", ko: "기획", title: "주제 한 줄이면 기획안 3개", desc: "숏폼·롱폼 규칙에 맞춰 훅, 구성, 타깃까지 서로 다른 방향의 기획안을 제안합니다." },
  { no: "02", en: "Storyboard", ko: "콘티", title: "컷마다 그림과 구도까지", desc: "장면·샷 크기·앵글·대사를 컷 단위로 나누고, 컷마다 스케치 콘티를 그려 드려요." },
  { no: "03", en: "Shoot", ko: "촬영", title: "같은 장소끼리 묶어서 촬영", desc: "인원·장비·장소에 맞춰 촬영 순서와 폰 위치, 컷별 체크리스트를 안내합니다." },
  { no: "04", en: "Edit", ko: "편집", title: "자막 파일까지 한 번에", desc: "컷별 편집·전환·자막 위치, 업로드용 제목·해시태그와 SRT 자막 파일까지 만들어 드려요." },
];

const TRENDS = [
  { name: "POV 상황극", desc: "1인칭 시점과 공감 상황으로 댓글·공유가 많은 포맷", meta: "15–30초" },
  { name: "Before / After 전환", desc: "확실한 변화를 한 번의 전환으로 보여주는 포맷", meta: "10–20초" },
  { name: "3초 컷 브이로그", desc: "짧은 컷을 빠르게 이어 붙여 지루할 틈이 없는 포맷", meta: "15–30초" },
];

const WORDS = [
  "훅", "클로즈업", "로우앵글", "POV", "트래킹", "9:16",
  "자막", "풀샷", "점프컷", "하이앵글", "리액션", "패닝",
  "와이드샷", "전환", "16:9", "인서트", "줌 인", "엔딩",
  "오버더숄더", "템포", "구도", "B-roll", "조명", "동선",
  "타임라인", "페이드", "썸네일", "탑뷰", "컷", "해시태그",
];

// ---------- 히어로: 카메라 뷰파인더 ----------
function Hero({ children }) {
  const ref = useRef(null);
  const readout = useRef(null);
  const tc = useRef(null);

  useEffect(() => {
    const start = performance.now();
    let id;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const s = Math.floor(t);
      if (!tc.current) return;
      tc.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(Math.floor((t % 1) * 24))}`;
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);

  // 마우스를 따라 십자선·초점 박스가 움직임
  function move(e) {
    if (!ref.current || !readout.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    ref.current.style.setProperty("--hx", `${x}px`);
    ref.current.style.setProperty("--hy", `${y}px`);
    readout.current.textContent = `X ${(x / r.width).toFixed(2)}  Y ${(y / r.height).toFixed(2)}`;
  }

  return (
    <section className="hero" ref={ref} onPointerMove={move}>
      <div className="hero-mark" aria-hidden="true">
        DIRECTOR
      </div>
      <div className="vf" aria-hidden="true">
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <span className="vf-line x" />
        <span className="vf-line y" />
        <span className="vf-focus" />
        <span className="vf-readout" ref={readout}>
          X 0.50 Y 0.50
        </span>
      </div>
      <div className="vf-hud" aria-hidden="true">
        <span className="rec">
          <i />
          REC
        </span>
        <span className="tc" ref={tc}>
          00:00:00:00
        </span>
        <span>4K · 24FPS</span>
      </div>
      {children}
      <span className="scroll-hint">Scroll to discover</span>
    </section>
  );
}

// ---------- 스크롤하면 커지면서 색이 살아나는 이미지 ----------
function Inset() {
  const ref = useScrollProgress();
  return (
    <section className="inset" ref={ref}>
      <div className="inset-sticky">
        <div className="inset-media">
          <img src="/hero.jpg" alt="가족이 셀카봉과 삼각대로 함께 영상을 찍는 모습" />
        </div>
        <div className="inset-caption">
          <span className="micro">For everyone</span>
          <h2>
            폰 하나로,
            <br />
            누구나 감독이 됩니다.
          </h2>
        </div>
      </div>
    </section>
  );
}

// ---------- 단계별 미니 화면 ----------
function Visual({ idx }) {
  return (
    <div className="frame">
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />

      <div className={`viz viz-plan ${idx === 0 ? "on" : ""}`}>
        {["POV 상황극", "감성 브이로그", "꿀팁 정리"].map((t, i) => (
          <div key={t} className="paper" style={{ "--i": i }}>
            <span className="micro">기획 0{i + 1}</span>
            <b>{t}</b>
            <i />
            <i />
            <i className="short" />
          </div>
        ))}
      </div>

      <div className={`viz viz-board ${idx === 1 ? "on" : ""}`}>
        {["CLOSE-UP", "MEDIUM", "WIDE", "LOW ANGLE", "POV", "FULL"].map((t, i) => (
          <div key={t} className="cell" style={{ "--i": i }}>
            <span className="sketch" />
            <span className="micro">
              CUT {pad(i + 1)} · {t}
            </span>
          </div>
        ))}
      </div>

      <div className={`viz viz-shoot ${idx === 2 ? "on" : ""}`}>
        <div className="phone">
          <span className="thirds" />
          <span className="focus" />
          <span className="micro">REC · 9:16</span>
        </div>
        <ul className="checks">
          {["폰 높이: 눈높이보다 살짝 위", "삼각대 1m 거리", "역광 피하기", "같은 장소 컷 묶기"].map((c, i) => (
            <li key={c} style={{ "--i": i }}>
              <i />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className={`viz viz-edit ${idx === 3 ? "on" : ""}`}>
        {[
          ["V1", [3, 2, 4, 2, 3, 4]],
          ["T1", [3, 0, 4, 0, 3, 0]],
          ["A1", [18]],
        ].map(([name, blocks]) => (
          <div key={name} className="track">
            <span className="micro">{name}</span>
            <div className="lane">
              {blocks.map((w, i) => (
                <span key={i} className={w ? "blk" : "gap"} style={{ flexGrow: w || 2 }} />
              ))}
            </div>
          </div>
        ))}
        <span className="playhead" />
      </div>
    </div>
  );
}

// ---------- 휠을 내리면 단계가 바뀌는 고정 화면 ----------
function Process() {
  const [idx, setIdx] = useState(0);
  const tc = useRef(null);
  const ref = useScrollProgress((p) => {
    const i = Math.min(3, Math.floor(p * 4));
    setIdx(i);
    ref.current?.style.setProperty("--q", Math.min(1, p * 4 - i).toFixed(4));
    if (tc.current) {
      const t = p * 60;
      tc.current.textContent = `00:00:${pad(Math.floor(t))}:${pad(Math.floor((t % 1) * 24))}`;
    }
  });

  return (
    <section className="process" ref={ref}>
      <div className="process-sticky">
        <div className="process-top">
          <span className="micro">How it works</span>
          <span className="micro" ref={tc}>
            00:00:00:00
          </span>
        </div>

        <div className="process-grid">
          <div className="process-left">
            <ol className="process-index">
              {STEPS.map((s, i) => (
                <li key={s.no} className={i === idx ? "on" : i < idx ? "past" : ""}>
                  {s.no} {s.ko}
                </li>
              ))}
            </ol>
            <div className="process-words" aria-live="polite">
              {STEPS.map((s, i) => (
                <h2 key={s.en} className={i === idx ? "on" : i < idx ? "past" : ""}>
                  {s.en}
                </h2>
              ))}
            </div>
            <div className="process-copy">
              {STEPS.map((s, i) => (
                <div key={s.no} className={i === idx ? "on" : ""}>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <Visual idx={idx} />
        </div>

        <div className="process-bar">
          <span />
        </div>
      </div>
    </section>
  );
}

// ---------- 스크롤·마우스에 따라 회전하는 3D 단어 필드 ----------
function WordField() {
  const ref = useScrollProgress();
  return (
    <section className="wfield" ref={ref}>
      <div className="wfield-sticky">
        <div className="wfield-plane" aria-hidden="true">
          {WORDS.map((w, i) => (
            <span key={w} style={{ "--x": i % 6, "--y": Math.floor(i / 6), "--z": (i * 7) % 5 }}>
              {w}
            </span>
          ))}
        </div>
        <div className="wfield-copy">
          <span className="micro">Every cut has a reason</span>
          <h2>
            모든 컷에는
            <br />
            이유가 있습니다.
          </h2>
          <p>샷 크기, 앵글, 카메라 움직임, 자막 위치까지. AI 감독이 컷마다 왜 그렇게 찍는지 설명해 드려요.</p>
        </div>
      </div>
    </section>
  );
}

// ---------- 갤러리 미리보기 ----------
function Showcase({ onOpen, onGallery }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getGallery("popular", "all")
      .then((d) => setItems(d.items.slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="showcase">
      <div className="sec-head" data-reveal>
        <div>
          <span className="micro">From the gallery</span>
          <h2>사람들이 만든 콘티</h2>
        </div>
        <button className="btn-ghost" onClick={onGallery} data-cursor="VIEW">
          갤러리 전체 보기 ↗
        </button>
      </div>
      {items?.length ? (
        <div className="sc-grid">
          {items.map((it, i) => (
            <article key={it.id} className="sc-card" data-reveal data-cursor="VIEW" onClick={() => onOpen(it.id)}>
              <div className="sc-media">{it.thumb ? <img src={it.thumb} alt="" loading="lazy" /> : null}</div>
              <div className="sc-label">
                <b>{it.title}</b>
                <span className="micro">
                  ♥ {it.likes} · 후기 {it.reviews}
                </span>
              </div>
              <span className="sc-count">
                PT — {pad(i + 1)} / {pad(items.length)}
              </span>
            </article>
          ))}
        </div>
      ) : (
        items && (
          <p className="muted" data-reveal>
            아직 공유된 콘티가 없어요. 첫 번째 콘티의 주인공이 되어 보세요.
          </p>
        )
      )}
    </section>
  );
}

export default function Home({ topic, setTopic, format, setFormat, style, setStyle, onStart, loading, onGallery, onOpen }) {
  const inputRef = useRef(null);
  const canStart = topic.trim().length >= 2 && !loading;

  function focusStart() {
    scrollToTop(true);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 700);
  }

  return (
    <main className="landing">
      <Hero>
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="micro">AI Video Director — 숏폼 · 롱폼 제작 도우미</span>
            <h1 className="display">
              아이디어를 장면으로,
              <br />
              장면을 영상으로.
            </h1>
          </div>

          <div className="hero-side">
            <p className="lead">
              기획부터 콘티, 촬영 구도, 편집까지.
              <br />
              처음 만드는 영상도 AI 감독이 함께합니다.
            </p>
            <div className="starter">
              <label className="micro" htmlFor="topic">
                어떤 영상을 만들고 싶나요?
              </label>
              <textarea
                id="topic"
                ref={inputRef}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 친구들과 제주도 여행 브이로그"
                maxLength={300}
                rows={2}
              />
              {style && (
                <div className="style-tag">
                  참고 포맷 · <b>{style}</b>
                  <button onClick={() => setStyle(null)} aria-label="포맷 해제">
                    ✕
                  </button>
                </div>
              )}
              <div className="starter-row">
                <div className="seg">
                  <button className={format === "short" ? "on" : ""} onClick={() => setFormat("short")}>
                    숏폼 <small>9:16</small>
                  </button>
                  <button className={format === "long" ? "on" : ""} onClick={() => setFormat("long")}>
                    롱폼 <small>16:9</small>
                  </button>
                </div>
                <button className="btn-primary" disabled={!canStart} onClick={onStart} data-cursor="START">
                  {loading ? "생성 중..." : "시작하기 ↗"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Hero>

      <Inset />
      <Process />
      <WordField />

      <section className="formats">
        <div className="sec-head" data-reveal>
          <div>
            <span className="micro">Trending formats</span>
            <h2>요즘 반응 좋은 포맷</h2>
          </div>
          <span className="micro">01 — 03</span>
        </div>
        {TRENDS.map((t, i) => (
          <article
            key={t.name}
            className="f-row"
            data-reveal
            data-cursor="선택"
            onClick={() => {
              setStyle(t.name);
              setFormat("short");
              focusStart();
            }}
          >
            <span className="f-no">{pad(i + 1)}</span>
            <h3>{t.name}</h3>
            <div className="f-meta">
              <span className="micro">{t.meta} · 9:16</span>
              <p>{t.desc}</p>
            </div>
            <span className="f-go">이 포맷으로 만들기 ↗</span>
          </article>
        ))}
      </section>

      <Showcase onOpen={onOpen} onGallery={onGallery} />

      <section className="cta">
        <span className="micro">Ready</span>
        <h2 className="cta-word">Action.</h2>
        <button className="btn-primary big" onClick={focusStart} data-cursor="START">
          첫 콘티 만들기 ↗
        </button>
      </section>

      <footer className="footer">
        <span className="micro">© 2026 AI Video Director</span>
        <span className="micro">동양미래대학교 · 인공지능프로젝트</span>
        <a className="micro" href="https://github.com/joy12341234/AIProject" target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </footer>
    </main>
  );
}
