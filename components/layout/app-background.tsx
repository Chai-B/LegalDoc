export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(0,122,255,0.16),transparent_28rem),radial-gradient(circle_at_82%_8%,rgba(73,214,200,0.11),transparent_24rem),linear-gradient(180deg,#080808_0%,#0b0b0d_46%,#080808_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:64px_64px] opacity-70" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.045] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(8,8,8,0.48)_82%)]" />
    </div>
  )
}
