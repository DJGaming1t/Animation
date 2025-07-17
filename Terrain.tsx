import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface TerrainProps {
  data: {
    size: number;
    resolution: number;
    heights: number[][];
  };
  lodLevel: number;
}

/**
 * Advanced terrain system with multiple texture layers and LOD
 * Supports displacement mapping, normal mapping, and multi-texture blending
 */
export default function Terrain({ data, lodLevel }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { terrainVertexShader, terrainFragmentShader } = useShaders();

  // Load terrain textures
  const grassTexture = useLoader(TextureLoader, "/textures/grass.png");
  const sandTexture = useLoader(TextureLoader, "/textures/sand.jpg");
  const asphaltTexture = useLoader(TextureLoader, "/textures/asphalt.png");
  const woodTexture = useLoader(TextureLoader, "/textures/wood.jpg");

  // Setup texture properties
  useMemo(() => {
    [grassTexture, sandTexture, asphaltTexture, woodTexture].forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 8);
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    });
  }, [grassTexture, sandTexture, asphaltTexture, woodTexture]);

  // Generate terrain geometry
  const geometry = useMemo(() => {
    const resolution = Math.max(32, data.resolution >> lodLevel);
    const geo = new THREE.PlaneGeometry(data.size, data.size, resolution - 1, resolution - 1);
    
    // Apply height displacement
    const vertices = geo.attributes.position.array as Float32Array;
    const uvs = geo.attributes.uv.array as Float32Array;
    const normals = new Float32Array(vertices.length);
    const tangents = new Float32Array(vertices.length / 3 * 4);
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const index = i * resolution + j;
        const vertexIndex = index * 3;
        
        // Interpolate height from height map
        const heightX = (i / (resolution - 1)) * (data.heights.length - 1);
        const heightZ = (j / (resolution - 1)) * (data.heights[0].length - 1);
        
        const x1 = Math.floor(heightX);
        const x2 = Math.min(x1 + 1, data.heights.length - 1);
        const z1 = Math.floor(heightZ);
        const z2 = Math.min(z1 + 1, data.heights[0].length - 1);
        
        const fx = heightX - x1;
        const fz = heightZ - z1;
        
        const h1 = data.heights[x1][z1] * (1 - fx) + data.heights[x2][z1] * fx;
        const h2 = data.heights[x1][z2] * (1 - fx) + data.heights[x2][z2] * fx;
        const height = h1 * (1 - fz) + h2 * fz;
        
        vertices[vertexIndex + 1] = height;
        
        // Calculate normals
        const left = i > 0 ? getHeightAt(i - 1, j) : height;
        const right = i < resolution - 1 ? getHeightAt(i + 1, j) : height;
        const bottom = j > 0 ? getHeightAt(i, j - 1) : height;
        const top = j < resolution - 1 ? getHeightAt(i, j + 1) : height;
        
        const normal = new THREE.Vector3(
          (left - right) * 0.1,
          2.0,
          (bottom - top) * 0.1
        ).normalize();
        
        normals[vertexIndex] = normal.x;
        normals[vertexIndex + 1] = normal.y;
        normals[vertexIndex + 2] = normal.z;
        
        // Calculate tangents for normal mapping
        const tangent = new THREE.Vector3(1, 0, 0).normalize();
        tangents[index * 4] = tangent.x;
        tangents[index * 4 + 1] = tangent.y;
        tangents[index * 4 + 2] = tangent.z;
        tangents[index * 4 + 3] = 1;
      }
    }
    
    function getHeightAt(x: number, z: number): number {
      const heightX = (x / (resolution - 1)) * (data.heights.length - 1);
      const heightZ = (z / (resolution - 1)) * (data.heights[0].length - 1);
      
      const x1 = Math.floor(heightX);
      const x2 = Math.min(x1 + 1, data.heights.length - 1);
      const z1 = Math.floor(heightZ);
      const z2 = Math.min(z1 + 1, data.heights[0].length - 1);
      
      const fx = heightX - x1;
      const fz = heightZ - z1;
      
      const h1 = data.heights[x1][z1] * (1 - fx) + data.heights[x2][z1] * fx;
      const h2 = data.heights[x1][z2] * (1 - fx) + data.heights[x2][z2] * fx;
      return h1 * (1 - fz) + h2 * fz;
    }
    
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('tangent', new THREE.BufferAttribute(tangents, 4));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    
    return geo;
  }, [data, lodLevel]);

  // Terrain shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGrassTexture: { value: grassTexture },
        uSandTexture: { value: sandTexture },
        uAsphaltTexture: { value: asphaltTexture },
        uWoodTexture: { value: woodTexture },
        uTextureScale: { value: 8.0 },
        uHeightScale: { value: 1.0 },
        uSlopeThreshold: { value: 0.7 },
        uHeightThreshold: { value: 5.0 },
        uFogNear: { value: 50.0 },
        uFogFar: { value: 200.0 },
        uFogColor: { value: new THREE.Color("#000011") }
      },
      vertexShader: terrainVertexShader || `
        uniform float uTime;
        uniform float uHeightScale;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;
        varying float vSlope;
        varying float vFogDepth;
        
        void main() {
          vec3 pos = position;
          
          // Apply height scaling
          pos.y *= uHeightScale;
          
          // Gentle terrain animation
          pos.y += sin(uTime * 0.1 + pos.x * 0.01 + pos.z * 0.01) * 0.2;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vHeight = pos.y;
          vSlope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
          vFogDepth = -mvPosition.z;
        }
      `,
      fragmentShader: terrainFragmentShader || `
        uniform float uTime;
        uniform sampler2D uGrassTexture;
        uniform sampler2D uSandTexture;
        uniform sampler2D uAsphaltTexture;
        uniform sampler2D uWoodTexture;
        uniform float uTextureScale;
        uniform float uSlopeThreshold;
        uniform float uHeightThreshold;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform vec3 uFogColor;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;
        varying float vSlope;
        varying float vFogDepth;
        
        void main() {
          vec2 scaledUv = vUv * uTextureScale;
          
          // Sample textures
          vec4 grassColor = texture2D(uGrassTexture, scaledUv);
          vec4 sandColor = texture2D(uSandTexture, scaledUv);
          vec4 asphaltColor = texture2D(uAsphaltTexture, scaledUv);
          vec4 woodColor = texture2D(uWoodTexture, scaledUv);
          
          // Texture blending based on height and slope
          vec4 finalColor = grassColor;
          
          // Sand in low areas
          if (vHeight < 2.0) {
            float sandMix = smoothstep(2.0, 0.0, vHeight);
            finalColor = mix(finalColor, sandColor, sandMix);
          }
          
          // Asphalt on steep slopes
          if (vSlope > uSlopeThreshold) {
            float asphaltMix = smoothstep(uSlopeThreshold, 1.0, vSlope);
            finalColor = mix(finalColor, asphaltColor, asphaltMix * 0.7);
          }
          
          // Wood on high areas
          if (vHeight > uHeightThreshold) {
            float woodMix = smoothstep(uHeightThreshold, uHeightThreshold + 5.0, vHeight);
            finalColor = mix(finalColor, woodColor, woodMix * 0.8);
          }
          
          // Add some variation
          float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1) * 0.1 + 0.9;
          finalColor.rgb *= noise;
          
          // Lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float NdotL = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.3;
          float lighting = ambient + NdotL * 0.7;
          
          finalColor.rgb *= lighting;
          
          // Fog
          float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
          finalColor.rgb = mix(finalColor.rgb, uFogColor, fogFactor);
          
          gl_FragColor = finalColor;
        }
      `,
      side: THREE.DoubleSide
    });
  }, [grassTexture, sandTexture, asphaltTexture, woodTexture, terrainVertexShader, terrainFragmentShader]);

  // Update animation
  useFrame((state) => {
    if (!materialRef.current) return;
    
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
    />
  );
}
