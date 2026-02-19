import { Link } from 'react-router-dom';

// Replace with your Ko-fi username (from ko-fi.com/yourusername)
const KO_FI_USERNAME = import.meta.env.VITE_KO_FI_USERNAME || '';

export function SupportUsPage() {
  return (
    <div className="page-support">
      <div className="page-support-inner">
        <div className="page-support-hero-wrap">
          <img src="/support-hero.png" alt="" className="page-support-hero" />
        </div>
        <h1 className="page-support-title">SUPPORT US</h1>
        <p className="page-support-desc">
          Having fun? Pass it along to a friend if you feel like it!
        </p>
        <div className="page-support-actions">
          <a
            href="https://twitter.com/intent/tweet?text=Just%20played%20ANIGUESS°%20—%20Guess%20the%20anime!%20%F0%9F%8E%AE%20https%3A%2F%2Fguessthisanime.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-go btn-shimmer page-support-btn page-support-btn--primary"
            style={{ '--bg': 'rgba(220, 242, 74, 1)' }}
          >
            <div className="btn-shimmer-edge">
              <div className="btn-shimmer-spark" />
            </div>
            <div className="btn-shimmer-fill shimmer-highlight" />
            <span>Share ♥</span>
          </a>
          <a
            href={
              KO_FI_USERNAME
                ? `https://ko-fi.com/${KO_FI_USERNAME}?utm_source=aniguess&utm_medium=web`
                : 'https://ko-fi.com'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="page-support-btn page-support-btn--outline"
          >
            Buy Pochita a bread
          </a>
        </div>
      </div>

      <style>{`
        .page-support {
          min-height: calc(100vh - 120px);
          padding: 24px 16px;
          background: #F5F5F0;
          font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .page-support-inner {
          max-width: 420px;
          margin: 0 auto;
          text-align: center;
        }
        .page-support-hero-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
          perspective: 600px;
        }
        .page-support-hero {
          width: 200px;
          height: 200px;
          object-fit: cover;
          border-radius: 20px;
          border: 4px solid #fff;
          box-shadow:
            0 4px 16px rgba(0,0,0,0.12),
            0 1px 4px rgba(0,0,0,0.08),
            0 0 0 1px rgba(0,0,0,0.04);
          transform: rotate(-2deg);
          transition:
            transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.3s ease;
          cursor: pointer;
        }
        .page-support-hero:hover {
          transform: rotate(1deg) scale(1.06) translateY(-4px);
          box-shadow:
            0 12px 32px rgba(0,0,0,0.16),
            0 4px 12px rgba(0,0,0,0.1),
            0 0 0 1px rgba(0,0,0,0.04);
        }
        .page-support-hero:active {
          transform: rotate(0deg) scale(0.97);
          transition-duration: 0.1s;
        }
        @media (min-width: 640px) {
          .page-support-hero {
            width: 240px;
            height: 240px;
            border-radius: 24px;
          }
        }
        .page-support-title {
          font-family: 'Gasoek', 'Vina Sans', Impact, sans-serif;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #111;
          margin-bottom: 16px;
        }
        .page-support-desc {
          font-size: 15px;
          line-height: 1.6;
          color: #555;
          margin-bottom: 32px;
        }
        .page-support-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .page-support-btn { display: block; width: 100%; text-decoration: none; box-sizing: border-box; }
        .page-support-btn--primary { /* uses btn-shimmer styles */ }
        .btn { font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .btn-go { width: 100%; box-sizing: border-box; padding: 16px 56px; font-size: 14px; font-weight: 600; color: #111; background: var(--bg, #DEFF0A); border: none; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.1em; transition: background 0.2s ease, color 0.2s ease; }
        .btn-go:hover { background: #111; color: #DEFF0A; }
        .btn-go:active { opacity: 0.9; }
        .btn-shimmer { position: relative; z-index: 0; overflow: hidden; background: var(--bg, #DEFF0A) !important; border: 2px solid #A8C200; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
        .btn-shimmer .btn-shimmer-edge { position: absolute; inset: 0; z-index: -30; overflow: hidden; border-radius: 9999px; filter: blur(2px); }
        .btn-shimmer .btn-shimmer-spark { position: absolute; inset: -100%; background: conic-gradient(from 225deg, transparent 0deg, rgba(255,255,220,0.95) 90deg, transparent 90deg); animation: spin-around 4s infinite linear; }
        .btn-shimmer .btn-shimmer-fill { position: absolute; top: 0; left: 0; right: 2px; bottom: 2px; border-radius: 9999px; background: var(--bg, #DEFF0A); z-index: -20; }
        .shimmer-highlight { box-shadow: inset 0 -8px 10px rgba(0,0,0,0.06); }
        .btn-shimmer:hover .shimmer-highlight { box-shadow: inset 0 -6px 10px rgba(0,0,0,0.1); }
        .btn-shimmer span { position: relative; z-index: 1; color: #111; text-align: center; }
        .btn-shimmer:hover { color: #111; transform: scale(1.06); box-shadow: 0 6px 20px rgba(0,0,0,0.12); border-color: #A8C200; }
        .btn-shimmer:hover .btn-shimmer-fill { background: rgba(220, 242, 74, 1); }
        @keyframes spin-around { to { transform: rotate(360deg); } }
        .page-support-btn--outline {
          background: transparent;
          color: #111;
          border: 1.5px solid #111;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-align: center;
          padding: 16px 24px;
          border-radius: 9999px;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .page-support-btn--outline:hover {
          background: rgba(0,0,0,0.06);
          color: #111;
        }
        .page-support-btn--outline {
          background: transparent;
          color: #111;
          border: 1.5px solid #111;
        }
        .page-support-btn--outline:hover {
          background: rgba(0,0,0,0.06);
          color: #111;
        }
      `}</style>
    </div>
  );
}
