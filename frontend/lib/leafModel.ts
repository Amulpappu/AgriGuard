/**
 * In-browser AgriGuard leaf model (onnxruntime-web).
 *
 * Same model files as the Python backend (backend/app/ml/weights/):
 *   /models/agriguard-leaf-v2.onnx   MobileNetV2 + AgriGuard head (logits)
 *   /models/agriguard-leaf-v2.json   classes, crops, metrics
 *
 * Crops covered: see "crops" in the .json file. Crops in "crops_without_healthy_class"
 * (rice) have no healthy training photos: a clean leaf is judged by the colour screen
 * and a disease is only ever "possible".
 * Other crops get a leaf-only colour screen and never a guessed disease name.
 * Keep screenLeaf() in sync with backend/app/ml/leaf_screen.py.
 */
"use client";

const MODEL_URL = "/models/agriguard-leaf-v2.onnx";
const META_URL = "/models/agriguard-leaf-v2.json";
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export interface LeafScreen {
  is_leaf: boolean;
  green_frac: number;
  plant_frac: number; // incl. yellow-green leaves (rice, maize); only used to decide "is there a leaf"
  red_frac: number; // ripe red fruit (tomato, chilli, apple) - a fruit photo, not a leaf
  leaf_frac: number;
  lesion_pct: number | null;
}

export interface LeafPrediction {
  probs: { disease_slug: string; prob: number }[]; // sorted, within one crop
  crop: string | null; // null = crop not recognised / not covered
  autoDetected: boolean;
  screenOnly: boolean; // true = model does not cover this crop
  screen: LeafScreen;
  modelVersion: string;
}

interface Meta {
  version: string;
  classes: string[];
  crops: string[];
  crops_without_healthy_class?: string[];
  // Produce brain: identifies fruits / vegetables / tubers ("leaf" = send to the leaf AI) and their condition
  produce?: { identity_classes: string[]; conditions: string[]; output_identity: string; output_condition: string };
}

let sessionPromise: Promise<{ session: any; ort: any; meta: Meta }> | null = null;

async function loadModel() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort: any = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = "/ort/"; // copied by scripts/copy-ort.js (postinstall)
      ort.env.wasm.numThreads = 1;
      const [session, meta] = await Promise.all([
        ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] }),
        fetch(META_URL).then((r) => r.json()),
      ]);
      return { session, ort, meta };
    })();
    sessionPromise.catch(() => {
      sessionPromise = null; // allow retry after a network failure
    });
  }
  return sessionPromise;
}

/** Start downloading the model early (e.g. when the scan page opens). */
export function preloadLeafModel() {
  if (typeof window !== "undefined") loadModel().catch(() => undefined);
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function toTensorData(img: HTMLImageElement): Float32Array {
  const size = 224;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Resize shortest side to 256, then centre-crop 224 (same as the Python backend).
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const s = 256 / Math.min(w, h);
  const cw = size / s;
  const ch = size / s;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const out = new Float32Array(3 * size * size);
  for (let i = 0; i < size * size; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * size * size + i] = (px[i * 4 + c] / 255 - MEAN[c]) / STD[c];
    }
  }
  return out;
}

/** Leaf-only colour screen: background (soil, pots, concrete, night) is never counted. */
export function screenLeaf(img: HTMLImageElement): LeafScreen {
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const green = new Uint8Array(N * N);
  const sym = new Uint8Array(N * N);
  let greenCount = 0, plantCount = 0, redCount = 0;
  for (let i = 0; i < N * N; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const isGreen = g > r * 1.05 && g > b * 1.05 && g > 45 && sat > 0.15;
    if (r > 110 && r > g * 1.6 && r > b * 1.6 && sat > 0.45) redCount++;
    if (isGreen || (g >= r * 0.9 && g > b * 1.25 && g > 60 && sat > 0.2)) plantCount++;
    if (isGreen) {
      green[i] = 1;
      greenCount++;
      continue;
    }
    const yellow = r > 110 && g > 100 && b < 0.75 * g && Math.abs(r - g) < 60;
    const brown = r > 60 && r > g * 1.08 && g > b && mx < 200;
    const dead = mx < 70 && sat < 0.45;
    if (yellow || brown || dead) sym[i] = 1;
  }
  // Morphological closing (4 x dilate, 4 x erode) to fill spots inside the leaf.
  const step = (m: Uint8Array, dilate: boolean) => {
    const o = new Uint8Array(m);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const nb = [y > 0 ? m[i - N] : m[i], y < N - 1 ? m[i + N] : m[i], x > 0 ? m[i - 1] : m[i], x < N - 1 ? m[i + 1] : m[i]];
        o[i] = dilate ? (m[i] | nb[0] | nb[1] | nb[2] | nb[3]) : (m[i] & nb[0] & nb[1] & nb[2] & nb[3]);
      }
    }
    return o;
  };
  let leaf: Uint8Array = green;
  for (let k = 0; k < 4; k++) leaf = step(leaf, true);
  for (let k = 0; k < 4; k++) leaf = step(leaf, false);
  let leafPx = 0, lesionPx = 0;
  for (let i = 0; i < N * N; i++) {
    if (leaf[i]) {
      leafPx++;
      if (!green[i] && sym[i]) lesionPx++;
    }
  }
  const greenFrac = greenCount / (N * N);
  return {
    is_leaf: greenFrac >= 0.08 && leafPx >= 400,
    green_frac: Math.round(greenFrac * 1000) / 1000,
    plant_frac: Math.round((plantCount / (N * N)) * 1000) / 1000,
    red_frac: Math.round((redCount / (N * N)) * 1000) / 1000,
    leaf_frac: Math.round((leafPx / (N * N)) * 1000) / 1000,
    lesion_pct: leafPx ? Math.round((10000 * lesionPx) / leafPx) / 100 : null,
  };
}

/* ------------------------------------------------------------------ */
/* Photo check: is this a clean close-up of the crop only?            */
/* Runs BEFORE the AI. If a hand, gloves, paper or other objects are  */
/* in the photo, the app asks for a retake instead of diagnosing.     */
/* Keep in sync with backend/app/ml/leaf_screen.py (photo_check).     */
/* ------------------------------------------------------------------ */

export type PhotoIssue = "hand" | "objects" | "too_dark" | "too_bright" | "no_leaf" | "fruit";

export interface PhotoCheck {
  ok: boolean;
  issues: PhotoIssue[];
  stats: { skin: number; white: number; background: number; bg_std: number; brightness: number; green: number };
}

/**
 * For photos of fruits, tubers or vegetables (not leaves). The leaf AI cannot judge these,
 * so only the surface is checked: share of dark brown/black rot or spots inside the produce.
 * A colour check, not a diagnosis. Keep in sync with backend leaf_screen.surface_screen.
 */
export function surfaceScreen(img: HTMLImageElement): { produce_frac: number; blemish_pct: number | null } {
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const produce = new Uint8Array(N * N);
  const rot = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    // dark brown/black rot or spots (dark-red shadows between fruits are excluded)
    const isRot = mx > 25 && mx < 95 && g > r * 0.45 && r >= b && sat > 0.2;
    rot[i] = isRot ? 1 : 0;
    produce[i] = (sat > 0.22 && mx > 70) || isRot ? 1 : 0;
  }
  let region: Uint8Array = produce;
  for (let k = 0; k < 4; k++) region = morph(region, N, true);
  for (let k = 0; k < 4; k++) region = morph(region, N, false);
  let px = 0, bad = 0;
  for (let i = 0; i < N * N; i++) {
    if (region[i]) {
      px++;
      if (rot[i]) bad++;
    }
  }
  return {
    produce_frac: Math.round((px / (N * N)) * 1000) / 1000,
    blemish_pct: px ? Math.round((10000 * bad) / px) / 100 : null,
  };
}

function morph(m: Uint8Array, N: number, dilate: boolean): Uint8Array {
  const o = new Uint8Array(m);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const a = y > 0 ? m[i - N] : m[i];
      const b = y < N - 1 ? m[i + N] : m[i];
      const c = x > 0 ? m[i - 1] : m[i];
      const d = x < N - 1 ? m[i + 1] : m[i];
      o[i] = dilate ? (m[i] | a | b | c | d) : (m[i] & a & b & c & d);
    }
  }
  return o;
}

export function checkPhotoImage(img: HTMLImageElement): PhotoCheck {
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const P = N * N;
  const crop = new Uint8Array(P);
  const Y = new Float32Array(P);
  let cropCount = 0, greenCount = 0, sumY = 0;

  for (let i = 0; i < P; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;

    // Bare human skin detector
    const isSkin = yVal > 100 && cr > 140 && cr < 170 && cb > 85 && cb < 125 && sat > 0.12 && sat < 0.55 && r > 140;

    // Green foliage
    const isGreen = (g > r * 1.05 && g > b * 1.05 && g > 40 && sat > 0.12) || (g >= r * 0.88 && g > b * 1.2 && g > 50 && sat > 0.15);
    // Yellow chlorotic foliage (excluding bare skin)
    const isYellow = r > 80 && g > 75 && b < 0.85 * g && sat > 0.18 && !isSkin;
    // Brown necrotic/rust/blight foliage (excluding bare skin)
    const isBrown = r > 55 && r > g * 1.05 && g > b * 0.95 && sat > 0.12 && mx < 225 && !isSkin;
    // Fruit / vegetable / tuber tissue (excluding bare skin)
    const isFruit = r > 80 && r > g * 1.2 && r > b * 1.2 && sat > 0.25 && !isSkin;

    if (isGreen) greenCount++;
    if (isGreen || isYellow || isBrown || isFruit) {
      crop[i] = 1;
      cropCount++;
    }
    Y[i] = yVal;
    sumY += yVal;
  }

  // Crop region (+ a small margin) — everything else is "background"
  let near: Uint8Array = crop;
  for (let k = 0; k < 4; k++) near = morph(near, N, true);
  for (let k = 0; k < 4; k++) near = morph(near, N, false);
  for (let k = 0; k < 3; k++) near = morph(near, N, true);

  let bgPx = 0, skinPx = 0, whitePx = 0, bgSum = 0, bgSq = 0;
  for (let i = 0; i < P; i++) {
    if (near[i]) continue;
    bgPx++;
    bgSum += Y[i];
    bgSq += Y[i] * Y[i];
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;

    // bare human skin (hand / fingers / arm) in background
    if (Y[i] > 100 && cr > 140 && cr < 170 && cb > 85 && cb < 125 && sat > 0.12 && sat < 0.55 && r > 140) skinPx++;
    // very bright white/grey object (gloves, lab coat, paper, clipboard, tools)
    if (mx > 215 && sat < 0.1) whitePx++;
  }

  const skin = skinPx / P;
  const white = whitePx / P;
  const background = bgPx / P;
  const bgMean = bgPx ? bgSum / bgPx : 0;
  const bgStd = bgPx > 50 ? Math.sqrt(Math.max(0, bgSq / bgPx - bgMean * bgMean)) : 0;
  const brightness = sumY / P;
  const cropFrac = cropCount / P;
  const greenFrac = greenCount / P;

  const issues: PhotoIssue[] = [];
  // 1. Multiple objects / foreign items:
  if (skin > 0.05) issues.push("hand");
  const whiteShare = background > 0 ? white / background : 0;
  if (white > 0.04 && whiteShare > 0.15 && whiteShare < 0.85 && bgStd > 35) issues.push("objects");

  // 2. Crop did not cover correctly (empty scene, wall, or pitch black):
  if (cropFrac < 0.03) issues.push("no_leaf");
  if (brightness < 20) issues.push("too_dark");

  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    ok: issues.length === 0,
    issues,
    stats: { skin: r3(skin), white: r3(white), background: r3(background), bg_std: Math.round(bgStd), brightness: Math.round(brightness), green: r3(greenFrac) },
  };
}

/** Check a photo file before running the AI. */
export async function checkPhoto(file: File): Promise<PhotoCheck> {
  const img = await fileToImage(file);
  return checkPhotoImage(img);
}

function softmax(x: Float32Array | number[]): number[] {
  const arr = Array.from(x);
  const m = Math.max(...arr);
  const e = arr.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function screenOnly(crop: string | null, screen: LeafScreen, version: string, autoDetected: boolean): LeafPrediction {
  const c = crop || "unknown";
  let probs;
  if (screen.is_leaf && screen.lesion_pct !== null && screen.lesion_pct < 3) {
    probs = [
      { disease_slug: `${c}_healthy`, prob: 0.99 },
      { disease_slug: "__uncertain__", prob: 0.01 },
    ];
  } else {
    probs = [
      { disease_slug: "__uncertain__", prob: 0.5 },
      { disease_slug: `${c}_healthy`, prob: 0.5 },
    ];
  }
  return { probs, crop, autoDetected, screenOnly: true, screen, modelVersion: `${version}+colour-screen` };
}

/** Weak disease call on a clean leaf -> shift weight to healthy (99% Prime Vigor). */
function healthGuard(probs: { disease_slug: string; prob: number }[], screen: LeafScreen) {
  if (!probs.length || probs[0].disease_slug.includes("healthy")) return probs;
  const healthy = probs.find((p) => p.disease_slug.includes("healthy"));
  if (!healthy || screen.lesion_pct === null || !screen.is_leaf) return probs;
  if (probs[0].prob < 0.85 && screen.lesion_pct < 2.0) {
    return [
      { disease_slug: healthy.disease_slug, prob: 0.99 },
      ...probs
        .filter((p) => p.disease_slug !== healthy.disease_slug)
        .map((p) => ({ ...p, prob: Math.round((0.01 / probs.length) * 10000) / 10000 })),
    ].sort((a, b) => b.prob - a.prob);
  }
  return probs;
}

/**
 * Produce brain (fruits, vegetables, tubers). Compares the photo with reference photos learned in training:
 * which crop it is (potato, tomato, onion, ...) and its condition (fresh / rotten, and for potato
 * tubers: dry rot, common scab, blackleg, pink rot, black scurf).
 */
function produceBrain(out: any, meta: Meta, img: HTMLImageElement, screen: LeafScreen, crop: string | null) {
  const pm = meta.produce;
  if (!pm || !out[pm.output_identity] || !out[pm.output_condition]) return null;
  const pid = softmax(out[pm.output_identity].data as Float32Array);
  const pc = softmax(out[pm.output_condition].data as Float32Array);
  const ids = pm.identity_classes;
  const leafIdx = ids.indexOf("leaf");
  let best = -1;
  for (let i = 0; i < ids.length; i++) if (i !== leafIdx && (best < 0 || pid[i] > pid[best])) best = i;
  const detected = ids[best];
  const chosen = crop && ids.includes(crop) && crop !== "leaf" ? crop : detected;
  const allowed = chosen === "potato" ? pm.conditions : ["fresh", "rotten"];
  const total = allowed.reduce((a, c) => a + pc[pm.conditions.indexOf(c)], 0);
  const probs = allowed
    .map((c) => ({
      disease_slug: c === "fresh" ? `${chosen}_healthy` : c === "rotten" ? `${chosen}_rot` : c,
      prob: pc[pm.conditions.indexOf(c)] / total,
    }))
    .sort((a, b) => b.prob - a.prob);
  const surf = surfaceScreen(img);
  const prediction: LeafPrediction = {
    probs,
    crop: chosen,
    autoDetected: !crop,
    screenOnly: false,
    screen: { ...screen, lesion_pct: surf.blemish_pct },
    modelVersion: `${meta.version}+produce`,
  };
  return { leafProb: leafIdx >= 0 ? pid[leafIdx] : 0, idConf: pid[best], prediction };
}

export async function predictLeaf(file: File, cropSlug: string | null): Promise<LeafPrediction> {
  const img = await fileToImage(file);
  const screen = screenLeaf(img);
  const { session, ort, meta } = await loadModel();
  const crop = cropSlug && cropSlug !== "auto" ? cropSlug : null;

  const input = new ort.Tensor("float32", toTensorData(img), [1, 3, 224, 224]);
  const out = await session.run({ [session.inputNames[0]]: input });
  const p = softmax(out[session.outputNames[0]].data as Float32Array);
  const cls = meta.classes;

  // 1. Is this a leaf, or a fruit / vegetable / tuber?
  const notLeafPhoto =
    screen.plant_frac < 0.02 ||
    (screen.red_frac > 0.2 && screen.red_frac > screen.green_frac) || // mostly red fruit
    (!screen.is_leaf && screen.plant_frac < 0.08 && Math.max(...p) < 0.8);
  const produce = produceBrain(out, meta, img, screen, crop);
  if (produce && ((produce.leafProb < 0.5 && produce.idConf >= 0.6) || (notLeafPhoto && produce.idConf >= 0.5))) {
    return produce.prediction;
  }
  if (notLeafPhoto) {
    // neither a leaf nor a produce item the AI recognises (wall, soil, sky, ...)
    return { probs: [{ disease_slug: "__uncertain__", prob: 1 }], crop, autoDetected: !crop, screenOnly: false, screen, modelVersion: meta.version };
  }

  // 2. Leaf: crop not covered by the leaf AI -> colour screen only
  if (crop && !meta.crops.includes(crop)) return screenOnly(crop, screen, meta.version, false);

  // 3. Leaf disease AI
  let chosen = crop;
  if (!chosen) {
    let best = "";
    let bestScore = -1;
    for (const c of meta.crops) {
      const s = cls.reduce((acc, k, i) => (k.startsWith(c + "_") ? acc + p[i] : acc), 0);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    const otherIdx = cls.indexOf("other_leaf");
    const other = otherIdx >= 0 ? p[otherIdx] : 0;
    if (other > bestScore || bestScore < 0.5) return screenOnly(null, screen, meta.version, true);
    chosen = best;
  }

  const noHealthy = meta.crops_without_healthy_class || [];
  if (noHealthy.includes(chosen) && screen.is_leaf && (screen.lesion_pct ?? 0) < 1.5) {
    return screenOnly(chosen, screen, meta.version, !crop);
  }

  const idx = cls.map((k, i) => (k.startsWith(chosen + "_") ? i : -1)).filter((i) => i >= 0);
  const total = idx.reduce((a, i) => a + p[i], 0);
  let probs = idx
    .map((i) => ({ disease_slug: cls[i], prob: p[i] / total }))
    .sort((a, b) => b.prob - a.prob);
  probs = healthGuard(probs, screen);
  if (noHealthy.includes(chosen) && probs[0].prob > 0.79) {
    probs[0] = { ...probs[0], prob: 0.79 }; // never a confident claim without a healthy class
  }
  return { probs, crop: chosen, autoDetected: !crop, screenOnly: false, screen, modelVersion: meta.version };
}

/** Same thresholds as backend/app/services/confidence.py (CONF_CONFIDENT/POSSIBLE/MARGIN). */
export function evaluateConfidence(probs: { disease_slug: string; prob: number }[]) {
  if (!probs.length) return { status: "uncertain" as const, low: true, conf: 0, top: "__uncertain__" };
  const top = probs[0];
  const conf = Math.min(top.prob, 0.99);
  const margin = conf - (probs[1]?.prob ?? 0);
  if (top.disease_slug === "__uncertain__") return { status: "uncertain" as const, low: true, conf: 0, top: "__uncertain__" };
  const healthy = top.disease_slug.includes("healthy");
  if (conf >= 0.8 && margin >= 0.15) return { status: healthy ? ("healthy" as const) : ("potentially_diseased" as const), low: false, conf, top: top.disease_slug };
  if (conf >= 0.55 && margin >= 0.15) return { status: healthy ? ("healthy" as const) : ("potentially_diseased" as const), low: true, conf, top: top.disease_slug };
  return { status: "uncertain" as const, low: true, conf, top: "__uncertain__" };
}
