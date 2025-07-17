import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { NoiseGenerator } from "../../utils/NoiseGenerator";
import { MathUtils } from "../../utils/MathUtils";

interface FloatingIslandsProps {
  count: number;
  time: number;
}

/**
 * Floating islands with procedural generation and vegetation
 * Creates mystical floating landmasses with dynamic positioning
 */
export default function FloatingIslands({ count, time }: FloatingIslandsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const islandsRef = useRef<THREE.Mesh[]>([]);
  const noiseGen = useMemo(() => new NoiseGenerator(), []);

  // Load textures
  const grassTexture = useLoader(TextureLoader, "/textures/grass.png");
  const woodTexture = useLoader(TextureLoader, "/textures/wood.jpg");

  // Setup texture properties
  useMemo(() => {
    [grassTexture, woodTexture].forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
    });
  }, [grassTexture, woodTexture]);

  // Generate island data
  const islands = useMemo(() => {
    const islandData = [];

    for (let i = 0; i < count; i++) {
      // Position islands in a spiral pattern at different heights
      const angle = (i / count) * Math.PI * 4;
      const radius = 50 + i * 15;
      const height = 20 + i * 10 + Math.sin(i) * 5;

      const island = {
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        size: 8 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2,
        orbitSpeed: 0.02 + Math.random() * 0.03,
        bobSpeed: 0.5 + Math.random() * 0.5,
        bobAmplitude: 2 + Math.random() * 3,
        vegetation: Math.random() > 0.3 // 70% chance of vegetation
      };

      islandData.push(island);
    }

    return islandData;
  }, [count]);

  // Generate island geometries
  const islandGeometries = useMemo(() => {
    return islands.map(island => {
      const size = island.size;
      const segments = 16;
      const geometry = new THREE.SphereGeometry(size, segments, segments, 0, Math.PI * 2, 0, Math.PI * 0.6);
      
      // Apply noise for natural island shape
      const positions = geometry.attributes.position;
      const vertex = new THREE.Vector3();

      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        
        // Apply multiple octaves of noise
        let noise = 0;
        noise += noiseGen.simplex3D(vertex.x * 0.1, vertex.y * 0.1, vertex.z * 0.1) * 0.5;
        noise += noiseGen.simplex3D(vertex.x * 0.2, vertex.y * 0.2, vertex.z * 0.2) * 0.3;
        noise += noiseGen.simplex3D(vertex.x * 0.4, vertex.y * 0.4, vertex.z * 0.4) * 0.2;
        
        // Apply noise displacement
        vertex.multiplyScalar(1 + noise * 0.3);
        
        // Flatten the bottom
        if (vertex.y < 0) {
          vertex.y *= 0.3;
        }
        
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }

      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      return geometry;
    });
  }, [islands, noiseGen]);

  // Generate vegetation for islands
  const vegetation = useMemo(() => {
    return islands.map(island => {
      if (!island.vegetation) return [];
      
      const trees = [];
      const treeCount = 3 + Math.floor(Math.random() * 8);
      
      for (let i = 0; i < treeCount; i++) {
        // Distribute trees on island surface
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * island.size * 0.7;
        const height = 1 + Math.random() * 3;
        
        trees.push({
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            island.size * 0.3 + height * 0.5,
            Math.sin(angle) * radius
          ),
          height,
          scale: 0.5 + Math.random() * 0.5
        });
      }
      
      return trees;
    });
  }, [islands]);

  // Materials
  const islandMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      map: grassTexture,
      color: "#4a7c59"
    });
  }, [grassTexture]);

  const treeMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      map: woodTexture,
      color: "#8B4513"
    });
  }, [woodTexture]);

  const leafMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: "#228B22"
    });
  }, []);

  // Tree geometry
  const treeGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.2, 0.4, 1, 8);
  }, []);

  const leafGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.8, 8, 6);
  }, []);

  // Update island animations
  useFrame(() => {
    if (!groupRef.current) return;

    islands.forEach((island, index) => {
      const islandMesh = islandsRef.current[index];
      if (!islandMesh) return;

      const islandGroup = islandMesh.parent as THREE.Group;
      if (!islandGroup) return;

      // Orbital motion
      const orbitAngle = time * island.orbitSpeed + island.rotation;
      const orbitRadius = 50 + index * 15;
      
      islandGroup.position.x = Math.cos(orbitAngle) * orbitRadius;
      islandGroup.position.z = Math.sin(orbitAngle) * orbitRadius;
      
      // Floating bob motion
      const bobOffset = Math.sin(time * island.bobSpeed + island.rotation) * island.bobAmplitude;
      islandGroup.position.y = island.position.y + bobOffset;
      
      // Gentle rotation
      islandGroup.rotation.y = time * 0.1 + island.rotation;
      
      // Island breathing (slight scale animation)
      const breathe = 1 + Math.sin(time * 0.3 + island.rotation) * 0.02;
      islandMesh.scale.setScalar(breathe);
    });
  });

  return (
    <group ref={groupRef}>
      {islands.map((island, index) => (
        <group key={island.id} position={island.position}>
          {/* Island mesh */}
          <mesh
            ref={(mesh) => {
              if (mesh) islandsRef.current[index] = mesh;
            }}
            geometry={islandGeometries[index]}
            material={islandMaterial}
            castShadow
            receiveShadow
          />
          
          {/* Vegetation */}
          {vegetation[index].map((tree, treeIndex) => (
            <group key={treeIndex} position={tree.position} scale={tree.scale}>
              {/* Tree trunk */}
              <mesh
                geometry={treeGeometry}
                material={treeMaterial}
                position={[0, tree.height * 0.5, 0]}
                scale={[1, tree.height, 1]}
                castShadow
              />
              
              {/* Tree leaves */}
              <mesh
                geometry={leafGeometry}
                material={leafMaterial}
                position={[0, tree.height + 0.5, 0]}
                castShadow
              />
            </group>
          ))}
          
          {/* Ambient particles around island */}
          <group>
            {Array.from({ length: 5 }, (_, i) => {
              const angle = (i / 5) * Math.PI * 2;
              const radius = island.size + 2;
              return (
                <mesh
                  key={i}
                  position={[
                    Math.cos(angle) * radius,
                    Math.sin(time * 0.5 + i) * 2,
                    Math.sin(angle) * radius
                  ]}
                >
                  <sphereGeometry args={[0.1, 4, 4]} />
                  <meshBasicMaterial
                    color="#88ccff"
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}
