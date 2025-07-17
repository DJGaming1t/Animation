import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PhysicsEngine, PhysicsParticle } from '../utils/PhysicsEngine';

interface ParticleSystemConfig {
  count: number;
  lifetime: number;
  emissionRate: number;
  spread: number;
  speed: number;
  size: number;
  gravity: THREE.Vector3;
  usePhysics: boolean;
}

interface EmitterConfig {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  type: 'point' | 'sphere' | 'box' | 'cone';
  parameters: Record<string, number>;
}

/**
 * Hook for managing particle systems with physics simulation
 */
export function useParticles(config: Partial<ParticleSystemConfig> = {}) {
  const defaultConfig: ParticleSystemConfig = {
    count: 1000,
    lifetime: 5.0,
    emissionRate: 200,
    spread: 1.0,
    speed: 5.0,
    size: 1.0,
    gravity: new THREE.Vector3(0, -9.81, 0),
    usePhysics: false
  };

  const finalConfig = { ...defaultConfig, ...config };
  const physicsEngine = useRef<PhysicsEngine>(new PhysicsEngine());
  const particlesRef = useRef<Map<string, PhysicsParticle>>(new Map());
  const nextParticleId = useRef(0);
  const lastEmissionTime = useRef(0);
  const emitterRef = useRef<EmitterConfig>({
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 1, 0),
    type: 'point',
    parameters: {}
  });

  // Particle geometry and material
  const { geometry, material } = useMemo(() => {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(finalConfig.count * 3);
    const velocities = new Float32Array(finalConfig.count * 3);
    const sizes = new Float32Array(finalConfig.count);
    const ages = new Float32Array(finalConfig.count);
    const lifetimes = new Float32Array(finalConfig.count);
    const colors = new Float32Array(finalConfig.count * 3);

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: finalConfig.size },
        uTexture: { value: null }
      },
      vertexShader: `
        attribute float size;
        attribute float age;
        attribute float lifetime;
        attribute vec3 velocity;
        
        uniform float uTime;
        uniform float uSize;
        
        varying float vAge;
        varying float vLifetime;
        varying vec3 vColor;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          float normalizedAge = age / lifetime;
          float pointSize = size * uSize * (1.0 - normalizedAge * 0.5);
          pointSize *= (300.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vAge = normalizedAge;
          vLifetime = lifetime;
          vColor = color;
        }
      `,
      fragmentShader: `
        varying float vAge;
        varying float vLifetime;
        varying vec3 vColor;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - distanceToCenter * 2.0;
          alpha = smoothstep(0.0, 1.0, alpha);
          alpha *= (1.0 - vAge);
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    return { geometry: particleGeometry, material: particleMaterial };
  }, [finalConfig.count, finalConfig.size]);

  // Emit a new particle
  const emitParticle = useCallback(() => {
    const id = `particle_${nextParticleId.current++}`;
    const emitter = emitterRef.current;
    
    // Calculate emission position based on emitter type
    let position = emitter.position.clone();
    let direction = emitter.direction.clone();

    switch (emitter.type) {
      case 'sphere':
        const sphereRadius = emitter.parameters.radius || 1;
        const randomDir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        position.add(randomDir.multiplyScalar(Math.random() * sphereRadius));
        break;

      case 'box':
        const boxSize = emitter.parameters.size || 1;
        position.add(new THREE.Vector3(
          (Math.random() - 0.5) * boxSize,
          (Math.random() - 0.5) * boxSize,
          (Math.random() - 0.5) * boxSize
        ));
        break;

      case 'cone':
        const coneAngle = emitter.parameters.angle || Math.PI / 6;
        const coneRadius = emitter.parameters.radius || 1;
        const angle = Math.random() * coneAngle - coneAngle / 2;
        const rotation = Math.random() * Math.PI * 2;
        
        direction = new THREE.Vector3(
          Math.sin(angle) * Math.cos(rotation),
          Math.cos(angle),
          Math.sin(angle) * Math.sin(rotation)
        );
        position.add(new THREE.Vector3(
          Math.random() * coneRadius,
          0,
          Math.random() * coneRadius
        ));
        break;
    }

    // Add spread to direction
    const spreadDirection = direction.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * finalConfig.spread,
      (Math.random() - 0.5) * finalConfig.spread,
      (Math.random() - 0.5) * finalConfig.spread
    )).normalize();

    const velocity = spreadDirection.multiplyScalar(
      finalConfig.speed * (0.5 + Math.random() * 0.5)
    );

    const particle: PhysicsParticle = {
      id,
      position: position.clone(),
      velocity: velocity.clone(),
      acceleration: new THREE.Vector3(),
      mass: 1.0,
      radius: 0.1,
      restitution: 0.3,
      friction: 0.1,
      density: 1.0,
      pressure: 0.0,
      forces: [],
      constraints: [],
      userData: {
        age: 0,
        lifetime: finalConfig.lifetime * (0.5 + Math.random()),
        size: finalConfig.size * (0.5 + Math.random()),
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
      }
    };

    particlesRef.current.set(id, particle);

    if (finalConfig.usePhysics) {
      physicsEngine.current.addParticle(particle);
    }

    return particle;
  }, [finalConfig]);

  // Update particles
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // Update material uniforms
    material.uniforms.uTime.value = time;

    // Emit new particles
    const timeSinceLastEmission = time - lastEmissionTime.current;
    const emissionInterval = 1 / finalConfig.emissionRate;
    
    if (timeSinceLastEmission >= emissionInterval) {
      if (particlesRef.current.size < finalConfig.count) {
        emitParticle();
      }
      lastEmissionTime.current = time;
    }

    // Update physics
    if (finalConfig.usePhysics) {
      physicsEngine.current.update(delta);
    }

    // Update particle attributes
    const positions = geometry.attributes.position;
    const ages = geometry.attributes.age;
    const colors = geometry.attributes.color;
    const sizes = geometry.attributes.size;
    
    let particleIndex = 0;
    const particlesToRemove: string[] = [];

    particlesRef.current.forEach((particle, id) => {
      // Update age
      particle.userData.age += delta;

      // Remove expired particles
      if (particle.userData.age >= particle.userData.lifetime) {
        particlesToRemove.push(id);
        return;
      }

      // Update physics (if not using physics engine)
      if (!finalConfig.usePhysics) {
        // Apply gravity
        particle.velocity.add(finalConfig.gravity.clone().multiplyScalar(delta));
        
        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      }

      // Update geometry attributes
      if (particleIndex < finalConfig.count) {
        const i3 = particleIndex * 3;
        
        positions.array[i3] = particle.position.x;
        positions.array[i3 + 1] = particle.position.y;
        positions.array[i3 + 2] = particle.position.z;
        
        ages.array[particleIndex] = particle.userData.age;
        sizes.array[particleIndex] = particle.userData.size;
        
        const color = particle.userData.color;
        colors.array[i3] = color.r;
        colors.array[i3 + 1] = color.g;
        colors.array[i3 + 2] = color.b;
        
        particleIndex++;
      }
    });

    // Remove expired particles
    particlesToRemove.forEach(id => {
      const particle = particlesRef.current.get(id);
      if (particle && finalConfig.usePhysics) {
        physicsEngine.current.removeParticle(id);
      }
      particlesRef.current.delete(id);
    });

    // Mark attributes for update
    positions.needsUpdate = true;
    ages.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  });

  // Control functions
  const setEmitter = useCallback((emitter: Partial<EmitterConfig>) => {
    emitterRef.current = { ...emitterRef.current, ...emitter };
  }, []);

  const clearParticles = useCallback(() => {
    particlesRef.current.clear();
    physicsEngine.current.reset();
    nextParticleId.current = 0;
  }, []);

  const setGravity = useCallback((gravity: THREE.Vector3) => {
    physicsEngine.current.setGravity(gravity);
  }, []);

  const addForce = useCallback((force: THREE.Vector3) => {
    particlesRef.current.forEach(particle => {
      particle.forces.push(force.clone());
    });
  }, []);

  const addField = useCallback((field: any) => {
    physicsEngine.current.addField(field);
  }, []);

  const getParticleCount = useCallback(() => {
    return particlesRef.current.size;
  }, []);

  const getStats = useCallback(() => {
    return {
      activeParticles: particlesRef.current.size,
      maxParticles: finalConfig.count,
      emissionRate: finalConfig.emissionRate,
      physicsEnabled: finalConfig.usePhysics,
      ...physicsEngine.current.getStats()
    };
  }, [finalConfig]);

  return {
    geometry,
    material,
    setEmitter,
    clearParticles,
    setGravity,
    addForce,
    addField,
    getParticleCount,
    getStats,
    emitParticle
  };
}

/**
 * Hook for creating fire particle effects
 */
export function useFireParticles(config: Partial<ParticleSystemConfig> = {}) {
  const fireConfig = {
    count: 2000,
    lifetime: 3.0,
    emissionRate: 500,
    spread: 0.5,
    speed: 8.0,
    size: 2.0,
    gravity: new THREE.Vector3(0, 2, 0), // Upward for fire
    usePhysics: true,
    ...config
  };

  const particles = useParticles(fireConfig);

  // Set up fire-specific emitter
  React.useEffect(() => {
    particles.setEmitter({
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 1, 0),
      type: 'cone',
      parameters: { angle: Math.PI / 6, radius: 2 }
    });

    // Add turbulence field
    particles.addField({
      type: 'wind',
      position: new THREE.Vector3(0, 5, 0),
      strength: 2.0,
      radius: 10,
      direction: new THREE.Vector3(0.2, 1, 0.1)
    });
  }, [particles]);

  return particles;
}

/**
 * Hook for creating water particle effects
 */
export function useWaterParticles(config: Partial<ParticleSystemConfig> = {}) {
  const waterConfig = {
    count: 1500,
    lifetime: 8.0,
    emissionRate: 300,
    spread: 0.3,
    speed: 10.0,
    size: 1.5,
    gravity: new THREE.Vector3(0, -9.81, 0),
    usePhysics: true,
    ...config
  };

  const particles = useParticles(waterConfig);

  React.useEffect(() => {
    particles.setEmitter({
      position: new THREE.Vector3(0, 10, 0),
      direction: new THREE.Vector3(0, -1, 0.2),
      type: 'point',
      parameters: {}
    });

    // Add splash collision
    particles.addField({
      type: 'gravity',
      position: new THREE.Vector3(0, -5, 0),
      strength: 50,
      radius: 20
    });
  }, [particles]);

  return particles;
}

/**
 * Hook for creating magical particle effects
 */
export function useMagicParticles(config: Partial<ParticleSystemConfig> = {}) {
  const magicConfig = {
    count: 1000,
    lifetime: 6.0,
    emissionRate: 150,
    spread: 2.0,
    speed: 3.0,
    size: 1.0,
    gravity: new THREE.Vector3(0, 0.5, 0), // Slight upward drift
    usePhysics: false,
    ...config
  };

  const particles = useParticles(magicConfig);

  React.useEffect(() => {
    particles.setEmitter({
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 1, 0),
      type: 'sphere',
      parameters: { radius: 3 }
    });

    // Add swirling field
    particles.addField({
      type: 'vortex',
      position: new THREE.Vector3(0, 2, 0),
      strength: 5,
      radius: 15
    });
  }, [particles]);

  return particles;
}

import React from 'react';
