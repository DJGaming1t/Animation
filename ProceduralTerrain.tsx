import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NoiseGenerator } from "../../utils/NoiseGenerator";
import { MathUtils } from "../../utils/MathUtils";

interface ProceduralTerrainProps {
  size: number;
  complexity: number;
  time: number;
}

/**
 * Procedurally generated terrain with real-time deformation
 * Uses multiple octaves of noise for natural terrain features
 */
export default function ProceduralTerrain({ size, complexity, time }: ProceduralTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const noiseGen = useMemo(() => new NoiseGenerator(), []);

  // Generate procedural terrain geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, complexity - 1, complexity - 1);
    const vertices = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(vertices.length);
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Multi-octave noise for terrain height
      let height = 0;
      let amplitude = 1;
      let frequency = 0.01;
      
      // Add multiple noise octaves
      for (let octave = 0; octave < 6; octave++) {
        height += noiseGen.simplex2D(x * frequency, z * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      // Additional noise layers for detail
      height += noiseGen.simplex2D(x * 0.05, z * 0.05) * 3;
      height += noiseGen.simplex2D(x * 0.1, z * 0.1) * 1;
      height += noiseGen.simplex2D(x * 0.2, z * 0.2) * 0.5;
      
      // Scale height
      vertices[i + 1] = height * 15;
      
      // Generate colors based on height
      const normalizedHeight = MathUtils.clamp((height + 5) / 20, 0, 1);
      colors[i] = normalizedHeight * 0.5 + 0.2; // Red
      colors[i + 1] = normalizedHeight * 0.8 + 0.3; // Green
      colors[i + 2] = normalizedHeight * 0.3 + 0.4; // Blue
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    
    return geo;
  }, [size, complexity, noiseGen]);

  // Procedural terrain material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeformation: { value: 1.0 },
        uColorIntensity: { value: 1.0 },
        uWaveAmplitude: { value: 0.5 },
        uWaveFrequency: { value: 0.01 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uDeformation;
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        
        attribute vec3 color;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vColor;
        varying float vElevation;
        
        void main() {
          vec3 pos = position;
          
          // Real-time terrain deformation
          float wave1 = sin(pos.x * uWaveFrequency + uTime * 0.5) * uWaveAmplitude;
          float wave2 = cos(pos.z * uWaveFrequency + uTime * 0.3) * uWaveAmplitude;
          float wave3 = sin((pos.x + pos.z) * uWaveFrequency * 0.5 + uTime * 0.7) * uWaveAmplitude * 0.5;
          
          pos.y += (wave1 + wave2 + wave3) * uDeformation;
          
          // Additional organic deformation
          float organicDeform = sin(uTime * 0.2 + pos.x * 0.01) * cos(uTime * 0.15 + pos.z * 0.01);
          pos.y += organicDeform * 2.0 * uDeformation;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          vColor = color;
          vElevation = pos.y;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uColorIntensity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vColor;
        varying float vElevation;
        
        void main() {
          // Base color from vertex colors
          vec3 color = vColor * uColorIntensity;
          
          // Height-based color modification
          float heightFactor = (vElevation + 10.0) / 20.0;
          heightFactor = clamp(heightFactor, 0.0, 1.0);
          
          // Color zones based on elevation
          if (heightFactor < 0.2) {
            // Water/low areas - blue
            color = mix(color, vec3(0.2, 0.4, 0.8), 0.6);
          } else if (heightFactor < 0.4) {
            // Beach/sand - yellow
            color = mix(color, vec3(0.8, 0.7, 0.4), 0.4);
          } else if (heightFactor < 0.6) {
            // Grass - green
            color = mix(color, vec3(0.3, 0.7, 0.2), 0.5);
          } else if (heightFactor < 0.8) {
            // Rock - gray
            color = mix(color, vec3(0.5, 0.5, 0.5), 0.4);
          } else {
            // Snow/peaks - white
            color = mix(color, vec3(0.9, 0.9, 0.9), 0.6);
          }
          
          // Dynamic color shifts
          float timeShift = sin(uTime * 0.1 + vPosition.x * 0.01 + vPosition.z * 0.01) * 0.1;
          color += timeShift;
          
          // Lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float NdotL = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.4;
          float lighting = ambient + NdotL * 0.6;
          
          color *= lighting;
          
          // Add atmospheric perspective
          float distance = length(vPosition);
          float fog = smoothstep(50.0, 150.0, distance);
          color = mix(color, vec3(0.1, 0.1, 0.2), fog * 0.5);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      vertexColors: true,
      wireframe: false
    });
  }, []);

  // Update terrain animation
  useFrame((state) => {
    if (!materialRef.current) return;
    
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uDeformation.value = 0.5 + Math.sin(time * 0.2) * 0.3;
    materialRef.current.uniforms.uColorIntensity.value = 0.8 + Math.sin(time * 0.3) * 0.2;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -20, 0]}
      receiveShadow
      castShadow
    />
  );
}
