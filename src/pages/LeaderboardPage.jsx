import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopScores } from '../supabase';

export function LeaderboardPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopScores(10).then((data) => {
      setScores(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-lb">
      <div className="page-lb-inner">
        <h1 className="page-lb-title">LEADERBOARD</h1>
        <p className="page-lb-sub">Top scores this week</p>

        {loading ? (
          <div className="page-lb-list page-lb-list--skeleton">
            {Array.from({ length: 10 }).map((_, i) => (
              <div className="page-lb-row page-lb-row--skeleton" key={i}>
                <span className="page-lb-rank page-lb-skeleton" />
                <div className="page-lb-avatar page-lb-skeleton page-lb-skeleton--circle" />
                <span className="page-lb-name page-lb-skeleton page-lb-skeleton--text" />
                <span className="page-lb-score page-lb-skeleton page-lb-skeleton--score" />
              </div>
            ))}
          </div>
        ) : scores.length === 0 ? (
          <p className="page-lb-empty">No scores yet. Be the first!</p>
        ) : (
          <div className="page-lb-list">
            {scores.map((entry, i) => (
              <div className="page-lb-row" key={entry.id}>
                <span className="page-lb-rank">#{i + 1}</span>
                <div className="page-lb-avatar">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" />
                  ) : (
                    <span>{(entry.name || 'A').trim().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="page-lb-name">{entry.name || 'Anonymous'}</span>
                <span className="page-lb-score">{(entry.score ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/" className="btn btn-go btn-shimmer page-lb-cta" style={{ '--bg': 'rgba(220, 242, 74, 1)' }}>
          <div className="btn-shimmer-edge">
            <div className="btn-shimmer-spark" />
          </div>
          <div className="btn-shimmer-fill shimmer-highlight" />
          <span>Claim the Throne</span>
        </Link>
      </div>

      <style>{`
        .page-lb {
          width: 100%;
          min-height: 100vh;
          padding: 24px 16px 48px 16px;
          background: #F5F5F0;
          font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }
        .page-lb-inner {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }
        .page-lb-title {
          font-family: 'Gasoek', 'Vina Sans', Impact, sans-serif;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #111;
          margin-bottom: 0;
          text-align: center;
        }
        .page-lb-sub {
          font-size: 14px;
          color: #666;
          margin-top: 16px;
          margin-bottom: 24px;
          text-align: center;
        }
        .page-lb-loading,
        .page-lb-empty {
          text-align: center;
          padding: 48px 16px;
          color: #999;
          font-size: 14px;
        }
        .page-lb-skeleton {
          display: block;
          background: linear-gradient(
            90deg,
            rgba(0,0,0,0.06) 0%,
            rgba(0,0,0,0.12) 50%,
            rgba(0,0,0,0.06) 100%
          );
          background-size: 200% 100%;
          animation: page-lb-skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: 6px;
        }
        .page-lb-skeleton--circle {
          border-radius: 50%;
        }
        .page-lb-skeleton--text {
          flex: 1;
          min-width: 80px;
          max-width: 140px;
          height: 14px;
        }
        .page-lb-skeleton--score {
          width: 48px;
          height: 14px;
        }
        .page-lb-row--skeleton .page-lb-rank.page-lb-skeleton {
          width: 28px;
          height: 12px;
          flex-shrink: 0;
        }
        @keyframes page-lb-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .page-lb-list {
          width: 100%;
          align-self: stretch;
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          overflow: hidden;
          margin-bottom: 16px;
        }
        .page-lb-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .page-lb-row:last-child {
          border-bottom: none;
        }
        .page-lb-rank {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          color: #bbb;
          width: 36px;
          flex-shrink: 0;
        }
        .page-lb-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: #666;
          flex-shrink: 0;
        }
        .page-lb-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .page-lb-name {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .page-lb-score {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #111;
          flex-shrink: 0;
        }
        .page-lb-cta { display: flex; width: 100%; max-width: 100%; min-width: 0; align-self: stretch; text-decoration: none; box-sizing: border-box; }
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
      `}</style>
    </div>
  );
}
