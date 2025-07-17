import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { GeometryGenerators } from "../../utils/GeometryGenerators";

interface GeometricShapesProps {
  count: number;
  time: number;
  intensity: number;
}

/**
 * Collection of animated geometric shapes with mathematical transformations
 * Creates complex geometric patterns and morphing structures
 */
export default function GeometricShapes({ count, time, intensity }: GeometricShapesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shapesRef = useRef<THREE.Mesh[]>([]);

  // Shape type definitions
  const shapeTypes = useMemo(() => [
    'icosahedron',
    'dodecahedron',
    'octahedron',
    'tetrahedron',
    'torus_knot',
    'klein_bottle',
    'mobius_strip',
    'hypercube_projection',
    'fibonacci_sphere',
    'fractal_pyramid'
  ], []);

  // Generate shape data
  const shapes = useMemo(() => {
    const shapeData = [];

    for (let i = 0; i < count; i++) {
      const shapeType = shapeTypes[i % shapeTypes.length];
      const layer = Math.floor(i / shapeTypes.length);
      const angleOffset = (i % shapeTypes.length) / shapeTypes.length * Math.PI * 2;
      const radius = 25 + layer * 20;

      const shape = {
        id: i,
        type: shapeType,
        position: new THREE.Vector3(
          Math.cos(angleOffset) * radius,
          Math.sin(i * 0.5) * 10,
          Math.sin(angleOffset) * radius
        ),
        scale: 0.8 + Math.random() * 1.2,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        morphSpeed: 0.5 + Math.random() * 1.0,
        color: new THREE.Color().setHSL(
          (i / count),
          0.7 + Math.random() * 0.3,
          0.5 + Math.random() * 0.3
        ),
        animationPhase: Math.random() * Math.PI * 2
      };

      shapeData.push(shape);
    }

    return shapeData;
  }, [count, shapeTypes]);

  // Create geometries for each shape type
  const geometries = useMemo(() => {
    const geos: { [key: string]: THREE.BufferGeometry } = {};
    
    shapeTypes.forEach(type => {
      switch (type) {
        case 'icosahedron':
          geos[type] = new THREE.IcosahedronGeometry(1, 1);
          break;
        case 'dodecahedron':
          geos[type] = new THREE.DodecahedronGeometry(1, 0);
          break;
        case 'octahedron':
          geos[type] = new THREE.OctahedronGeometry(1, 1);
          break;
        case 'tetrahedron':
          geos[type] = new THREE.TetrahedronGeometry(1, 0);
          break;
        case 'torus_knot':
          geos[type] = new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8, 2, 3);
          break;
        case 'klein_bottle':
          geos[type] = GeometryGenerators.createKleinBottle(1, 32);
          break;
        case 'mobius_strip':
          geos[type] = GeometryGenerators.createMobiusStrip(1, 2);
          break;
        case 'hypercube_projection':
          geos[type] = GeometryGenerators.createHypercubeProjection(1);
          break;
        case 'fibonacci_sphere':
          geos[type] = GeometryGenerators.createFibonacciSphere(1, 500);
          break;
        case 'fractal_pyramid':
          geos[type] = GeometryGenerators.createFractalPyramid(1, 3);
          break;
        default:
          geos[type] = new THREE.BoxGeometry(1, 1, 1);
      }
      
      // Store original positions for morphing
      const positions = geos[type].attributes.position.array;
      (geos[type] as any).originalPositions = Array.from(positions);
    });

    return geos;
  }, [shapeTypes]);

  // Materials with different rendering modes
  const materials = useMemo(() => {
    return shapes.map((shape, index) => {
      const materialType = index % 4;
      
      switch (materialType) {
        case 0: // Solid with emissive
          return new THREE.MeshPhongMaterial({
            color: shape.color,
            emissive: shape.color.clone().multiplyScalar(0.2),
            shininess: 100,
            transparent: true,
            opacity: 0.9
          });
        case 1: // Wireframe
          return new THREE.MeshBasicMaterial({
            color: shape.color,
            wireframe: true,
            transparent: true,
            opacity: 0.7
          });
        case 2: // Glass-like
          return new THREE.MeshPhysicalMaterial({
            color: shape.color,
            transparent: true,
            opacity: 0.3,
            transmission: 0.8,
            roughness: 0.1,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
          });
        case 3: // Holographic
          return new THREE.ShaderMaterial({
            uniforms: {
              uTime: { value: 0 },
              uColor: { value: shape.color },
              uIntensity: { value: 1.0 }
            },
            vertexShader: `
              uniform float uTime;
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                vPosition = worldPos.xyz;
                vNormal = normalize(normalMatrix * normal);
              }
            `,
            fragmentShader: `
              uniform float uTime;
              uniform vec3 uColor;
              uniform float uIntensity;
              
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              void main() {
                vec3 eyeVector = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - abs(dot(eyeVector, vNormal)), 2.0);
                
                vec3 color = uColor;
                color += sin(vPosition.x * 0.1 + uTime) * 0.2;
                color += cos(vPosition.y * 0.1 + uTime * 0.7) * 0.2;
                color += sin(vPosition.z * 0.1 + uTime * 1.3) * 0.2;
                
                float alpha = fresnel * uIntensity * 0.8;
                gl_FragColor = vec4(color, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          });
        default:
          return new THREE.MeshBasicMaterial({ color: shape.color });
      }
    });
  }, [shapes]);

  // Mathematical transformation functions
  const transformations = useMemo(() => ({
    sphericalHarmonics: (pos: THREE.Vector3, time: number, l: number, m: number) => {
      const r = pos.length();
      const theta = Math.acos(pos.y / r);
      const phi = Math.atan2(pos.z, pos.x);
      
      // Simplified spherical harmonics
      const Y = Math.sin(l * theta) * Math.cos(m * phi + time);
      return pos.clone().multiplyScalar(1 + Y * 0.3);
    },
    
    kleinTransform: (pos: THREE.Vector3, time: number) => {
      const u = Math.atan2(pos.z, pos.x) + time * 0.5;
      const v = pos.y + time * 0.3;
      
      const x = (2 + Math.cos(v)) * Math.cos(u);
      const y = (2 + Math.cos(v)) * Math.sin(u);
      const z = Math.sin(v);
      
      return new THREE.Vector3(x, y, z).multiplyScalar(0.5);
    },
    
    hyperbolicParaboloid: (pos: THREE.Vector3, time: number) => {
      const scale = 0.5;
      return new THREE.Vector3(
        pos.x,
        pos.x * pos.z * scale + Math.sin(time) * 0.2,
        pos.z
      );
    },
    
    torusTransform: (pos: THREE.Vector3, time: number, R: number, r: number) => {
      const angle = Math.atan2(pos.z, pos.x) + time * 0.5;
      const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      
      const majorRadius = R + radius * r;
      const x = majorRadius * Math.cos(angle);
      const y = pos.y + Math.sin(angle * 3 + time) * 0.2;
      const z = majorRadius * Math.sin(angle);
      
      return new THREE.Vector3(x, y, z);
    }
  }), []);

  // Update shape animations
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    shapes.forEach((shape, index) => {
      const mesh = shapesRef.current[index];
      if (!mesh) return;

      const phase = shape.animationPhase;
      
      // Position animation (orbital motion)
      const orbitAngle = time * 0.1 + phase;
      const orbitRadius = 25 + Math.floor(index / shapeTypes.length) * 20;
      const verticalMotion = Math.sin(time * shape.morphSpeed + phase) * 5;
      
      mesh.position.x = Math.cos(orbitAngle) * orbitRadius;
      mesh.position.z = Math.sin(orbitAngle) * orbitRadius;
      mesh.position.y = shape.position.y + verticalMotion;

      // Rotation animation
      mesh.rotation.x += delta * shape.rotationSpeed.x * intensity;
      mesh.rotation.y += delta * shape.rotationSpeed.y * intensity;
      mesh.rotation.z += delta * shape.rotationSpeed.z * intensity;

      // Scale animation
      const scaleVariation = 1 + Math.sin(time * shape.morphSpeed * 2 + phase) * 0.3 * intensity;
      mesh.scale.setScalar(shape.scale * scaleVariation);

      // Geometric morphing
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const originalPositions = (geometry as any).originalPositions;
      
      if (originalPositions && geometry.attributes.position) {
        const positions = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          vertex.set(
            originalPositions[i3],
            originalPositions[i3 + 1],
            originalPositions[i3 + 2]
          );

          // Apply mathematical transformations based on shape type
          switch (shape.type) {
            case 'fibonacci_sphere':
              vertex = transformations.sphericalHarmonics(vertex, time + phase, 3, 2);
              break;
            case 'klein_bottle':
              vertex = transformations.kleinTransform(vertex, time + phase);
              break;
            case 'torus_knot':
              vertex = transformations.torusTransform(vertex, time + phase, 1.0, 0.3);
              break;
            default:
              // Generic wave deformation
              vertex.add(new THREE.Vector3(
                Math.sin(time * 2 + vertex.y * 5 + phase) * 0.1,
                Math.cos(time * 1.5 + vertex.x * 5 + phase) * 0.1,
                Math.sin(time * 1.8 + vertex.z * 5 + phase) * 0.1
              ).multiplyScalar(intensity));
          }
          
          positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      }

      // Update shader materials
      const material = mesh.material;
      if (material instanceof THREE.ShaderMaterial && material.uniforms) {
        material.uniforms.uTime.value = time;
        material.uniforms.uIntensity.value = intensity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((shape, index) => {
        const geometry = geometries[shape.type];
        const material = materials[index];

        return (
          <mesh
            key={shape.id}
            ref={(mesh) => {
              if (mesh) shapesRef.current[index] = mesh;
            }}
            geometry={geometry}
            material={material}
            position={shape.position}
            scale={shape.scale}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}
