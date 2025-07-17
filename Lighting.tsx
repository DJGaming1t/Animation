import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LightingProps {
  sequence?: string;
  intensity: number;
  time: number;
}

/**
 * Advanced lighting system with dynamic light configurations
 * Adapts lighting setup based on animation sequences
 */
export default function Lighting({ sequence, intensity, time }: LightingProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const pointLight1Ref = useRef<THREE.PointLight>(null);
  const pointLight2Ref = useRef<THREE.PointLight>(null);
  const pointLight3Ref = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  // Lighting configuration based on sequence
  const lightConfig = useMemo(() => {
    const configs = {
      cosmic: {
        ambient: { color: "#001133", intensity: 0.2 },
        directional: { color: "#4466ff", intensity: 1.0, position: [50, 100, 50] },
        point1: { color: "#6688ff", intensity: 0.8, position: [-30, 20, 30] },
        point2: { color: "#8844ff", intensity: 0.6, position: [30, 15, -30] },
        point3: { color: "#44aaff", intensity: 0.4, position: [0, 25, 0] },
        spot: { color: "#ffffff", intensity: 0.5, position: [0, 50, 0] }
      },
      fire: {
        ambient: { color: "#331100", intensity: 0.3 },
        directional: { color: "#ff4400", intensity: 0.8, position: [30, 80, 30] },
        point1: { color: "#ff6600", intensity: 1.2, position: [-20, 15, 20] },
        point2: { color: "#ff8800", intensity: 1.0, position: [20, 12, -20] },
        point3: { color: "#ffaa00", intensity: 0.8, position: [0, 20, 0] },
        spot: { color: "#ffcc44", intensity: 0.7, position: [0, 40, 0] }
      },
      water: {
        ambient: { color: "#001122", intensity: 0.4 },
        directional: { color: "#0066ff", intensity: 0.9, position: [40, 90, 40] },
        point1: { color: "#0088ff", intensity: 0.7, position: [-25, 18, 25] },
        point2: { color: "#00aaff", intensity: 0.5, position: [25, 14, -25] },
        point3: { color: "#44ccff", intensity: 0.6, position: [0, 22, 0] },
        spot: { color: "#88ddff", intensity: 0.4, position: [0, 45, 0] }
      },
      crystal: {
        ambient: { color: "#220033", intensity: 0.3 },
        directional: { color: "#ff44ff", intensity: 1.1, position: [60, 120, 60] },
        point1: { color: "#ff66ff", intensity: 0.9, position: [-35, 25, 35] },
        point2: { color: "#cc44ff", intensity: 0.7, position: [35, 20, -35] },
        point3: { color: "#ff88ff", intensity: 0.5, position: [0, 30, 0] },
        spot: { color: "#ffaaff", intensity: 0.6, position: [0, 55, 0] }
      },
      plasma: {
        ambient: { color: "#002211", intensity: 0.2 },
        directional: { color: "#44ffff", intensity: 1.2, position: [70, 140, 70] },
        point1: { color: "#66ffff", intensity: 1.1, position: [-40, 30, 40] },
        point2: { color: "#88ffff", intensity: 0.9, position: [40, 25, -40] },
        point3: { color: "#aaffff", intensity: 0.7, position: [0, 35, 0] },
        spot: { color: "#ccffff", intensity: 0.8, position: [0, 60, 0] }
      },
      default: {
        ambient: { color: "#404040", intensity: 0.3 },
        directional: { color: "#ffffff", intensity: 1.0, position: [50, 100, 50] },
        point1: { color: "#ffffff", intensity: 0.5, position: [-20, 15, 20] },
        point2: { color: "#ffffff", intensity: 0.5, position: [20, 15, -20] },
        point3: { color: "#ffffff", intensity: 0.3, position: [0, 20, 0] },
        spot: { color: "#ffffff", intensity: 0.4, position: [0, 40, 0] }
      }
    };
    
    return configs[sequence as keyof typeof configs] || configs.default;
  }, [sequence]);

  // Animation patterns for dynamic lighting
  const animationPatterns = useMemo(() => ({
    cosmic: {
      pulseSpeed: 0.5,
      colorShift: 0.3,
      movement: 0.8
    },
    fire: {
      pulseSpeed: 2.0,
      colorShift: 0.8,
      movement: 1.2
    },
    water: {
      pulseSpeed: 0.3,
      colorShift: 0.4,
      movement: 0.6
    },
    crystal: {
      pulseSpeed: 0.7,
      colorShift: 0.6,
      movement: 0.4
    },
    plasma: {
      pulseSpeed: 1.5,
      colorShift: 1.0,
      movement: 1.5
    },
    default: {
      pulseSpeed: 0.5,
      colorShift: 0.2,
      movement: 0.5
    }
  }), []);

  const currentPattern = animationPatterns[sequence as keyof typeof animationPatterns] || animationPatterns.default;

  // Update lighting animation
  useFrame((state) => {
    const elapsedTime = time;
    const baseIntensity = intensity;

    // Animate directional light
    if (directionalLightRef.current) {
      const light = directionalLightRef.current;
      const config = lightConfig.directional;
      
      // Intensity pulsing
      const pulse = Math.sin(elapsedTime * currentPattern.pulseSpeed) * 0.2 + 0.8;
      light.intensity = config.intensity * baseIntensity * pulse;
      
      // Position movement
      const movement = currentPattern.movement;
      light.position.set(
        config.position[0] + Math.sin(elapsedTime * 0.2) * 20 * movement,
        config.position[1] + Math.cos(elapsedTime * 0.15) * 10 * movement,
        config.position[2] + Math.sin(elapsedTime * 0.25) * 15 * movement
      );
      
      // Color shifting
      if (currentPattern.colorShift > 0) {
        const colorShift = Math.sin(elapsedTime * 0.3) * currentPattern.colorShift;
        const baseColor = new THREE.Color(config.color);
        light.color.setHSL(
          (baseColor.getHSL({ h: 0, s: 0, l: 0 }).h + colorShift) % 1,
          baseColor.getHSL({ h: 0, s: 0, l: 0 }).s,
          baseColor.getHSL({ h: 0, s: 0, l: 0 }).l
        );
      }
    }

    // Animate ambient light
    if (ambientLightRef.current) {
      const light = ambientLightRef.current;
      const config = lightConfig.ambient;
      
      const pulse = Math.sin(elapsedTime * currentPattern.pulseSpeed * 0.5) * 0.1 + 0.9;
      light.intensity = config.intensity * baseIntensity * pulse;
    }

    // Animate point lights
    [pointLight1Ref, pointLight2Ref, pointLight3Ref].forEach((lightRef, index) => {
      if (lightRef.current) {
        const light = lightRef.current;
        const configKey = `point${index + 1}` as keyof typeof lightConfig;
        const config = lightConfig[configKey];
        
        // Individual pulsing patterns
        const phaseOffset = index * Math.PI * 0.67; // 120 degree phase shift
        const pulse = Math.sin(elapsedTime * currentPattern.pulseSpeed + phaseOffset) * 0.3 + 0.7;
        light.intensity = config.intensity * baseIntensity * pulse;
        
        // Orbital movement
        const orbitRadius = 15;
        const orbitSpeed = 0.1 + index * 0.05;
        const orbitAngle = elapsedTime * orbitSpeed + phaseOffset;
        
        light.position.set(
          config.position[0] + Math.cos(orbitAngle) * orbitRadius * currentPattern.movement,
          config.position[1] + Math.sin(elapsedTime * 0.1 + phaseOffset) * 5 * currentPattern.movement,
          config.position[2] + Math.sin(orbitAngle) * orbitRadius * currentPattern.movement
        );
        
        // Color cycling
        if (currentPattern.colorShift > 0) {
          const colorPhase = elapsedTime * 0.2 + phaseOffset;
          const hue = (Math.sin(colorPhase) * 0.5 + 0.5) * currentPattern.colorShift;
          light.color.setHSL(hue, 0.8, 0.6);
        }
      }
    });

    // Animate spotlight
    if (spotLightRef.current) {
      const light = spotLightRef.current;
      const config = lightConfig.spot;
      
      const pulse = Math.sin(elapsedTime * currentPattern.pulseSpeed * 1.5) * 0.4 + 0.6;
      light.intensity = config.intensity * baseIntensity * pulse;
      
      // Scanning movement
      const scanAngle = Math.sin(elapsedTime * 0.3) * Math.PI * 0.5;
      light.target.position.set(
        Math.sin(scanAngle) * 50,
        0,
        Math.cos(scanAngle) * 50
      );
      
      // Cone angle animation
      light.angle = Math.PI * 0.1 + Math.sin(elapsedTime * 0.5) * 0.05;
      light.penumbra = 0.5 + Math.sin(elapsedTime * 0.7) * 0.3;
    }
  });

  return (
    <group>
      {/* Ambient light */}
      <ambientLight
        ref={ambientLightRef}
        color={lightConfig.ambient.color}
        intensity={lightConfig.ambient.intensity * intensity}
      />

      {/* Main directional light */}
      <directionalLight
        ref={directionalLightRef}
        color={lightConfig.directional.color}
        intensity={lightConfig.directional.intensity * intensity}
        position={lightConfig.directional.position}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />

      {/* Point lights for local illumination */}
      <pointLight
        ref={pointLight1Ref}
        color={lightConfig.point1.color}
        intensity={lightConfig.point1.intensity * intensity}
        position={lightConfig.point1.position}
        distance={100}
        decay={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        ref={pointLight2Ref}
        color={lightConfig.point2.color}
        intensity={lightConfig.point2.intensity * intensity}
        position={lightConfig.point2.position}
        distance={80}
        decay={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        ref={pointLight3Ref}
        color={lightConfig.point3.color}
        intensity={lightConfig.point3.intensity * intensity}
        position={lightConfig.point3.position}
        distance={60}
        decay={2}
      />

      {/* Spotlight for dramatic effects */}
      <spotLight
        ref={spotLightRef}
        color={lightConfig.spot.color}
        intensity={lightConfig.spot.intensity * intensity}
        position={lightConfig.spot.position}
        angle={Math.PI * 0.1}
        penumbra={0.5}
        distance={150}
        decay={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Helper geometry for light visualization (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <group>
          <mesh position={lightConfig.point1.position}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={lightConfig.point1.color} />
          </mesh>
          <mesh position={lightConfig.point2.position}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={lightConfig.point2.color} />
          </mesh>
          <mesh position={lightConfig.point3.position}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={lightConfig.point3.color} />
          </mesh>
        </group>
      )}
    </group>
  );
}
