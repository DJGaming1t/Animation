import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { GeometryGenerators } from "../../utils/GeometryGenerators";

interface AnimatedObjectsProps {
  sequence?: string;
  time: number;
  lodLevel: number;
}

/**
 * Collection of animated geometric objects that respond to different sequences
 * Creates dynamic sculptures, rotating forms, and morphing geometries
 */
export default function AnimatedObjects({ sequence, time, lodLevel }: AnimatedObjectsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const objectsRef = useRef<THREE.Mesh[]>([]);

  // Generate animated objects based on sequence
  const objects = useMemo(() => {
    const objectCount = Math.max(5, 20 - lodLevel * 3);
    const objs = [];

    for (let i = 0; i < objectCount; i++) {
      const type = i % 6; // 6 different object types
      const angle = (i / objectCount) * Math.PI * 2;
      const radius = 30 + Math.random() * 40;
      
      objs.push({
        id: i,
        type,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.random() * 20 + 5,
          Math.sin(angle) * radius
        ),
        rotation: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        scale: new THREE.Vector3(
          0.5 + Math.random() * 1.5,
          0.5 + Math.random() * 1.5,
          0.5 + Math.random() * 1.5
        ),
        animationSpeed: 0.5 + Math.random() * 1.5,
        animationPhase: Math.random() * Math.PI * 2
      });
    }

    return objs;
  }, [lodLevel]);

  // Create geometries for different object types
  const geometries = useMemo(() => {
    const detail = Math.max(0, 3 - lodLevel);
    
    return {
      0: GeometryGenerators.createMorphingCube(1, detail),
      1: GeometryGenerators.createSpiralSphere(1, detail),
      2: GeometryGenerators.createTwistedTorus(0.8, 0.3, detail),
      3: GeometryGenerators.createFractalTetrahedron(1, detail),
      4: GeometryGenerators.createHelixCylinder(0.5, 2, detail),
      5: GeometryGenerators.createMobiusStrip(1, detail)
    };
  }, [lodLevel]);

  // Materials for different sequences
  const materials = useMemo(() => {
    const createMaterial = (baseColor: string, emission: string = "#000000") => {
      return new THREE.MeshPhongMaterial({
        color: baseColor,
        emissive: emission,
        shininess: 100,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
    };

    const sequenceMaterials = {
      cosmic: [
        createMaterial("#4466ff", "#001133"),
        createMaterial("#6644ff", "#110033"),
        createMaterial("#44ffff", "#003333"),
        createMaterial("#ff44ff", "#330033"),
        createMaterial("#ffff44", "#333300"),
        createMaterial("#44ff44", "#003300")
      ],
      fire: [
        createMaterial("#ff4400", "#331100"),
        createMaterial("#ff6600", "#332200"),
        createMaterial("#ff8800", "#333300"),
        createMaterial("#ffaa00", "#334400"),
        createMaterial("#ffcc00", "#335500"),
        createMaterial("#ffee00", "#336600")
      ],
      water: [
        createMaterial("#0044ff", "#001133"),
        createMaterial("#0066ff", "#001144"),
        createMaterial("#0088ff", "#001155"),
        createMaterial("#00aaff", "#001166"),
        createMaterial("#00ccff", "#001177"),
        createMaterial("#00eeff", "#001188")
      ],
      crystal: [
        createMaterial("#ff44ff", "#330033"),
        createMaterial("#ff66ff", "#440044"),
        createMaterial("#ff88ff", "#550055"),
        createMaterial("#ffaaff", "#660066"),
        createMaterial("#ffccff", "#770077"),
        createMaterial("#ffeeff", "#880088")
      ],
      plasma: [
        createMaterial("#44ffff", "#003333"),
        createMaterial("#66ffff", "#004444"),
        createMaterial("#88ffff", "#005555"),
        createMaterial("#aaffff", "#006666"),
        createMaterial("#ccffff", "#007777"),
        createMaterial("#eeffff", "#008888")
      ],
      default: [
        createMaterial("#ffffff", "#333333"),
        createMaterial("#cccccc", "#222222"),
        createMaterial("#aaaaaa", "#111111"),
        createMaterial("#888888", "#000000"),
        createMaterial("#666666", "#000000"),
        createMaterial("#444444", "#000000")
      ]
    };

    return sequenceMaterials[sequence as keyof typeof sequenceMaterials] || sequenceMaterials.default;
  }, [sequence]);

  // Animation behaviors for different sequences
  const animationBehaviors = useMemo(() => ({
    cosmic: {
      rotation: { x: 1, y: 0.7, z: 0.3 },
      position: { amplitude: 5, frequency: 0.5 },
      scale: { amplitude: 0.3, frequency: 0.8 },
      morphing: true
    },
    fire: {
      rotation: { x: 2, y: 1.5, z: 1 },
      position: { amplitude: 8, frequency: 1.2 },
      scale: { amplitude: 0.5, frequency: 1.5 },
      morphing: true
    },
    water: {
      rotation: { x: 0.5, y: 0.3, z: 0.8 },
      position: { amplitude: 3, frequency: 0.3 },
      scale: { amplitude: 0.2, frequency: 0.6 },
      morphing: false
    },
    crystal: {
      rotation: { x: 0.8, y: 1.2, z: 0.4 },
      position: { amplitude: 2, frequency: 0.4 },
      scale: { amplitude: 0.4, frequency: 0.7 },
      morphing: true
    },
    plasma: {
      rotation: { x: 3, y: 2, z: 1.5 },
      position: { amplitude: 10, frequency: 2 },
      scale: { amplitude: 0.8, frequency: 2.5 },
      morphing: true
    },
    default: {
      rotation: { x: 1, y: 1, z: 1 },
      position: { amplitude: 5, frequency: 0.5 },
      scale: { amplitude: 0.3, frequency: 1 },
      morphing: false
    }
  }), []);

  const currentBehavior = animationBehaviors[sequence as keyof typeof animationBehaviors] || animationBehaviors.default;

  // Update object animations
  useFrame(() => {
    if (!groupRef.current) return;

    objects.forEach((obj, index) => {
      const mesh = groupRef.current?.children[index] as THREE.Mesh;
      if (!mesh) return;

      const phase = obj.animationPhase;
      const speed = obj.animationSpeed;

      // Rotation animation
      mesh.rotation.x = obj.rotation.x + time * speed * currentBehavior.rotation.x;
      mesh.rotation.y = obj.rotation.y + time * speed * currentBehavior.rotation.y;
      mesh.rotation.z = obj.rotation.z + time * speed * currentBehavior.rotation.z;

      // Position animation (orbital and vertical movement)
      const orbitRadius = 30 + Math.sin(time * 0.2 + phase) * 10;
      const orbitAngle = time * 0.1 * speed + phase;
      const verticalOffset = Math.sin(time * currentBehavior.position.frequency + phase) * currentBehavior.position.amplitude;

      mesh.position.x = Math.cos(orbitAngle) * orbitRadius;
      mesh.position.z = Math.sin(orbitAngle) * orbitRadius;
      mesh.position.y = obj.position.y + verticalOffset;

      // Scale animation (breathing effect)
      const scaleMultiplier = 1 + Math.sin(time * currentBehavior.scale.frequency + phase) * currentBehavior.scale.amplitude;
      mesh.scale.copy(obj.scale.clone().multiplyScalar(scaleMultiplier));

      // Morphing animation for supported geometries
      if (currentBehavior.morphing && mesh.geometry instanceof THREE.BufferGeometry) {
        const positions = mesh.geometry.attributes.position;
        if (positions) {
          const originalPositions = (mesh as any).originalPositions;
          if (originalPositions) {
            for (let i = 0; i < positions.count; i++) {
              const i3 = i * 3;
              const morphFactor = Math.sin(time * 2 + phase + i * 0.1) * 0.1;
              
              positions.array[i3] = originalPositions[i3] * (1 + morphFactor);
              positions.array[i3 + 1] = originalPositions[i3 + 1] * (1 + morphFactor * 0.5);
              positions.array[i3 + 2] = originalPositions[i3 + 2] * (1 + morphFactor);
            }
            positions.needsUpdate = true;
          }
        }
      }

      // Material property animation
      const material = mesh.material as THREE.MeshPhongMaterial;
      if (material) {
        // Opacity pulsing
        material.opacity = 0.6 + Math.sin(time * 1.5 + phase) * 0.3;
        
        // Emissive intensity
        const baseEmissive = materials[obj.type % materials.length].emissive.clone();
        const emissiveIntensity = 0.5 + Math.sin(time * 0.8 + phase) * 0.5;
        material.emissive.copy(baseEmissive.multiplyScalar(emissiveIntensity));
      }
    });
  });

  return (
    <group ref={groupRef}>
      {objects.map((obj, index) => {
        const geometry = geometries[obj.type as keyof typeof geometries];
        const material = materials[obj.type % materials.length].clone();

        return (
          <mesh
            key={obj.id}
            ref={(mesh) => {
              if (mesh) {
                objectsRef.current[index] = mesh;
                // Store original positions for morphing
                if (geometry.attributes.position) {
                  (mesh as any).originalPositions = Array.from(geometry.attributes.position.array);
                }
              }
            }}
            geometry={geometry}
            material={material}
            position={obj.position}
            rotation={obj.rotation}
            scale={obj.scale}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}
