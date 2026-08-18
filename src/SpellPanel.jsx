import React, { useState, useRef, useEffect } from 'react';
import { playSpellChime } from './audio';
import './SpellPanel.css';

export default function SpellPanel({ detection, spell, onCast }) {
  const [isCasting, setIsCasting] = useState(false);
  const panelRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(280);

  useEffect(() => {
    if (!panelRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect.height > 0) {
          // add padding to measured content box height
          setPanelHeight(entry.contentRect.height + 40);
        }
      }
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  if (!detection || !spell) return null;

  const handleCast = () => {
    if (isCasting) return;
    setIsCasting(true);
    playSpellChime();
    if (onCast) onCast();
    
    // Reset casting state after animation
    setTimeout(() => {
      setIsCasting(false);
    }, 1500);
  };

  // Calculate viewport-aware placement
  const panelWidth = 280;
  const padding = 20;

  const vW = window.innerWidth;
  const vH = window.innerHeight;

  const targetX = detection.x + detection.width / 2;
  const targetBottom = detection.y + detection.height;
  const targetTop = detection.y;

  // Clamp X
  let left = targetX;
  const halfW = panelWidth / 2;
  if (left - halfW < padding) left = padding + halfW;
  if (left + halfW > vW - padding) left = vW - padding - halfW;

  // Vertical placement
  let top;
  let isAbove = false;
  const spaceBelow = vH - targetBottom;
  const spaceAbove = targetTop;

  if (spaceBelow >= panelHeight + padding) {
    // Fits perfectly below
    top = targetBottom + 20;
  } else if (spaceAbove >= panelHeight + padding) {
    // Fits perfectly above
    top = targetTop - panelHeight - 20;
    isAbove = true;
  } else {
    // Screen is too small, keep it in view based on largest space
    if (spaceBelow > spaceAbove) {
      top = vH - panelHeight - padding;
    } else {
      top = padding;
      isAbove = true;
    }
  }

  const panelStyle = {
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translateX(-50%)',
    transformOrigin: isAbove ? 'bottom center' : 'top center',
    '--spell-color': spell.color || 'var(--color-gold-accent)'
  };
  
  // Tether connector line pointing back to the actual object center X
  const dx = targetX - left;
  const tetherStyle = {
    position: 'absolute',
    width: '2px',
    height: '20px',
    left: `calc(50% + ${dx}px)`,
    background: isAbove 
      ? 'linear-gradient(to top, var(--spell-color), transparent)' 
      : 'linear-gradient(to bottom, var(--spell-color), transparent)',
    top: isAbove ? '100%' : '-20px',
    opacity: 0.5,
    pointerEvents: 'none'
  };

  return (
    <div ref={panelRef} className={`spell-panel ${isCasting ? 'casting' : ''} ${isAbove ? 'placed-above' : 'placed-below'}`} style={panelStyle}>
      <div className="spell-tether" style={tetherStyle}></div>
      <div className="spell-panel-glow"></div>

      <div className="spell-panel-content">
        <div className="spell-identity">
          <span className="spell-rune">{spell.rune || "ᛟ"}</span>
          <div className="spell-meta">
            <span className={`spell-rarity rarity-${(spell.rarity || 'common').toLowerCase()}`}>{spell.rarity || 'Common'}</span>
            <span className="spell-element">{spell.element || 'Arcane'}</span>
          </div>
        </div>

        <div className="spell-header">
          <span className="runes left-runes">{spell.rune}ᛖ</span>
          <h2>{spell.displayName}</h2>
          <span className="runes right-runes">ᛖ{spell.rune}</span>
        </div>
        
        <div className="spell-divider">
          <div className="diamond"></div>
        </div>
        
        <p className="spell-flavor">"{spell.flavor}"</p>
        
        <button className="spell-action-button" onClick={handleCast}>
          <span className="button-text">{spell.actionName}</span>
          <span className="button-glow"></span>
        </button>
      </div>
      
      {/* Ornamental corners */}
      <div className="ornament top-left"></div>
      <div className="ornament top-right"></div>
      <div className="ornament bottom-left"></div>
      <div className="ornament bottom-right"></div>
    </div>
  );
}
