import * as THREE from "three";
import { EffectManager } from "./EffectManager";
import { AnimationSequencer } from "./AnimationSequencer";
import { PerformanceOptimizer } from "./PerformanceOptimizer";

/**
 * Central scene management system for coordinating all 3D elements
 */
export interface SceneObject {
  id: string;
  object: THREE.Object3D;
  type: 'particle_system' | 'geometry' | 'light' | 'camera' | 'environment';
  priority: number;
  active: boolean;
  lastUpdate: number;
}

export interface SceneConfiguration {
  name: string;
  description: string;
  objects: string[];
  effects: string[];
  lighting: {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; position: number[] };
    point: Array<{ color: string; intensity: number; position: number[] }>;
  };
  camera: {
    position: number[];
    target: number[];
    fov: number;
  };
  fog: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private effectManager: EffectManager;
  private animationSequencer: AnimationSequencer;
  private performanceOptimizer: PerformanceOptimizer;
  
  private sceneObjects: Map<string, SceneObject> = new Map();
  private activeConfiguration: SceneConfiguration | null = null;
  private updateCallbacks: Map<string, (deltaTime: number) => void> = new Map();
  
  private clock: THREE.Clock = new THREE.Clock();
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 60;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.effectManager = new EffectManager();
    this.animationSequencer = new AnimationSequencer();
    this.performanceOptimizer = new PerformanceOptimizer();

    this.initializeScene();
    this.setupEventListeners();
  }

  /**
   * Initialize the scene with default settings
   */
  private initializeScene(): void {
    // Set up default lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.addSceneObject('ambient_light', ambientLight, 'light', 10);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.addSceneObject('directional_light', directionalLight, 'light', 9);

    // Set up fog
    this.scene.fog = new THREE.Fog(0x000011, 50, 200);

    // Configure renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  /**
   * Set up event listeners for managers
   */
  private setupEventListeners(): void {
    // Listen to effect changes
    this.effectManager.addListener((effects) => {
      this.onEffectsChanged(effects);
    });

    // Listen to animation sequence changes
    this.animationSequencer.on('update', (data) => {
      this.onAnimationUpdate(data);
    });

    this.animationSequencer.on('play', (sequence) => {
      console.log(`Started sequence: ${sequence.name}`);
    });
  }

  /**
   * Add an object to the scene
   */
  addSceneObject(
    id: string,
    object: THREE.Object3D,
    type: SceneObject['type'],
    priority: number = 5
  ): void {
    // Remove existing object with same ID
    if (this.sceneObjects.has(id)) {
      this.removeSceneObject(id);
    }

    const sceneObject: SceneObject = {
      id,
      object,
      type,
      priority,
      active: true,
      lastUpdate: Date.now()
    };

    this.sceneObjects.set(id, sceneObject);
    this.scene.add(object);

    // Sort objects by priority
    this.sortSceneObjects();
  }

  /**
   * Remove an object from the scene
   */
  removeSceneObject(id: string): boolean {
    const sceneObject = this.sceneObjects.get(id);
    if (sceneObject) {
      this.scene.remove(sceneObject.object);
      this.sceneObjects.delete(id);
      this.updateCallbacks.delete(id);
      
      // Dispose of geometry and materials
      this.disposeObject(sceneObject.object);
      return true;
    }
    return false;
  }

  /**
   * Get a scene object by ID
   */
  getSceneObject(id: string): SceneObject | undefined {
    return this.sceneObjects.get(id);
  }

  /**
   * Get all scene objects
   */
  getAllSceneObjects(): SceneObject[] {
    return Array.from(this.sceneObjects.values());
  }

  /**
   * Get scene objects by type
   */
  getSceneObjectsByType(type: SceneObject['type']): SceneObject[] {
    return this.getAllSceneObjects().filter(obj => obj.type === type);
  }

  /**
   * Set object active state
   */
  setObjectActive(id: string, active: boolean): void {
    const sceneObject = this.sceneObjects.get(id);
    if (sceneObject) {
      sceneObject.active = active;
      sceneObject.object.visible = active;
    }
  }

  /**
   * Register an update callback for an object
   */
  registerUpdateCallback(id: string, callback: (deltaTime: number) => void): void {
    this.updateCallbacks.set(id, callback);
  }

  /**
   * Apply a scene configuration
   */
  applyConfiguration(config: SceneConfiguration): void {
    this.activeConfiguration = config;

    // Apply lighting
    this.applyLightingConfiguration(config.lighting);

    // Apply camera settings
    this.applyCameraConfiguration(config.camera);

    // Apply fog settings
    this.applyFogConfiguration(config.fog);

    // Enable specified effects
    this.effectManager.disableAllEffects();
    config.effects.forEach(effectId => {
      this.effectManager.enableEffect(effectId);
    });

    console.log(`Applied scene configuration: ${config.name}`);
  }

  /**
   * Apply lighting configuration
   */
  private applyLightingConfiguration(lighting: SceneConfiguration['lighting']): void {
    // Update ambient light
    const ambientLight = this.getSceneObject('ambient_light')?.object as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.color.setStyle(lighting.ambient.color);
      ambientLight.intensity = lighting.ambient.intensity;
    }

    // Update directional light
    const directionalLight = this.getSceneObject('directional_light')?.object as THREE.DirectionalLight;
    if (directionalLight) {
      directionalLight.color.setStyle(lighting.directional.color);
      directionalLight.intensity = lighting.directional.intensity;
      directionalLight.position.set(...lighting.directional.position);
    }

    // Update point lights
    lighting.point.forEach((pointConfig, index) => {
      const id = `point_light_${index}`;
      let pointLight = this.getSceneObject(id)?.object as THREE.PointLight;
      
      if (!pointLight) {
        pointLight = new THREE.PointLight();
        this.addSceneObject(id, pointLight, 'light', 7);
      }
      
      pointLight.color.setStyle(pointConfig.color);
      pointLight.intensity = pointConfig.intensity;
      pointLight.position.set(...pointConfig.position);
    });
  }

  /**
   * Apply camera configuration
   */
  private applyCameraConfiguration(cameraConfig: SceneConfiguration['camera']): void {
    this.camera.position.set(...cameraConfig.position);
    this.camera.lookAt(...cameraConfig.target);
    this.camera.fov = cameraConfig.fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Apply fog configuration
   */
  private applyFogConfiguration(fogConfig: SceneConfiguration['fog']): void {
    if (fogConfig.enabled) {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(fogConfig.color).getHex(),
        fogConfig.near,
        fogConfig.far
      );
    } else {
      this.scene.fog = null;
    }
  }

  /**
   * Update the scene (call this in your animation loop)
   */
  update(): void {
    const deltaTime = this.clock.getDelta();
    this.frameCount++;

    // Update performance metrics
    this.performanceOptimizer.addFrameTime(deltaTime);
    this.updateFPS(deltaTime);

    // Update animation sequencer
    this.animationSequencer.update();

    // Update scene objects
    this.updateSceneObjects(deltaTime);

    // Performance-based optimizations
    this.applyPerformanceOptimizations();
  }

  /**
   * Update FPS counter
   */
  private updateFPS(deltaTime: number): void {
    const now = Date.now();
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }
  }

  /**
   * Update all scene objects
   */
  private updateSceneObjects(deltaTime: number): void {
    const sortedObjects = Array.from(this.sceneObjects.values())
      .filter(obj => obj.active)
      .sort((a, b) => b.priority - a.priority);

    for (const sceneObject of sortedObjects) {
      sceneObject.lastUpdate = Date.now();
      
      // Call registered update callback
      const callback = this.updateCallbacks.get(sceneObject.id);
      if (callback) {
        try {
          callback(deltaTime);
        } catch (error) {
          console.error(`Error updating object ${sceneObject.id}:`, error);
        }
      }
    }
  }

  /**
   * Apply performance-based optimizations
   */
  private applyPerformanceOptimizations(): void {
    const performanceLevel = this.performanceOptimizer.getPerformanceLevel();
    
    if (performanceLevel < 0.5) {
      // Reduce shadow quality
      const directionalLight = this.getSceneObject('directional_light')?.object as THREE.DirectionalLight;
      if (directionalLight?.shadow) {
        directionalLight.shadow.mapSize.setScalar(1024);
      }

      // Reduce particle systems
      this.getSceneObjectsByType('particle_system').forEach(obj => {
        if (obj.object.userData.particleCount) {
          obj.object.userData.particleCount *= 0.5;
        }
      });
    }

    if (performanceLevel < 0.3) {
      // Disable expensive effects
      const expensiveEffects = ['plasma', 'liquid', 'procedural_terrain'];
      expensiveEffects.forEach(effectId => {
        if (this.effectManager.isEffectActive(effectId)) {
          this.effectManager.disableEffect(effectId);
        }
      });
    }
  }

  /**
   * Handle effect changes
   */
  private onEffectsChanged(effects: any[]): void {
    // Update scene based on active effects
    effects.forEach(effectState => {
      const effect = effectState.effect;
      
      // Apply effect-specific scene modifications
      switch (effect.id) {
        case 'fog_enhancement':
          if (this.scene.fog) {
            (this.scene.fog as THREE.Fog).density = effectState.intensity * 0.01;
          }
          break;
        case 'global_illumination':
          const ambientLight = this.getSceneObject('ambient_light')?.object as THREE.AmbientLight;
          if (ambientLight) {
            ambientLight.intensity = 0.4 * effectState.intensity;
          }
          break;
      }
    });
  }

  /**
   * Handle animation updates
   */
  private onAnimationUpdate(data: any): void {
    const { sequence, progress, data: frameData } = data;
    
    // Apply camera animations
    if (frameData.camera) {
      const camera = frameData.camera;
      if (camera.position) {
        this.camera.position.set(...camera.position);
      }
      if (camera.target) {
        this.camera.lookAt(...camera.target);
      }
    }

    // Apply lighting animations
    if (frameData.lighting) {
      this.applyLightingConfiguration(frameData.lighting);
    }
  }

  /**
   * Sort scene objects by priority
   */
  private sortSceneObjects(): void {
    const sortedEntries = Array.from(this.sceneObjects.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    this.sceneObjects.clear();
    sortedEntries.forEach(([id, obj]) => {
      this.sceneObjects.set(id, obj);
    });
  }

  /**
   * Dispose of Three.js objects properly
   */
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  /**
   * Get scene statistics
   */
  getSceneStats(): {
    objectCount: number;
    triangleCount: number;
    activeEffects: number;
    fps: number;
    performanceLevel: number;
  } {
    let triangleCount = 0;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geometry = object.geometry;
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else {
          triangleCount += geometry.attributes.position.count / 3;
        }
      }
    });

    return {
      objectCount: this.sceneObjects.size,
      triangleCount: Math.floor(triangleCount),
      activeEffects: this.effectManager.getActiveEffects().length,
      fps: this.currentFPS,
      performanceLevel: this.performanceOptimizer.getPerformanceLevel()
    };
  }

  /**
   * Get manager instances
   */
  getEffectManager(): EffectManager {
    return this.effectManager;
  }

  getAnimationSequencer(): AnimationSequencer {
    return this.animationSequencer;
  }

  getPerformanceOptimizer(): PerformanceOptimizer {
    return this.performanceOptimizer;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.sceneObjects.forEach((obj) => {
      this.disposeObject(obj.object);
    });
    this.sceneObjects.clear();
    this.updateCallbacks.clear();
  }
}
