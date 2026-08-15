import React from 'react';
import './TrueForm.css';

export default function TrueForm({ detection, type }) {
  if (type !== 'bottle') return null;

  const style = {
    left: `${detection.x}px`,
    top: `${detection.y}px`,
    width: `${detection.width}px`,
    height: `${detection.height}px`
  };

  return (
    <div className="true-form-container" style={style}>
      <div className="tf-glow"></div>
      <div className="tf-runes">ᛗ</div>
      <div className="tf-energy"></div>
      
      <div className="tf-artwork">
        <svg viewBox="0 0 100 150" className="tf-bottle-svg">
          {/* Flask outline */}
          <path 
            d="M 40 10 L 60 10 L 60 40 L 85 80 L 85 130 C 85 145 70 145 50 145 C 30 145 15 145 15 130 L 15 80 L 40 40 Z" 
            className="tf-flask" 
          />
          {/* Magical Liquid inside */}
          <path 
            d="M 22 90 Q 50 85 78 90 L 78 125 C 78 135 65 135 50 135 C 35 135 22 135 22 125 Z" 
            className="tf-liquid" 
          />
          {/* Cork */}
          <rect x="42" y="0" width="16" height="12" className="tf-cork" />
          
          {/* Decorative Rune on flask */}
          <text x="50" y="115" textAnchor="middle" className="tf-flask-rune">ᛗ</text>
        </svg>
      </div>
    </div>
  );
}
