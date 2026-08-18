import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SPELLS } from './spells';
import './ARTransformationCanvas.css';

/**
 * 3D AR Transformation & WebGL Shader / GPU Particle System (M26 & M27)
 *
 * Synchronizes 3D procedural magical artifacts over tracked 2D bounding boxes.
 * Handles GPU particle explosions when spells are cast and materialization shaders.
 */
export default function ARTransformationCanvas({ activeDetections, castingTracks = new Set(), enabled = true }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsGroupMapRef = useRef(new Map()); // trackId -> THREE.Group
  const particleBurstsRef = useRef(new Set()); // active particle systems
  const lastCastingTracksRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Initialize Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const fov = 50;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    const cameraZ = 500;
    camera.position.set(0, 0, cameraZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xf59e0b, 2.5, 900);
    pointLight.position.set(0, 0, 400);
    scene.add(pointLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(250, 350, 250);
    scene.add(dirLight);

    // 3. Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 4. Animation loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Animate active 3D artifacts
      objectsGroupMapRef.current.forEach((group) => {
        if (group.userData.animate) {
          group.userData.animate(elapsedTime);
        }
      });

      // Animate active GPU particle bursts
      particleBurstsRef.current.forEach((burst) => {
        burst.update(delta);
        if (burst.isDead) {
          scene.remove(burst.mesh);
          burst.dispose();
          particleBurstsRef.current.delete(burst);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      scene.clear();
      objectsGroupMapRef.current.clear();
      particleBurstsRef.current.clear();
    };
  }, [enabled]);

  // Handle active detections update
  useEffect(() => {
    if (!enabled || !sceneRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const fovRad = (camera.fov * Math.PI) / 180;
    const cameraZ = camera.position.z;
    const viewportH = 2 * Math.tan(fovRad / 2) * cameraZ;
    const viewportW = viewportH * (screenW / screenH);

    const activeTrackIds = new Set();

    activeDetections.forEach((det) => {
      const trackId = det.id;
      activeTrackIds.add(trackId);

      const { x, y, width: boxW, height: boxH } = det.box;
      const objectClass = det.class;
      const spell = SPELLS[objectClass] || {};
      const themeColor = spell.color || '#38bdf8';

      // Map 2D screen bbox center to 3D world position
      const centerX = x + boxW / 2;
      const centerY = y + boxH / 2;

      const dx = centerX - screenW / 2;
      const dy = screenH / 2 - centerY;

      const worldX = (dx / screenW) * viewportW;
      const worldY = (dy / screenH) * viewportH;
      const worldZ = 0;

      const targetScaleX = (boxW / screenW) * viewportW;
      const targetScaleY = (boxH / screenH) * viewportH;

      let group = objectsGroupMapRef.current.get(trackId);

      if (!group) {
        // Build 3D Magical Artifact Mesh for object class
        group = create3DArtifactMesh(objectClass, themeColor);
        group.position.set(worldX, worldY, worldZ);
        group.scale.set(targetScaleX, targetScaleY, Math.max(targetScaleX, targetScaleY));
        scene.add(group);
        objectsGroupMapRef.current.set(trackId, group);

        // Materialization particle burst on discovery
        spawnParticleBurst(scene, worldX, worldY, worldZ, themeColor, 50);
      } else {
        // Smoothly interpolate position & scale towards tracked bbox
        group.position.x += (worldX - group.position.x) * 0.3;
        group.position.y += (worldY - group.position.y) * 0.3;
        
        const currentScale = Math.max(targetScaleX, targetScaleY);
        group.scale.x += (targetScaleX - group.scale.x) * 0.3;
        group.scale.y += (targetScaleY - group.scale.y) * 0.3;
        group.scale.z += (currentScale - group.scale.z) * 0.3;

        // Materialization opacity scaling during reveal phase
        const phase = det.phase;
        if (phase === 'discovering') {
          setGroupOpacity(group, 0.4);
        } else if (phase === 'transforming') {
          setGroupOpacity(group, 0.75);
        } else {
          setGroupOpacity(group, 0.95);
        }
      }
    });

    // Remove artifacts for tracks that are no longer active
    objectsGroupMapRef.current.forEach((group, id) => {
      if (!activeTrackIds.has(id)) {
        scene.remove(group);
        disposeGroup(group);
        objectsGroupMapRef.current.delete(id);
      }
    });
  }, [activeDetections, enabled]);

  // Handle Spell Cast Particle Bursts
  useEffect(() => {
    if (!enabled || !sceneRef.current) return;

    castingTracks.forEach((trackId) => {
      if (!lastCastingTracksRef.current.has(trackId)) {
        const group = objectsGroupMapRef.current.get(trackId);
        const det = activeDetections.find((d) => d.id === trackId);
        if (group && det) {
          const spell = SPELLS[det.class] || {};
          const themeColor = spell.color || '#f59e0b';
          // Trigger intensive GPU particle explosion from artifact center
          spawnParticleBurst(
            sceneRef.current,
            group.position.x,
            group.position.y,
            group.position.z,
            themeColor,
            120
          );
        }
      }
    });

    lastCastingTracksRef.current = new Set(castingTracks);
  }, [castingTracks, activeDetections, enabled]);

  function spawnParticleBurst(scene, x, y, z, colorHex, count = 80) {
    const burst = new GPUParticleBurst(x, y, z, colorHex, count);
    scene.add(burst.mesh);
    particleBurstsRef.current.add(burst);
  }

  return (
    <canvas
      ref={canvasRef}
      className="ar-transformation-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 43
      }}
    />
  );
}

/**
 * GPU Particle Burst Emitter System
 */
class GPUParticleBurst {
  constructor(x, y, z, colorHex, count = 80) {
    this.life = 0;
    this.maxLife = 1.2; // seconds
    this.isDead = false;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const color = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Radial spherical velocity distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 120 + Math.random() * 250;

      velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      velocities[i * 3 + 2] = speed * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.velocities = velocities;

    const material = new THREE.PointsMaterial({
      color,
      size: 14,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(geometry, material);
    this.geometry = geometry;
    this.material = material;
  }

  update(delta) {
    this.life += delta;
    if (this.life >= this.maxLife) {
      this.isDead = true;
      return;
    }

    const progress = this.life / this.maxLife;
    this.material.opacity = (1 - progress) * 0.9;
    this.material.size = 14 * (1 - progress * 0.5);

    const positions = this.geometry.attributes.position.array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += this.velocities[i * 3] * delta;
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          m.transparent = true;
          m.opacity = opacity;
        });
      } else {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    }
  });
}

/**
 * Creates a procedural 3D magical artifact mesh based on object class
 */
function create3DArtifactMesh(objectClass, colorHex) {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  if (objectClass === 'bottle') {
    // 3D Elixir Flask with liquid shimmer and outer wireframe runic tori
    const glassGeo = new THREE.CylinderGeometry(0.2, 0.45, 1.0, 16);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
      thickness: 0.5
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    group.add(glassMesh);

    // Inner Liquid
    const liquidGeo = new THREE.CylinderGeometry(0.18, 0.4, 0.6, 16);
    const liquidMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = -0.15;
    group.add(liquidMesh);

    // Runic Ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.02, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    group.userData.animate = (time) => {
      ringMesh.rotation.z = time * 0.8;
      glassMesh.rotation.y = time * 0.3;
      liquidMesh.position.y = -0.15 + Math.sin(time * 3) * 0.03;
    };
  } else if (objectClass === 'book') {
    // 3D Ancient Spellbook with floating glowing pages
    const coverGeo = new THREE.BoxGeometry(0.8, 1.0, 0.2);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.4
    });
    const coverMesh = new THREE.Mesh(coverGeo, coverMat);
    group.add(coverMesh);

    const pageGeo = new THREE.BoxGeometry(0.75, 0.95, 0.16);
    const pageMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const pageMesh = new THREE.Mesh(pageGeo, pageMat);
    pageMesh.position.z = 0.02;
    group.add(pageMesh);

    // Floating Runic Orbs
    const orbGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const orbGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({ color });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      const angle = (i / 4) * Math.PI * 2;
      orbMesh.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0);
      orbGroup.add(orbMesh);
    }
    group.add(orbGroup);

    group.userData.animate = (time) => {
      coverMesh.rotation.y = Math.sin(time * 1.5) * 0.2;
      orbGroup.rotation.z = time * 1.2;
    };
  } else if (objectClass === 'cell phone') {
    // 3D Crystal Oracle Mirror
    const crystalGeo = new THREE.OctahedronGeometry(0.6, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      wireframe: true
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    group.add(crystalMesh);

    const innerGeo = new THREE.OctahedronGeometry(0.3, 0);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    group.userData.animate = (time) => {
      crystalMesh.rotation.x = time * 0.6;
      crystalMesh.rotation.y = time * 0.9;
      innerMesh.rotation.y = -time * 1.2;
    };
  } else if (objectClass === 'cup') {
    // 3D Steaming Cauldron
    const cauldronGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const cauldronMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.8,
      roughness: 0.3
    });
    const cauldronMesh = new THREE.Mesh(cauldronGeo, cauldronMat);
    group.add(cauldronMesh);

    const rimGeo = new THREE.TorusGeometry(0.5, 0.05, 12, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.35;
    group.add(rimMesh);

    const glowGeo = new THREE.CircleGeometry(0.45, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.3;
    group.add(glowMesh);

    group.userData.animate = (time) => {
      cauldronMesh.rotation.y = time * 0.4;
      glowMesh.scale.setScalar(0.9 + Math.sin(time * 4) * 0.1);
    };
  } else {
    // Generic Enchanted Arcane Monolith / Relic for other object classes
    const polyGeo = new THREE.IcosahedronGeometry(0.5, 0);
    const polyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      flatShading: true
    });
    const polyMesh = new THREE.Mesh(polyGeo, polyMat);
    group.add(polyMesh);

    const wireGeo = new THREE.IcosahedronGeometry(0.65, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    group.userData.animate = (time) => {
      polyMesh.rotation.x = time * 0.5;
      polyMesh.rotation.y = time * 0.8;
      wireMesh.rotation.x = -time * 0.3;
      wireMesh.rotation.y = -time * 0.6;
    };
  }

  return group;
}

function disposeGroup(group) {
  group.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}
