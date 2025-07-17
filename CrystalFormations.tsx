import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { useShaders } from "../../hooks/useShaders";

interface CrystalFormationsProps {
  count: number;
  time: number;
  intensity: number;
}

/**
 * Dynamic crystal formations with complex geometries and refractive materials
 * Creates clusters of crystals that grow, pulse, and emit light
 */
export default function CrystalFormations({ count, time, intensity }: CrystalFormationsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const crystalsRef = useRef<THREE.Mesh[]>([]);
  
  const { crystalVertexShader, crystalFragmentShader } = useShaders();

  // Generate crystal cluster data
  const crystalClusters = useMemo(() => {
    const clusters = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 25 + Math.random() * 50;
      
      const cluster = {
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.random() * 10,
          Math.sin(angle) * radius
        ),
        crystalCount: 5 + Math.floor(Math.random() * 10),
        baseColor: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
        growthSpeed: 0.5 + Math.random() * 1.0,
        pulseSpeed: 1.0 + Math.random() * 2.0,
        rotation: Math.random() * Math.PI * 2
      };

      clusters.push(cluster);
    }

    return clusters;
  }, [count]);

  // Generate individual crystals for each cluster
  const crystalData = useMemo(() => {
    return crystalClusters.map(cluster => {
      const crystals = [];
      
      for (let i = 0; i < cluster.crystalCount; i++) {
        // Arrange crystals in cluster formation
        const clusterAngle = (i / cluster.crystalCount) * Math.PI * 2;
        const clusterRadius = 1 + Math.random() * 3;
        const height = 2 + Math.random() * 6;
        
        crystals.push({
          id: i,
          position: new THREE.Vector3(
            Math.cos(clusterAngle) * clusterRadius,
            Math.random() * 2,
            Math.sin(clusterAngle) * clusterRadius
          ),
          height,
          width: 0.5 + Math.random() * 1.0,
          rotation: new THREE.Vector3(
            Math.random() * Math.PI * 0.2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 0.2
          ),
          facets: 6 + Math.floor(Math.random() * 6), // 6-12 sided crystals
          growthPhase: Math.random() * Math.PI * 2,
          energyLevel: Math.random()
        });
      }
      
      return crystals;
    });
  }, [crystalClusters]);

  // Create crystal geometries
  const createCrystalGeometry = useMemo(() => {
    return (height: number, width: number, facets: number) => {
      const geometry = new THREE.ConeGeometry(width, height, facets);
      
      // Modify geometry for more crystal-like shape
      const positions = geometry.attributes.position;
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        
        // Add some irregularity to crystal faces
        if (vertex.y > height * 0.3) {
          const noise = (Math.random() - 0.5) * 0.1;
          vertex.x += noise;
          vertex.z += noise;
        }
        
        // Create pointed top
        if (vertex.y > height * 0.8) {
          vertex.x *= 0.3;
          vertex.z *= 0.3;
        }
        
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      
      geometry.computeVertexNormals();
      geometry.computeTangents();
      
      return geometry;
    };
  }, []);

  // Crystal materials with refractive properties
  const crystalMaterials = useMemo(() => {
    return crystalClusters.map(cluster => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: intensity },
          uBaseColor: { value: cluster.baseColor },
          uRefractionRatio: { value: 0.95 },
          uFresnelBias: { value: 0.1 },
          uFresnelScale: { value: 1.0 },
          uFresnelPower: { value: 2.0 },
          uEnergyLevel: { value: 1.0 },
          uPulseSpeed: { value: cluster.pulseSpeed }
        },
        vertexShader: crystalVertexShader || `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uEnergyLevel;
          uniform float uPulseSpeed;
          uniform float uFresnelBias;
          uniform float uFresnelScale;
          uniform float uFresnelPower;
          
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying vec3 vEyeVector;
          varying float vFresnel;
          varying float vEnergy;
          
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            vWorldPosition = worldPosition.xyz;
            vWorldNormal = normalize(normalMatrix * normal);
            vEyeVector = normalize(worldPosition.xyz - cameraPosition);
            
            // Fresnel effect
            vFresnel = uFresnelBias + uFresnelScale * pow(1.0 + dot(vEyeVector, vWorldNormal), uFresnelPower);
            
            // Energy pulsing
            vEnergy = uEnergyLevel * (0.5 + 0.5 * sin(uTime * uPulseSpeed));
            
            // Crystal growth animation
            vec3 pos = position;
            float growth = 0.8 + 0.2 * sin(uTime * 0.5);
            pos.y *= growth;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: crystalFragmentShader || `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uBaseColor;
          uniform float uRefractionRatio;
          
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying vec3 vEyeVector;
          varying float vFresnel;
          varying float vEnergy;
          
          void main() {
            // Base crystal color
            vec3 color = uBaseColor;
            
            // Refraction effect
            vec3 refracted = refract(vEyeVector, vWorldNormal, uRefractionRatio);
            float refractionFactor = dot(refracted, vWorldNormal);
            
            // Internal light scattering
            float scatter = abs(sin(vWorldPosition.x * 0.1 + uTime)) * 
                           abs(cos(vWorldPosition.z * 0.1 + uTime * 0.7));
            color += scatter * 0.3;
            
            // Energy glow
            color += vEnergy * uIntensity * 0.5;
            
            // Fresnel highlighting
            color += vFresnel * 0.4;
            
            // Internal structure lines
            float lines = sin(vWorldPosition.y * 2.0) * 0.1 + 0.9;
            color *= lines;
            
            // Transparency based on viewing angle
            float alpha = 0.7 + vFresnel * 0.3;
            alpha *= uIntensity;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
    });
  }, [crystalClusters, intensity, crystalVertexShader, crystalFragmentShader]);

  // Update crystal animations
  useFrame(() => {
    if (!groupRef.current) return;

    crystalClusters.forEach((cluster, clusterIndex) => {
      const clusterGroup = groupRef.current?.children[clusterIndex] as THREE.Group;
      if (!clusterGroup) return;

      // Rotate entire cluster
      clusterGroup.rotation.y = time * 0.1 + cluster.rotation;
      
      // Vertical floating motion
      const floatOffset = Math.sin(time * cluster.pulseSpeed * 0.3) * 2;
      clusterGroup.position.y = cluster.position.y + floatOffset;

      // Update individual crystals in cluster
      crystalData[clusterIndex].forEach((crystal, crystalIndex) => {
        const crystalMesh = clusterGroup.children[crystalIndex] as THREE.Mesh;
        if (!crystalMesh) return;

        // Individual crystal rotation
        crystalMesh.rotation.x = crystal.rotation.x + time * 0.2;
        crystalMesh.rotation.z = crystal.rotation.z + time * 0.1;

        // Growth pulsing
        const growthPulse = 0.9 + 0.1 * Math.sin(time * cluster.growthSpeed + crystal.growthPhase);
        crystalMesh.scale.y = growthPulse;

        // Energy level animation
        const material = crystalMesh.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.uTime.value = time;
          material.uniforms.uIntensity.value = intensity;
          material.uniforms.uEnergyLevel.value = crystal.energyLevel * (0.5 + 0.5 * Math.sin(time * 2));
        }
      });

      // Update cluster material
      const clusterMaterial = crystalMaterials[clusterIndex];
      if (clusterMaterial.uniforms) {
        clusterMaterial.uniforms.uTime.value = time;
        clusterMaterial.uniforms.uIntensity.value = intensity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {crystalClusters.map((cluster, clusterIndex) => (
        <group
          key={cluster.id}
          position={cluster.position}
        >
          {crystalData[clusterIndex].map((crystal, crystalIndex) => {
            const geometry = createCrystalGeometry(crystal.height, crystal.width, crystal.facets);
            
            return (
              <mesh
                key={crystal.id}
                geometry={geometry}
                material={crystalMaterials[clusterIndex]}
                position={crystal.position}
                rotation={crystal.rotation}
                castShadow
                receiveShadow
              />
            );
          })}
          
          {/* Crystal base/platform */}
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[4, 5, 1, 8]} />
            <meshPhongMaterial
              color={cluster.baseColor}
              emissive={cluster.baseColor}
              emissiveIntensity={0.2}
              transparent
              opacity={0.3}
            />
          </mesh>
          
          {/* Energy emanation effect */}
          <group>
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 6 + Math.sin(time * 2 + i) * 2;
              
              return (
                <mesh
                  key={i}
                  position={[
                    Math.cos(angle) * radius,
                    Math.sin(time * 1.5 + i) * 3,
                    Math.sin(angle) * radius
                  ]}
                >
                  <sphereGeometry args={[0.2, 4, 4]} />
                  <meshBasicMaterial
                    color={cluster.baseColor}
                    transparent
                    opacity={0.4}
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
