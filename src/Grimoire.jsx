import React from 'react';
import { SPELLS } from './spells';
import './Grimoire.css';

export default function Grimoire({ discoveredIds, onClose }) {
  const allSpells = Object.values(SPELLS);
  
  return (
    <div className="grimoire-overlay" onClick={onClose}>
      <div className="grimoire-book" onClick={e => e.stopPropagation()}>
        <button className="grimoire-close" onClick={onClose}>
          <span className="runes">ᚷ</span>
        </button>
        <div className="grimoire-header">
          <h2 className="grimoire-title">The Grimoire</h2>
          <p className="grimoire-progress">
            Artifacts Discovered: {discoveredIds.length} / {allSpells.length}
          </p>
        </div>
        
        <div className="spell-divider"><div className="diamond"></div></div>
        
        <div className="grimoire-grid">
          {allSpells.map(spell => {
            const isDiscovered = discoveredIds.includes(spell.id);
            return (
              <div 
                key={spell.id} 
                className={`grimoire-entry ${isDiscovered ? 'discovered' : 'locked'}`}
                style={isDiscovered ? { '--spell-color': spell.color } : {}}
              >
                <div className="entry-icon">
                  {isDiscovered ? spell.rune : '?'}
                </div>
                <div className="entry-details">
                  <h3>{isDiscovered ? spell.displayName : 'Unknown Artifact'}</h3>
                  {isDiscovered ? (
                    <>
                      <p className="entry-flavor">"{spell.flavor}"</p>
                      <div className="entry-meta">
                        <span className={`spell-rarity rarity-${spell.rarity.toLowerCase()}`}>{spell.rarity}</span>
                        <span className="spell-element">{spell.element}</span>
                      </div>
                    </>
                  ) : (
                    <p className="entry-locked-text">Seek and you shall find.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
