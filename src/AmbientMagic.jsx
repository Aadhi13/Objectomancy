import React, { useMemo } from 'react';
import './AmbientMagic.css';

export default function AmbientMagic() {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const left = `${Math.random() * 100}%`;
      const top = `${Math.random() * 100}%`;
      const animationDelay = `${Math.random() * 5}s`;
      const animationDuration = `${4 + Math.random() * 6}s`;
      const scale = 0.3 + Math.random() * 0.8;
      
      return { id: i, left, top, animationDelay, animationDuration, scale };
    });
  }, []);

  return (
    <div className="ambient-magic-container">
      {particles.map(p => (
        <div 
          key={p.id} 
          className="magic-mote" 
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
            transform: `scale(${p.scale})`
          }}
        />
      ))}
    </div>
  );
}
