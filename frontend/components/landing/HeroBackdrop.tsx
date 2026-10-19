/**
 * Hero background: a plain soft gradient (no JS). The 3D leaf is the hero's
 * visual, so there is no animated background behind it.
 */
export default function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_0%,rgb(var(--ag-leaf))_0%,rgb(var(--ag-canvas))_60%)]" />
      {/* Fade into the page so text below the fold sits on plain canvas */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}
