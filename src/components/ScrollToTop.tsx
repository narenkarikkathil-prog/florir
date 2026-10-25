import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures the window scrolls to top on every route and query change,
 * preventing mobile and desktop viewports from retaining previous scroll positions.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname, search]);

  return null;
}
