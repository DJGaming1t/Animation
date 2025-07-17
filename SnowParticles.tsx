import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SnowParticlesProps {
  count: number;
  intensity: number;
  time: number;
}

/**
 * Snow particle system with realistic winter weather effects
 * Creates gentle falling snow with wind patterns and accumulation
 */
export default function SnowParticles({ count, intensity, time }: SnowParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Snow simulation data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const rotationSpeeds = new Float32Array(count);
    const densities = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);

    // Snow field bounds
    const fieldWidth = 200;
    const fieldHeight = 100;
    const fieldDepth = 200;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Distribute snow across the sky
      positions[i3] = (Math.random() - 0.5) * fieldWidth;
      positions[i3 + 1] = Math.random() * fieldHeight + 20; // Start high
      positions[i3 + 2] = (Math.random() - 0.5) * fieldDepth;

      // Gentle downward velocity with wind
      velocities[i3] = (Math.random() - 0.5) * 0.5; // Slight horizontal drift
      velocities[i3 + 1] = -Math.random() * 2 - 0.5; // Downward (0.5-2.5)
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5; // Slight horizontal drift

      // Snowflake properties
      sizes[i] = Math.random() * 0.5 + 0.2; // Small to medium snowflakes
      rotations[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = (Math.random() - 0.5) * 0.5; // Slow rotation
      densities[i] = Math.random() * 0.5 + 0.5; // Snowflake density
      lifetimes[i] = Math.random() * 20 + 30; // Long lifetime (30-50 seconds)
      ages[i] = Math.random() * lifetimes[i];
    }

    return {
      positions,
      velocities,
      sizes,
      rotations,
      rotationSpeeds,
      densities,
      lifetimes,
      ages,
      fieldWidth,
      fieldHeight,
      fieldDepth
    };
  }, [count]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('rotation', new THREE.BufferAttribute(particleData.rotations, 1));
    geo.setAttribute('rotationSpeed', new THREE.BufferAttribute(particleData.rotationSpeeds, 1));
    geo.setAttribute('density', new THREE.BufferAttribute(particleData.densities, 1));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    return geo;
  }, [particleData]);

  // Snow shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 3.0 },
        uWindStrength: { value: 1.0 },
        uTurbulence: { value: 0.5 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;
        attribute float rotation;
        attribute float rotationSpeed;
        attribute float density;
        attribute float lifetime;
        attribute float age;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        uniform float uWindStrength;
        uniform float uTurbulence;
        
        varying float vDensity;
        varying float vAge;
        varying float vRotation;
        varying vec3 vPosition;
        
        void main() {
          vec3 pos = position;
          
          // Age calculation
          float normalizedAge = age / lifetime;
          
          // Wind effect - stronger at higher altitudes
          float windEffect = (pos.y / 100.0) * uWindStrength;
          vec3 wind = vec3(
            sin(uTime * 0.3 + pos.z * 0.01) * windEffect,
            0.0,
            cos(uTime * 0.2 + pos.x * 0.01) * windEffect
          );
          pos += wind * uIntensity;
          
          // Turbulence for realistic snow movement
          vec3 turbulence = vec3(
            sin(uTime * 2.0 + pos.x * 0.1) * 0.5,
            sin(uTime * 1.5 + pos.y * 0.05) * 0.2,
            cos(uTime * 1.8 + pos.z * 0.1) * 0.5
          );
          pos += turbulence * uTurbulence * density * uIntensity;
          
          // Gravity and air resistance
          pos += velocity * age;
          
          // Slight oscillation for floating effect
          float oscillation = sin(uTime + pos.x * 0.01 + pos.z * 0.01) * 0.3;
          pos.y += oscillation * density;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on density and distance
          float pointSize = size * uSize * density;
          pointSize *= (500.0 / -mvPosition.z);
          pointSize *= (1.0 - normalizedAge * 0.2); // Slight shrinking over time
          gl_PointSize = pointSize;
          
          vDensity = density;
          vAge = normalizedAge;
          vRotation = rotation + rotationSpeed * uTime;
          vPosition = pos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        
        varying float vDensity;
        varying float vAge;
        varying float vRotation;
        varying vec3 vPosition;
        
        void main() {
          vec2 coord = gl_PointCoord - 0.5;
          
          // Rotate the snowflake
          float cosR = cos(vRotation);
          float sinR = sin(vRotation);
          coord = vec2(
            coord.x * cosR - coord.y * sinR,
            coord.x * sinR + coord.y * cosR
          );
          coord += 0.5;
          
          float distanceToCenter = distance(coord, vec2(0.5));
          
          // Create snowflake pattern
          float snowflake = 1.0 - distanceToCenter * 2.0;
          snowflake = smoothstep(0.0, 0.8, snowflake);
          
          // Add snowflake structure
          float angle = atan(coord.y - 0.5, coord.x - 0.5);
          float radius = distance(coord, vec2(0.5));
          
          // Create 6-pointed snowflake pattern
          float spikes = sin(angle * 6.0) * 0.3 + 0.7;
          spikes *= smoothstep(0.5, 0.1, radius);
          
          // Add inner detail
          float detail = sin(angle * 12.0) * 0.2 + 0.8;
          detail *= smoothstep(0.3, 0.0, radius);
          
          snowflake *= spikes * detail;
          
          // Snow color - pure white with slight blue tint
          vec3 color = vec3(0.95, 0.98, 1.0);
          
          // Add some sparkle based on density
          float sparkle = sin(uTime * 10.0 + vPosition.x + vPosition.z) * 0.1 + 0.9;
          color *= sparkle * vDensity;
          
          // Transparency based on density and age
          float alpha = snowflake * vDensity * (1.0 - vAge * 0.3);
          
          // Add atmospheric perspective
          float distance = length(vPosition);
          alpha *= smoothstep(150.0, 50.0, distance);
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
  }, [intensity]);

  // Update snow simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const velocities = meshRef.current.geometry.attributes.velocity;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;
    const rotations = meshRef.current.geometry.attributes.rotation;
    const rotationSpeeds = meshRef.current.geometry.attributes.rotationSpeed;

    // Update snow particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += delta;
      
      // Update rotation
      rotations.array[i] += rotationSpeeds.array[i] * delta;
      
      // Check if snowflake hit the ground or went out of bounds
      const hitGround = positions.array[i3 + 1] <= 0;
      const outOfBounds = Math.abs(positions.array[i3]) > particleData.fieldWidth / 2 ||
                          Math.abs(positions.array[i3 + 2]) > particleData.fieldDepth / 2;
      
      // Reset particle if too old, hit ground, or out of bounds
      if (ages.array[i] > lifetimes.array[i] || hitGround || outOfBounds) {
        ages.array[i] = 0;
        
        // Respawn at top of field
        positions.array[i3] = (Math.random() - 0.5) * particleData.fieldWidth;
        positions.array[i3 + 1] = Math.random() * particleData.fieldHeight + 20;
        positions.array[i3 + 2] = (Math.random() - 0.5) * particleData.fieldDepth;
        
        // Reset velocity
        velocities.array[i3] = (Math.random() - 0.5) * 0.5;
        velocities.array[i3 + 1] = -Math.random() * 2 - 0.5;
        velocities.array[i3 + 2] = (Math.random() - 0.5) * 0.5;
        
        // Reset rotation
        rotations.array[i] = Math.random() * Math.PI * 2;
        rotationSpeeds.array[i] = (Math.random() - 0.5) * 0.5;
      }
    }

    // Mark for update
    positions.needsUpdate = true;
    ages.needsUpdate = true;
    rotations.needsUpdate = true;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
    
    // Dynamic wind based on time
    const windStrength = 0.5 + Math.sin(time * 0.1) * 0.3;
    materialRef.current.uniforms.uWindStrength.value = windStrength;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
