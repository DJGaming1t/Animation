import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useAnimation } from "../../lib/stores/useAnimation";

/**
 * Interactive camera controller with smooth movement and animation sequence targeting
 * Provides manual control and automatic camera movements for different sequences
 */
export default function CameraController() {
  const { camera } = useThree();
  const { currentSequence, isPlaying } = useAnimation();
  
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const lookTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Get keyboard controls
  const [, getKeys] = useKeyboardControls();

  // Camera movement parameters
  const moveSpeed = 30;
  const rotationSpeed = 2;
  const dampingFactor = 0.9;
  const smoothness = 0.05;

  // Sequence-specific camera positions and targets
  const sequenceCameras = {
    cosmic: {
      position: new THREE.Vector3(0, 40, 80),
      target: new THREE.Vector3(0, 10, 0),
      fov: 75
    },
    fire: {
      position: new THREE.Vector3(15, 25, 45),
      target: new THREE.Vector3(0, 5, 0),
      fov: 70
    },
    water: {
      position: new THREE.Vector3(-20, 20, 60),
      target: new THREE.Vector3(0, 0, 0),
      fov: 80
    },
    crystal: {
      position: new THREE.Vector3(30, 35, 50),
      target: new THREE.Vector3(0, 15, 0),
      fov: 65
    },
    plasma: {
      position: new THREE.Vector3(0, 60, 100),
      target: new THREE.Vector3(0, 20, 0),
      fov: 85
    },
    default: {
      position: new THREE.Vector3(0, 15, 25),
      target: new THREE.Vector3(0, 0, 0),
      fov: 75
    }
  };

  // Initialize camera position
  useEffect(() => {
    const defaultCam = sequenceCameras.default;
    camera.position.copy(defaultCam.position);
    camera.lookAt(defaultCam.target);
    camera.fov = defaultCam.fov;
    camera.updateProjectionMatrix();
    
    cameraTargetRef.current.copy(defaultCam.position);
    lookTargetRef.current.copy(defaultCam.target);
  }, [camera]);

  // Handle sequence changes
  useEffect(() => {
    if (!currentSequence || !isPlaying) return;

    const sequenceCamera = sequenceCameras[currentSequence as keyof typeof sequenceCameras] || sequenceCameras.default;
    
    // Smoothly transition to sequence camera
    cameraTargetRef.current.copy(sequenceCamera.position);
    lookTargetRef.current.copy(sequenceCamera.target);
    
    // Animate FOV change
    const startFov = camera.fov;
    const targetFov = sequenceCamera.fov;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    
    const animateFov = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      camera.fov = startFov + (targetFov - startFov) * easedProgress;
      camera.updateProjectionMatrix();
      
      if (progress < 1) {
        requestAnimationFrame(animateFov);
      }
    };
    
    animateFov();
  }, [currentSequence, isPlaying, camera]);

  // Update camera movement
  useFrame((state, delta) => {
    const keys = getKeys();
    const velocity = cameraVelocityRef.current;
    const target = cameraTargetRef.current;
    
    // Manual controls override automatic movement
    let manualControl = false;
    
    // Movement input
    if (keys.forward) {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      velocity.add(forward.multiplyScalar(moveSpeed * delta));
      manualControl = true;
    }
    
    if (keys.backward) {
      const backward = new THREE.Vector3(0, 0, 1);
      backward.applyQuaternion(camera.quaternion);
      velocity.add(backward.multiplyScalar(moveSpeed * delta));
      manualControl = true;
    }
    
    if (keys.leftward) {
      const left = new THREE.Vector3(-1, 0, 0);
      left.applyQuaternion(camera.quaternion);
      velocity.add(left.multiplyScalar(moveSpeed * delta));
      manualControl = true;
    }
    
    if (keys.rightward) {
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      velocity.add(right.multiplyScalar(moveSpeed * delta));
      manualControl = true;
    }
    
    if (keys.up) {
      velocity.y += moveSpeed * delta;
      manualControl = true;
    }
    
    if (keys.down) {
      velocity.y -= moveSpeed * delta;
      manualControl = true;
    }
    
    // Speed modifiers
    const speedMultiplier = keys.boost ? 3 : (keys.slow ? 0.3 : 1);
    velocity.multiplyScalar(speedMultiplier);
    
    // Apply velocity damping
    velocity.multiplyScalar(dampingFactor);
    
    // Update position
    if (manualControl) {
      // Manual control - apply velocity directly
      camera.position.add(velocity);
      target.copy(camera.position);
    } else {
      // Automatic control - smooth transition to target
      camera.position.lerp(target, smoothness);
    }
    
    // Look at target
    const currentLookTarget = camera.getWorldDirection(new THREE.Vector3()).add(camera.position);
    const targetLookAt = lookTargetRef.current;
    
    if (!manualControl) {
      currentLookTarget.lerp(targetLookAt, smoothness);
      camera.lookAt(currentLookTarget);
    }
    
    // Cinematic camera movements for sequences
    if (!manualControl && currentSequence && isPlaying) {
      const time = state.clock.elapsedTime;
      
      switch (currentSequence) {
        case 'cosmic':
          // Slow orbital movement
          const cosmicAngle = time * 0.1;
          const cosmicRadius = 80;
          target.x = Math.cos(cosmicAngle) * cosmicRadius;
          target.z = Math.sin(cosmicAngle) * cosmicRadius;
          target.y = 40 + Math.sin(time * 0.05) * 10;
          break;
          
        case 'fire':
          // Dynamic movement around fire sources
          const fireAngle = time * 0.3;
          target.x = 15 + Math.cos(fireAngle) * 20;
          target.z = Math.sin(fireAngle) * 30;
          target.y = 25 + Math.sin(time * 0.2) * 5;
          
          // Look at fire sources
          lookTargetRef.current.set(
            Math.sin(time * 0.1) * 10,
            5,
            Math.cos(time * 0.1) * 10
          );
          break;
          
        case 'water':
          // Smooth flowing movement
          const waterAngle = time * 0.15;
          target.x = -20 + Math.cos(waterAngle) * 35;
          target.z = Math.sin(waterAngle) * 25;
          target.y = 20 + Math.sin(time * 0.1) * 8;
          break;
          
        case 'crystal':
          // Crystal examination - closer inspection movements
          const crystalAngle = time * 0.2;
          target.x = 30 + Math.cos(crystalAngle) * 15;
          target.z = Math.sin(crystalAngle) * 20;
          target.y = 35 + Math.sin(time * 0.3) * 3;
          
          // Focus on crystal formations
          const crystalTarget = new THREE.Vector3(
            Math.sin(time * 0.05) * 20,
            15,
            Math.cos(time * 0.05) * 20
          );
          lookTargetRef.current.lerp(crystalTarget, 0.02);
          break;
          
        case 'plasma':
          // Energetic, fast movements
          const plasmaAngle = time * 0.4;
          target.x = Math.cos(plasmaAngle) * 60;
          target.z = Math.sin(plasmaAngle) * 80;
          target.y = 60 + Math.sin(time * 0.5) * 20;
          
          // Look at plasma center with some jitter
          lookTargetRef.current.set(
            Math.sin(time * 2) * 5,
            20 + Math.cos(time * 3) * 5,
            Math.cos(time * 2.5) * 5
          );
          break;
      }
    }
    
    // Camera shake for intense sequences
    if (currentSequence === 'plasma' || currentSequence === 'fire') {
      const shakeIntensity = currentSequence === 'plasma' ? 0.2 : 0.1;
      const shake = new THREE.Vector3(
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity
      );
      camera.position.add(shake);
    }
    
    // Reset camera on 'R' key
    if (keys.reset) {
      const defaultCam = sequenceCameras.default;
      target.copy(defaultCam.position);
      lookTargetRef.current.copy(defaultCam.target);
      velocity.set(0, 0, 0);
      camera.fov = defaultCam.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null; // This component doesn't render anything
}
