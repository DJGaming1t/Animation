import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";
import { useShaders } from "../../hooks/useShaders";

interface WaveSystemProps {
  size: number;
  resolution: number;
  time: number;
}

/**
 * Advanced wave simulation system with multiple wave types
 * Creates realistic water surfaces with interference patterns
 */
export default function WaveSystem({ size, resolution, time }: WaveSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { liquidVertexShader, liquidFragmentShader } = useShaders();

  // Wave parameters for different wave types
  const waveParams = useMemo(() => ({
    primary: {
      amplitude: 2.0,
      frequency: 0.03,
      speed: 1.5,
      direction: new THREE.Vector2(1, 0)
    },
    secondary: {
      amplitude: 1.2,
      frequency: 0.05,
      speed: 1.0,
      direction: new THREE.Vector2(0.7, 0.7).normalize()
    },
    tertiary: {
      amplitude: 0.8,
      frequency: 0.08,
      speed: 0.8,
      direction: new THREE.Vector2(-0.5, 1).normalize()
    },
    ripples: {
      amplitude: 0.3,
      frequency: 0.2,
      speed: 2.0,
      direction: new THREE.Vector2(0, 1)
    }
  }), []);

  // Generate wave geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
    
    // Store original positions for wave calculation
    const originalPositions = geo.attributes.position.array.slice();
    (geo as any).originalPositions = originalPositions;
    
    geo.computeVertexNormals();
    geo.computeTangents();
    
    return geo;
  }, [size, resolution]);

  // Wave material with realistic water shading
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uResolution: { value: resolution },
        
        // Wave parameters
        uPrimaryWave: { value: new THREE.Vector4(
          waveParams.primary.amplitude,
          waveParams.primary.frequency,
          waveParams.primary.speed,
          0
        )},
        uSecondaryWave: { value: new THREE.Vector4(
          waveParams.secondary.amplitude,
          waveParams.secondary.frequency,
          waveParams.secondary.speed,
          0
        )},
        uTertiaryWave: { value: new THREE.Vector4(
          waveParams.tertiary.amplitude,
          waveParams.tertiary.frequency,
          waveParams.tertiary.speed,
          0
        )},
        uRipples: { value: new THREE.Vector4(
          waveParams.ripples.amplitude,
          waveParams.ripples.frequency,
          waveParams.ripples.speed,
          0
        )},
        
        // Wave directions
        uPrimaryDir: { value: waveParams.primary.direction },
        uSecondaryDir: { value: waveParams.secondary.direction },
        uTertiaryDir: { value: waveParams.tertiary.direction },
        uRipplesDir: { value: waveParams.ripples.direction },
        
        // Water properties
        uWaterColor: { value: new THREE.Color(0.1, 0.3, 0.8) },
        uFoamColor: { value: new THREE.Color(0.9, 0.95, 1.0) },
        uDeepColor: { value: new THREE.Color(0.0, 0.1, 0.4) },
        uTransparency: { value: 0.8 },
        uReflectivity: { value: 0.6 },
        
        // Environmental
        uSunDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        uSunColor: { value: new THREE.Color(1.0, 0.9, 0.7) }
      },
      vertexShader: liquidVertexShader || `
        uniform float uTime;
        uniform float uSize;
        uniform vec4 uPrimaryWave;
        uniform vec4 uSecondaryWave;
        uniform vec4 uTertiaryWave;
        uniform vec4 uRipples;
        uniform vec2 uPrimaryDir;
        uniform vec2 uSecondaryDir;
        uniform vec2 uTertiaryDir;
        uniform vec2 uRipplesDir;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWaveHeight;
        varying vec3 vWorldPosition;
        
        float calculateWave(vec2 pos, vec4 wave, vec2 direction, float time) {
          float dot_product = dot(pos, direction);
          float phase = dot_product * wave.y + time * wave.z;
          return wave.x * sin(phase);
        }
        
        vec2 calculateWaveDerivative(vec2 pos, vec4 wave, vec2 direction, float time) {
          float dot_product = dot(pos, direction);
          float phase = dot_product * wave.y + time * wave.z;
          float derivative = wave.x * wave.y * cos(phase);
          return derivative * direction;
        }
        
        void main() {
          vec3 pos = position;
          vec2 worldPos = pos.xz;
          
          // Calculate multiple wave heights
          float height = 0.0;
          height += calculateWave(worldPos, uPrimaryWave, uPrimaryDir, uTime);
          height += calculateWave(worldPos, uSecondaryWave, uSecondaryDir, uTime);
          height += calculateWave(worldPos, uTertiaryWave, uTertiaryDir, uTime);
          height += calculateWave(worldPos, uRipples, uRipplesDir, uTime);
          
          // Add some noise for natural variation
          height += sin(worldPos.x * 0.1 + uTime * 0.5) * 0.2;
          height += cos(worldPos.y * 0.15 + uTime * 0.3) * 0.15;
          
          pos.y = height;
          
          // Calculate wave derivatives for normal calculation
          vec2 dx = vec2(0.1, 0.0);
          vec2 dz = vec2(0.0, 0.1);
          
          float heightDx = 0.0;
          heightDx += calculateWave(worldPos + dx, uPrimaryWave, uPrimaryDir, uTime);
          heightDx += calculateWave(worldPos + dx, uSecondaryWave, uSecondaryDir, uTime);
          heightDx += calculateWave(worldPos + dx, uTertiaryWave, uTertiaryDir, uTime);
          heightDx += calculateWave(worldPos + dx, uRipples, uRipplesDir, uTime);
          
          float heightDz = 0.0;
          heightDz += calculateWave(worldPos + dz, uPrimaryWave, uPrimaryDir, uTime);
          heightDz += calculateWave(worldPos + dz, uSecondaryWave, uSecondaryDir, uTime);
          heightDz += calculateWave(worldPos + dz, uTertiaryWave, uTertiaryDir, uTime);
          heightDz += calculateWave(worldPos + dz, uRipples, uRipplesDir, uTime);
          
          // Calculate surface normal
          vec3 tangentX = vec3(dx.x, heightDx - height, 0.0);
          vec3 tangentZ = vec3(0.0, heightDz - height, dz.y);
          vec3 calculatedNormal = normalize(cross(tangentZ, tangentX));
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          
          vPosition = pos;
          vNormal = calculatedNormal;
          vUv = uv;
          vWaveHeight = height;
          vWorldPosition = worldPosition.xyz;
        }
      `,
      fragmentShader: liquidFragmentShader || `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uFoamColor;
        uniform vec3 uDeepColor;
        uniform float uTransparency;
        uniform float uReflectivity;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWaveHeight;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          
          // Base water color based on depth
          vec3 color = mix(uWaterColor, uDeepColor, clamp(-vWaveHeight * 0.1, 0.0, 1.0));
          
          // Foam on wave peaks
          float foamFactor = smoothstep(0.8, 1.5, vWaveHeight);
          color = mix(color, uFoamColor, foamFactor);
          
          // Fresnel effect
          float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
          
          // Sun reflection
          vec3 reflectDirection = reflect(-uSunDirection, normal);
          float sunReflection = pow(max(dot(viewDirection, reflectDirection), 0.0), 32.0);
          
          // Lighting
          float NdotL = max(dot(normal, uSunDirection), 0.0);
          vec3 lighting = uSunColor * NdotL * 0.7 + 0.3; // Ambient
          
          color *= lighting;
          color += sunReflection * uSunColor * uReflectivity;
          
          // Add some caustics pattern
          float caustics = sin(vWorldPosition.x * 0.5 + uTime * 2.0) * 
                          cos(vWorldPosition.z * 0.5 + uTime * 1.5);
          caustics = smoothstep(-0.5, 0.5, caustics) * 0.2;
          color += caustics * uSunColor;
          
          // Transparency based on fresnel and depth
          float alpha = mix(uTransparency, 1.0, fresnel);
          alpha = mix(alpha, 1.0, foamFactor);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [size, waveParams, liquidVertexShader, liquidFragmentShader]);

  // Update wave animation
  useFrame((state) => {
    if (!materialRef.current) return;
    
    materialRef.current.uniforms.uTime.value = time;
    
    // Update sun direction based on time
    const sunAngle = time * 0.1;
    materialRef.current.uniforms.uSunDirection.value.set(
      Math.cos(sunAngle),
      Math.sin(sunAngle) * 0.5 + 0.5,
      0.5
    );
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -5, 0]}
      receiveShadow
    />
  );
}
