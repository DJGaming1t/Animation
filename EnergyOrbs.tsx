import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { useShaders } from "../../hooks/useShaders";

interface EnergyOrbsProps {
  count: number;
  time: number;
  intensity: number;
}

/**
 * Energy orbs with electromagnetic effects and particle trails
 * Creates spheres of energy that interact with each other and emit particles
 */
export default function EnergyOrbs({ count, time, intensity }: EnergyOrbsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const orbsRef = useRef<THREE.Mesh[]>([]);
  const trailsRef = useRef<THREE.Points[]>([]);
  
  const { energyVertexShader, energyFragmentShader } = useShaders();

  // Generate orb data
  const orbs = useMemo(() => {
    const orbData = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const layer = Math.floor(i / 5); // Multiple layers
      const layerRadius = 20 + layer * 15;
      
      const orb = {
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * layerRadius,
          5 + Math.sin(i) * 10,
          Math.sin(angle) * layerRadius
        ),
        size: 0.8 + Math.random() * 1.5,
        energy: 0.3 + Math.random() * 0.7,
        charge: Math.random() > 0.5 ? 1 : -1, // Positive or negative
        orbitSpeed: 0.1 + Math.random() * 0.3,
        pulseSpeed: 0.8 + Math.random() * 1.5,
        color: new THREE.Color().setHSL(
          Math.random(),
          0.8 + Math.random() * 0.2,
          0.5 + Math.random() * 0.3
        ),
        trail: {
          positions: new Float32Array(100 * 3), // 100 trail points
          ages: new Float32Array(100),
          currentIndex: 0
        }
      };

      // Initialize trail positions
      for (let j = 0; j < 100; j++) {
        const j3 = j * 3;
        orb.trail.positions[j3] = orb.position.x;
        orb.trail.positions[j3 + 1] = orb.position.y;
        orb.trail.positions[j3 + 2] = orb.position.z;
        orb.trail.ages[j] = 1.0;
      }

      orbData.push(orb);
    }

    return orbData;
  }, [count]);

  // Orb geometries
  const orbGeometry = useMemo(() => {
    return new THREE.SphereGeometry(1, 16, 12);
  }, []);

  // Trail geometries
  const trailGeometries = useMemo(() => {
    return orbs.map(orb => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(orb.trail.positions, 3));
      geometry.setAttribute('age', new THREE.BufferAttribute(orb.trail.ages, 1));
      return geometry;
    });
  }, [orbs]);

  // Energy orb materials
  const orbMaterials = useMemo(() => {
    return orbs.map(orb => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: intensity },
          uEnergyLevel: { value: orb.energy },
          uCharge: { value: orb.charge },
          uColor: { value: orb.color },
          uSize: { value: orb.size },
          uPulseSpeed: { value: orb.pulseSpeed }
        },
        vertexShader: energyVertexShader || `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uEnergyLevel;
          uniform float uPulseSpeed;
          uniform float uSize;
          
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vEnergy;
          
          void main() {
            vec3 pos = position;
            
            // Energy pulsing
            float pulse = 0.9 + 0.1 * sin(uTime * uPulseSpeed);
            pos *= pulse * uSize;
            
            // Surface distortion
            float distortion = sin(pos.x * 5.0 + uTime * 2.0) * 
                              cos(pos.y * 5.0 + uTime * 1.5) * 
                              sin(pos.z * 5.0 + uTime * 1.8);
            pos += normal * distortion * 0.1 * uEnergyLevel;
            
            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            
            vPosition = worldPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            vEnergy = uEnergyLevel * pulse;
          }
        `,
        fragmentShader: energyFragmentShader || `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uCharge;
          uniform vec3 uColor;
          
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vEnergy;
          
          void main() {
            // Base energy color
            vec3 color = uColor;
            
            // Charge-based color modification
            if (uCharge > 0.0) {
              color = mix(color, vec3(1.0, 0.8, 0.2), 0.3); // Warm for positive
            } else {
              color = mix(color, vec3(0.2, 0.8, 1.0), 0.3); // Cool for negative
            }
            
            // Energy surface patterns
            float pattern = sin(vPosition.x * 10.0 + uTime * 3.0) *
                           cos(vPosition.y * 10.0 + uTime * 2.5) *
                           sin(vPosition.z * 10.0 + uTime * 2.0);
            color += pattern * 0.2 * vEnergy;
            
            // Fresnel effect for energy glow
            vec3 eyeVector = normalize(cameraPosition - vPosition);
            float fresnel = 1.0 - abs(dot(eyeVector, vNormal));
            color += fresnel * 0.5 * vEnergy;
            
            // Intensity modulation
            color *= uIntensity * vEnergy;
            
            // Core brightness
            float core = pow(fresnel, 2.0);
            color += core * 0.8;
            
            gl_FragColor = vec4(color, 0.8 + fresnel * 0.2);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
    });
  }, [orbs, intensity, energyVertexShader, energyFragmentShader]);

  // Trail materials
  const trailMaterials = useMemo(() => {
    return orbs.map(orb => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: orb.color },
          uIntensity: { value: intensity }
        },
        vertexShader: `
          attribute float age;
          
          uniform float uTime;
          
          varying float vAge;
          
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (1.0 - age) * 5.0;
            vAge = age;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          
          varying float vAge;
          
          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
            float alpha = 1.0 - distanceToCenter * 2.0;
            alpha *= (1.0 - vAge) * uIntensity * 0.5;
            
            if (alpha < 0.01) discard;
            
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
    });
  }, [orbs, intensity]);

  // Calculate electromagnetic forces between orbs
  const calculateForces = (orbIndex: number) => {
    const currentOrb = orbs[orbIndex];
    const force = new THREE.Vector3();

    orbs.forEach((otherOrb, otherIndex) => {
      if (orbIndex === otherIndex) return;

      const distance = currentOrb.position.distanceTo(otherOrb.position);
      if (distance < 0.1) return;

      // Electromagnetic force (Coulomb's law approximation)
      const forceDirection = currentOrb.position.clone().sub(otherOrb.position).normalize();
      const forceMagnitude = (currentOrb.charge * otherOrb.charge) / (distance * distance);
      
      force.add(forceDirection.multiplyScalar(forceMagnitude * 0.1));
    });

    return force;
  };

  // Update orb animations and physics
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    orbs.forEach((orb, index) => {
      const orbMesh = orbsRef.current[index];
      const trailPoints = trailsRef.current[index];
      
      if (!orbMesh) return;

      // Calculate electromagnetic forces
      const force = calculateForces(index);
      
      // Apply forces to position (simplified physics)
      orb.position.add(force.multiplyScalar(delta));
      
      // Orbital motion
      const orbitAngle = time * orb.orbitSpeed + index;
      const orbitRadius = 20 + Math.floor(index / 5) * 15;
      
      const targetX = Math.cos(orbitAngle) * orbitRadius;
      const targetZ = Math.sin(orbitAngle) * orbitRadius;
      const targetY = 5 + Math.sin(time * 0.3 + index) * 8;
      
      // Interpolate towards target position
      orb.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 0.5);
      
      // Update mesh position
      orbMesh.position.copy(orb.position);
      
      // Rotation
      orbMesh.rotation.x += delta * orb.pulseSpeed;
      orbMesh.rotation.y += delta * orb.pulseSpeed * 0.7;
      
      // Update trail
      if (trailPoints && Math.floor(time * 30) % 2 === 0) { // Update every 2 frames
        const trailIndex = orb.trail.currentIndex;
        const i3 = trailIndex * 3;
        
        orb.trail.positions[i3] = orb.position.x;
        orb.trail.positions[i3 + 1] = orb.position.y;
        orb.trail.positions[i3 + 2] = orb.position.z;
        orb.trail.ages[trailIndex] = 0;
        
        // Age existing trail points
        for (let i = 0; i < 100; i++) {
          orb.trail.ages[i] = Math.min(orb.trail.ages[i] + delta * 2, 1.0);
        }
        
        orb.trail.currentIndex = (trailIndex + 1) % 100;
        
        // Update trail geometry
        trailPoints.geometry.attributes.position.needsUpdate = true;
        trailPoints.geometry.attributes.age.needsUpdate = true;
      }
      
      // Update materials
      const orbMaterial = orbMaterials[index];
      if (orbMaterial.uniforms) {
        orbMaterial.uniforms.uTime.value = time;
        orbMaterial.uniforms.uIntensity.value = intensity;
      }
      
      const trailMaterial = trailMaterials[index];
      if (trailMaterial.uniforms) {
        trailMaterial.uniforms.uTime.value = time;
        trailMaterial.uniforms.uIntensity.value = intensity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, index) => (
        <group key={orb.id}>
          {/* Energy orb */}
          <mesh
            ref={(mesh) => {
              if (mesh) orbsRef.current[index] = mesh;
            }}
            geometry={orbGeometry}
            material={orbMaterials[index]}
            position={orb.position}
            scale={orb.size}
          />
          
          {/* Trail particles */}
          <points
            ref={(points) => {
              if (points) trailsRef.current[index] = points;
            }}
            geometry={trailGeometries[index]}
            material={trailMaterials[index]}
          />
          
          {/* Energy field visualization */}
          <mesh position={orb.position}>
            <sphereGeometry args={[orb.size * 2, 8, 6]} />
            <meshBasicMaterial
              color={orb.color}
              transparent
              opacity={0.1 * intensity}
              wireframe
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
