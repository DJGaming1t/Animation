import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShaders } from "../../hooks/useShaders";

interface DynamicSkyProps {
  sequence?: string;
  time: number;
}

/**
 * Dynamic sky system with procedural clouds, atmospheric scattering, and celestial bodies
 * Adapts to different animation sequences with unique sky characteristics
 */
export default function DynamicSky({ sequence, time }: DynamicSkyProps) {
  const skyRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Points>(null);
  const starsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { skyVertexShader, skyFragmentShader } = useShaders();

  // Sky configuration based on sequence
  const skyConfig = useMemo(() => {
    const configs = {
      cosmic: {
        skyColor: new THREE.Color(0x000022),
        horizonColor: new THREE.Color(0x001144),
        sunColor: new THREE.Color(0x4466ff),
        cloudDensity: 0.2,
        starDensity: 0.8
      },
      fire: {
        skyColor: new THREE.Color(0x220011),
        horizonColor: new THREE.Color(0x441122),
        sunColor: new THREE.Color(0xff4400),
        cloudDensity: 0.6,
        starDensity: 0.1
      },
      water: {
        skyColor: new THREE.Color(0x001122),
        horizonColor: new THREE.Color(0x002244),
        sunColor: new THREE.Color(0x0066ff),
        cloudDensity: 0.4,
        starDensity: 0.3
      },
      crystal: {
        skyColor: new THREE.Color(0x110022),
        horizonColor: new THREE.Color(0x220044),
        sunColor: new THREE.Color(0xff44ff),
        cloudDensity: 0.3,
        starDensity: 0.6
      },
      plasma: {
        skyColor: new THREE.Color(0x002211),
        horizonColor: new THREE.Color(0x004422),
        sunColor: new THREE.Color(0x44ffff),
        cloudDensity: 0.1,
        starDensity: 0.9
      },
      default: {
        skyColor: new THREE.Color(0x001122),
        horizonColor: new THREE.Color(0x002244),
        sunColor: new THREE.Color(0xffffff),
        cloudDensity: 0.5,
        starDensity: 0.5
      }
    };
    
    return configs[sequence as keyof typeof configs] || configs.default;
  }, [sequence]);

  // Sky dome geometry
  const skyGeometry = useMemo(() => {
    return new THREE.SphereGeometry(500, 32, 16);
  }, []);

  // Cloud particles
  const cloudData = useMemo(() => {
    const count = Math.floor(1000 * skyConfig.cloudDensity);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const densities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Distribute clouds in upper hemisphere
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI * 0.4 + Math.PI * 0.1; // Upper portion
      const radius = 200 + Math.random() * 150;
      
      positions[i3] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i3 + 1] = Math.abs(radius * Math.cos(theta)) + 50;
      positions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
      
      sizes[i] = Math.random() * 20 + 10;
      densities[i] = Math.random() * 0.5 + 0.3;
    }
    
    return { positions, sizes, densities, count };
  }, [skyConfig.cloudDensity]);

  // Star field
  const starData = useMemo(() => {
    const count = Math.floor(2000 * skyConfig.starDensity);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const intensities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Distribute stars on sphere
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const radius = 480;
      
      positions[i3] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i3 + 1] = radius * Math.cos(theta);
      positions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
      
      sizes[i] = Math.random() * 2 + 0.5;
      intensities[i] = Math.random() * 0.8 + 0.2;
    }
    
    return { positions, sizes, intensities, count };
  }, [skyConfig.starDensity]);

  // Sky material
  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSkyColor: { value: skyConfig.skyColor },
        uHorizonColor: { value: skyConfig.horizonColor },
        uSunColor: { value: skyConfig.sunColor },
        uSunPosition: { value: new THREE.Vector3(100, 80, 50) },
        uAtmosphereThickness: { value: 1.0 },
        uScattering: { value: 0.5 }
      },
      vertexShader: skyVertexShader || `
        uniform float uTime;
        uniform vec3 uSunPosition;
        
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSunAngle;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          
          vPosition = position;
          vWorldPosition = worldPosition.xyz;
          
          // Calculate angle to sun
          vec3 toSun = normalize(uSunPosition - worldPosition.xyz);
          vec3 toVertex = normalize(worldPosition.xyz);
          vSunAngle = dot(toSun, toVertex);
        }
      `,
      fragmentShader: skyFragmentShader || `
        uniform float uTime;
        uniform vec3 uSkyColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunPosition;
        uniform float uAtmosphereThickness;
        uniform float uScattering;
        
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSunAngle;
        
        void main() {
          vec3 direction = normalize(vPosition);
          
          // Sky gradient based on height
          float heightFactor = direction.y * 0.5 + 0.5;
          vec3 skyGradient = mix(uHorizonColor, uSkyColor, heightFactor);
          
          // Atmospheric scattering
          float scattering = pow(1.0 - abs(direction.y), 2.0) * uScattering;
          skyGradient += scattering * uSunColor * 0.3;
          
          // Sun
          float sunDist = distance(direction, normalize(uSunPosition));
          float sunEffect = 1.0 - smoothstep(0.0, 0.1, sunDist);
          sunEffect = pow(sunEffect, 3.0);
          
          vec3 color = skyGradient + uSunColor * sunEffect;
          
          // Sun glow
          float sunGlow = 1.0 - smoothstep(0.0, 0.3, sunDist);
          color += uSunColor * sunGlow * 0.3;
          
          // Atmospheric perspective
          float atmosphere = pow(1.0 - abs(direction.y), 3.0) * uAtmosphereThickness;
          color += atmosphere * uSunColor * 0.2;
          
          // Time-based color shifts
          float timeShift = sin(uTime * 0.1) * 0.1;
          color += timeShift;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
  }, [skyConfig, skyVertexShader, skyFragmentShader]);

  // Cloud material
  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCloudColor: { value: new THREE.Color(0.8, 0.8, 0.9) },
        uOpacity: { value: skyConfig.cloudDensity }
      },
      vertexShader: `
        attribute float size;
        attribute float density;
        
        uniform float uTime;
        
        varying float vDensity;
        
        void main() {
          vec3 pos = position;
          
          // Cloud movement
          pos.x += sin(uTime * 0.02 + pos.z * 0.01) * 20.0;
          pos.z += cos(uTime * 0.015 + pos.x * 0.01) * 15.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          float pointSize = size * (300.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vDensity = density;
        }
      `,
      fragmentShader: `
        uniform vec3 uCloudColor;
        uniform float uOpacity;
        
        varying float vDensity;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float cloud = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
          cloud *= vDensity;
          
          float alpha = cloud * uOpacity;
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(uCloudColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
  }, [skyConfig.cloudDensity]);

  // Star material
  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStarColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        uVisibility: { value: skyConfig.starDensity }
      },
      vertexShader: `
        attribute float size;
        attribute float intensity;
        
        uniform float uTime;
        
        varying float vIntensity;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          float pointSize = size * intensity * (500.0 / -mvPosition.z);
          gl_PointSize = pointSize;
          
          vIntensity = intensity;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uStarColor;
        uniform float uVisibility;
        
        varying float vIntensity;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float star = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
          
          // Twinkling effect
          float twinkle = sin(uTime * 3.0 + gl_FragCoord.x + gl_FragCoord.y) * 0.2 + 0.8;
          star *= twinkle;
          
          float alpha = star * vIntensity * uVisibility;
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(uStarColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [skyConfig.starDensity]);

  // Cloud geometry
  const cloudGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(cloudData.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(cloudData.sizes, 1));
    geo.setAttribute('density', new THREE.BufferAttribute(cloudData.densities, 1));
    return geo;
  }, [cloudData]);

  // Star geometry
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starData.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(starData.sizes, 1));
    geo.setAttribute('intensity', new THREE.BufferAttribute(starData.intensities, 1));
    return geo;
  }, [starData]);

  // Update sky animation
  useFrame((state) => {
    const elapsedTime = time;
    
    // Update sky material
    if (skyMaterial.uniforms) {
      skyMaterial.uniforms.uTime.value = elapsedTime;
      
      // Animate sun position
      const sunAngle = elapsedTime * 0.1;
      skyMaterial.uniforms.uSunPosition.value.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 80 + 40,
        Math.sin(sunAngle) * 50
      );
    }
    
    // Update cloud material
    if (cloudMaterial.uniforms) {
      cloudMaterial.uniforms.uTime.value = elapsedTime;
    }
    
    // Update star material
    if (starMaterial.uniforms) {
      starMaterial.uniforms.uTime.value = elapsedTime;
    }
  });

  return (
    <group>
      {/* Sky dome */}
      <mesh
        ref={skyRef}
        geometry={skyGeometry}
        material={skyMaterial}
        renderOrder={-1}
      />
      
      {/* Clouds */}
      <points
        ref={cloudsRef}
        geometry={cloudGeometry}
        material={cloudMaterial}
      />
      
      {/* Stars */}
      <points
        ref={starsRef}
        geometry={starGeometry}
        material={starMaterial}
      />
    </group>
  );
}
