export default function MoonlitGameFrame() {
  return <iframe
    src="/apps/moonlit-immortal-chronicle/index.html"
    title="月下问仙录 · 文字修仙模拟器"
    allow="autoplay; fullscreen"
    style={{ display: "block", width: "100%", height: "calc(100dvh - 64px)", minHeight: "760px", border: 0, background: "#081117" }}
  />;
}
