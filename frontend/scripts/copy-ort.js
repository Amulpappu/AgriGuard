// Copies the onnxruntime-web WebAssembly runtime into public/ort so the leaf model
// runs without any third-party CDN (works on the laptop server and on Vercel).
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "node_modules", "onnxruntime-web", "dist");
const dst = path.join(__dirname, "..", "public", "ort");
fs.mkdirSync(dst, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log("onnxruntime-web runtime copied to public/ort");
