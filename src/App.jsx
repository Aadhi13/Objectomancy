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
            <p className="subtitle">The forgotten art of seeing what things really are.</p>
            
            <div className="spell-divider" style={{ margin: '1.5rem 0' }}>
              <div className="diamond"></div>
            </div>
            
            <ul className="landing-instructions">
              <li>Point camera at an ordinary object</li>
              <li>Reveal its hidden true form</li>
              <li>Cast a spell</li>
            </ul>

            <button className="spell-action-button" onClick={handleStart} style={{ marginTop: '2rem' }}>
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
