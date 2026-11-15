// 인터랙션 엔진: 부드러운 스크롤 · 마우스 변수 · 스크롤 진행도 · 등장 효과
import Lenis from "lenis";
import { useEffect, useRef } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lenis = null;

export function initFx() {
  const root = document.documentElement;

  // 휠 스크롤을 부드럽게 (움직임 줄이기 설정이면 끔)
  if (!reduced() && !lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // 마우스 위치(-1~1)와 페이지 스크롤 진행도를 CSS 변수로 기록
  let tx = 0, ty = 0, x = 0, y = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true }
  );
  const loop = () => {
    const ease = reduced() ? 1 : 0.07;
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    const max = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty("--mx", x.toFixed(4));
    root.style.setProperty("--my", y.toFixed(4));
    root.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : "0");
    requestAnimationFrame(loop);
  };
  loop();

  // data-reveal 요소가 화면에 들어오면 .in 추가 (새로 생긴 요소도 자동 감시)
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  const scan = () => document.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => io.observe(el));
  scan();
  new MutationObserver(scan).observe(document.getElementById("root"), { childList: true, subtree: true });
}

export function scrollToTop(smooth = false) {
  if (lenis) lenis.scrollTo(0, { immediate: !smooth });
  else window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

export function scrollToEl(el, offset = -100) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// 긴 섹션(고정 화면)을 지나가는 진행도 0~1을 --p로 기록하고 콜백으로도 전달
export function useScrollProgress(onProgress) {
  const ref = useRef(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    let id;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = Math.max(1, r.height - innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / span));
        el.style.setProperty("--p", p.toFixed(4));
        cb.current?.(p);
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);

  return ref;
}
