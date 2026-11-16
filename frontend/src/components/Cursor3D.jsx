import { useEffect, useRef } from "react";
import "./Cursor3D.css";

// On these elements the 3D cursor hides and the normal browser cursor shows.
const HIDE_SELECTOR =
  'a, button, [role="button"], summary, select, input, textarea, label[for], [contenteditable], [data-cursor="hide"]';

export default function Cursor3D() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    // Touch devices and reduced-motion users keep the normal cursor.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduced) return;

    const root = rootRef.current;
    const stage = stageRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    const dot = dotRef.current;

    const mouse = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    const last = { x: -100, y: -100 };
    let rx = -24;
    let ry = 32;
    let scale = 1;
    let targetScale = 1;
    let raf = 0;

    document.documentElement.classList.add("c3-on");

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!root.classList.contains("c3-visible")) {
        pos.x = last.x = mouse.x;
        pos.y = last.y = mouse.y;
        root.classList.add("c3-visible");
      }
    };
    const onLeave = () => root.classList.remove("c3-visible");
    const onEnter = () => root.classList.add("c3-visible");
    const onDown = () => { targetScale = 0.8; };
    const onUp = () => { targetScale = 1; };

    const onOver = (e) => {
      if (e.target.closest && e.target.closest(HIDE_SELECTOR)) {
        root.classList.add("c3-hide");
      }
    };
    const onOut = (e) => {
      const el = e.target.closest && e.target.closest(HIDE_SELECTOR);
      if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) {
        root.classList.remove("c3-hide");
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    const tick = () => {
      pos.x += (mouse.x - pos.x) * 0.16;
      pos.y += (mouse.y - pos.y) * 0.16;

      const vx = pos.x - last.x;
      const vy = pos.y - last.y;
      last.x = pos.x;
      last.y = pos.y;

      // Slow idle spin, plus extra spin in the direction of movement.
      rx += 0.35 - vy * 1.0;
      ry += 0.55 + vx * 1.0;
      scale += (targetScale - scale) * 0.18;

      stage.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`;
      outer.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      // Inner core counter-rotates for a layered 3D look.
      inner.style.transform = `rotateX(${-rx * 1.4}deg) rotateY(${-ry * 1.4}deg)`;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("c3-on");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  const faces = [0, 1, 2, 3, 4, 5].map((i) => <i className="c3-face" key={i} />);

  return (
    <div className="c3-root" ref={rootRef} aria-hidden="true">
      <div className="c3-stage" ref={stageRef}>
        <div className="c3-shadow" />
        <div className="c3-cube c3-outer" ref={outerRef}>{faces}</div>
        <div className="c3-cube c3-inner" ref={innerRef}>{faces}</div>
      </div>
      <div className="c3-dot" ref={dotRef} />
    </div>
  );
}
