"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  /** Called after the first frame is drawn, so the static leaf image can fade out. */
  onReady?: () => void;
}

/**
 * The original AgriGuard 3D leaf (procedural, no model files), unchanged in shape,
 * texture, lighting and resting pose. public/images/hero-leaf.webp is a snapshot
 * of this exact render at rest, used on phones and with reduced motion.
 *
 * Here the leaf only breathes (slow idle sway) and leans toward the pointer.
 * Scroll rotation and fade are applied by HeroLeaf on the wrapper.
 * Rendering pauses while the leaf is off screen.
 */
export default function LeafScene({ onReady }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const host = cv?.parentElement;
    if (!cv || !host) return;
    let R: THREE.WebGLRenderer;
    try {
      R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // no WebGL: the leaf image simply stays
    }
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const S = new THREE.Scene();
    const C = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    C.position.set(0, 0, 9);

    function tex() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 1024;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, 0, 1024);
      g.addColorStop(0, "#5E8F3A");
      g.addColorStop(0.5, "#3E7A32");
      g.addColorStop(1, "#2B5A28");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 1024);
      x.strokeStyle = "rgba(200,230,150,.55)";
      x.lineWidth = 7;
      x.beginPath(); x.moveTo(256, 0); x.lineTo(256, 1024); x.stroke();
      x.lineWidth = 2.5;
      for (let i = 0; i < 14; i++) {
        const y = 90 + i * 66;
        x.beginPath();
        x.moveTo(256, y); x.quadraticCurveTo(170, y - 30, 70, y - 110);
        x.moveTo(256, y); x.quadraticCurveTo(342, y - 30, 442, y - 110);
        x.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }

    function geometry() {
      const nu = 36, nv = 60, pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.78)), 0.9) * 1.15;
        for (let i = 0; i <= nu; i++) {
          const u = (i / nu) * 2 - 1;
          const x = u * w, y = v * 4.4 - 2.2;
          const z = 0.32 * u * u * (1 - v * 0.5) + 0.18 * Math.sin(v * 3.2) + 0.05 * Math.sin(u * 9 + v * 6) * w;
          pos.push(x, y, z);
          uv.push(u * 0.5 + 0.5, v);
        }
      }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    const G = geometry();
    const leafMat = new THREE.MeshStandardMaterial({ map: tex(), roughness: 0.5, side: THREE.DoubleSide });
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(G, leafMat));
    S.add(grp);
    S.add(new THREE.HemisphereLight(0xeaf4e6, 0x14151d, 0.85));
    const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(3, 4, 5); S.add(d);
    const rim = new THREE.DirectionalLight(0x3ea094, 1.2); rim.position.set(-4, 1, -3); S.add(rim);

    const size = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      R.setSize(w, h, false);
      C.aspect = w / h;
      C.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size);
    ro.observe(host);
    size();

    let mx = 0, my = 0, smx = 0, smy = 0, raf = 0, visible = true, readySent = false;
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove, { passive: true });

    const frame = () => {
      raf = 0;
      smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
      // Original resting pose; the leaf leans a little toward the pointer and sways slowly
      grp.rotation.set(-0.35 + smy * 0.3, -0.7 + smx * 0.5 + Math.sin(performance.now() / 2600) * 0.05, 0.28);
      R.render(S, C);
      if (!readySent) { readySent = true; onReady?.(); }
      if (visible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(host);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      G.dispose(); leafMat.map?.dispose(); leafMat.dispose();
      R.dispose();
    };
  }, [onReady]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
