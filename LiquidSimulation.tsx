import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { PhysicsEngine } from "../../utils/PhysicsEngine";
import { useShaders } from "../../hooks/useShaders";

interface LiquidSimulationProps {
  resolution: number;
  time: number;
}

/**
 * Advanced liquid simulation using metaballs and fluid dynamics
 * Creates realistic liquid behavior with surface tension and flow
 */
export default function LiquidSimulation({ resolution, time }: LiquidSimulationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { liquidVertexShader, liquidFragmentShader } = useShaders();
  const physicsEngine = useMemo(() => new PhysicsEngine(), []);

  // Liquid particle system
  const liquidParticles = useMemo(() => {
    const particleCount = Math.min(resolution * 2, 1000);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 10 + 5,
          (Math.random() - 0.5) * 20
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ),
        mass: 1.0,
        radius: 0.5 + Math.random() * 0.5,
        density: 1.0,
        pressure: 0.0,
        viscosity: 0.1,
        id: i
      });
    }

    return particles;
  }, [resolution]);

  // Metaball field calculation
  const calculateMetaballField = useMemo(() => {
    return (x: number, y: number, z: number, particles: any[]) => {
      let field = 0;
      const point = new THREE.Vector3(x, y, z);

      particles.forEach(particle => {
        const distance = point.distanceTo(particle.position);
        if (distance > 0) {
          const influence = (particle.radius * particle.radius) / (distance * distance);
          field += influence * particle.density;
        }
      });

      return field;
    };
  }, []);

  // Generate liquid mesh using marching cubes approximation
  const generateLiquidMesh = useMemo(() => {
    return (particles: any[], gridSize: number, threshold: number) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const normals = [];
      const uvs = [];

      const step = 2;
      const halfGrid = gridSize / 2;

      for (let x = -halfGrid; x < halfGrid; x += step) {
        for (let y = 0; y < gridSize; y += step) {
          for (let z = -halfGrid; z < halfGrid; z += step) {
            const field = calculateMetaballField(x, y, z, particles);
            
            if (field > threshold) {
              // Create cube at this position
              const size = Math.min(field / threshold, 2) * step;
              
              // Add cube vertices (simplified)
              const cubeVertices = [
                // Front face
                x - size/2, y - size/2, z + size/2,
                x + size/2, y - size/2, z + size/2,
                x + size/2, y + size/2, z + size/2,
                x + size/2, y + size/2, z + size/2,
                x - size/2, y + size/2, z + size/2,
                x - size/2, y - size/2, z + size/2,
                
                // Back face (and other faces...)
                x - size/2, y - size/2, z - size/2,
                x - size/2, y + size/2, z - size/2,
                x + size/2, y + size/2, z - size/2,
                x + size/2, y + size/2, z - size/2,
                x + size/2, y - size/2, z - size/2,
                x - size/2, y - size/2, z - size/2
              ];

              vertices.push(...cubeVertices);
              
              // Add normals (simplified)
              for (let i = 0; i < cubeVertices.length / 3; i++) {
                normals.push(0, 1, 0);
              }
              
              // Add UVs
              for (let i = 0; i < cubeVertices.length / 3; i++) {
                uvs.push(0, 0);
              }
            }
          }
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();

      return geometry;
    };
  }, [calculateMetaballField]);

  // Particle visualization geometry
  const particleGeometry = useMemo(() => {
    const positions = new Float32Array(liquidParticles.length * 3);
    const sizes = new Float32Array(liquidParticles.length);
    const colors = new Float32Array(liquidParticles.length * 3);

    liquidParticles.forEach((particle, i) => {
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
      
      sizes[i] = particle.radius;
      
      colors[i * 3] = 0.2;     // R
      colors[i * 3 + 1] = 0.6; // G
      colors[i * 3 + 2] = 1.0; // B
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geo;
  }, [liquidParticles]);

  // Liquid shader material
  const liquidMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLiquidColor: { value: new THREE.Color(0.2, 0.6, 1.0) },
        uSurfaceColor: { value: new THREE.Color(0.8, 0.9, 1.0) },
        uRefractionRatio: { value: 0.8 },
        uFresnelBias: { value: 0.1 },
        uFresnelScale: { value: 1.0 },
        uFresnelPower: { value: 2.0 },
        uFlowSpeed: { value: 1.0 },
        uViscosity: { value: 0.1 }
      },
      vertexShader: liquidVertexShader || `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform float uViscosity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vEyeVector;
        varying float vFlow;
        
        void main() {
          vec3 pos = position;
          
          // Add fluid flow motion
          float flow = sin(pos.x * 0.1 + uTime * uFlowSpeed) * 
                      cos(pos.z * 0.1 + uTime * uFlowSpeed * 0.7);
          pos.y += flow * 0.2;
          
          // Surface ripples
          float ripple = sin(pos.x * 0.3 + uTime * 2.0) * 
                        cos(pos.z * 0.3 + uTime * 1.5) * 0.1;
          pos.y += ripple;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          gl_Position = projectionMatrix * mvPosition;
          
          vPosition = pos;
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          vEyeVector = normalize(worldPosition.xyz - cameraPosition);
          vFlow = flow;
        }
      `,
      fragmentShader: liquidFragmentShader || `
        uniform float uTime;
        uniform vec3 uLiquidColor;
        uniform vec3 uSurfaceColor;
        uniform float uRefractionRatio;
        uniform float uFresnelBias;
        uniform float uFresnelScale;
        uniform float uFresnelPower;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vEyeVector;
        varying float vFlow;
        
        void main() {
          vec3 normal = normalize(vNormal);
          
          // Fresnel effect
          float fresnel = uFresnelBias + uFresnelScale * 
                         pow(1.0 + dot(vEyeVector, normal), uFresnelPower);
          
          // Base liquid color
          vec3 color = mix(uLiquidColor, uSurfaceColor, fresnel);
          
          // Flow-based color variation
          color += vFlow * 0.1;
          
          // Subsurface scattering approximation
          float scatter = pow(max(0.0, dot(normal, normalize(vec3(1.0, 1.0, 0.5)))), 2.0);
          color += scatter * 0.2;
          
          // Surface foam
          float foam = smoothstep(0.8, 1.0, abs(vFlow));
          color = mix(color, vec3(1.0), foam * 0.5);
          
          // Transparency based on fresnel
          float alpha = 0.7 + fresnel * 0.3;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [liquidVertexShader, liquidFragmentShader]);

  // Particle material
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 2.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        
        uniform float uTime;
        uniform float uSize;
        
        varying vec3 vColor;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * uSize * (300.0 / -mvPosition.z);
          vColor = color;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
          
          gl_FragColor = vec4(vColor, alpha * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }, []);

  // Update liquid simulation
  useFrame((state, delta) => {
    if (!meshRef.current || !particlesRef.current) return;

    // Update particle physics
    liquidParticles.forEach((particle, i) => {
      // Apply gravity
      particle.velocity.y -= 9.8 * delta;
      
      // Apply viscosity (damping)
      particle.velocity.multiplyScalar(1 - particle.viscosity * delta);
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Boundary conditions
      if (particle.position.y < 0) {
        particle.position.y = 0;
        particle.velocity.y = Math.abs(particle.velocity.y) * 0.3; // Bounce
        particle.velocity.x *= 0.8; // Friction
        particle.velocity.z *= 0.8;
      }
      
      // Side boundaries
      const boundary = 25;
      if (Math.abs(particle.position.x) > boundary) {
        particle.position.x = Math.sign(particle.position.x) * boundary;
        particle.velocity.x *= -0.5;
      }
      if (Math.abs(particle.position.z) > boundary) {
        particle.position.z = Math.sign(particle.position.z) * boundary;
        particle.velocity.z *= -0.5;
      }
    });

    // SPH (Smoothed Particle Hydrodynamics) calculations
    const smoothingRadius = 2.0;
    const restDensity = 1.0;
    const pressureConstant = 10.0;

    // Calculate density and pressure for each particle
    liquidParticles.forEach((particle, i) => {
      particle.density = 0;
      
      liquidParticles.forEach((neighbor, j) => {
        const distance = particle.position.distanceTo(neighbor.position);
        if (distance < smoothingRadius) {
          const influence = Math.max(0, smoothingRadius - distance);
          particle.density += neighbor.mass * influence * influence;
        }
      });
      
      particle.pressure = pressureConstant * (particle.density - restDensity);
    });

    // Apply pressure forces
    liquidParticles.forEach((particle, i) => {
      const pressureForce = new THREE.Vector3();
      
      liquidParticles.forEach((neighbor, j) => {
        if (i === j) return;
        
        const distance = particle.position.distanceTo(neighbor.position);
        if (distance < smoothingRadius && distance > 0) {
          const direction = particle.position.clone().sub(neighbor.position).normalize();
          const pressure = (particle.pressure + neighbor.pressure) / 2;
          const influence = Math.max(0, smoothingRadius - distance);
          
          pressureForce.add(direction.multiplyScalar(pressure * influence * delta));
        }
      });
      
      particle.velocity.add(pressureForce.multiplyScalar(0.1));
    });

    // Update particle geometry
    const positions = particlesRef.current.geometry.attributes.position;
    liquidParticles.forEach((particle, i) => {
      positions.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
    });
    positions.needsUpdate = true;

    // Generate liquid mesh (simplified for performance)
    if (Math.floor(time * 2) % 10 === 0) { // Update every 5 frames
      const newGeometry = generateLiquidMesh(liquidParticles, 30, 0.5);
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = newGeometry;
    }

    // Update materials
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }
    
    if (particleMaterial.uniforms) {
      particleMaterial.uniforms.uTime.value = time;
    }
  });

  return (
    <group>
      {/* Liquid mesh */}
      <mesh
        ref={meshRef}
        material={liquidMaterial}
        receiveShadow
        castShadow
      />
      
      {/* Particle visualization */}
      <points
        ref={particlesRef}
        geometry={particleGeometry}
        material={particleMaterial}
      />
      
      {/* Container/Pool */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[50, 2, 50]} />
        <meshPhongMaterial
          color="#333333"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}
