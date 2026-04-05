import { useLocation, Outlet } from 'react-router-dom';

/**
 * Re-mounts the outlet on each pathname so the enter animation runs on every in-app navigation.
 */
export default function PageTransition() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition-enter">
      <Outlet />
    </div>
  );
}
