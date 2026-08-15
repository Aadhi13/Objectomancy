import { useState, useCallback } from 'react';

export function useGrimoire() {
  const [discovered, setDiscovered] = useState(() => {
    try {
      const stored = localStorage.getItem('objectomancy_grimoire');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const discover = useCallback((className) => {
    setDiscovered(prev => {
      if (!prev.includes(className)) {
        const next = [...prev, className];
        localStorage.setItem('objectomancy_grimoire', JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, []);

  return { discovered, discover };
}
