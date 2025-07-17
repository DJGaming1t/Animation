import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerformanceOptimizer } from "../../utils/PerformanceOptimizer";
import { NoiseGenerator } from "../../utils/NoiseGenerator";

interface ParticleSystemProps {
  count: number;
  positions: Array<{ x: number; y: number; z: number }>;
  intensity: number;
  time: number;
}

/**
 * Advanced particle system with multiple behaviors and optimizations
 * Supports thousands of particles with efficient GPU-based rendering
 */
export default function ParticleSystem({ count, positions, intensity, time }: ParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Performance optimizer instance
  const optimizer = useMemo(() => new PerformanceOptimizer(), []);
  const noiseGen = useMemo(() => new NoiseGenerator(), []);

  // Particle data arrays
  const particleData = useMemo(() => {
    const effectiveCount = optimizer.adjustParticleCount(count);
    const positionsArray = new Float32Array(effectiveCount * 3);
    const velocitiesArray = new Float32Array(effectiveCount * 3);
    const sizesArray = new Float32Array(effectiveCount);
    const colorsArray = new Float32Array(effectiveCount * 3);
    const lifetimesArray = new Float32Array(effectiveCount);
    const agesArray = new Float32Array(effectiveCount);

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3;
      
      // Initial positions with some randomness
      const basePos = positions[i % positions.length] || { x: 0, y: 0, z: 0 };
      positionsArray[i3] = basePos.x + (Math.random() - 0.5) * 20;
      positionsArray[i3 + 1] = basePos.y + (Math.random() - 0.5) * 20;
      positionsArray[i3 + 2] = basePos.z + (Math.random() - 0.5) * 20;

      // Initial velocities
      velocitiesArray[i3] = (Math.random() - 0.5) * 2;
      velocitiesArray[i3 + 1] = Math.random() * 3 + 1;
      velocitiesArray[i3 + 2] = (Math.random() - 0.5) * 2;

      // Particle properties
      sizesArray[i] = Math.random() * 2 + 0.5;
      lifetimesArray[i] = Math.random() * 10 + 5;
      agesArray[i] = Math.random() * lifetimesArray[i];

      // Colors (will be animated)
      colorsArray[i3] = Math.random();
      colorsArray[i3 + 1] = Math.random();
      colorsArray[i3 + 2] = Math.random();
    }

    return {
      count: effectiveCount,
      positions: positionsArray,
      velocities: velocitiesArray,
      sizes: sizesArray,
      colors: colorsArray,
      lifetimes: lifetimesArray,
      ages: agesArray
    };
  }, [count, positions, optimizer]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    return geo;
  }, [particleData]);

  // Shader material for advanced particle rendering
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 1.0 },
        uOpacity: { value: 0.8 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float lifetime;
        attribute float age;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          
          // Age-based lifecycle
          float normalizedAge = age / lifetime;
          float alpha = 1.0 - normalizedAge;
          alpha *= sin(normalizedAge * 3.14159) * 2.0;
          alpha = clamp(alpha, 0.0, 1.0);
          
          // Movement with noise
          float noiseX = sin(uTime * 0.5 + pos.x * 0.01) * 5.0;
          float noiseY = cos(uTime * 0.3 + pos.y * 0.01) * 3.0;
          float noiseZ = sin(uTime * 0.7 + pos.z * 0.01) * 4.0;
          
          pos.x += noiseX * uIntensity;
          pos.y += noiseY * uIntensity;
          pos.z += noiseZ * uIntensity;
          
          // Orbital motion
          float orbitRadius = length(pos.xz);
          float orbitAngle = atan(pos.z, pos.x) + uTime * 0.1;
          pos.x = cos(orbitAngle) * orbitRadius;
          pos.z = sin(orbitAngle) * orbitRadius;
          
          // Vertical wave motion
          pos.y += sin(uTime * 2.0 + orbitRadius * 0.1) * 2.0 * uIntensity;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on distance and age
          float pointSize = size * uSize * (300.0 / -mvPosition.z);
          pointSize *= (0.5 + alpha * 0.5);
          gl_PointSize = pointSize;
          
          vColor = color;
          vAlpha = alpha;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - distanceToCenter * 2.0;
          alpha = smoothstep(0.0, 1.0, alpha);
          alpha *= vAlpha * uOpacity;
          
          // Create a more interesting particle shape
          float ring = smoothstep(0.3, 0.4, distanceToCenter) - smoothstep(0.4, 0.5, distanceToCenter);
          float core = 1.0 - smoothstep(0.0, 0.3, distanceToCenter);
          float particle = core + ring * 0.5;
          
          alpha *= particle;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }, [intensity]);

  // Particle physics and lifecycle update
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const adjustedDelta = optimizer.adjustDelta(delta);
    const positions = meshRef.current.geometry.attributes.position;
    const colors = meshRef.current.geometry.attributes.color;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;

    // Update particle system
    for (let i = 0; i < particleData.count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += adjustedDelta;
      
      // Reset particle if it's too old
      if (ages.array[i] > lifetimes.array[i]) {
        ages.array[i] = 0;
        
        // Reset position
        const basePos = positions[i % positions.length] || { x: 0, y: 0, z: 0 };
        positions.array[i3] = basePos.x + (Math.random() - 0.5) * 20;
        positions.array[i3 + 1] = basePos.y + (Math.random() - 0.5) * 20;
        positions.array[i3 + 2] = basePos.z + (Math.random() - 0.5) * 20;
      }

      // Update colors based on age and position
      const normalizedAge = ages.array[i] / lifetimes.array[i];
      const x = positions.array[i3];
      const y = positions.array[i3 + 1];
      const z = positions.array[i3 + 2];
      
      // Color cycling based on position and time
      colors.array[i3] = 0.5 + 0.5 * Math.sin(time * 0.5 + x * 0.01);
      colors.array[i3 + 1] = 0.5 + 0.5 * Math.sin(time * 0.7 + y * 0.01 + 2.0);
      colors.array[i3 + 2] = 0.5 + 0.5 * Math.sin(time * 0.3 + z * 0.01 + 4.0);
    }

    // Mark attributes for update
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    ages.needsUpdate = true;

    // Update material uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
