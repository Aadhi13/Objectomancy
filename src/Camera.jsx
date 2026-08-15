import { useEffect, useRef, useState } from 'react';
import './Camera.css';

export default function Camera() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading', 'active', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available in this browser');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('active');
        }
      } catch (err) {
        setStatus('error');
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera access was denied. Please grant permission.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No camera device found.');
        } else {
          setErrorMsg(err.message || 'An unknown error occurred accessing the camera.');
        }
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="camera-container">
      {status === 'loading' && (
        <div className="camera-status">
          <p>Summoning the sight...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="camera-status error">
          <p>{errorMsg}</p>
        </div>
      )}

      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`camera-video ${status === 'active' ? 'visible' : 'hidden'}`}
      />
    </div>
  );
}
