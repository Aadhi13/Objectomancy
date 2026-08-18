import { useState, useCallback } from 'react';
import { SPELLS } from './spells';

export function useHunt() {
  const [isActive, setIsActive] = useState(false);
  const [targets, setTargets] = useState([]);
  const [discoveredInHunt, setDiscoveredInHunt] = useState([]);

  const startHunt = useCallback(() => {
    // Curated demo-friendly set
    const demoPool = ['bottle', 'cup', 'book', 'cell phone', 'laptop', 'backpack'];
    const validPool = demoPool.filter(id => SPELLS[id]);
    
    // Pick 5 random items from validPool
    const shuffled = [...validPool].sort(() => 0.5 - Math.random());
    setTargets(shuffled.slice(0, 5));
    setDiscoveredInHunt([]);
    setIsActive(true);
  }, []);

  const cancelHunt = useCallback(() => {
    setIsActive(false);
    setTargets([]);
    setDiscoveredInHunt([]);
  }, []);

  const handleDiscovery = useCallback((classId) => {
    setDiscoveredInHunt(prev => {
      if (isActive && targets.includes(classId) && !prev.includes(classId)) {
        return [...prev, classId];
      }
      return prev;
    });
  }, [isActive, targets]);

  const isComplete = isActive && targets.length > 0 && discoveredInHunt.length === targets.length;

  return { isActive, targets, discoveredInHunt, startHunt, cancelHunt, handleDiscovery, isComplete };
}
