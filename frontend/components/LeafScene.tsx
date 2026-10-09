"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Procedural 3D leaf that reacts to the pointer and to scroll progress through
 * the #lp-story section. No external model files. Falls back silently if WebGL
 * is unavailable (the page adds a CSS gradient instead).
 */
export default function LeafScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let R: THREE.WebGLRenderer;
    try {
      R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch {
      document.documentElement.classList.add("lp-nogl");
      return;
    }
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const S = new THREE.Scene();
    const C = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    C.position.set(0, 0, 9);

    function tex(spots: boolean) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 1024;
      const x = c.getContext("2d")!;
      if (!spots) {
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
      } else {
        [[170,380,34],[330,520,26],[220,640,20],[300,300,16],[200,820,28],[310,760,14]].forEach((p) => {
          const g = x.createRadialGradient(p[0], p[1], 2, p[0], p[1], p[2] * 1.8);
          g.addColorStop(0, "rgba(70,32,10,.95)");
          g.addColorStop(0.55, "rgba(120,70,20,.75)");
          g.addColorStop(1, "rgba(200,170,40,0)");
          x.fillStyle = g;
          x.beginPath(); x.arc(p[0], p[1], p[2] * 1.8, 0, 7); x.fill();
        });
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
    const leafMat = new THREE.MeshStandardMaterial({ map: tex(false), roughness: 0.5, side: THREE.DoubleSide });
    const lesionMat = new THREE.MeshStandardMaterial({
      map: tex(true), transparent: true, opacity: 0, roughness: 0.8, side: THREE.DoubleSide,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const leaf = new THREE.Mesh(G, leafMat);
    const lesion = new THREE.Mesh(G, lesionMat);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x3ea094, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.035), beamMat);
    const grp = new THREE.Group();
    grp.add(leaf, lesion);
    S.add(grp, beam);
    S.add(new THREE.HemisphereLight(0xeaf4e6, 0x14151d, 0.85));
    const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(3, 4, 5); S.add(d);
    const rim = new THREE.DirectionalLight(0x3ea094, 1.2); rim.position.set(-4, 1, -3); S.add(rim);

    const size = () => {
      R.setSize(window.innerWidth, window.innerHeight, false);
      C.aspect = window.innerWidth / window.innerHeight;
      C.updateProjectionMatrix();
    };
    window.addEventListener("resize", size);
    size();

    let mx = 0, my = 0, smx = 0, smy = 0, p = 0, raf = 0;
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    const ss = (a: number, b: number, v: number) => { v = Math.max(0, Math.min(1, (v - a) / (b - a))); return v * v * (3 - 2 * v); };

    const frame = () => {
      const st = document.getElementById("lp-story");
      let tp = 0;
      if (st) {
        const r = st.getBoundingClientRect();
        tp = Math.max(0, Math.min(1, -r.top / (r.height - window.innerHeight)));
      }
      p += (tp - p) * (reduce ? 1 : 0.08);
      smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
      const wide = window.innerWidth > 760;
      const tx = wide ? (1 - ss(0, 0.25, p) * 0.55) * 2.3 : 0;
      const after = ss(0.92, 1, p);
      grp.position.x += (tx - grp.position.x) * 0.08;
      grp.position.y = (wide ? 0 : 1.1) - after * 3;
      const sc = wide ? 1 : 0.8;
      grp.scale.setScalar(sc);
      grp.rotation.set(-0.35 + smy * 0.3 + p * 0.5, -0.7 + smx * 0.5 + p * Math.PI * 1.1, 0.28 - p * 0.25);
      if (!reduce) grp.rotation.y += Math.sin(performance.now() / 2600) * 0.05;
      lesionMat.opacity = ss(0.38, 0.58, p);
      beam.position.set(grp.position.x, (-2 + ss(0.3, 0.75, p) * 4.2) * sc * 0.9 + grp.position.y, 0.6);
      beamMat.opacity = p > 0.3 && p < 0.78 ? 0.9 * Math.sin(Math.PI * ss(0.3, 0.78, p)) : 0;
      R.render(S, C);

      const idx = p < 0.34 ? 0 : p < 0.7 ? 1 : 2;
      document.querySelectorAll<HTMLElement>(".lp-step").forEach((el, i) => {
        const on = i === idx;
        el.style.opacity = on ? "1" : "0";
        el.style.transform = on ? "none" : "translateY(14px)";
        el.style.pointerEvents = on ? "auto" : "none";
      });
      const bar = document.getElementById("lp-bar");
      if (bar) bar.style.height = `${p * 100}%`;
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      G.dispose(); leafMat.map?.dispose(); lesionMat.map?.dispose();
      leafMat.dispose(); lesionMat.dispose(); beamMat.dispose();
      R.dispose();
    };
  }, []);

  return <canvas id="lp-gl" ref={ref} aria-hidden="true" />;
}
