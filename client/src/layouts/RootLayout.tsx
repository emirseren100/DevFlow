import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/login', label: 'Login', end: false },
  { to: '/register', label: 'Register', end: false },
  { to: '/app', label: 'App', end: false },
];

export default function RootLayout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__brand">DevFlow</span>
        <nav aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="layout__main">
        <Outlet />
      </main>

      <footer className="layout__footer">DevFlow — Phase 1 scaffolding</footer>
    </div>
  );
}
