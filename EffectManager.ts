/**
 * Effect management system for coordinating visual effects
 */
export interface Effect {
  id: string;
  name: string;
  description: string;
  category: 'particles' | 'geometry' | 'postprocessing' | 'environment';
  performanceImpact: 'low' | 'medium' | 'high';
  dependencies?: string[];
  conflictsWith?: string[];
  parameters?: Record<string, any>;
}

export interface EffectState {
  effect: Effect;
  enabled: boolean;
  intensity: number;
  parameters: Record<string, any>;
  lastUpdate: number;
}

export class EffectManager {
  private effects: Map<string, Effect> = new Map();
  private activeEffects: Map<string, EffectState> = new Map();
  private globalIntensity: number = 1.0;
  private listeners: Set<(effects: EffectState[]) => void> = new Set();

  constructor() {
    this.initializeDefaultEffects();
  }

  /**
   * Initialize default effects library
   */
  private initializeDefaultEffects(): void {
    const defaultEffects: Effect[] = [
      // Particle Effects
      {
        id: 'fire',
        name: 'Fire Particles',
        description: 'Realistic fire simulation with heat distortion',
        category: 'particles',
        performanceImpact: 'high',
        parameters: {
          temperature: 1.0,
          spread: 1.0,
          turbulence: 0.8
        }
      },
      {
        id: 'water',
        name: 'Water Particles',
        description: 'Fluid dynamics with splash and flow effects',
        category: 'particles',
        performanceImpact: 'medium',
        parameters: {
          viscosity: 0.1,
          surfaceTension: 0.5,
          flowSpeed: 1.0
        }
      },
      {
        id: 'snow',
        name: 'Snow Particles',
        description: 'Gentle falling snow with wind patterns',
        category: 'particles',
        performanceImpact: 'low',
        parameters: {
          windStrength: 0.5,
          flakeSize: 1.0,
          density: 1.0
        }
      },
      {
        id: 'cosmic',
        name: 'Cosmic Particles',
        description: 'Stellar dust, star formation, and cosmic phenomena',
        category: 'particles',
        performanceImpact: 'high',
        parameters: {
          starDensity: 0.5,
          nebulaIntensity: 0.8,
          cosmicRayFrequency: 0.3
        }
      },
      {
        id: 'plasma',
        name: 'Plasma Particles',
        description: 'Electromagnetic plasma fields and discharge',
        category: 'particles',
        performanceImpact: 'high',
        parameters: {
          electricField: 2.0,
          magneticStrength: 1.5,
          plasmaFrequency: 10.0
        }
      },

      // Geometry Effects
      {
        id: 'floating_islands',
        name: 'Floating Islands',
        description: 'Mystical floating landmasses with vegetation',
        category: 'geometry',
        performanceImpact: 'medium',
        parameters: {
          islandCount: 6,
          vegetationDensity: 0.7,
          floatAmplitude: 2.0
        }
      },
      {
        id: 'crystals',
        name: 'Crystal Formations',
        description: 'Dynamic crystal clusters with refractive properties',
        category: 'geometry',
        performanceImpact: 'medium',
        parameters: {
          growthSpeed: 0.5,
          refractionIndex: 0.95,
          energyLevel: 1.0
        }
      },
      {
        id: 'energy_orbs',
        name: 'Energy Orbs',
        description: 'Electromagnetic energy spheres with particle trails',
        category: 'geometry',
        performanceImpact: 'medium',
        parameters: {
          orbCount: 15,
          trailLength: 100,
          electricalForce: 1.0
        }
      },
      {
        id: 'waves',
        name: 'Wave System',
        description: 'Advanced wave simulation with interference patterns',
        category: 'geometry',
        performanceImpact: 'high',
        parameters: {
          waveHeight: 2.0,
          frequency: 0.03,
          interference: true
        }
      },
      {
        id: 'fractal_trees',
        name: 'Fractal Trees',
        description: 'Procedurally generated tree structures',
        category: 'geometry',
        performanceImpact: 'medium',
        parameters: {
          complexity: 5,
          branchingFactor: 0.8,
          windEffect: 0.5
        }
      },
      {
        id: 'geometric_shapes',
        name: 'Geometric Shapes',
        description: 'Animated mathematical forms and patterns',
        category: 'geometry',
        performanceImpact: 'low',
        parameters: {
          morphingSpeed: 1.0,
          geometricComplexity: 1.0,
          rotationSpeed: 0.5
        }
      },
      {
        id: 'liquid',
        name: 'Liquid Simulation',
        description: 'Advanced fluid dynamics with metaballs',
        category: 'geometry',
        performanceImpact: 'high',
        parameters: {
          viscosity: 0.1,
          surfaceTension: 0.8,
          particleDensity: 1.0
        }
      },

      // Post-processing Effects
      {
        id: 'bloom',
        name: 'Bloom Effect',
        description: 'Luminous glow around bright objects',
        category: 'postprocessing',
        performanceImpact: 'medium',
        parameters: {
          strength: 1.0,
          threshold: 0.3,
          radius: 0.8
        }
      },
      {
        id: 'chromatic_aberration',
        name: 'Chromatic Aberration',
        description: 'Color separation effect for artistic distortion',
        category: 'postprocessing',
        performanceImpact: 'low',
        parameters: {
          intensity: 0.002,
          distortion: 1.0
        }
      },
      {
        id: 'film_grain',
        name: 'Film Grain',
        description: 'Vintage film noise and scanlines',
        category: 'postprocessing',
        performanceImpact: 'low',
        parameters: {
          grainIntensity: 0.3,
          scanlineIntensity: 0.4
        }
      },
      {
        id: 'kaleidoscope',
        name: 'Kaleidoscope',
        description: 'Symmetrical pattern reflection effect',
        category: 'postprocessing',
        performanceImpact: 'medium',
        parameters: {
          sides: 6,
          rotation: 0.1,
          radius: 0.5
        }
      },
      {
        id: 'pixelation',
        name: 'Pixelation',
        description: 'Retro pixel art effect',
        category: 'postprocessing',
        performanceImpact: 'low',
        parameters: {
          pixelSize: 4.0
        }
      },
      {
        id: 'vortex',
        name: 'Vortex Distortion',
        description: 'Swirling distortion effect',
        category: 'postprocessing',
        performanceImpact: 'medium',
        parameters: {
          strength: 1.0,
          center: [0.5, 0.5]
        }
      },

      // Environment Effects
      {
        id: 'procedural_terrain',
        name: 'Procedural Terrain',
        description: 'Dynamic terrain generation with real-time deformation',
        category: 'environment',
        performanceImpact: 'high',
        parameters: {
          complexity: 64,
          deformation: 1.0,
          textureBlending: true
        }
      },
      {
        id: 'audio_reactive',
        name: 'Audio Reactive',
        description: 'Visual effects synchronized to audio frequency data',
        category: 'environment',
        performanceImpact: 'medium',
        dependencies: ['audio_context'],
        parameters: {
          sensitivity: 1.0,
          frequencyRange: [20, 20000],
          visualizerType: 'spectrum'
        }
      }
    ];

    defaultEffects.forEach(effect => {
      this.effects.set(effect.id, effect);
    });
  }

  /**
   * Get all available effects
   */
  getAllEffects(): Effect[] {
    return Array.from(this.effects.values());
  }

  /**
   * Get effects by category
   */
  getEffectsByCategory(category: Effect['category']): Effect[] {
    return this.getAllEffects().filter(effect => effect.category === category);
  }

  /**
   * Get active effects
   */
  getActiveEffects(): EffectState[] {
    return Array.from(this.activeEffects.values());
  }

  /**
   * Enable an effect
   */
  enableEffect(effectId: string, intensity: number = 1.0): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn(`Effect ${effectId} not found`);
      return false;
    }

    // Check dependencies
    if (effect.dependencies) {
      const missingDeps = effect.dependencies.filter(dep => !this.isEffectActive(dep));
      if (missingDeps.length > 0) {
        console.warn(`Effect ${effectId} missing dependencies: ${missingDeps.join(', ')}`);
        return false;
      }
    }

    // Handle conflicts
    if (effect.conflictsWith) {
      effect.conflictsWith.forEach(conflictId => {
        if (this.isEffectActive(conflictId)) {
          this.disableEffect(conflictId);
          console.info(`Disabled conflicting effect: ${conflictId}`);
        }
      });
    }

    const effectState: EffectState = {
      effect,
      enabled: true,
      intensity: Math.max(0, Math.min(2, intensity)),
      parameters: { ...effect.parameters },
      lastUpdate: Date.now()
    };

    this.activeEffects.set(effectId, effectState);
    this.notifyListeners();
    return true;
  }

  /**
   * Disable an effect
   */
  disableEffect(effectId: string): boolean {
    if (this.activeEffects.delete(effectId)) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Toggle an effect
   */
  toggleEffect(effectId: string, intensity?: number): boolean {
    if (this.isEffectActive(effectId)) {
      return this.disableEffect(effectId);
    } else {
      return this.enableEffect(effectId, intensity);
    }
  }

  /**
   * Check if an effect is active
   */
  isEffectActive(effectId: string): boolean {
    return this.activeEffects.has(effectId);
  }

  /**
   * Update effect intensity
   */
  setEffectIntensity(effectId: string, intensity: number): boolean {
    const effectState = this.activeEffects.get(effectId);
    if (effectState) {
      effectState.intensity = Math.max(0, Math.min(2, intensity));
      effectState.lastUpdate = Date.now();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Update effect parameters
   */
  setEffectParameters(effectId: string, parameters: Record<string, any>): boolean {
    const effectState = this.activeEffects.get(effectId);
    if (effectState) {
      effectState.parameters = { ...effectState.parameters, ...parameters };
      effectState.lastUpdate = Date.now();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Set global intensity multiplier
   */
  setGlobalIntensity(intensity: number): void {
    this.globalIntensity = Math.max(0, Math.min(2, intensity));
    this.notifyListeners();
  }

  /**
   * Get global intensity
   */
  getGlobalIntensity(): number {
    return this.globalIntensity;
  }

  /**
   * Get effective intensity for an effect (global * effect intensity)
   */
  getEffectiveIntensity(effectId: string): number {
    const effectState = this.activeEffects.get(effectId);
    return effectState ? effectState.intensity * this.globalIntensity : 0;
  }

  /**
   * Enable all effects
   */
  enableAllEffects(): void {
    this.effects.forEach((effect, id) => {
      this.enableEffect(id, 1.0);
    });
  }

  /**
   * Disable all effects
   */
  disableAllEffects(): void {
    this.activeEffects.clear();
    this.notifyListeners();
  }

  /**
   * Get performance impact summary
   */
  getPerformanceSummary(): { low: number; medium: number; high: number; total: number } {
    const summary = { low: 0, medium: 0, high: 0, total: 0 };
    
    this.activeEffects.forEach(effectState => {
      summary[effectState.effect.performanceImpact]++;
      summary.total++;
    });

    return summary;
  }

  /**
   * Get recommended settings based on performance target
   */
  getRecommendedSettings(targetPerformance: 'low' | 'medium' | 'high'): string[] {
    const recommended: string[] = [];
    
    this.effects.forEach((effect, id) => {
      switch (targetPerformance) {
        case 'low':
          if (effect.performanceImpact === 'low') {
            recommended.push(id);
          }
          break;
        case 'medium':
          if (effect.performanceImpact !== 'high') {
            recommended.push(id);
          }
          break;
        case 'high':
          recommended.push(id);
          break;
      }
    });

    return recommended;
  }

  /**
   * Apply recommended settings
   */
  applyRecommendedSettings(targetPerformance: 'low' | 'medium' | 'high'): void {
    this.disableAllEffects();
    const recommended = this.getRecommendedSettings(targetPerformance);
    recommended.forEach(id => this.enableEffect(id));
  }

  /**
   * Add listener for effect changes
   */
  addListener(listener: (effects: EffectState[]) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: (effects: EffectState[]) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const activeEffects = this.getActiveEffects();
    this.listeners.forEach(listener => {
      try {
        listener(activeEffects);
      } catch (error) {
        console.error('Error in effect manager listener:', error);
      }
    });
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): Record<string, any> {
    const config: Record<string, any> = {
      globalIntensity: this.globalIntensity,
      activeEffects: {}
    };

    this.activeEffects.forEach((effectState, id) => {
      config.activeEffects[id] = {
        intensity: effectState.intensity,
        parameters: effectState.parameters
      };
    });

    return config;
  }

  /**
   * Import configuration
   */
  importConfiguration(config: Record<string, any>): void {
    this.disableAllEffects();
    
    if (config.globalIntensity !== undefined) {
      this.setGlobalIntensity(config.globalIntensity);
    }

    if (config.activeEffects) {
      Object.entries(config.activeEffects).forEach(([id, settings]: [string, any]) => {
        if (this.enableEffect(id, settings.intensity)) {
          if (settings.parameters) {
            this.setEffectParameters(id, settings.parameters);
          }
        }
      });
    }
  }
}
