import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudio } from "../../lib/stores/useAudio";
import { useAudioAnalyzer } from "../../hooks/useAudioAnalyzer";

interface AudioReactiveSystemProps {
  intensity: number;
  time: number;
}

/**
 * Audio-reactive visualization system that responds to music
 * Creates dynamic visual effects synchronized with audio frequency data
 */
export default function AudioReactiveSystem({ intensity, time }: AudioReactiveSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visualizersRef = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  
  const { backgroundMusic, isMuted } = useAudio();
  const audioAnalyzer = useAudioAnalyzer(backgroundMusic, !isMuted);

  // Audio visualization parameters
  const vizParams = useMemo(() => ({
    frequencyBands: 64,
    spectrumResolution: 256,
    smoothingFactor: 0.8,
    bassThreshold: 0.3,
    midThreshold: 0.2,
    trebleThreshold: 0.1,
    reactivityScale: 5.0
  }), []);

  // Create frequency visualizer bars
  const frequencyBars = useMemo(() => {
    const bars = [];
    const radius = 25;
    
    for (let i = 0; i < vizParams.frequencyBands; i++) {
      const angle = (i / vizParams.frequencyBands) * Math.PI * 2;
      
      bars.push({
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ),
        rotation: new THREE.Vector3(0, angle, 0),
        baseHeight: 1,
        currentHeight: 1,
        targetHeight: 1,
        frequency: i / vizParams.frequencyBands
      });
    }
    
    return bars;
  }, [vizParams.frequencyBands]);

  // Audio-reactive particles
  const audioParticles = useMemo(() => {
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const frequencies = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in sphere
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const radius = 10 + Math.random() * 30;
      
      positions[i3] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i3 + 1] = radius * Math.cos(theta);
      positions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
      
      velocities[i3] = (Math.random() - 0.5) * 2;
      velocities[i3 + 1] = (Math.random() - 0.5) * 2;
      velocities[i3 + 2] = (Math.random() - 0.5) * 2;
      
      frequencies[i] = Math.random(); // 0-1 frequency response
      sizes[i] = 1 + Math.random() * 2;
      
      // Color based on frequency
      const hue = frequencies[i];
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('frequency', new THREE.BufferAttribute(frequencies, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
  }, []);

  // Frequency bar geometries and materials
  const barGeometry = useMemo(() => {
    return new THREE.BoxGeometry(1, 1, 1);
  }, []);

  const barMaterials = useMemo(() => {
    return frequencyBars.map((bar) => {
      const hue = bar.frequency;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      
      return new THREE.MeshPhongMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.3),
        transparent: true,
        opacity: 0.8
      });
    });
  }, [frequencyBars]);

  // Audio-reactive particle material
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uBassLevel: { value: 0 },
        uMidLevel: { value: 0 },
        uTrebleLevel: { value: 0 },
        uSize: { value: 3.0 }
      },
      vertexShader: `
        attribute float frequency;
        attribute float size;
        attribute vec3 velocity;
        
        uniform float uTime;
        uniform float uAudioLevel;
        uniform float uBassLevel;
        uniform float uMidLevel;
        uniform float uTrebleLevel;
        uniform float uSize;
        
        varying vec3 vColor;
        varying float vAudioResponse;
        
        void main() {
          vec3 pos = position;
          
          // Audio-reactive movement
          float audioResponse = 0.0;
          if (frequency < 0.33) {
            audioResponse = uBassLevel;
          } else if (frequency < 0.66) {
            audioResponse = uMidLevel;
          } else {
            audioResponse = uTrebleLevel;
          }
          
          // Expand/contract based on audio
          pos += normalize(pos) * audioResponse * 10.0;
          
          // Oscillation based on frequency
          pos += velocity * sin(uTime * (1.0 + frequency * 5.0)) * audioResponse;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on audio response
          float pointSize = size * uSize * (1.0 + audioResponse * 3.0);
          pointSize *= (300.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vColor = color;
          vAudioResponse = audioResponse;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAudioResponse;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - distanceToCenter * 2.0;
          alpha = smoothstep(0.0, 1.0, alpha);
          
          // Intensity based on audio response
          vec3 color = vColor * (1.0 + vAudioResponse * 2.0);
          alpha *= (0.3 + vAudioResponse * 0.7);
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }, []);

  // Central waveform display
  const waveformGeometry = useMemo(() => {
    const segments = 128;
    const positions = new Float32Array(segments * 3);
    const indices = [];

    for (let i = 0; i < segments; i++) {
      const x = (i / (segments - 1)) * 20 - 10;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      if (i < segments - 1) {
        indices.push(i, i + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    
    return geometry;
  }, []);

  const waveformMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: "#00ffff",
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
  }, []);

  // Update audio visualization
  useFrame(() => {
    if (!groupRef.current || !audioAnalyzer) return;

    const audioData = audioAnalyzer.getFrequencyData();
    const waveformData = audioAnalyzer.getWaveformData();
    const averageLevel = audioAnalyzer.getAverageLevel();
    const bassLevel = audioAnalyzer.getBassLevel();
    const midLevel = audioAnalyzer.getMidLevel();
    const trebleLevel = audioAnalyzer.getTrebleLevel();

    // Update frequency bars
    frequencyBars.forEach((bar, index) => {
      const mesh = visualizersRef.current[index];
      if (!mesh || !audioData) return;

      // Map frequency bands to audio data
      const dataIndex = Math.floor((index / vizParams.frequencyBands) * audioData.length);
      const frequencyValue = audioData[dataIndex] / 255;
      
      // Smooth the height changes
      bar.targetHeight = bar.baseHeight + frequencyValue * vizParams.reactivityScale * intensity;
      bar.currentHeight += (bar.targetHeight - bar.currentHeight) * vizParams.smoothingFactor;
      
      // Update mesh
      mesh.scale.y = bar.currentHeight;
      mesh.position.y = bar.currentHeight / 2;
      
      // Update material opacity and emissive based on frequency
      const material = mesh.material as THREE.MeshPhongMaterial;
      material.opacity = 0.5 + frequencyValue * 0.5;
      material.emissiveIntensity = frequencyValue * 0.8;
    });

    // Update audio-reactive particles
    if (particleMaterial.uniforms) {
      particleMaterial.uniforms.uTime.value = time;
      particleMaterial.uniforms.uAudioLevel.value = averageLevel;
      particleMaterial.uniforms.uBassLevel.value = bassLevel;
      particleMaterial.uniforms.uMidLevel.value = midLevel;
      particleMaterial.uniforms.uTrebleLevel.value = trebleLevel;
    }

    // Update waveform visualization
    if (waveformData && waveformGeometry.attributes.position) {
      const positions = waveformGeometry.attributes.position;
      const segments = positions.count;
      
      for (let i = 0; i < segments; i++) {
        const dataIndex = Math.floor((i / segments) * waveformData.length);
        const amplitude = (waveformData[dataIndex] - 128) / 128;
        
        positions.setY(i, amplitude * 5 * intensity);
      }
      
      positions.needsUpdate = true;
    }

    // Global audio-reactive effects
    if (groupRef.current) {
      // Rotate the entire visualization based on bass
      groupRef.current.rotation.y = time * 0.1 + bassLevel * 2;
      
      // Scale based on overall audio level
      const scale = 1 + averageLevel * 0.5;
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Frequency visualization bars */}
      {frequencyBars.map((bar, index) => (
        <mesh
          key={bar.id}
          ref={(mesh) => {
            if (mesh) visualizersRef.current[index] = mesh;
          }}
          geometry={barGeometry}
          material={barMaterials[index]}
          position={bar.position}
          rotation={bar.rotation}
          castShadow
        />
      ))}
      
      {/* Audio-reactive particles */}
      <points
        ref={particlesRef}
        geometry={audioParticles}
        material={particleMaterial}
      />
      
      {/* Central waveform display */}
      <line geometry={waveformGeometry} material={waveformMaterial} />
      
      {/* Audio spectrum circular display */}
      <group>
        {Array.from({ length: 32 }, (_, i) => {
          const angle = (i / 32) * Math.PI * 2;
          const radius = 15;
          
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
              ]}
              rotation={[0, angle, 0]}
            >
              <planeGeometry args={[0.5, 5]} />
              <meshBasicMaterial
                color="#ff4400"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
