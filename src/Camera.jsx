import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import './Camera.css';

export default function Camera() {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const animationRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  
  const [cameraStatus, setCameraStatus] = useState('loading'); 
  const [modelStatus, setModelStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Store mapped bounding boxes for rendering
  const [debugBoxes, setDebugBoxes] = useState([]);

  // Setup camera
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
          setCameraStatus('active');
        }
      } catch (err) {
        setCameraStatus('error');
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

  // Setup model
  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        const loadedModel = await cocoSsd.load();
        if (isMounted) {
          modelRef.current = loadedModel;
          setModelStatus('active');
        }
      } catch (err) {
        console.error("Failed to load COCO-SSD:", err);
        if (isMounted) {
          setModelStatus('error');
          setErrorMsg('Failed to load detection model.');
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (cameraStatus !== 'active' || modelStatus !== 'active') return;

    const video = videoRef.current;
    
    function startDetection() {
      const detectLoop = async (time) => {
        // Throttle to ~5fps (200ms)
        if (time - lastDetectionTimeRef.current >= 200) {
          if (video && video.videoWidth > 0 && modelRef.current) {
            lastDetectionTimeRef.current = time;
            try {
              const predictions = await modelRef.current.detect(video);
              
              // Filter for 'bottle' and confidence >= 0.6
              const bottlePredictions = predictions.filter(
                p => p.class === 'bottle' && p.score >= 0.6
              );

              if (bottlePredictions.length > 0) {
                const vW = video.videoWidth;
                const vH = video.videoHeight;
                const cW = video.clientWidth;
                const cH = video.clientHeight;

                // Map coordinates accounting for object-fit: cover
                const scale = Math.max(cW / vW, cH / vH);
                const dW = vW * scale;
                const dH = vH * scale;
                const oX = (cW - dW) / 2;
                const oY = (cH - dH) / 2;

                const mappedBoxes = bottlePredictions.map(p => {
                  const [x, y, w, h] = p.bbox;
                  return {
                    x: x * scale + oX,
                    y: y * scale + oY,
                    width: w * scale,
                    height: h * scale,
                    score: p.score.toFixed(2)
                  };
                });
                
                setDebugBoxes(mappedBoxes);
              } else {
                setDebugBoxes([]);
              }
            } catch (err) {
              console.error("Detection error:", err);
            }
          }
        }
        animationRef.current = requestAnimationFrame(detectLoop);
      };
      
      animationRef.current = requestAnimationFrame(detectLoop);
    }

    // Check if video is ready to play
    if (video.readyState >= 2) {
      startDetection();
    } else {
      const onPlay = () => startDetection();
      video.addEventListener('loadeddata', onPlay);
      return () => {
        video.removeEventListener('loadeddata', onPlay);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraStatus, modelStatus]);

  const isLoading = cameraStatus === 'loading' || modelStatus === 'loading';
  const hasError = cameraStatus === 'error' || modelStatus === 'error';

  return (
    <div className="camera-container">
      {isLoading && !hasError && (
        <div className="camera-status">
          <p>Summoning the sight...</p>
        </div>
      )}
      
      {hasError && (
        <div className="camera-status error">
          <p>{errorMsg}</p>
        </div>
      )}

      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`camera-video ${!isLoading && !hasError ? 'visible' : 'hidden'}`}
      />
      
      {debugBoxes.map((box, index) => (
        <div
          key={index}
          className="debug-box"
          style={{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`
          }}
        >
          <span className="debug-label">Bottle: {box.score}</span>
        </div>
      ))}
    </div>
  );
}
