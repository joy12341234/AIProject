import { useEffect, useRef } from "react";

const HOVER = "a, button, label, select, [role='button'], [data-cursor], .clickable";

// 배경색을 반전시키는 원형 커서: 평소엔 작은 점, 누를 수 있는 요소 위에선 커짐
export default function Cursor() {
  const ref = useRef(null);
  const dotRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    let x = -100, y = -100, tx = -100, ty = -100;
    let s = 0.2, ts = 0.2;
    let id;

    const move = (e) => {
      if (!ref.current) return;
      tx = e.clientX;
      ty = e.clientY;
      ref.current.style.opacity = 1;
    };
    const over = (e) => {
      if (!ref.current || !labelRef.current) return;
      const t = e.target.closest?.(HOVER);
      const field = e.target.closest?.("input, textarea");
      const label = t?.dataset?.cursor ?? "";
      labelRef.current.textContent = label;
      if (field) ts = 0.12;
      else if (t && !t.disabled) ts = label ? 1.7 : 1;
      else ts = 0.2;
      ref.current.dataset.state = field ? "text" : t && !t.disabled ? "hover" : "";
    };
    const leave = () => ref.current && (ref.current.style.opacity = 0);
    const down = () => (ts *= 0.75);
    const up = (e) => over(e);

    const loop = () => {
      if (!ref.current || !dotRef.current) return;
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      s += (ts - s) * 0.18;
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      dotRef.current.style.transform = `scale(${s})`;
      id = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("pointerleave", leave);
    loop();

    return () => {
      cancelAnimationFrame(id);
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="cursor" ref={ref} aria-hidden="true">
      <div className="cursor-dot" ref={dotRef}>
        <span className="cursor-label" ref={labelRef} />
      </div>
    </div>
  );
}
