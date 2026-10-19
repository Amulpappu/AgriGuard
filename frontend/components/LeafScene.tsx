"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  /** Called after the first frame is drawn, so the static poster can fade out. */
  onReady?: () => void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Procedural 3D leaf for the landing hero (no model files).
 * Fills its parent. Scroll drives a slow turn; as "How it works" (#how) comes into
 * view a scan line sweeps the leaf and early disease spots fade in, to suggest
 * the AI check. Rendering pauses while the hero is off screen.
 * Only loaded on tablet/desktop with motion allowed (see HeroLeaf).
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
      return; // no WebGL: the SVG poster simply stays
    }
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    R.outputColorSpace = THREE.SRGBColorSpace;
    const S = new THREE.Scene();
    const C = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    C.position.set(0, 0, 9.5);

    function tex(spots: boolean) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 1024;
      const x = c.getContext("2d")!;
      if (!spots) {
        // AgriGuard greens around primary #2E7D32
        const g = x.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, "#5FA357");
        g.addColorStop(0.5, "#2E7D32");
        g.addColorStop(1, "#1D4F20");
        x.fillStyle = g;
        x.fillRect(0, 0, 512, 1024);
        x.strokeStyle = "rgba(230,239,224,.6)";
        x.lineWidth = 7;
        x.beginPath(); x.moveTo(256, 0); x.lineTo(256, 1024); x.stroke();
        x.lineWidth = 2.5;
        x.strokeStyle = "rgba(230,239,224,.38)";
        for (let i = 0; i < 14; i++) {
          const y = 90 + i * 66;
          x.beginPath();
          x.moveTo(256, y); x.quadraticCurveTo(170, y - 30, 70, y - 110);
          x.moveTo(256, y); x.quadraticCurveTo(342, y - 30, 442, y - 110);
          x.stroke();
        }
      } else {
        [[170,380,34],[330,520,26],[220,640,20],[300,300,16],[200,820,28],[310,760,14]].forEach((p) => {
          const g = x.createRadialGradient(p[0], p[1], 2, p[0], p[1], p[2] * 1.8);
          g.addColorStop(0, "rgba(70,32,10,.95)");
          g.addColorStop(0.55, "rgba(120,70,20,.75)");
          g.addColorStop(1, "rgba(233,162,59,0)");
          x.fillStyle = g;
          x.beginPath(); x.arc(p[0], p[1], p[2] * 1.8, 0, 7); x.fill();
        });
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
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
    const leafMat = new THREE.MeshStandardMaterial({ map: tex(false), roughness: 0.55, side: THREE.DoubleSide });
    const lesionMat = new THREE.MeshStandardMaterial({
      map: tex(true), transparent: true, opacity: 0, roughness: 0.8, side: THREE.DoubleSide,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const leaf = new THREE.Mesh(G, leafMat);
    const lesion = new THREE.Mesh(G, lesionMat);
    // Scan line: pale leaf-green so it reads over the dark leaf and stays quiet on the cream page
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xf1f7ee, transparent: true, opacity: 0, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.045), beamMat);
    const grp = new THREE.Group();
    grp.add(leaf, lesion, beam);
    beam.position.z = 0.6;
    S.add(grp);
    // Daylight: bright sky, warm cream bounce from the page, soft key light
    S.add(new THREE.HemisphereLight(0xffffff, 0xd9d2bf, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); S.add(key);
    const fill = new THREE.DirectionalLight(0xe6efe0, 0.5); fill.position.set(-4, 1, 2); S.add(fill);

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

    let mx = 0, my = 0, smx = 0, smy = 0, p = 0, q = 0, raf = 0, visible = true, readySent = false;
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove, { passive: true });

    const hero = cv.closest("section");
    const how = document.getElementById("how");

    const frame = () => {
      raf = 0;
      // p: how far the hero has scrolled away (0 → 1)
      let tp = 0;
      if (hero) { const r = hero.getBoundingClientRect(); tp = clamp01(-r.top / (r.height * 0.9)); }
      // q: how far "How it works" has come into view (0 → 1)
      let tq = 0;
      // Completes over the first ~45% of the viewport so the sweep finishes while the leaf is still in view
      if (how) { const r = how.getBoundingClientRect(); tq = clamp01((window.innerHeight - r.top) / (window.innerHeight * 0.45)); }
      p += (tp - p) * 0.08;
      q += (tq - q) * 0.08;
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;

      // Slow, subtle turn: under one radian across the whole hero scroll
      const sway = Math.sin(performance.now() / 2800) * 0.04;
      grp.rotation.set(-0.3 + smy * 0.2 + p * 0.35, -0.6 + smx * 0.35 + p * 0.9 + sway, 0.25 - p * 0.2);

      // AI check: one sweep of the scan line, spots appear behind it
      const sweep = smooth(0.15, 0.85, q);
      beam.position.y = 2.1 - sweep * 4.3;
      beamMat.opacity = q > 0.12 && q < 0.9 ? 0.85 * Math.sin(Math.PI * sweep) : 0;
      lesionMat.opacity = smooth(0.35, 0.8, q);

      R.render(S, C);
      if (!readySent) { readySent = true; onReady?.(); }
      if (visible) raf = requestAnimationFrame(frame);
    };

    // Stop drawing while the hero is off screen (battery, cheap GPUs)
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
      G.dispose(); leafMat.map?.dispose(); lesionMat.map?.dispose();
      leafMat.dispose(); lesionMat.dispose(); beamMat.dispose(); beam.geometry.dispose();
      R.dispose();
    };
  }, [onReady]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
