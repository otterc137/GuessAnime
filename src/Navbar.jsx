import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/leaderboard', label: 'Leaderboard' },
  { path: '/support', label: 'Support Us' },
];

const SCROLL_THRESHOLD = 80;

export function Navbar() {
  const location = useLocation();
  const [navLinksVisible, setNavLinksVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < SCROLL_THRESHOLD) {
        setNavLinksVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setNavLinksVisible(false);
      } else {
        setNavLinksVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="navbar-wrapper">
      <div className="navbar-unit">
        <Link to="/" className="navbar-logo-pill" aria-label="ANIGUESS Home">
          <img src="/navbarlogo-aniguess.svg" alt="" className="navbar-logo-img" />
        </Link>

        <div className={`navbar-nav-pill ${navLinksVisible ? '' : 'navbar-nav-pill--collapsed'}`}>
          <nav id="navbar-links" className="navbar-links">
            {NAV_ITEMS.map((item) => (
              <span key={item.path} className="navbar-nav-item-wrap">
                <Link
                  to={item.path}
                  className={`navbar-link ${isActive(item.path) ? 'navbar-link--active' : ''}`}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <style>{`
        .navbar-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 16px 20px;
          z-index: 50;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          pointer-events: none;
        }
        .navbar-wrapper > * {
          pointer-events: auto;
        }

        .navbar-unit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          height: 44px;
          width: fit-content;
          max-width: 900px;
        }

        /* Logo - circular container */
        .navbar-logo-pill {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          overflow: hidden;
          text-decoration: none;
        }
        .navbar-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Nav pill - black container */
        .navbar-nav-pill {
          display: flex;
          align-items: center;
          height: 44px;
          padding: 0 6px;
          background: #111;
          border-radius: 9999px;
          overflow: hidden;
          max-width: 500px;
          opacity: 1;
          transform: scaleX(1);
          transform-origin: left center;
          filter: blur(0px);
          transition:
            opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
            filter 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .navbar-nav-pill--collapsed {
          opacity: 0;
          max-width: 0;
          min-width: 0;
          transform: scaleX(0);
          filter: blur(4px);
          padding: 0;
          pointer-events: none;
        }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .navbar-nav-item-wrap {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .navbar-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #fff;
          text-decoration: none;
          border-radius: 9999px;
          transition: color 0.15s;
        }
        .navbar-link:hover {
          color: #DEFF0A;
        }
        .navbar-link--active {
          background: #fff;
          color: #111;
        }
        .navbar-link--active:hover {
          background: #fff;
          color: #111;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .navbar-unit {
            gap: 0;
            justify-content: flex-start;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
            scrollbar-width: none;
          }
          .navbar-unit::-webkit-scrollbar {
            display: none;
          }
          .navbar-logo-pill {
            width: 40px;
            height: 40px;
            flex-shrink: 0;
          }
          .navbar-nav-pill {
            height: 40px;
            padding: 0 4px;
            flex-shrink: 0;
          }
          .navbar-link {
            font-size: 10px;
            padding: 6px 12px;
          }
        }
      `}</style>
    </header>
  );
}
