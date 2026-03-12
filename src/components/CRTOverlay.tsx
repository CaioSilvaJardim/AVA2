'use client';

export function CRTOverlay() {
  return (
    <>
      {/* Scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* Moving scanline */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-50 h-[2px] opacity-10"
        style={{
          background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
          animation: 'scanline 8s linear infinite',
          top: 0,
        }}
      />
    </>
  );
}
