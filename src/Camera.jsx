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
  
  // Store smoothed active detection for rendering
  const [activeDetection, setActiveDetection] = useState(null);
  
  // Hit/miss tracking state
  const trackingRef = useRef({
    hits: 0,
    misses: 0,
    isActive: false,
    box: null,
    score: 0
  });

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
            facingMode: 'environment',
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
                // Focus on the most confident bottle
                const bestBottle = bottlePredictions[0];
                
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

                const [x, y, w, h] = bestBottle.bbox;
                const mappedBox = {
                  x: x * scale + oX,
                  y: y * scale + oY,
                  width: w * scale,
                  height: h * scale,
                  score: parseFloat(bestBottle.score.toFixed(2))
                };
                
                const t = trackingRef.current;
                t.misses = 0;
                t.hits++;
                
                // Trigger discovery after 2 valid hits
                if (!t.isActive && t.hits >= 2) {
                  t.isActive = true;
                  console.log("✨ Discovery event: New bottle found!");
                }
                
                if (t.isActive) {
                  if (t.box) {
                    // Exponential moving average for positional smoothing
                    const alpha = 0.5;
                    t.box = {
                      x: t.box.x * (1 - alpha) + mappedBox.x * alpha,
                      y: t.box.y * (1 - alpha) + mappedBox.y * alpha,
                      width: t.box.width * (1 - alpha) + mappedBox.width * alpha,
                      height: t.box.height * (1 - alpha) + mappedBox.height * alpha,
                    };
                  } else {
                    t.box = { ...mappedBox };
                  }
                  t.score = mappedBox.score;
                  setActiveDetection({ ...t.box, score: t.score });
                }
              } else {
                const t = trackingRef.current;
                t.hits = 0;
                t.misses++;
                
                // Hide after 5 consecutive misses
                if (t.isActive && t.misses >= 5) {
                  t.isActive = false;
                  t.box = null;
                  setActiveDetection(null);
                  console.log("💨 Object lost.");
                }
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
      
      {activeDetection && (
        <div
          className="debug-box"
          style={{
            left: `${activeDetection.x}px`,
            top: `${activeDetection.y}px`,
            width: `${activeDetection.width}px`,
            height: `${activeDetection.height}px`
          }}
        >
          <span className="debug-label">Bottle: {activeDetection.score}</span>
        </div>
      )}
    </div>
  );
}
