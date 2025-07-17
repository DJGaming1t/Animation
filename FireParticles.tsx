import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface FireParticlesProps {
  count: number;
  intensity: number;
  time: number;
}

/**
 * Fire particle system with realistic fire behavior
 * Uses custom shaders for heat distortion and flame effects
 */
export default function FireParticles({ count, intensity, time }: FireParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { fireVertexShader, fireFragmentShader } = useShaders();

  // Fire particle data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const temperatures = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);

    // Fire sources (multiple campfires)
    const fireSources = [
      { x: 0, y: 0, z: 0 },
      { x: -15, y: 0, z: 10 },
      { x: 15, y: 0, z: -10 },
      { x: 8, y: 0, z: 15 },
      { x: -8, y: 0, z: -15 }
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const source = fireSources[i % fireSources.length];
      
      // Position particles around fire sources
      const radius = Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      
      positions[i3] = source.x + Math.cos(angle) * radius;
      positions[i3 + 1] = source.y + Math.random() * 0.5;
      positions[i3 + 2] = source.z + Math.sin(angle) * radius;

      // Upward velocity with some randomness
      velocities[i3] = (Math.random() - 0.5) * 1.0;
      velocities[i3 + 1] = Math.random() * 8 + 2; // Strong upward motion
      velocities[i3 + 2] = (Math.random() - 0.5) * 1.0;

      // Fire properties
      sizes[i] = Math.random() * 3 + 1;
      temperatures[i] = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
      lifetimes[i] = Math.random() * 3 + 2; // 2-5 seconds
      ages[i] = Math.random() * lifetimes[i];
    }

    return {
      positions,
      velocities,
      sizes,
      temperatures,
      lifetimes,
      ages,
      fireSources
    };
  }, [count]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('temperature', new THREE.BufferAttribute(particleData.temperatures, 1));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    return geo;
  }, [particleData]);

  // Fire shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 2.0 },
        uHeatDistortion: { value: 0.5 }
      },
      vertexShader: fireVertexShader || `
        attribute vec3 velocity;
        attribute float size;
        attribute float temperature;
        attribute float lifetime;
        attribute float age;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        uniform float uHeatDistortion;
        
        varying float vTemperature;
        varying float vAge;
        varying vec3 vPosition;
        
        void main() {
          vec3 pos = position;
          
          // Age calculation
          float normalizedAge = age / lifetime;
          
          // Fire physics - upward movement with turbulence
          pos += velocity * age;
          
          // Heat-based turbulence
          float turbulence = sin(uTime * 3.0 + pos.x * 0.1) * cos(uTime * 2.0 + pos.z * 0.1);
          pos.x += turbulence * temperature * 2.0 * uHeatDistortion;
          pos.z += turbulence * temperature * 1.5 * uHeatDistortion;
          
          // Cooling expansion as fire rises
          float expansion = normalizedAge * temperature * 3.0;
          pos.x += sin(uTime + pos.y * 0.1) * expansion;
          pos.z += cos(uTime + pos.y * 0.1) * expansion;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size increases as fire cools and expands
          float pointSize = size * uSize * (1.0 + normalizedAge * 2.0);
          pointSize *= temperature; // Hotter = smaller, more intense
          pointSize *= (200.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vTemperature = temperature;
          vAge = normalizedAge;
          vPosition = pos;
        }
      `,
      fragmentShader: fireFragmentShader || `
        uniform float uTime;
        
        varying float vTemperature;
        varying float vAge;
        varying vec3 vPosition;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          
          // Create fire-like shape
          float fire = 1.0 - distanceToCenter * 2.0;
          fire = smoothstep(0.0, 1.0, fire);
          
          // Temperature-based color
          vec3 hotColor = vec3(1.0, 1.0, 0.8); // White-yellow
          vec3 mediumColor = vec3(1.0, 0.5, 0.1); // Orange
          vec3 coolColor = vec3(1.0, 0.1, 0.0); // Red
          vec3 smokeColor = vec3(0.3, 0.3, 0.3); // Gray
          
          vec3 color;
          if (vTemperature > 0.8) {
            color = mix(mediumColor, hotColor, (vTemperature - 0.8) * 5.0);
          } else if (vTemperature > 0.5) {
            color = mix(coolColor, mediumColor, (vTemperature - 0.5) * 3.33);
          } else {
            color = mix(smokeColor, coolColor, vTemperature * 2.0);
          }
          
          // Age affects transparency and color
          float alpha = fire * (1.0 - vAge) * vTemperature;
          
          // Add flickering
          float flicker = sin(uTime * 10.0 + vPosition.x + vPosition.z) * 0.1 + 0.9;
          alpha *= flicker;
          
          // Smoke transition
          if (vAge > 0.7) {
            color = mix(color, smokeColor, (vAge - 0.7) * 3.33);
            alpha *= 0.5;
          }
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [intensity, fireVertexShader, fireFragmentShader]);

  // Update fire simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const velocities = meshRef.current.geometry.attributes.velocity;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;
    const temperatures = meshRef.current.geometry.attributes.temperature;

    // Update fire particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += delta;
      
      // Reset particle if too old
      if (ages.array[i] > lifetimes.array[i]) {
        ages.array[i] = 0;
        
        // Respawn at fire source
        const source = particleData.fireSources[i % particleData.fireSources.length];
        const radius = Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        
        positions.array[i3] = source.x + Math.cos(angle) * radius;
        positions.array[i3 + 1] = source.y + Math.random() * 0.5;
        positions.array[i3 + 2] = source.z + Math.sin(angle) * radius;
        
        // Reset velocity
        velocities.array[i3] = (Math.random() - 0.5) * 1.0;
        velocities.array[i3 + 1] = Math.random() * 8 + 2;
        velocities.array[i3 + 2] = (Math.random() - 0.5) * 1.0;
        
        // Reset temperature
        temperatures.array[i] = Math.random() * 0.5 + 0.5;
      }

      // Update temperature (cooling over time)
      const normalizedAge = ages.array[i] / lifetimes.array[i];
      temperatures.array[i] = Math.max(0.1, 1.0 - normalizedAge * 0.8);
    }

    // Mark for update
    positions.needsUpdate = true;
    ages.needsUpdate = true;
    temperatures.needsUpdate = true;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
