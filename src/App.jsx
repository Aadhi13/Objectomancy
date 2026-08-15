import { useState } from 'react';
import './App.css';
import Camera from './Camera';
import { initAmbientAudio } from './audio';

function App() {
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    initAmbientAudio();
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
