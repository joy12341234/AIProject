import { useEffect, useRef, useState } from "react";

const pad = (n, len = 2) => String(n).padStart(len, "0");
export { pad };

// 메인 히어로와 같은 뷰파인더 헤더: 큰 단어 + 마우스를 따라오는 십자선, 스크롤하면 단어가 천천히 밀려남
export default function PageHero({ word, micro, title, desc, hud, action }) {
  const ref = useRef(null);
  const readout = useRef(null);

  useEffect(() => {
    let id;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--o", Math.min(1, Math.max(0, -r.top / r.height)).toFixed(4));
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);

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
    <section className="phero" ref={ref} onPointerMove={move}>
      <div className="phero-word" aria-hidden="true">
        {word}
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
      <div className="phero-hud" aria-hidden="true">
        {hud}
      </div>
      <div className="phero-row">
        <div className="phero-copy">
          <span className="micro">{micro}</span>
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

// 화면에 보이면 0부터 목표 숫자까지 올라가는 숫자
export function CountUp({ value, decimals = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof value !== "number") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let id;
    let start;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const run = (t) => {
        start ??= t;
        const k = Math.min(1, (t - start) / 1200);
        setShown(value * (1 - Math.pow(1 - k, 3)));
        if (k < 1) id = requestAnimationFrame(run);
      };
      id = requestAnimationFrame(run);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(id);
    };
  }, [value]);

  return <span ref={ref}>{typeof value === "number" ? shown.toFixed(decimals) : value}</span>;
}

// 휠을 내리면 옆으로 흘러가는 큰 글자 띠
export function Marquee({ text }) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-inner">
        <div className="marquee-track">
          {[0, 1, 2, 3].map((i) => (
            <span key={i}>{text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 촬영 대기 화면처럼 보이는 빈 상태
export function EmptyFrame({ title, desc, action, label = "STANDBY" }) {
  return (
    <div className="empty-frame" data-reveal>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      <span className="rec">
        <i />
        {label}
      </span>
      <h3>{title}</h3>
      <p className="muted">{desc}</p>
      {action}
    </div>
  );
}
