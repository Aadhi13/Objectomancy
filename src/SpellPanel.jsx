import React, { useState } from 'react';
import { playSpellChime } from './audio';
import './SpellPanel.css';

export default function SpellPanel({ detection, spell }) {
  const [isCasting, setIsCasting] = useState(false);

  if (!detection || !spell) return null;

  const handleCast = () => {
    if (isCasting) return;
    setIsCasting(true);
    playSpellChime();
    
    // Reset casting state after animation
    setTimeout(() => {
      setIsCasting(false);
    }, 1500);
  };

  // Anchor to the bottom center of the detected object
  const panelStyle = {
    left: `${detection.x + detection.width / 2}px`,
    top: `${detection.y + detection.height + 20}px`,
    transform: 'translateX(-50%)'
  };

  return (
    <div className={`spell-panel ${isCasting ? 'casting' : ''}`} style={panelStyle}>
      <div className="spell-panel-glow"></div>
      
      {/* Spell visual effect container */}
      {isCasting && (
        <div className="spell-effect-container">
          <div className="water-ripple"></div>
          <div className="water-ripple delay-1"></div>
          <div className="water-ripple delay-2"></div>
        </div>
      )}

      <div className="spell-panel-content">
        <div className="spell-header">
          <span className="runes left-runes">ᚼᛖ</span>
          <h2>{spell.displayName}</h2>
          <span className="runes right-runes">ᛖᚼ</span>
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
