import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { getEnchantmentForClass } from './spells';
import SpellPanel from './SpellPanel';
import AmbientMagic from './AmbientMagic';
import { playDiscoveryChime } from './audio';
import { useGrimoire } from './useGrimoire';
import Grimoire from './Grimoire';
import { useHunt } from './useHunt';
import HuntPanel from './HuntPanel';
import './Camera.css';

export default function Camera() {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const animationRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  
  const [cameraStatus, setCameraStatus] = useState('loading'); 
  const [modelStatus, setModelStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Store smoothed active detections for rendering
  const [activeDetections, setActiveDetections] = useState([]);
  const [discoveryEvents, setDiscoveryEvents] = useState([]);
  
  // Hardware Zoom & Lens state
  const [zoomCapability, setZoomCapability] = useState(null);
  const [zoomValue, setZoomValue] = useState(1);
  const videoTrackRef = useRef(null);
  const [isArcaneSightOpen, setIsArcaneSightOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const hasFetchedCamerasRef = useRef(false);
  
  // Grimoire state
  const { discovered, discover } = useGrimoire();
  const [isGrimoireOpen, setIsGrimoireOpen] = useState(false);
  
  // Hunt state
  const huntState = useHunt();
  
  // Hit/miss tracking state array
  const trackingRef = useRef([]);
  const nextTrackIdRef = useRef(1);

  // Helper for bounding box overlap matching
  function getIoU(box1, box2) {
    const xA = Math.max(box1.x, box2.x);
    const yA = Math.max(box1.y, box2.y);
    const xB = Math.min(box1.x + box1.width, box2.x + box2.width);
    const yB = Math.min(box1.y + box1.height, box2.y + box2.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea === 0) return 0;

    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;

    return interArea / (box1Area + box2Area - interArea);
  }

  // Setup camera
  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available in this browser');
        }

        // Request a resolution that matches the device's current orientation
        // to prevent heavy horizontal cropping from object-fit: cover on mobile devices.
        const isPortrait = window.innerHeight > window.innerWidth;
        const videoConstraints = {
          width: { ideal: isPortrait ? 720 : 1280 },
          height: { ideal: isPortrait ? 1280 : 720 }
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

              if (supportedPredictions.length > 0 || trackingRef.current.length > 0) {
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

                const mappedPredictions = supportedPredictions.map(p => {
                  const [x, y, w, h] = p.bbox;
                  return {
                    class: p.class,
                    enchantment: getEnchantmentForClass(p.class),
                    x: x * scale + oX,
                    y: y * scale + oY,
                    width: w * scale,
                    height: h * scale,
                    score: parseFloat(p.score.toFixed(2))
                  };
                });
                
                const tracks = trackingRef.current;
                
                // Mark all tracks as unmatched
                tracks.forEach(t => t.matchedThisFrame = false);

                // Match predictions to tracks
                mappedPredictions.forEach(pred => {
                  let bestMatch = null;
                  let bestIoU = 0.3; // threshold for overlap
                  
                  tracks.forEach(t => {
                    if (t.class === pred.class && !t.matchedThisFrame) {
                      const iou = getIoU(t.box, pred);
                      if (iou > bestIoU) {
                        bestIoU = iou;
                        bestMatch = t;
                      }
                    }
                  });

                  if (bestMatch) {
                    bestMatch.matchedThisFrame = true;
                    bestMatch.misses = 0;
                    bestMatch.hits++;
                    
                    // Exponential moving average for positional smoothing
                    const alpha = 0.5;
                    bestMatch.box = {
                      ...pred,
                      x: bestMatch.box.x * (1 - alpha) + pred.x * alpha,
                      y: bestMatch.box.y * (1 - alpha) + pred.y * alpha,
                      width: bestMatch.box.width * (1 - alpha) + pred.width * alpha,
                      height: bestMatch.box.height * (1 - alpha) + pred.height * alpha,
                    };
                    bestMatch.score = pred.score;
                  } else {
                    // New track
                    tracks.push({
                      id: nextTrackIdRef.current++,
                      class: pred.class,
                      enchantment: pred.enchantment,
                      hits: 1,
                      misses: 0,
                      isActive: false,
                      box: { ...pred },
                      score: pred.score,
                      matchedThisFrame: true
                    });
                  }
                });

                // Process unmatched tracks and update active statuses
                const activeList = [];
                const discoveries = [];
                
                for (let i = tracks.length - 1; i >= 0; i--) {
                  const t = tracks[i];
                  if (!t.matchedThisFrame) {
                    t.hits = 0;
                    t.misses++;
                  }
                  
                  // Hide after 5 consecutive misses
                  if (t.misses >= 5) {
                    if (t.isActive) console.log(`💨 Object lost: ${t.enchantment.displayName}`);
                    tracks.splice(i, 1);
                    continue;
                  }
                  
                  // Trigger discovery after 2 valid hits
                  if (!t.isActive && t.hits >= 2) {
                    t.isActive = true;
                    discover(t.class);
                    huntState.handleDiscovery(t.class);
                    console.log(`✨ Discovery event: ${t.enchantment.displayName} found!`);
                    discoveries.push({
                      id: Date.now() + i,
                      x: t.box.x,
                      y: t.box.y,
                      width: t.box.width,
                      height: t.box.height
                    });
                  }
                  
                  if (t.isActive) {
                    activeList.push({ ...t, box: { ...t.box } });
                  }
                }

                if (discoveries.length > 0) {
                  playDiscoveryChime();
                  setDiscoveryEvents(prev => [...prev, ...discoveries]);
                  setTimeout(() => {
                    setDiscoveryEvents(prev => prev.filter(d => !discoveries.find(nd => nd.id === d.id)));
                  }, 1000);
                }

                setActiveDetections(activeList);
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
          <AmbientMagic />
          
          <HuntPanel {...huntState} />
          
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
              className="arcane-sight-toggle grimoire-toggle"
              onClick={() => setIsGrimoireOpen(true)}
              aria-label="Open Grimoire"
              style={{ bottom: '90px' }} // Position above Arcane Sight
            >
              <span className="runes">ᚷ</span>
            </button>
            
            <button 
              className="arcane-sight-toggle"
              onClick={() => setIsArcaneSightOpen(!isArcaneSightOpen)}
              aria-label="Toggle Arcane Sight"
            >
              <span className="runes">ᛟ</span>
            </button>
          </div>
          
          {isGrimoireOpen && (
            <Grimoire discoveredIds={discovered} onClose={() => setIsGrimoireOpen(false)} />
          )}
        </>
      )}

      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`camera-video ${!isLoading && !hasError ? 'visible' : 'hidden'}`}
      />
      
      {discoveryEvents.map(evt => (
        <div 
          key={evt.id}
          className="discovery-flourish"
          style={{
            left: `${evt.x + evt.width/2}px`,
            top: `${evt.y + evt.height/2}px`
          }}
        >
           <div className="flourish-ring"></div>
           <div className="flourish-burst"></div>
        </div>
      ))}
      
      {activeDetections.map(det => (
        <SpellPanel key={det.id} detection={det.box} spell={det.enchantment} />
      ))}
    </div>
  );
}
