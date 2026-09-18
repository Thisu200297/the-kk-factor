import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import ThemeToggle from '../common/ThemeToggle';
import SearchBar from '../News/SearchBar';
import SubscribeButton from '../Membership/SubscribeButton';
import { useAuth } from '../../hooks/useAuth';
import { SITE_NAME } from '../../utils/constants';
import { classNames } from '../../utils/format';

/**
 * The top bar. Every news section — Politics, Sports, Tech,
 * Entertainment — lives as a tab inside /news rather than crowding the top bar.
 */
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/show', label: 'The Show' },
  { to: '/about', label: 'About Roula' },
  { to: '/news', label: 'News' },
  { to: '/music', label: 'Music' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    classNames(
      'relative rounded-full px-3 py-1.5 text-[0.8125rem] font-medium tracking-[-0.01em] transition-colors duration-200',
      isActive ? 'text-fg' : 'text-fg-muted hover:text-fg'
    );

  return (
    <header
      className={classNames(
        'sticky top-0 z-50 border-b transition-all duration-300 ease-apple',
        scrolled ? 'glass border-line' : 'border-transparent bg-bg'
      )}
    >
      <div className="container-page flex h-14 items-center gap-3">
        {/* Wordmark */}
        {/*
          * `min-h-11` on the wordmark, not for looks: it measured 23px tall,
          * which is under the 24px WCAG asks of a target and well under what
          * a thumb actually wants. The bar is 56px, so the extra height costs
          * nothing visually and makes the most-pressed link on the site
          * comfortably hittable.
          */}
        <Link
          to="/"
          className="flex min-h-11 shrink-0 items-center gap-2"
          aria-label={`${SITE_NAME} home`}
        >
          {/*
            * The K off her logo, not the whole lockup. The full mark is
            * roughly 3:2, so inside a 56px bar it can only be about 36px wide
            * and the "The KK Factor" line under it stops being readable — a
            * logo too small to read is just a smudge. The K alone survives the
            * size, and it is pink in both themes, so it needs no dark variant.
            * The name stays live text beside it: selectable, translatable, and
            * it reflows instead of squashing.
            */}
          <img
            src="/kk-mark.png"
            alt=""
            width="357"
            height="406"
            className="h-6 w-auto"
            aria-hidden="true"
          />
          <span className="text-[0.9375rem] font-bold tracking-[-0.02em]">
            The <span className="text-primary">KK</span> Factor
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-px h-px rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden w-56 xl:block">
            <SearchBar compact />
          </div>

          <Link to="/search" className="btn-icon xl:hidden" aria-label="Search">
            <Icon name="search" size={19} />
          </Link>

          <ThemeToggle />

          {isAuthenticated ? (
            <div className="hidden items-center gap-1.5 md:flex">
              <SubscribeButton />
              {isAdmin && (
                <Link to="/admin" className="btn-secondary" title="Admin dashboard">
                  <Icon name="dashboard" size={16} />
                  <span className="hidden lg:inline">Admin</span>
                </Link>
              )}
              <Link to="/account" className="btn-ghost" title="Your account">
                <Icon name="settings" size={16} />
                <span className="hidden lg:inline">Account</span>
              </Link>
              <button type="button" onClick={handleLogout} className="btn-ghost" title="Sign out">
                <Icon name="logout" size={16} />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 md:flex">
              <Link to="/login" className="btn-secondary">Sign in</Link>
              <Link to="/register" className="btn-secondary">Sign up</Link>
              <SubscribeButton />
            </div>
          )}

          <button
            type="button"
            className="btn-icon lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={classNames(
          'overflow-hidden border-t border-line bg-surface transition-[max-height,opacity] duration-300 ease-apple lg:hidden',
          menuOpen ? 'max-h-[85vh] overflow-y-auto opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="container-page space-y-4 py-4">
          <SearchBar onNavigate={() => setMenuOpen(false)} />

          <nav className="grid gap-0.5" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  classNames(
                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors',
                    isActive ? 'bg-fill/[0.055] text-fg' : 'text-fg-muted hover:bg-fill/[0.04]'
                  )
                }
              >
                {link.label}
                <Icon name="chevron_right" size={16} className="opacity-40" />
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2 border-t border-line pt-4">
            <ThemeToggle withLabel />

            {isAuthenticated ? (
              <>
                <p className="px-1 text-xs text-fg-muted">
                  Signed in as <span className="text-fg">{user?.name}</span>
                </p>
                {isAdmin && (
                  <Link to="/admin" className="btn-secondary w-full">
                    <Icon name="dashboard" size={16} />
                    Admin dashboard
                  </Link>
                )}
                <Link to="/account" className="btn-secondary w-full">
                  <Icon name="settings" size={16} />
                  Your account
                </Link>
                <button type="button" onClick={handleLogout} className="btn-ghost w-full">
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn-secondary w-full">Sign in</Link>
                  <Link to="/register" className="btn-secondary w-full">Sign up</Link>
                </div>
                <SubscribeButton
                  className="btn-primary mt-2 w-full"
                  onNavigate={() => setMenuOpen(false)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
