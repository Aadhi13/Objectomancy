import { useState } from 'react';
import './App.css';
import Camera from './Camera';

function App() {
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    // Resume or initialize audio context on first user interaction to bypass browser autoplay policies
    if (window.audioCtx && window.audioCtx.state === 'suspended') {
      window.audioCtx.resume();
    } else if (!window.audioCtx) {
      window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    setHasStarted(true);
  };

  return (
    <>
      {!hasStarted ? (
        <div className="landing-screen">
          <div className="landing-content">
            <h1>Objectomancy</h1>
            <p className="subtitle">A mystical augmented reality</p>
            
            <div className="spell-divider" style={{ margin: '2rem 0' }}>
              <div className="diamond"></div>
            </div>
            
            <button className="spell-action-button" onClick={handleStart}>
              <span className="button-text">Open the Monocle</span>
              <span className="button-glow"></span>
            </button>
          </div>
        </div>
      ) : (
        <Camera />
      )}
    </>
  );
}

export default App;
