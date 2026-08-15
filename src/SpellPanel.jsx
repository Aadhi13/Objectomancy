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
    transform: 'translateX(-50%)',
    '--spell-color': spell.color || 'var(--color-gold-accent)'
  };

  const renderSpellEffect = (type) => {
    switch (type) {
      case 'ripple':
        return (
          <>
            <div className="effect-ripple"></div>
            <div className="effect-ripple delay-1"></div>
            <div className="effect-ripple delay-2"></div>
          </>
        );
      case 'runes':
        return (
          <>
            <div className="effect-rune r1">ᛈ</div>
            <div className="effect-rune r2">ᚢ</div>
            <div className="effect-rune r3">ᛋ</div>
            <div className="effect-rune r4">ᚱ</div>
            <div className="effect-rune r5">ᛗ</div>
          </>
        );
      case 'lightning':
        return (
          <>
            <div className="effect-lightning l1"></div>
            <div className="effect-lightning l2"></div>
            <div className="effect-lightning l3"></div>
          </>
        );
      case 'steam':
      case 'aura':
        return (
          <>
            <div className="effect-steam s1"></div>
            <div className="effect-steam s2"></div>
            <div className="effect-steam s3"></div>
          </>
        );
      case 'vortex':
        return (
          <div className="effect-vortex"></div>
        );
      default:
        return (
          <>
            <div className="effect-ripple"></div>
            <div className="effect-ripple delay-1"></div>
            <div className="effect-ripple delay-2"></div>
          </>
        );
    }
  };

  return (
    <div className={`spell-panel ${isCasting ? 'casting' : ''}`} style={panelStyle}>
      <div className="spell-panel-glow"></div>
      
      {/* Spell visual effect container */}
      {isCasting && (
        <div className="spell-effect-container">
          {renderSpellEffect(spell.spellEffect)}
        </div>
      )}

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
