import React, { useMemo } from 'react';
import './AmbientMagic.css';

const RUNE_CHARS = ['ᛗ', 'ᚢ', 'ᛈ', 'ᛋ', 'ᛟ', 'ᛒ', 'ᚺ', 'ᚱ', 'ᚷ', 'ᚦ', 'ᚼ', 'ᛖ'];

export default function AmbientMagic() {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const left = `${Math.random() * 100}%`;
      const top = `${Math.random() * 100}%`;
      const animationDelay = `${Math.random() * 5}s`;
      const animationDuration = `${4 + Math.random() * 6}s`;
      const scale = 0.3 + Math.random() * 0.8;
      
      return { id: `p-${i}`, left, top, animationDelay, animationDuration, scale };
    });
  }, []);

  const runes = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const left = `${Math.random() * 100}%`;
      const top = `${Math.random() * 100}%`;
      const animationDelay = `${Math.random() * 10}s`;
      const animationDuration = `${8 + Math.random() * 10}s`;
      const char = RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)];
      
      return { id: `r-${i}`, left, top, animationDelay, animationDuration, char };
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
      
      {runes.map(r => (
        <div 
          key={r.id} 
          className="ambient-rune" 
          style={{
            left: r.left,
            top: r.top,
            animationDelay: r.animationDelay,
            animationDuration: r.animationDuration
          }}
        >
          {r.char}
        </div>
      ))}
    </div>
  );
}
