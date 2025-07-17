import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

// Import all scene components
import Lighting from "./Lighting";
import Terrain from "./Terrain";
import ProceduralTerrain from "./ProceduralTerrain";
import DynamicSky from "./DynamicSky";
import ParticleSystem from "./ParticleSystem";
import FireParticles from "./FireParticles";
import WaterParticles from "./WaterParticles";
import SnowParticles from "./SnowParticles";
import CosmicParticles from "./CosmicParticles";
import PlasmaParticles from "./PlasmaParticles";
import AnimatedObjects from "./AnimatedObjects";
import FloatingIslands from "./FloatingIslands";
import CrystalFormations from "./CrystalFormations";
import EnergyOrbs from "./EnergyOrbs";
import WaveSystem from "./WaveSystem";
import FractalTrees from "./FractalTrees";
import GeometricShapes from "./GeometricShapes";
import LiquidSimulation from "./LiquidSimulation";
import CameraController from "./CameraController";
import AudioReactiveSystem from "./AudioReactiveSystem";

// Import stores
import { useAnimation } from "../../lib/stores/useAnimation";
import { useEffects } from "../../lib/stores/useEffects";
import { usePerformance } from "../../lib/stores/usePerformance";

/**
 * Main scene component that orchestrates all 3D elements
 * This is the central hub for the complex 3D animation system
 */
export default function Scene() {
  const sceneRef = useRef<THREE.Group>(null);
  const { currentSequence, globalTime, isPlaying, speed } = useAnimation();
  const { activeEffects, intensity } = useEffects();
  const { lodLevel, particleCount } = usePerformance();

  // Pre-calculate positions for performance
  const particlePositions = useMemo(() => {
    const positions = [];
    const radius = 100;
    
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const x = Math.cos(angle) * radius * (0.5 + Math.random() * 0.5);
      const z = Math.sin(angle) * radius * (0.5 + Math.random() * 0.5);
      const y = (Math.random() - 0.5) * 20;
      
      positions.push({ x, y, z });
    }
    
    return positions;
  }, []);

  // Generate terrain data
  const terrainData = useMemo(() => {
    const size = 200;
    const resolution = 64;
    const heights = [];
    
    for (let i = 0; i < resolution; i++) {
      heights[i] = [];
      for (let j = 0; j < resolution; j++) {
        const x = (i / resolution) * size - size / 2;
        const z = (j / resolution) * size - size / 2;
        
        // Multi-octave noise for terrain height
        let height = 0;
        height += Math.sin(x * 0.01) * 10;
        height += Math.sin(z * 0.01) * 10;
        height += Math.sin(x * 0.05) * 3;
        height += Math.sin(z * 0.05) * 3;
        height += Math.sin(x * 0.1) * 1;
        height += Math.sin(z * 0.1) * 1;
        
        heights[i][j] = height;
      }
    }
    
    return { size, resolution, heights };
  }, []);

  // Animation sequences configuration
  const animationSequences = useMemo(() => ({
    cosmic: {
      cameraPosition: [0, 30, 50],
      particleIntensity: 1.5,
      lightColor: "#4466ff",
      fogColor: "#001122"
    },
    fire: {
      cameraPosition: [10, 20, 30],
      particleIntensity: 2.0,
      lightColor: "#ff4400",
      fogColor: "#220011"
    },
    water: {
      cameraPosition: [-10, 15, 40],
      particleIntensity: 1.2,
      lightColor: "#0044ff",
      fogColor: "#001122"
    },
    crystal: {
      cameraPosition: [20, 25, 35],
      particleIntensity: 0.8,
      lightColor: "#ff44ff",
      fogColor: "#110022"
    },
    plasma: {
      cameraPosition: [0, 40, 60],
      particleIntensity: 3.0,
      lightColor: "#44ffff",
      fogColor: "#002211"
    }
  }), []);

  // Main animation loop
  useFrame((state, delta) => {
    if (!isPlaying || !sceneRef.current) return;

    const adjustedDelta = delta * speed;
    const time = state.clock.getElapsedTime() * speed;

    // Update scene rotation based on current sequence
    if (currentSequence && animationSequences[currentSequence]) {
      const sequence = animationSequences[currentSequence];
      
      // Smooth camera transitions
      const targetPos = new THREE.Vector3(...sequence.cameraPosition);
      state.camera.position.lerp(targetPos, adjustedDelta * 0.5);
      
      // Dynamic scene rotation
      sceneRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
      sceneRef.current.rotation.x = Math.sin(time * 0.05) * 0.05;
    }

    // Performance-based LOD adjustments
    if (lodLevel > 2) {
      // Reduce update frequency for distant objects
      if (Math.floor(time * 10) % 2 === 0) {
        // Update only every other frame
        updateDistantObjects(time);
      }
    } else {
      updateDistantObjects(time);
    }
  });

  // Update distant objects
  const updateDistantObjects = (time: number) => {
    // This function handles updates for objects that can be updated less frequently
    // when performance optimization is needed
  };

  return (
    <group ref={sceneRef}>
      {/* Lighting system */}
      <Lighting 
        sequence={currentSequence}
        intensity={intensity}
        time={globalTime}
      />

      {/* Sky and atmospheric effects */}
      <DynamicSky 
        sequence={currentSequence}
        time={globalTime}
      />

      {/* Terrain systems */}
      <Terrain 
        data={terrainData}
        lodLevel={lodLevel}
      />
      
      {activeEffects.includes('procedural_terrain') && (
        <ProceduralTerrain 
          size={150}
          complexity={lodLevel > 1 ? 32 : 64}
          time={globalTime}
        />
      )}

      {/* Particle systems */}
      <ParticleSystem 
        count={particleCount}
        positions={particlePositions}
        intensity={intensity}
        time={globalTime}
      />

      {activeEffects.includes('fire') && (
        <FireParticles 
          count={Math.min(particleCount, 2000)}
          intensity={intensity}
          time={globalTime}
        />
      )}

      {activeEffects.includes('water') && (
        <WaterParticles 
          count={Math.min(particleCount, 1500)}
          intensity={intensity}
          time={globalTime}
        />
      )}

      {activeEffects.includes('snow') && (
        <SnowParticles 
          count={Math.min(particleCount, 3000)}
          intensity={intensity}
          time={globalTime}
        />
      )}

      {activeEffects.includes('cosmic') && (
        <CosmicParticles 
          count={Math.min(particleCount, 5000)}
          intensity={intensity}
          time={globalTime}
        />
      )}

      {activeEffects.includes('plasma') && (
        <PlasmaParticles 
          count={Math.min(particleCount, 1000)}
          intensity={intensity}
          time={globalTime}
        />
      )}

      {/* Animated objects and structures */}
      <AnimatedObjects 
        sequence={currentSequence}
        time={globalTime}
        lodLevel={lodLevel}
      />

      {activeEffects.includes('floating_islands') && (
        <FloatingIslands 
          count={lodLevel > 1 ? 3 : 6}
          time={globalTime}
        />
      )}

      {activeEffects.includes('crystals') && (
        <CrystalFormations 
          count={lodLevel > 1 ? 5 : 12}
          time={globalTime}
          intensity={intensity}
        />
      )}

      {activeEffects.includes('energy_orbs') && (
        <EnergyOrbs 
          count={lodLevel > 1 ? 8 : 15}
          time={globalTime}
          intensity={intensity}
        />
      )}

      {activeEffects.includes('waves') && (
        <WaveSystem 
          size={100}
          resolution={lodLevel > 1 ? 32 : 64}
          time={globalTime}
        />
      )}

      {activeEffects.includes('fractal_trees') && (
        <FractalTrees 
          count={lodLevel > 1 ? 3 : 8}
          complexity={lodLevel > 1 ? 3 : 5}
          time={globalTime}
        />
      )}

      {activeEffects.includes('geometric_shapes') && (
        <GeometricShapes 
          count={lodLevel > 1 ? 10 : 20}
          time={globalTime}
          intensity={intensity}
        />
      )}

      {activeEffects.includes('liquid') && (
        <LiquidSimulation 
          resolution={lodLevel > 1 ? 32 : 64}
          time={globalTime}
        />
      )}

      {/* Interactive systems */}
      <CameraController />
      
      {activeEffects.includes('audio_reactive') && (
        <AudioReactiveSystem 
          intensity={intensity}
          time={globalTime}
        />
      )}
    </group>
  );
}
