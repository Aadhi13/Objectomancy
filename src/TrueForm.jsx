import React from 'react';
import './TrueForm.css';

/**
 * True-Form Transformation — fires ONCE per discovery event.
 * Renders inside the discoveryEvents loop so it auto-removes after timeout.
 * Uses overflow:hidden to keep all effects strictly within the bbox.
 */
export default function TrueForm({ x, y, width, height, objectClass }) {
  if (objectClass !== 'bottle') return null;

  const style = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`
  };

  return (
    <div className="true-form" style={style}>
      {/* Phase 1: Glow  (250ms) */}
      <div className="tf-phase tf-glow" />

      {/* Phase 2: Runes (450ms) */}
      <div className="tf-phase tf-runes">
        <span>ᛗ</span>
        <span>ᚹ</span>
        <span>ᛈ</span>
        <span>ᚢ</span>
      </div>

      {/* Phase 3: Energy ring (650ms) */}
      <div className="tf-phase tf-energy" />

      {/* Phase 4+5: True-form artwork (850ms → stable at 1400ms) */}
      <div className="tf-phase tf-artwork">
        <svg viewBox="0 0 80 130" className="tf-vessel-svg">
          <path
            d="M32 8 L48 8 L48 32 L66 62 L66 108 C66 120 56 122 40 122 C24 122 14 120 14 108 L14 62 L32 32 Z"
            className="tf-flask-path"
          />
          <path
            d="M20 72 Q40 68 60 72 L60 105 C60 112 52 114 40 114 C28 114 20 112 20 105 Z"
            className="tf-liquid-path"
          />
          <rect x="34" y="2" width="12" height="8" rx="1" className="tf-cork-path" />
          <text x="40" y="100" textAnchor="middle" className="tf-inner-rune">ᛗ</text>
        </svg>
      </div>
    </div>
  );
}
