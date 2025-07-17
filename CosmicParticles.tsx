import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface CosmicParticlesProps {
  count: number;
  intensity: number;
  time: number;
}

/**
 * Cosmic particle system simulating space phenomena
 * Creates stellar dust, nebulae, star formation, and cosmic rays
 */
export default function CosmicParticles({ count, intensity, time }: CosmicParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { cosmicVertexShader, cosmicFragmentShader } = useShaders();

  // Cosmic simulation data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const energies = new Float32Array(count);
    const types = new Float32Array(count); // 0: dust, 1: star, 2: gas, 3: cosmic ray
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);
    const orbitalRadii = new Float32Array(count);
    const orbitalSpeeds = new Float32Array(count);

    // Cosmic structures
    const galaxyCenter = { x: 0, y: 0, z: 0 };
    const spiralArms = 4;
    const galaxyRadius = 150;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Determine particle type
      const rand = Math.random();
      let particleType;
      if (rand < 0.4) particleType = 0; // Dust (40%)
      else if (rand < 0.6) particleType = 1; // Stars (20%)
      else if (rand < 0.85) particleType = 2; // Gas (25%)
      else particleType = 3; // Cosmic rays (15%)
      
      types[i] = particleType;

      // Position based on galaxy structure
      if (particleType === 3) {
        // Cosmic rays - more spread out
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = Math.random() * galaxyRadius * 2;
        
        positions[i3] = galaxyCenter.x + radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = galaxyCenter.y + radius * Math.cos(phi);
        positions[i3 + 2] = galaxyCenter.z + radius * Math.sin(phi) * Math.sin(theta);
      } else {
        // Spiral galaxy distribution
        const armIndex = Math.floor(Math.random() * spiralArms);
        const armAngle = (armIndex / spiralArms) * Math.PI * 2;
        const spiralTightness = 0.3;
        const radius = Math.random() * galaxyRadius;
        const angle = armAngle + radius * spiralTightness + (Math.random() - 0.5) * 0.5;
        
        positions[i3] = galaxyCenter.x + radius * Math.cos(angle);
        positions[i3 + 1] = galaxyCenter.y + (Math.random() - 0.5) * 10; // Disk thickness
        positions[i3 + 2] = galaxyCenter.z + radius * Math.sin(angle);
      }

      // Orbital properties
      orbitalRadii[i] = Math.sqrt(
        Math.pow(positions[i3] - galaxyCenter.x, 2) +
        Math.pow(positions[i3 + 2] - galaxyCenter.z, 2)
      );
      orbitalSpeeds[i] = (1.0 / Math.max(orbitalRadii[i], 1.0)) * 0.1; // Slower for outer particles

      // Velocities based on type and orbital motion
      switch (particleType) {
        case 0: // Dust
          velocities[i3] = (Math.random() - 0.5) * 0.5;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
          break;
        case 1: // Stars
          velocities[i3] = (Math.random() - 0.5) * 0.1;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
          break;
        case 2: // Gas
          velocities[i3] = (Math.random() - 0.5) * 2.0;
          velocities[i3 + 1] = (Math.random() - 0.5) * 1.0;
          velocities[i3 + 2] = (Math.random() - 0.5) * 2.0;
          break;
        case 3: // Cosmic rays
          velocities[i3] = (Math.random() - 0.5) * 10.0;
          velocities[i3 + 1] = (Math.random() - 0.5) * 10.0;
          velocities[i3 + 2] = (Math.random() - 0.5) * 10.0;
          break;
      }

      // Properties based on type
      switch (particleType) {
        case 0: // Dust
          sizes[i] = Math.random() * 0.5 + 0.2;
          energies[i] = Math.random() * 0.3 + 0.1;
          lifetimes[i] = Math.random() * 100 + 50;
          break;
        case 1: // Stars
          sizes[i] = Math.random() * 3.0 + 1.0;
          energies[i] = Math.random() * 0.8 + 0.7;
          lifetimes[i] = Math.random() * 200 + 100;
          break;
        case 2: // Gas
          sizes[i] = Math.random() * 2.0 + 0.5;
          energies[i] = Math.random() * 0.5 + 0.2;
          lifetimes[i] = Math.random() * 80 + 40;
          break;
        case 3: // Cosmic rays
          sizes[i] = Math.random() * 0.3 + 0.1;
          energies[i] = Math.random() * 0.9 + 0.8;
          lifetimes[i] = Math.random() * 20 + 10;
          break;
      }

      ages[i] = Math.random() * lifetimes[i];
    }

    return {
      positions,
      velocities,
      sizes,
      energies,
      types,
      lifetimes,
      ages,
      orbitalRadii,
      orbitalSpeeds,
      galaxyCenter,
      galaxyRadius
    };
  }, [count]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('energy', new THREE.BufferAttribute(particleData.energies, 1));
    geo.setAttribute('particleType', new THREE.BufferAttribute(particleData.types, 1));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    geo.setAttribute('orbitalRadius', new THREE.BufferAttribute(particleData.orbitalRadii, 1));
    geo.setAttribute('orbitalSpeed', new THREE.BufferAttribute(particleData.orbitalSpeeds, 1));
    return geo;
  }, [particleData]);

  // Cosmic shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 2.0 },
        uGalaxyRotation: { value: 0.0 },
        uCosmicEnergy: { value: 1.0 }
      },
      vertexShader: cosmicVertexShader || `
        attribute vec3 velocity;
        attribute float size;
        attribute float energy;
        attribute float particleType;
        attribute float lifetime;
        attribute float age;
        attribute float orbitalRadius;
        attribute float orbitalSpeed;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        uniform float uGalaxyRotation;
        uniform float uCosmicEnergy;
        
        varying float vEnergy;
        varying float vAge;
        varying float vType;
        varying vec3 vPosition;
        
        void main() {
          vec3 pos = position;
          
          // Age calculation
          float normalizedAge = age / lifetime;
          
          // Orbital motion around galaxy center
          if (particleType < 3.0) { // Not cosmic rays
            float currentAngle = atan(pos.z, pos.x) + orbitalSpeed * uTime * uGalaxyRotation;
            pos.x = cos(currentAngle) * orbitalRadius;
            pos.z = sin(currentAngle) * orbitalRadius;
          }
          
          // Movement based on velocity
          pos += velocity * age * uIntensity;
          
          // Gravitational effects towards galaxy center
          if (particleType < 2.0) { // Dust and stars
            vec3 toCenter = -normalize(pos);
            float gravityStrength = 1.0 / max(length(pos), 1.0);
            pos += toCenter * gravityStrength * age * 0.1;
          }
          
          // Cosmic phenomena
          if (particleType == 2.0) { // Gas - turbulent motion
            vec3 turbulence = vec3(
              sin(uTime * 0.5 + pos.x * 0.01),
              sin(uTime * 0.7 + pos.y * 0.01),
              sin(uTime * 0.3 + pos.z * 0.01)
            );
            pos += turbulence * energy * 5.0 * uIntensity;
          }
          
          if (particleType == 3.0) { // Cosmic rays - high speed linear motion
            pos += velocity * uTime * 0.5;
          }
          
          // Stellar evolution for stars
          if (particleType == 1.0) {
            float evolutionPhase = normalizedAge;
            if (evolutionPhase > 0.8) {
              // Supernova expansion
              float expansion = (evolutionPhase - 0.8) * 5.0;
              pos += normalize(pos) * expansion * energy * 10.0;
            }
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on type and energy
          float pointSize = size * uSize;
          if (particleType == 1.0) { // Stars
            pointSize *= (1.0 + energy * 2.0);
            if (normalizedAge > 0.8) {
              pointSize *= (1.0 + (normalizedAge - 0.8) * 10.0); // Supernova
            }
          } else if (particleType == 3.0) { // Cosmic rays
            pointSize *= (1.0 + energy * 0.5);
          }
          pointSize *= (1000.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vEnergy = energy;
          vAge = normalizedAge;
          vType = particleType;
          vPosition = pos;
        }
      `,
      fragmentShader: cosmicFragmentShader || `
        uniform float uTime;
        uniform float uCosmicEnergy;
        
        varying float vEnergy;
        varying float vAge;
        varying float vType;
        varying vec3 vPosition;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          
          vec3 color;
          float alpha;
          
          if (vType < 0.5) { // Dust
            color = vec3(0.4, 0.3, 0.2); // Brown dust
            float dust = 1.0 - distanceToCenter * 2.0;
            alpha = smoothstep(0.0, 1.0, dust) * (1.0 - vAge * 0.5) * 0.3;
          }
          else if (vType < 1.5) { // Stars
            // Star color based on energy (temperature)
            if (vEnergy > 0.8) {
              color = vec3(0.9, 0.9, 1.0); // Blue-white hot stars
            } else if (vEnergy > 0.6) {
              color = vec3(1.0, 1.0, 0.8); // White stars
            } else if (vEnergy > 0.4) {
              color = vec3(1.0, 0.9, 0.6); // Yellow stars
            } else {
              color = vec3(1.0, 0.6, 0.4); // Red stars
            }
            
            // Create star shape with rays
            float star = 1.0 - distanceToCenter * 2.0;
            star = smoothstep(0.0, 1.0, star);
            
            // Add stellar flare
            float flare = 1.0 - smoothstep(0.0, 0.8, distanceToCenter);
            star += flare * 0.3;
            
            alpha = star * vEnergy;
            
            // Supernova effect
            if (vAge > 0.8) {
              float explosion = (vAge - 0.8) * 5.0;
              color = mix(color, vec3(1.0, 0.8, 0.6), explosion);
              alpha *= (1.0 + explosion * 3.0);
            }
            
            // Twinkling effect
            float twinkle = sin(uTime * 5.0 + vPosition.x + vPosition.y + vPosition.z) * 0.2 + 0.8;
            alpha *= twinkle;
          }
          else if (vType < 2.5) { // Gas
            // Nebula colors
            vec3 nebulaColor1 = vec3(0.8, 0.2, 0.6); // Magenta
            vec3 nebulaColor2 = vec3(0.2, 0.6, 0.8); // Cyan
            vec3 nebulaColor3 = vec3(0.6, 0.8, 0.2); // Green
            
            float colorPhase = sin(uTime * 0.3 + vPosition.x * 0.01) * 0.5 + 0.5;
            if (colorPhase < 0.33) {
              color = nebulaColor1;
            } else if (colorPhase < 0.66) {
              color = nebulaColor2;
            } else {
              color = nebulaColor3;
            }
            
            float gas = 1.0 - smoothstep(0.0, 1.0, distanceToCenter);
            alpha = gas * vEnergy * 0.6;
            
            // Add turbulent structure
            float turbulence = sin(uTime + vPosition.x * 0.1) * cos(uTime + vPosition.z * 0.1);
            alpha *= (0.7 + turbulence * 0.3);
          }
          else { // Cosmic rays
            color = vec3(0.9, 0.7, 1.0); // Purple-white
            
            // Create streak effect
            float streak = 1.0 - abs(gl_PointCoord.y - 0.5) * 4.0;
            streak = smoothstep(0.0, 1.0, streak);
            
            alpha = streak * vEnergy * 0.8;
            
            // High energy glow
            float glow = 1.0 - smoothstep(0.0, 0.7, distanceToCenter);
            alpha += glow * vEnergy * 0.5;
          }
          
          // Apply cosmic energy modifier
          alpha *= uCosmicEnergy;
          
          // Distance fade
          float distance = length(vPosition);
          alpha *= smoothstep(300.0, 100.0, distance);
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [intensity, cosmicVertexShader, cosmicFragmentShader]);

  // Update cosmic simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;
    const velocities = meshRef.current.geometry.attributes.velocity;
    const types = meshRef.current.geometry.attributes.particleType;

    // Update cosmic particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += delta;
      
      // Reset particle if too old
      if (ages.array[i] > lifetimes.array[i]) {
        ages.array[i] = 0;
        
        // Respawn based on type
        const particleType = types.array[i];
        
        if (particleType === 3) {
          // Cosmic rays - respawn from edge
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const radius = particleData.galaxyRadius * 1.5;
          
          positions.array[i3] = radius * Math.sin(phi) * Math.cos(theta);
          positions.array[i3 + 1] = radius * Math.cos(phi);
          positions.array[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        } else {
          // Other particles - respawn in galaxy
          const armIndex = Math.floor(Math.random() * 4);
          const armAngle = (armIndex / 4) * Math.PI * 2;
          const spiralTightness = 0.3;
          const radius = Math.random() * particleData.galaxyRadius;
          const angle = armAngle + radius * spiralTightness + (Math.random() - 0.5) * 0.5;
          
          positions.array[i3] = radius * Math.cos(angle);
          positions.array[i3 + 1] = (Math.random() - 0.5) * 10;
          positions.array[i3 + 2] = radius * Math.sin(angle);
        }
      }
    }

    // Mark for update
    positions.needsUpdate = true;
    ages.needsUpdate = true;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
    materialRef.current.uniforms.uGalaxyRotation.value = 1.0;
    materialRef.current.uniforms.uCosmicEnergy.value = 0.5 + Math.sin(time * 0.2) * 0.3;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
