import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface WaterParticlesProps {
  count: number;
  intensity: number;
  time: number;
}

/**
 * Water particle system with fluid dynamics simulation
 * Creates realistic water effects including waves, splashes, and flow
 */
export default function WaterParticles({ count, intensity, time }: WaterParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { waterVertexShader, waterFragmentShader } = useShaders();

  // Water simulation data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const depths = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);
    const flow = new Float32Array(count * 3);

    // Water sources (fountains, waterfalls, streams)
    const waterSources = [
      { x: 0, y: 20, z: 0, type: 'fountain' },
      { x: -25, y: 15, z: 20, type: 'waterfall' },
      { x: 25, y: 5, z: -15, type: 'stream' },
      { x: -10, y: 10, z: -25, type: 'geyser' },
      { x: 15, y: 8, z: 25, type: 'spring' }
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const source = waterSources[i % waterSources.length];
      
      // Position based on source type
      let spreadRadius, heightVariation;
      switch (source.type) {
        case 'fountain':
          spreadRadius = 1;
          heightVariation = 2;
          break;
        case 'waterfall':
          spreadRadius = 3;
          heightVariation = 5;
          break;
        case 'stream':
          spreadRadius = 2;
          heightVariation = 1;
          break;
        case 'geyser':
          spreadRadius = 0.5;
          heightVariation = 3;
          break;
        default:
          spreadRadius = 1.5;
          heightVariation = 2;
      }
      
      positions[i3] = source.x + (Math.random() - 0.5) * spreadRadius;
      positions[i3 + 1] = source.y + Math.random() * heightVariation;
      positions[i3 + 2] = source.z + (Math.random() - 0.5) * spreadRadius;

      // Velocity based on source type
      switch (source.type) {
        case 'fountain':
          velocities[i3] = (Math.random() - 0.5) * 2;
          velocities[i3 + 1] = Math.random() * 15 + 5; // Strong upward
          velocities[i3 + 2] = (Math.random() - 0.5) * 2;
          break;
        case 'waterfall':
          velocities[i3] = (Math.random() - 0.5) * 1;
          velocities[i3 + 1] = -Math.random() * 10 - 5; // Downward
          velocities[i3 + 2] = (Math.random() - 0.5) * 1;
          break;
        case 'geyser':
          velocities[i3] = (Math.random() - 0.5) * 1;
          velocities[i3 + 1] = Math.random() * 25 + 10; // Very strong upward
          velocities[i3 + 2] = (Math.random() - 0.5) * 1;
          break;
        default:
          velocities[i3] = (Math.random() - 0.5) * 3;
          velocities[i3 + 1] = Math.random() * 5;
          velocities[i3 + 2] = (Math.random() - 0.5) * 3;
      }

      // Water properties
      sizes[i] = Math.random() * 2 + 0.5;
      depths[i] = Math.random(); // Simulates water depth/pressure
      lifetimes[i] = Math.random() * 8 + 4; // 4-12 seconds
      ages[i] = Math.random() * lifetimes[i];
      
      // Flow direction
      flow[i3] = Math.random() - 0.5;
      flow[i3 + 1] = -1; // Generally downward flow
      flow[i3 + 2] = Math.random() - 0.5;
    }

    return {
      positions,
      velocities,
      sizes,
      depths,
      lifetimes,
      ages,
      flow,
      waterSources
    };
  }, [count]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('depth', new THREE.BufferAttribute(particleData.depths, 1));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    geo.setAttribute('flow', new THREE.BufferAttribute(particleData.flow, 3));
    return geo;
  }, [particleData]);

  // Water shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 1.5 },
        uWaveHeight: { value: 2.0 },
        uWaveFrequency: { value: 0.5 },
        uFlowSpeed: { value: 1.0 }
      },
      vertexShader: waterVertexShader || `
        attribute vec3 velocity;
        attribute float size;
        attribute float depth;
        attribute float lifetime;
        attribute float age;
        attribute vec3 flow;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        uniform float uWaveHeight;
        uniform float uWaveFrequency;
        uniform float uFlowSpeed;
        
        varying float vDepth;
        varying float vAge;
        varying vec3 vPosition;
        varying float vVelocity;
        
        void main() {
          vec3 pos = position;
          
          // Age calculation
          float normalizedAge = age / lifetime;
          
          // Physics - gravity and flow
          vec3 gravity = vec3(0.0, -9.8, 0.0);
          pos += velocity * age + 0.5 * gravity * age * age;
          
          // Water flow
          pos += flow * uFlowSpeed * age;
          
          // Wave motion
          float waveX = sin(uTime * uWaveFrequency + pos.x * 0.1) * uWaveHeight * depth;
          float waveZ = cos(uTime * uWaveFrequency + pos.z * 0.1) * uWaveHeight * depth;
          pos.x += waveX * uIntensity;
          pos.z += waveZ * uIntensity;
          
          // Surface tension effects
          float surfaceTension = sin(uTime * 2.0 + pos.x * 0.2 + pos.z * 0.2) * 0.5;
          pos.y += surfaceTension * depth * uIntensity;
          
          // Turbulence based on velocity
          float turbulence = length(velocity) * 0.1;
          pos += sin(uTime * 3.0 + pos * 0.1) * turbulence * uIntensity;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on depth and age
          float pointSize = size * uSize * (1.0 + depth * 0.5);
          pointSize *= (1.0 - normalizedAge * 0.3); // Shrink as ages
          pointSize *= (300.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vDepth = depth;
          vAge = normalizedAge;
          vPosition = pos;
          vVelocity = length(velocity);
        }
      `,
      fragmentShader: waterFragmentShader || `
        uniform float uTime;
        
        varying float vDepth;
        varying float vAge;
        varying vec3 vPosition;
        varying float vVelocity;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          
          // Create water droplet shape
          float water = 1.0 - distanceToCenter * 2.0;
          water = smoothstep(0.0, 1.0, water);
          
          // Add highlight for surface tension
          float highlight = 1.0 - smoothstep(0.3, 0.5, distanceToCenter);
          
          // Water color based on depth and velocity
          vec3 deepWater = vec3(0.0, 0.2, 0.6); // Deep blue
          vec3 shallowWater = vec3(0.4, 0.8, 1.0); // Light blue
          vec3 foam = vec3(0.9, 0.95, 1.0); // White foam
          
          vec3 color = mix(deepWater, shallowWater, 1.0 - vDepth);
          
          // Add foam for high velocity
          if (vVelocity > 5.0) {
            float foamAmount = (vVelocity - 5.0) / 10.0;
            color = mix(color, foam, foamAmount);
          }
          
          // Refraction effect
          vec2 refraction = sin(uTime * 2.0 + vPosition.xz * 0.1) * 0.1;
          color.rgb += refraction.x * 0.1;
          
          // Transparency based on age and depth
          float alpha = water * (1.0 - vAge * 0.5) * (0.7 + vDepth * 0.3);
          
          // Add caustics effect
          float caustics = sin(uTime * 3.0 + vPosition.x * 0.2) * cos(uTime * 2.0 + vPosition.z * 0.2);
          caustics = smoothstep(-0.5, 0.5, caustics) * 0.3;
          color += caustics;
          
          // Highlight
          alpha += highlight * 0.3;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
  }, [intensity, waterVertexShader, waterFragmentShader]);

  // Update water simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const velocities = meshRef.current.geometry.attributes.velocity;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;
    const depths = meshRef.current.geometry.attributes.depth;

    // Update water particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += delta;
      
      // Check for collision with ground (y = 0)
      if (positions.array[i3 + 1] <= 0) {
        // Splash effect - reduce velocity and spread
        velocities.array[i3] *= 0.3;
        velocities.array[i3 + 1] = Math.abs(velocities.array[i3 + 1]) * 0.1;
        velocities.array[i3 + 2] *= 0.3;
        positions.array[i3 + 1] = 0;
      }
      
      // Reset particle if too old
      if (ages.array[i] > lifetimes.array[i]) {
        ages.array[i] = 0;
        
        // Respawn at water source
        const source = particleData.waterSources[i % particleData.waterSources.length];
        
        let spreadRadius, heightVariation;
        switch (source.type) {
          case 'fountain':
            spreadRadius = 1;
            heightVariation = 2;
            break;
          case 'waterfall':
            spreadRadius = 3;
            heightVariation = 5;
            break;
          case 'stream':
            spreadRadius = 2;
            heightVariation = 1;
            break;
          case 'geyser':
            spreadRadius = 0.5;
            heightVariation = 3;
            break;
          default:
            spreadRadius = 1.5;
            heightVariation = 2;
        }
        
        positions.array[i3] = source.x + (Math.random() - 0.5) * spreadRadius;
        positions.array[i3 + 1] = source.y + Math.random() * heightVariation;
        positions.array[i3 + 2] = source.z + (Math.random() - 0.5) * spreadRadius;
        
        // Reset velocity based on source type
        switch (source.type) {
          case 'fountain':
            velocities.array[i3] = (Math.random() - 0.5) * 2;
            velocities.array[i3 + 1] = Math.random() * 15 + 5;
            velocities.array[i3 + 2] = (Math.random() - 0.5) * 2;
            break;
          case 'waterfall':
            velocities.array[i3] = (Math.random() - 0.5) * 1;
            velocities.array[i3 + 1] = -Math.random() * 10 - 5;
            velocities.array[i3 + 2] = (Math.random() - 0.5) * 1;
            break;
          case 'geyser':
            velocities.array[i3] = (Math.random() - 0.5) * 1;
            velocities.array[i3 + 1] = Math.random() * 25 + 10;
            velocities.array[i3 + 2] = (Math.random() - 0.5) * 1;
            break;
          default:
            velocities.array[i3] = (Math.random() - 0.5) * 3;
            velocities.array[i3 + 1] = Math.random() * 5;
            velocities.array[i3 + 2] = (Math.random() - 0.5) * 3;
        }
        
        // Reset depth
        depths.array[i] = Math.random();
      }
    }

    // Mark for update
    positions.needsUpdate = true;
    velocities.needsUpdate = true;
    ages.needsUpdate = true;
    depths.needsUpdate = true;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
