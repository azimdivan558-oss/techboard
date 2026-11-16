import { useEffect, useRef } from "react";
import "./Cursor3D.css";

// On these elements the 3D cursor hides and the normal browser cursor shows.
const HIDE_SELECTOR =
  'a, button, [role="button"], summary, select, input, textarea, label[for], [contenteditable], [data-cursor="hide"]';

// ---- Real-time lighting -------------------------------------------------
// Light comes from the top-left, towards the viewer (x right, y down, z out).
const LIGHT = (() => {
  const v = [-0.5, -0.7, 0.85];
  const len = Math.hypot(...v);
  return v.map((n) => n / len);
})();
// Face normals in the same order as the .c3-face nth-child rules in the CSS.
const NORMALS = [
  [0, 0, 1],   // front
  [0, 0, -1],  // back
  [1, 0, 0],   // right
  [-1, 0, 0],  // left
  [0, -1, 0],  // top
  [0, 1, 0],   // bottom
];

// Rotates each face normal by rotateX(rxDeg) rotateY(ryDeg) and writes how
// much light it receives (0..1) into the --l CSS variable of that face.
function shade(faces, rxDeg, ryDeg) {
  const a = (rxDeg * Math.PI) / 180;
  const b = (ryDeg * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);
  for (let i = 0; i < 6; i++) {
    const [x, y, z] = NORMALS[i];
    const x1 = x * cb + z * sb;
    const z1 = -x * sb + z * cb;
    const y2 = y * ca - z1 * sa;
    const z2 = y * sa + z1 * ca;
    const d = x1 * LIGHT[0] + y2 * LIGHT[1] + z2 * LIGHT[2];
    faces[i].style.setProperty("--l", Math.max(0, d).toFixed(3));
  }
}

export default function Cursor3D() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const orbitRef = useRef(null);
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
    const orbit = orbitRef.current;
    const dot = dotRef.current;
    const outerFaces = Array.from(outer.children);
    const innerFaces = Array.from(inner.children);

    const mouse = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    const last = { x: -100, y: -100 };
    let rx = -24;
    let ry = 32;
    let spin = 0;
    let energy = 0;
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
    const onDown = () => {
      targetScale = 0.8;
      // Click pulse: an expanding square shockwave.
      const p = document.createElement("i");
      p.className = "c3-pulse";
      stage.appendChild(p);
      p.addEventListener("animationend", () => p.remove());
    };
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

      // 0..1 "how fast is the cursor moving" -> drives glow, shadow, orbit.
      const speed = Math.hypot(vx, vy);
      energy += (Math.min(speed / 14, 1) - energy) * 0.12;
      spin += 2 + energy * 7;
      root.style.setProperty("--e", energy.toFixed(3));

      const irx = -rx * 1.4;
      const iry = -ry * 1.4;

      stage.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`;
      outer.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      // Inner core counter-rotates for a layered 3D look.
      inner.style.transform = `rotateX(${irx}deg) rotateY(${iry}deg)`;
      orbit.style.transform = `rotateX(68deg) rotateY(${ry * 0.1}deg) rotateZ(${spin}deg)`;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;

      shade(outerFaces, rx, ry);
      shade(innerFaces, irx, iry);

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
        <div className="c3-glow" />
        <div className="c3-orbit" ref={orbitRef}><i className="c3-sat" /></div>
        <div className="c3-cube c3-outer" ref={outerRef}>{faces}</div>
        <div className="c3-cube c3-inner" ref={innerRef}>{faces}</div>
      </div>
      <div className="c3-dot" ref={dotRef} />
    </div>
  );
}
