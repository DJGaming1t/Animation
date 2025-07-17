import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface PlasmaParticlesProps {
  count: number;
  intensity: number;
  time: number;
}

/**
 * Plasma particle system simulating high-energy electromagnetic phenomena
 * Creates electric arcs, plasma fields, and electromagnetic disturbances
 */
export default function PlasmaParticles({ count, intensity, time }: PlasmaParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { plasmaVertexShader, plasmaFragmentShader } = useShaders();

  // Plasma simulation data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const charges = new Float32Array(count); // Positive or negative charge
    const energies = new Float32Array(count);
    const magneticField = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);

    // Plasma generators (electromagnetic sources)
    const plasmaGenerators = [
      { x: 0, y: 15, z: 0, strength: 1.0, type: 'tesla_coil' },
      { x: -20, y: 10, z: 15, strength: 0.8, type: 'plasma_ball' },
      { x: 20, y: 12, z: -15, strength: 0.9, type: 'arc_generator' },
      { x: 0, y: 25, z: 20, strength: 1.2, type: 'van_de_graaff' },
      { x: -15, y: 8, z: -20, strength: 0.7, type: 'plasma_field' }
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const generator = plasmaGenerators[i % plasmaGenerators.length];
      
      // Position around electromagnetic sources
      const radius = Math.random() * 5 + 1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = generator.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = generator.y + radius * Math.cos(phi);
      positions[i3 + 2] = generator.z + radius * Math.sin(phi) * Math.sin(theta);

      // Random charge distribution
      charges[i] = Math.random() > 0.5 ? 1.0 : -1.0;
      
      // Initial velocity based on electromagnetic forces
      const chargeInfluence = charges[i] * generator.strength;
      velocities[i3] = (Math.random() - 0.5) * 5.0 * chargeInfluence;
      velocities[i3 + 1] = (Math.random() - 0.5) * 5.0 * chargeInfluence;
      velocities[i3 + 2] = (Math.random() - 0.5) * 5.0 * chargeInfluence;

      // Particle properties
      sizes[i] = Math.random() * 1.5 + 0.5;
      energies[i] = Math.random() * 0.8 + 0.2;
      lifetimes[i] = Math.random() * 5 + 2; // 2-7 seconds
      ages[i] = Math.random() * lifetimes[i];

      // Magnetic field direction (simplified)
      magneticField[i3] = (Math.random() - 0.5) * 2.0;
      magneticField[i3 + 1] = 1.0; // Generally upward
      magneticField[i3 + 2] = (Math.random() - 0.5) * 2.0;
    }

    return {
      positions,
      velocities,
      sizes,
      charges,
      energies,
      magneticField,
      lifetimes,
      ages,
      plasmaGenerators
    };
  }, [count]);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('charge', new THREE.BufferAttribute(particleData.charges, 1));
    geo.setAttribute('energy', new THREE.BufferAttribute(particleData.energies, 1));
    geo.setAttribute('magneticField', new THREE.BufferAttribute(particleData.magneticField, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(particleData.ages, 1));
    return geo;
  }, [particleData]);

  // Plasma shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uSize: { value: 3.0 },
        uElectricField: { value: 2.0 },
        uMagneticStrength: { value: 1.5 },
        uPlasmaFrequency: { value: 10.0 }
      },
      vertexShader: plasmaVertexShader || `
        attribute vec3 velocity;
        attribute float size;
        attribute float charge;
        attribute float energy;
        attribute vec3 magneticField;
        attribute float lifetime;
        attribute float age;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSize;
        uniform float uElectricField;
        uniform float uMagneticStrength;
        uniform float uPlasmaFrequency;
        
        varying float vCharge;
        varying float vEnergy;
        varying float vAge;
        varying vec3 vPosition;
        varying float vSpeed;
        
        void main() {
          vec3 pos = position;
          
          // Age calculation
          float normalizedAge = age / lifetime;
          
          // Electromagnetic forces
          vec3 electricForce = vec3(
            sin(uTime * uPlasmaFrequency + pos.x * 0.1) * uElectricField,
            cos(uTime * uPlasmaFrequency + pos.y * 0.1) * uElectricField,
            sin(uTime * uPlasmaFrequency + pos.z * 0.1) * uElectricField
          );
          electricForce *= charge * energy;
          
          // Magnetic force (Lorentz force approximation)
          vec3 magneticForce = cross(velocity, magneticField) * uMagneticStrength * charge;
          
          // Apply forces
          pos += (electricForce + magneticForce) * age * uIntensity;
          
          // Cyclotron motion (charged particles in magnetic field)
          float cyclotronFreq = abs(charge) * uMagneticStrength;
          float cyclotronRadius = length(velocity) / cyclotronFreq;
          float cyclotronAngle = cyclotronFreq * uTime;
          
          vec3 cyclotronMotion = vec3(
            cos(cyclotronAngle) * cyclotronRadius,
            0.0,
            sin(cyclotronAngle) * cyclotronRadius
          );
          pos += cyclotronMotion * 0.1 * energy * uIntensity;
          
          // Plasma oscillations
          float plasmaOsc = sin(uTime * uPlasmaFrequency * 2.0 + pos.x + pos.y + pos.z);
          pos += normalize(pos) * plasmaOsc * 0.5 * energy * uIntensity;
          
          // Electric arcing between particles (simplified)
          float arcEffect = sin(uTime * 15.0 + length(pos) * 0.1) * 0.3;
          pos += vec3(arcEffect, arcEffect * 0.5, arcEffect) * charge * energy;
          
          // Confinement by magnetic field
          float distanceFromCenter = length(pos);
          if (distanceFromCenter > 30.0) {
            vec3 confinementForce = -normalize(pos) * (distanceFromCenter - 30.0) * 0.1;
            pos += confinementForce;
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size based on energy and charge
          float pointSize = size * uSize * (1.0 + energy * 2.0);
          pointSize *= (1.0 + abs(charge) * 0.5);
          pointSize *= (400.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vCharge = charge;
          vEnergy = energy;
          vAge = normalizedAge;
          vPosition = pos;
          vSpeed = length(velocity);
        }
      `,
      fragmentShader: plasmaFragmentShader || `
        uniform float uTime;
        uniform float uPlasmaFrequency;
        
        varying float vCharge;
        varying float vEnergy;
        varying float vAge;
        varying vec3 vPosition;
        varying float vSpeed;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          
          // Create electric plasma shape
          float plasma = 1.0 - distanceToCenter * 2.0;
          plasma = smoothstep(0.0, 1.0, plasma);
          
          // Add electric arc pattern
          float angle = atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5);
          float radius = distance(gl_PointCoord, vec2(0.5));
          
          // Lightning-like branching pattern
          float lightning = sin(angle * 6.0 + uTime * 5.0) * 0.1 + 0.9;
          lightning *= sin(radius * 20.0 + uTime * 10.0) * 0.2 + 0.8;
          plasma *= lightning;
          
          // Color based on charge and energy
          vec3 color;
          if (vCharge > 0.0) {
            // Positive charge - blue-white
            color = vec3(0.6, 0.8, 1.0);
          } else {
            // Negative charge - red-purple
            color = vec3(1.0, 0.4, 0.8);
          }
          
          // Energy affects brightness and color temperature
          color *= (0.5 + vEnergy * 1.5);
          
          // Add electric glow
          float glow = 1.0 - smoothstep(0.0, 0.8, distanceToCenter);
          color += glow * vEnergy * 0.5;
          
          // Plasma frequency modulation
          float freq = sin(uTime * uPlasmaFrequency + vPosition.x + vPosition.y + vPosition.z);
          color *= (0.8 + freq * 0.4);
          
          // Speed-based trail effect
          if (vSpeed > 3.0) {
            float trail = (vSpeed - 3.0) / 7.0;
            color += vec3(1.0, 1.0, 0.8) * trail * 0.3;
          }
          
          // Age affects transparency
          float alpha = plasma * vEnergy * (1.0 - vAge * 0.6);
          
          // Electric discharge flicker
          float flicker = sin(uTime * 20.0 + vPosition.x * 0.1) * 0.1 + 0.9;
          alpha *= flicker;
          
          // Add core intensity
          float core = 1.0 - smoothstep(0.0, 0.3, distanceToCenter);
          alpha += core * vEnergy * 0.5;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [intensity, plasmaVertexShader, plasmaFragmentShader]);

  // Update plasma simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const velocities = meshRef.current.geometry.attributes.velocity;
    const ages = meshRef.current.geometry.attributes.age;
    const lifetimes = meshRef.current.geometry.attributes.lifetime;
    const charges = meshRef.current.geometry.attributes.charge;
    const energies = meshRef.current.geometry.attributes.energy;

    // Update plasma particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update age
      ages.array[i] += delta;
      
      // Electromagnetic interactions between particles (simplified)
      const currentPos = new THREE.Vector3(
        positions.array[i3],
        positions.array[i3 + 1],
        positions.array[i3 + 2]
      );

      // Calculate forces from nearby particles
      for (let j = 0; j < Math.min(count, 100); j++) {
        if (i === j) continue;
        
        const j3 = j * 3;
        const otherPos = new THREE.Vector3(
          positions.array[j3],
          positions.array[j3 + 1],
          positions.array[j3 + 2]
        );
        
        const distance = currentPos.distanceTo(otherPos);
        if (distance < 10.0 && distance > 0.1) {
          // Coulomb force
          const forceDirection = currentPos.clone().sub(otherPos).normalize();
          const forceMagnitude = (charges.array[i] * charges.array[j]) / (distance * distance);
          
          // Apply force to velocity (simplified)
          velocities.array[i3] += forceDirection.x * forceMagnitude * delta * 0.1;
          velocities.array[i3 + 1] += forceDirection.y * forceMagnitude * delta * 0.1;
          velocities.array[i3 + 2] += forceDirection.z * forceMagnitude * delta * 0.1;
        }
      }
      
      // Energy decay over time
      energies.array[i] *= (1.0 - delta * 0.1);
      energies.array[i] = Math.max(energies.array[i], 0.1);
      
      // Reset particle if too old or energy too low
      if (ages.array[i] > lifetimes.array[i] || energies.array[i] < 0.15) {
        ages.array[i] = 0;
        
        // Respawn at plasma generator
        const generator = particleData.plasmaGenerators[i % particleData.plasmaGenerators.length];
        const radius = Math.random() * 5 + 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions.array[i3] = generator.x + radius * Math.sin(phi) * Math.cos(theta);
        positions.array[i3 + 1] = generator.y + radius * Math.cos(phi);
        positions.array[i3 + 2] = generator.z + radius * Math.sin(phi) * Math.sin(theta);
        
        // Reset properties
        charges.array[i] = Math.random() > 0.5 ? 1.0 : -1.0;
        energies.array[i] = Math.random() * 0.8 + 0.2;
        
        const chargeInfluence = charges.array[i] * generator.strength;
        velocities.array[i3] = (Math.random() - 0.5) * 5.0 * chargeInfluence;
        velocities.array[i3 + 1] = (Math.random() - 0.5) * 5.0 * chargeInfluence;
        velocities.array[i3 + 2] = (Math.random() - 0.5) * 5.0 * chargeInfluence;
      }
    }

    // Mark for update
    positions.needsUpdate = true;
    velocities.needsUpdate = true;
    ages.needsUpdate = true;
    energies.needsUpdate = true;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uIntensity.value = intensity;
    materialRef.current.uniforms.uElectricField.value = 1.0 + Math.sin(time * 0.5) * 0.5;
    materialRef.current.uniforms.uPlasmaFrequency.value = 8.0 + Math.sin(time * 0.3) * 4.0;
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  );
}
