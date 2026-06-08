/* Branded loading screen — the logo on its own cream plate colour (#FAF2EA),
   so the rounded-square logo blends into a single seamless surface. A gentle
   pulse, no spinner, no artificial delay. Used by app/loading.tsx (route
   transitions) and AppSplash (initial load). Server-safe (no client hooks). */

export const BRAND_CREAM = '#FAF2EA'

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: BRAND_CREAM, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOGO_Timebank_Academy.png"
        alt="TimeBank Academy"
        width={168}
        height={168}
        style={{ width: 168, height: 168, animation: 'tb-logo-pulse 1.6s ease-in-out infinite' }}
      />
      <style>{`@keyframes tb-logo-pulse{0%,100%{opacity:.6;transform:scale(.97)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
