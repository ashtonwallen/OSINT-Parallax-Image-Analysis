import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'Parallax — Open source image intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#121212',
        color: '#ededed',
        padding: '68px',
        fontFamily: 'sans-serif',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', color: '#94b7e5', fontSize: 38 }}>parallax.</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 74, letterSpacing: -4 }}>Open source</div>
        <div style={{ fontSize: 74, letterSpacing: -4, color: '#94b7e5' }}>image intelligence</div>
      </div>
      <div style={{ display: 'flex', fontSize: 19, color: '#b1b1b1', letterSpacing: 3 }}>
        METADATA / VISUAL CLUES / CHRONOLOCATION
      </div>
    </div>,
    size,
  );
}
