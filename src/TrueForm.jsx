import React from 'react';
import { TRUE_FORMS, FALLBACK_TRUE_FORM } from './trueForms';
import { SPELLS } from './spells';
import './TrueForm.css';

/**
 * True-Form Transformation — data-driven.
 *
 * Reads asset config from trueForms.js. Falls back to a generic arcane circle
 * for objects without a dedicated true-form asset. Uses CSS custom properties
 * (--tf-color) for per-object color theming, identical pattern to SpellPanel.
 */
export default function TrueForm({ x, y, width, height, objectClass, isFading, phase }) {
  const spell = SPELLS[objectClass];
  if (!spell) return null;

  const form = TRUE_FORMS[objectClass] || FALLBACK_TRUE_FORM;
  const color = form.color || spell.color || '#d4a574';
  const rune = form.rune || spell.rune || 'ᛟ';
  const runeColor = form.runeColor || '#f5f5f5';
  const runeY = form.runeY || 48;

  const style = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    '--tf-color': color,
    opacity: isFading ? 0 : 1,
    transition: 'opacity 0.3s ease-out, left 0.1s linear, top 0.1s linear, width 0.1s linear, height 0.1s linear'
  };

  const isRevealed = phase === 'revealed';

  return (
    <div className={`true-form ${isRevealed ? 'revealed' : ''}`} style={style}>
      {/* Phase 1: Glow  (250ms) */}
      {!isRevealed && <div className="tf-phase tf-glow" />}

      {/* Phase 2: Runes (450ms) */}
      {!isRevealed && (
        <div className="tf-phase tf-runes">
          <span>{rune}</span>
          <span>{spell.rune}</span>
          <span>{rune}</span>
        </div>
      )}

      {/* Phase 3: Energy ring (650ms) */}
      {!isRevealed && <div className="tf-phase tf-energy" />}

      {/* Phase 4+5: True-form artwork (850ms → stable at 1400ms) */}
      <div className={`tf-phase tf-artwork ${isRevealed ? 'tf-artwork-stable' : ''}`}>
        <svg viewBox={form.svgViewBox} className="tf-svg">
          {(form.paths || []).map((p, i) => (
            <path key={i} d={p.d} className={p.className} />
          ))}
          {(form.rects || []).map((r, i) => (
            <rect
              key={`r${i}`}
              x={r.x} y={r.y}
              width={r.width} height={r.height}
              rx={r.rx || 0}
              className={r.className}
            />
          ))}
          <text
            x="50%"
            y={runeY}
            textAnchor="middle"
            className="tf-inner-rune"
            style={{ fill: runeColor }}
          >
            {rune}
          </text>
        </svg>
      </div>
    </div>
  );
}
