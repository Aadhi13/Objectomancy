/**
 * DeepLab Segmentation Benchmark — M21 Experiment
 *
 * Isolated benchmark to evaluate DeepLab v3 (Pascal VOC & ADE20K)
 * for potential laptop-only "Reveal True Form" segmentation.
 *
 * Does NOT integrate with the production pipeline.
 * Reuses the existing @tensorflow/tfjs runtime.
 *
 * Measures:
 *   1. Model loading time
 *   2. First inference time
 *   3. Warm inference latency (N runs)
 *   4. Average inference latency
 *   5. Approximate continuous FPS
 *   6. Memory/runtime stability
 *   7. Mask quality for: bottle, book, chair, laptop
 *   8. Movement behavior (slight repositioning)
 *   9. Whether inference blocks the main thread noticeably
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@tensorflow/tfjs';
import * as tf from '@tensorflow/tfjs';
import * as deeplab from '@tensorflow-models/deeplab';
import './DeepLabBenchmark.css';

// Pascal VOC classes we care about
const PASCAL_TARGETS = ['bottle', 'chair'];
// ADE20K classes we care about
const ADE20K_TARGETS = ['bottle', 'chair', 'book', 'computer'];

const WARM_RUNS = 20;

export default function DeepLabBenchmark() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const modelRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState('idle');
  const [selectedBase, setSelectedBase] = useState('pascal');
  const [quantBytes, setQuantBytes] = useState(2);
  const [results, setResults] = useState(null);
  const [liveSegResult, setLiveSegResult] = useState(null);
  const [isRunningLive, setIsRunningLive] = useState(false);
  const liveRef = useRef(false);
  const [mainThreadLag, setMainThreadLag] = useState([]);
  const [tfBackend, setTfBackend] = useState('');
  const [memoryBefore, setMemoryBefore] = useState(null);
  const [memoryAfter, setMemoryAfter] = useState(null);

  // Frame counter for jank detection
  const jankRef = useRef({ lastFrame: 0, drops: 0, frames: 0 });

  // Start camera
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => setCameraReady(true);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setStatus('camera-error');
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Track TF.js backend
  useEffect(() => {
    tf.ready().then(() => setTfBackend(tf.getBackend()));
  }, []);

  // Main-thread jank detector: counts animation frame drops
  useEffect(() => {
    let rafId;
    const detect = (ts) => {
      const j = jankRef.current;
      if (j.lastFrame > 0) {
        const delta = ts - j.lastFrame;
        j.frames++;
        if (delta > 50) j.drops++; // > 50ms = dropped frame
      }
      j.lastFrame = ts;
      rafId = requestAnimationFrame(detect);
    };
    rafId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const runBenchmark = useCallback(async () => {
    if (!cameraReady) return;
    setStatus('loading-model');
    setResults(null);
    setMainThreadLag([]);
    setMemoryBefore(null);
    setMemoryAfter(null);

    const benchResults = {
      base: selectedBase,
      quantizationBytes: quantBytes,
      backend: tf.getBackend(),
    };

    // Reset jank counter
    jankRef.current = { lastFrame: 0, drops: 0, frames: 0 };

    // Memory before
    const memBefore = tf.memory();
    setMemoryBefore({ ...memBefore });
    benchResults.memoryBefore = {
      numTensors: memBefore.numTensors,
      numBytes: memBefore.numBytes,
    };

    // 1. Model loading time
    const loadStart = performance.now();
    try {
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
      const model = await deeplab.load({
        base: selectedBase,
        quantizationBytes: quantBytes,
      });
      const loadEnd = performance.now();
      modelRef.current = model;
      benchResults.modelLoadMs = Math.round(loadEnd - loadStart);
      setStatus('model-loaded');
    } catch (err) {
      console.error('Model load error:', err);
      setStatus('model-error');
      benchResults.error = err.message;
      setResults(benchResults);
      return;
    }

    const video = videoRef.current;

    // 2. First inference
    setStatus('first-inference');
    const firstStart = performance.now();
    let firstResult;
    try {
      firstResult = await modelRef.current.segment(video);
      const firstEnd = performance.now();
      benchResults.firstInferenceMs = Math.round(firstEnd - firstStart);
      benchResults.firstLegend = { ...firstResult.legend };
      benchResults.firstDimensions = {
        width: firstResult.width,
        height: firstResult.height,
      };
    } catch (err) {
      console.error('First inference error:', err);
      benchResults.firstInferenceError = err.message;
      setResults(benchResults);
      setStatus('done');
      return;
    }

    // Draw first result to mask canvas
    drawMask(firstResult);

    // 3. Warm inference runs
    setStatus('warm-inference');
    const warmTimings = [];
    const legends = [];
    for (let i = 0; i < WARM_RUNS; i++) {
      const start = performance.now();
      const result = await modelRef.current.segment(video);
      const end = performance.now();
      warmTimings.push(end - start);
      legends.push({ ...result.legend });

      // Periodically yield to main thread
      if (i % 5 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    benchResults.warmTimings = warmTimings.map(t => Math.round(t));
    benchResults.avgWarmMs = Math.round(
      warmTimings.reduce((a, b) => a + b, 0) / warmTimings.length
    );
    benchResults.minWarmMs = Math.round(Math.min(...warmTimings));
    benchResults.maxWarmMs = Math.round(Math.max(...warmTimings));
    benchResults.medianWarmMs = Math.round(
      warmTimings.slice().sort((a, b) => a - b)[Math.floor(warmTimings.length / 2)]
    );
    benchResults.p95WarmMs = Math.round(
      warmTimings.slice().sort((a, b) => a - b)[Math.floor(warmTimings.length * 0.95)]
    );
    benchResults.approxFps = parseFloat(
      (1000 / benchResults.avgWarmMs).toFixed(1)
    );

    // 4. Class detection analysis
    const targetClasses = selectedBase === 'pascal' ? PASCAL_TARGETS : ADE20K_TARGETS;
    const classHits = {};
    targetClasses.forEach(c => { classHits[c] = 0; });

    legends.forEach(legend => {
      Object.keys(legend).forEach(cls => {
        const clsLower = cls.toLowerCase();
        targetClasses.forEach(target => {
          if (clsLower.includes(target)) {
            classHits[target]++;
          }
        });
      });
    });

    benchResults.classDetectionRates = {};
    targetClasses.forEach(c => {
      benchResults.classDetectionRates[c] = `${classHits[c]}/${WARM_RUNS} (${Math.round(classHits[c] / WARM_RUNS * 100)}%)`;
    });

    // Include first inference legend separately
    benchResults.allDetectedClasses = [...new Set(
      legends.flatMap(l => Object.keys(l))
    )].sort();

    // 5. Memory after
    const memAfter = tf.memory();
    setMemoryAfter({ ...memAfter });
    benchResults.memoryAfter = {
      numTensors: memAfter.numTensors,
      numBytes: memAfter.numBytes,
    };
    benchResults.memoryDelta = {
      tensors: memAfter.numTensors - benchResults.memoryBefore.numTensors,
      bytes: memAfter.numBytes - benchResults.memoryBefore.numBytes,
    };

    // 6. Jank measurement
    const jank = jankRef.current;
    benchResults.jank = {
      totalFrames: jank.frames,
      droppedFrames: jank.drops,
      dropRate: jank.frames > 0
        ? `${((jank.drops / jank.frames) * 100).toFixed(1)}%`
        : 'N/A',
    };

    console.log('=== DEEPLAB BENCHMARK RESULTS ===');
    console.log(JSON.stringify(benchResults, null, 2));
    console.log('=================================');
    setResults(benchResults);
    setStatus('done');
  }, [cameraReady, selectedBase, quantBytes, drawMask]);

  // Draw the segmentation mask onto the overlay canvas
  const drawMask = useCallback((segResult) => {
    if (!maskCanvasRef.current || !segResult) return;
    const canvas = maskCanvasRef.current;
    canvas.width = segResult.width;
    canvas.height = segResult.height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(segResult.segmentationMap.buffer),
      segResult.width,
      segResult.height
    );
    ctx.putImageData(imageData, 0, 0);
    setLiveSegResult({
      legend: segResult.legend,
      width: segResult.width,
      height: segResult.height,
    });
  }, []);

  // Live segmentation loop (simulates event-triggered usage)
  const toggleLive = useCallback(async () => {
    if (isRunningLive) {
      liveRef.current = false;
      setIsRunningLive(false);
      return;
    }

    if (!modelRef.current || !cameraReady) return;
    liveRef.current = true;
    setIsRunningLive(true);

    const runFrame = async () => {
      if (!liveRef.current || !modelRef.current) return;
      try {
        const result = await modelRef.current.segment(videoRef.current);
        drawMask(result);
      } catch (err) {
        console.error('Live seg error:', err);
      }
      if (liveRef.current) {
        // Small delay to prevent 100% GPU/CPU saturation
        setTimeout(runFrame, 50);
      }
    };
    runFrame();
  }, [isRunningLive, cameraReady, drawMask]);

  // Single-shot segmentation (simulates "Reveal True Form" trigger)
  const runSingleShot = useCallback(async () => {
    if (!modelRef.current || !cameraReady) return;
    setStatus('single-shot');
    const start = performance.now();
    const result = await modelRef.current.segment(videoRef.current);
    const end = performance.now();
    drawMask(result);
    setMainThreadLag(prev => [...prev, Math.round(end - start)]);
    setStatus('done');
  }, [cameraReady, drawMask]);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="deeplab-benchmark">
      <header className="bench-header">
        <h1>🔬 DeepLab Segmentation Benchmark</h1>
        <p className="bench-subtitle">M21 Experiment — Isolated from production pipeline</p>
        <p className="bench-backend">TF.js backend: <strong>{tfBackend || 'loading...'}</strong></p>
      </header>

      <div className="bench-layout">
        {/* Video + Mask overlay */}
        <div className="bench-video-section">
          <div className="bench-video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="bench-video"
            />
            <canvas
              ref={maskCanvasRef}
              className="bench-mask-overlay"
            />
          </div>
          {!cameraReady && <p className="bench-waiting">Waiting for camera...</p>}

          {liveSegResult && (
            <div className="bench-legend">
              <h4>Detected Classes</h4>
              <div className="legend-chips">
                {Object.entries(liveSegResult.legend).map(([cls, color]) => (
                  <span
                    key={cls}
                    className="legend-chip"
                    style={{ backgroundColor: `rgb(${color.join(',')})` }}
                  >
                    {cls}
                  </span>
                ))}
              </div>
              <p className="legend-dims">
                Mask: {liveSegResult.width}×{liveSegResult.height}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bench-controls-section">
          <div className="bench-config">
            <h3>Configuration</h3>
            <label>
              Model base:
              <select value={selectedBase} onChange={e => setSelectedBase(e.target.value)}>
                <option value="pascal">Pascal VOC (bottle, chair)</option>
                <option value="ade20k">ADE20K (bottle, chair, book, computer)</option>
              </select>
            </label>
            <label>
              Quantization:
              <select value={quantBytes} onChange={e => setQuantBytes(Number(e.target.value))}>
                <option value={2}>2-byte (recommended, ~8MB)</option>
                <option value={1}>1-byte (~4MB, lower quality)</option>
                <option value={4}>4-byte (~16MB, full precision)</option>
              </select>
            </label>
          </div>

          <div className="bench-actions">
            <button
              onClick={runBenchmark}
              disabled={!cameraReady || status === 'loading-model' || status === 'warm-inference'}
              className="bench-btn bench-btn-primary"
            >
              {status === 'idle' || status === 'done' || status === 'model-error'
                ? '▶ Run Full Benchmark'
                : status === 'loading-model'
                  ? '⏳ Loading Model...'
                  : status === 'first-inference'
                    ? '⏳ First Inference...'
                    : status === 'warm-inference'
                      ? `⏳ Warm runs (${WARM_RUNS})...`
                      : '⏳ Working...'}
            </button>

            <button
              onClick={runSingleShot}
              disabled={!modelRef.current || !cameraReady}
              className="bench-btn bench-btn-secondary"
            >
              📸 Single-Shot (Reveal True Form)
            </button>

            <button
              onClick={toggleLive}
              disabled={!modelRef.current || !cameraReady}
              className={`bench-btn ${isRunningLive ? 'bench-btn-danger' : 'bench-btn-secondary'}`}
            >
              {isRunningLive ? '⏹ Stop Live' : '🔄 Live Segmentation'}
            </button>
          </div>

          {mainThreadLag.length > 0 && (
            <div className="bench-single-shots">
              <h4>Single-Shot Timings</h4>
              <p>{mainThreadLag.map(t => `${t}ms`).join(', ')}</p>
              <p className="bench-note">
                These simulate the "Reveal True Form" event trigger.
                Move the object slightly between shots to test stability.
              </p>
            </div>
          )}

          {/* Memory stats */}
          {(memoryBefore || memoryAfter) && (
            <div className="bench-memory">
              <h4>Memory (TF.js)</h4>
              <table>
                <thead>
                  <tr><th></th><th>Tensors</th><th>Bytes</th></tr>
                </thead>
                <tbody>
                  {memoryBefore && (
                    <tr>
                      <td>Before</td>
                      <td>{memoryBefore.numTensors}</td>
                      <td>{formatBytes(memoryBefore.numBytes)}</td>
                    </tr>
                  )}
                  {memoryAfter && (
                    <tr>
                      <td>After</td>
                      <td>{memoryAfter.numTensors}</td>
                      <td>{formatBytes(memoryAfter.numBytes)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Results panel */}
      {results && (
        <div className="bench-results">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Benchmark Results</h2>
            <button
              className="bench-btn bench-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                alert('Results JSON copied to clipboard');
              }}
            >
              📋 Copy JSON
            </button>
          </div>
          <div className="results-grid">
            <div className="result-card">
              <h4>Model</h4>
              <p>{results.base} / {results.quantizationBytes}-byte</p>
              <p className="result-sub">Backend: {results.backend}</p>
            </div>

            <div className="result-card">
              <h4>Model Load</h4>
              <p className="result-big">{results.modelLoadMs}ms</p>
            </div>

            <div className="result-card">
              <h4>First Inference</h4>
              <p className="result-big">{results.firstInferenceMs}ms</p>
              <p className="result-sub">Cold start (includes GPU shader compilation)</p>
            </div>

            <div className="result-card">
              <h4>Warm Inference</h4>
              <p className="result-big">{results.avgWarmMs}ms avg</p>
              <p className="result-sub">
                min: {results.minWarmMs}ms / 
                max: {results.maxWarmMs}ms / 
                median: {results.medianWarmMs}ms / 
                p95: {results.p95WarmMs}ms
              </p>
            </div>

            <div className="result-card">
              <h4>Approx FPS</h4>
              <p className="result-big">{results.approxFps} fps</p>
              <p className="result-sub">If segmentation ran continuously</p>
            </div>

            <div className="result-card">
              <h4>Main Thread Jank</h4>
              <p className="result-big">{results.jank.dropRate}</p>
              <p className="result-sub">
                {results.jank.droppedFrames}/{results.jank.totalFrames} frames dropped (&gt;50ms)
              </p>
            </div>

            <div className="result-card">
              <h4>Memory Delta</h4>
              <p className="result-big">
                {results.memoryDelta.tensors > 0 ? '+' : ''}{results.memoryDelta.tensors} tensors
              </p>
              <p className="result-sub">
                {results.memoryDelta.bytes > 0 ? '+' : ''}{formatBytes(Math.abs(results.memoryDelta.bytes))}
              </p>
            </div>

            <div className="result-card result-card-wide">
              <h4>Class Detection Rates ({WARM_RUNS} runs)</h4>
              <div className="class-rates">
                {Object.entries(results.classDetectionRates).map(([cls, rate]) => (
                  <span key={cls} className="class-rate">
                    <strong>{cls}:</strong> {rate}
                  </span>
                ))}
              </div>
              <p className="result-sub">
                All detected: {results.allDetectedClasses.join(', ')}
              </p>
            </div>

            <div className="result-card result-card-wide">
              <h4>Raw Warm Timings (ms)</h4>
              <p className="result-timings">
                {results.warmTimings.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
