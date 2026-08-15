import React from 'react';
import { SPELLS } from './spells';
import './HuntPanel.css';

export default function HuntPanel({ isActive, targets, discoveredInHunt, isComplete, startHunt, cancelHunt }) {
  if (!isActive) {
    return (
      <button className="start-hunt-button" onClick={startHunt}>
        Start Hunt
      </button>
    );
  }

  return (
    <div className={`hunt-panel ${isComplete ? 'complete' : ''}`}>
      <div className="hunt-header">
        <h3 className="hunt-title">Enchantment Hunt</h3>
        <button className="cancel-hunt" onClick={cancelHunt}>&times;</button>
      </div>
      
      {!isComplete && (
        <p className="hunt-subtitle">Discover {targets.length} objects</p>
      )}

      {isComplete ? (
        <div className="hunt-complete-banner">
          <span className="runes">ᛗ</span>
          <h4>Hunt Complete!</h4>
          <p>You have mastered the artifacts.</p>
          <button className="restart-hunt-button" onClick={startHunt}>Play Again</button>
        </div>
      ) : (
        <ul className="hunt-list">
          {targets.map(id => {
            const spell = SPELLS[id];
            const found = discoveredInHunt.includes(id);
            return (
              <li key={id} className={`hunt-item ${found ? 'found' : 'pending'}`}>
                <span className="status-icon">{found ? '✓' : '○'}</span>
                <span className="target-name">{spell.displayName}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
