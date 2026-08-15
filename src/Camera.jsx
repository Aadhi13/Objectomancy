import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { getEnchantmentForClass } from './spells';
import SpellPanel from './SpellPanel';
import { playDiscoveryChime } from './audio';
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
  const [discoveryEvent, setDiscoveryEvent] = useState(null);
  
  // Hardware Zoom & Lens state
  const [zoomCapability, setZoomCapability] = useState(null);
  const [zoomValue, setZoomValue] = useState(1);
  const videoTrackRef = useRef(null);
  const [isArcaneSightOpen, setIsArcaneSightOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const hasFetchedCamerasRef = useRef(false);
  
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

        const isPortrait = window.innerHeight > window.innerWidth;
        const idealWidth = isPortrait ? 720 : 1280;
        const idealHeight = isPortrait ? 1280 : 720;

        const videoConstraints = {
          width: { ideal: idealWidth },
          height: { ideal: idealHeight }
        };

        if (selectedCameraId) {
          videoConstraints.deviceId = { exact: selectedCameraId };
        } else {
          videoConstraints.facingMode = 'environment';
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraStatus('active');
          
          const track = stream.getVideoTracks()[0];
          videoTrackRef.current = track;
          
          if (track && typeof track.getCapabilities === 'function') {
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
              const settings = track.getSettings();
              setZoomCapability({
                min: capabilities.zoom.min,
                max: capabilities.zoom.max,
                step: capabilities.zoom.step
              });
              setZoomValue(settings.zoom || capabilities.zoom.min);
            } else {
              setZoomCapability(null);
            }
          } else {
            setZoomCapability(null);
          }

          if (!hasFetchedCamerasRef.current) {
            hasFetchedCamerasRef.current = true;
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            setAvailableCameras(videoDevices);
          }
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
  }, [selectedCameraId]);

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
              
              // Filter for supported classes with valid enchantments and confidence >= 0.6
              const supportedPredictions = predictions.filter(
                p => getEnchantmentForClass(p.class) && p.score >= 0.6
              );

              if (supportedPredictions.length > 0) {
                // Focus on the most confident
                const bestMatch = supportedPredictions[0];
                const enchantment = getEnchantmentForClass(bestMatch.class);
                
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

                const [x, y, w, h] = bestMatch.bbox;
                const mappedBox = {
                  class: bestMatch.class,
                  enchantment,
                  x: x * scale + oX,
                  y: y * scale + oY,
                  width: w * scale,
                  height: h * scale,
                  score: parseFloat(bestMatch.score.toFixed(2))
                };
                
                const t = trackingRef.current;
                t.misses = 0;
                t.hits++;
                
                // Trigger discovery after 2 valid hits
                if (!t.isActive && t.hits >= 2) {
                  t.isActive = true;
                  console.log(`✨ Discovery event: ${enchantment.displayName} found!`);
                  playDiscoveryChime();
                  
                  setDiscoveryEvent({
                    x: mappedBox.x,
                    y: mappedBox.y,
                    width: mappedBox.width,
                    height: mappedBox.height
                  });
                  setTimeout(() => setDiscoveryEvent(null), 1000);
                }
                
                if (t.isActive) {
                  if (t.box) {
                    // Exponential moving average for positional smoothing
                    const alpha = 0.5;
                    t.box = {
                      ...mappedBox,
                      x: t.box.x * (1 - alpha) + mappedBox.x * alpha,
                      y: t.box.y * (1 - alpha) + mappedBox.y * alpha,
                      width: t.box.width * (1 - alpha) + mappedBox.width * alpha,
                      height: t.box.height * (1 - alpha) + mappedBox.height * alpha,
                    };
                  } else {
                    t.box = { ...mappedBox };
                  }
                  t.score = mappedBox.score;
                  setActiveDetection({ ...t.box });
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

  const handleZoomChange = (e) => {
    const newZoom = Number(e.target.value);
    setZoomValue(newZoom);
    if (videoTrackRef.current && typeof videoTrackRef.current.applyConstraints === 'function') {
      videoTrackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom }]
      }).catch(err => console.error("Failed to apply zoom:", err));
    }
  };

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

      {!isLoading && !hasError && (
        <>
          {isArcaneSightOpen && (
            <div 
              className="arcane-backdrop" 
              onClick={() => setIsArcaneSightOpen(false)}
            ></div>
          )}
          <div className="arcane-sight-container">
            {isArcaneSightOpen && (
              <div className="arcane-sight-panel">
                <h4>Arcane Sight</h4>
                <div className="spell-divider"><div className="diamond"></div></div>
                
                {availableCameras.length > 1 && (
                  <div className="arcane-control-group">
                    <label>Lens Focus</label>
                    <select 
                      value={selectedCameraId || (videoTrackRef.current?.getSettings()?.deviceId) || ''} 
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                    >
                      {availableCameras.map((cam, i) => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Lens ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {zoomCapability ? (
                  <div className="arcane-control-group">
                    <label>Scrying Depth (Zoom)</label>
                    <input 
                      type="range"
                      className="zoom-slider"
                      min={zoomCapability.min}
                      max={zoomCapability.max}
                      step={zoomCapability.step}
                      value={zoomValue}
                      onChange={handleZoomChange}
                    />
                  </div>
                ) : (
                  <p className="arcane-unsupported">Scrying depth fixed.</p>
                )}
              </div>
            )}
            
            <button 
              className="arcane-sight-toggle"
              onClick={() => setIsArcaneSightOpen(!isArcaneSightOpen)}
              aria-label="Toggle Arcane Sight"
            >
              <span className="runes">ᛟ</span>
            </button>
          </div>
        </>
      )}

      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`camera-video ${!isLoading && !hasError ? 'visible' : 'hidden'}`}
      />
      
      {discoveryEvent && (
        <div 
          className="discovery-flourish"
          style={{
            left: `${discoveryEvent.x + discoveryEvent.width/2}px`,
            top: `${discoveryEvent.y + discoveryEvent.height/2}px`
          }}
        >
           <div className="flourish-ring"></div>
           <div className="flourish-burst"></div>
        </div>
      )}
      
      {activeDetection && activeDetection.enchantment && (
        <SpellPanel detection={activeDetection} spell={activeDetection.enchantment} />
      )}
    </div>
  );
}
