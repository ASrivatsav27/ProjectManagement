import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROLE_LABEL } from "@/api/types";
import { useAuth, useCurrentUser } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

export function AppShell() {
  const user = useCurrentUser();
  const { logout, hasRole } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation and on outside click.
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out");
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <button className="header-btn nav-toggle" onClick={() => setNavOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={navOpen}>
            <Icon name="menu" size={20} />
          </button>
          <Link to="/" className="brand" aria-label="Project Hub home">
            <Icon name="layers" size={28} />
            <span className="brand-name">Project Hub</span>
          </Link>
          <nav className={`header-nav${navOpen ? " open" : ""}`} aria-label="Main">
            <NavLink to="/" end>
              <Icon name="home" /> Dashboard
            </NavLink>
            <NavLink to="/projects">
              <Icon name="folder" /> Projects
            </NavLink>
            <NavLink to="/tasks">
              <Icon name="circle-dot" /> Tasks
            </NavLink>
            {hasRole("Admin") && (
              <NavLink to="/users">
                <Icon name="users" /> Users
              </NavLink>
            )}
          </nav>
          <div className="header-actions">
            <button className="header-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Toggle theme">
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <div className="menu" ref={menuRef}>
              <button className="header-btn avatar-btn" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <Avatar name={user.username} size={24} />
                <Icon name="chevron-down" size={12} />
              </button>
              {menuOpen && (
                <div className="menu-panel" role="menu">
                  <div className="menu-header">
                    Signed in as
                    <strong>{user.username}</strong>
                    <span className="muted small">{user.email}</span>
                    <span className="muted small">{ROLE_LABEL[user.role]}</span>
                  </div>
                  <button className="menu-item" role="menuitem" onClick={signOut}>
                    <Icon name="log-out" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer className="footer muted small">Project Hub · Project &amp; Team Management</footer>
    </div>
  );
}
