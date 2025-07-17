import { EventEmitter } from 'events';

/**
 * Animation sequence manager for coordinating complex animation timelines
 */
export interface AnimationKeyframe {
  time: number;
  properties: Record<string, any>;
  easing?: (t: number) => number;
}

export interface AnimationTrack {
  id: string;
  keyframes: AnimationKeyframe[];
  loop?: boolean;
  duration?: number;
}

export interface AnimationSequence {
  id: string;
  name: string;
  description: string;
  tracks: AnimationTrack[];
  duration: number;
  loop: boolean;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export class AnimationSequencer extends EventEmitter {
  private sequences: Map<string, AnimationSequence> = new Map();
  private currentSequence: AnimationSequence | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private speed: number = 1;
  private progress: number = 0;

  constructor() {
    super();
    this.initializeDefaultSequences();
  }

  /**
   * Initialize default animation sequences
   */
  private initializeDefaultSequences(): void {
    // Cosmic sequence
    this.addSequence({
      id: 'cosmic',
      name: 'Cosmic Journey',
      description: 'Travel through space with stellar formations and cosmic phenomena',
      duration: 60,
      loop: true,
      tracks: [
        {
          id: 'camera',
          keyframes: [
            { time: 0, properties: { position: [0, 40, 80], target: [0, 10, 0] } },
            { time: 15, properties: { position: [50, 60, 50], target: [20, 5, 20] } },
            { time: 30, properties: { position: [-30, 80, 60], target: [-10, 15, 10] } },
            { time: 45, properties: { position: [0, 100, 100], target: [0, 20, 0] } },
            { time: 60, properties: { position: [0, 40, 80], target: [0, 10, 0] } }
          ]
        },
        {
          id: 'particles',
          keyframes: [
            { time: 0, properties: { intensity: 1.0, count: 5000 } },
            { time: 20, properties: { intensity: 1.5, count: 8000 } },
            { time: 40, properties: { intensity: 2.0, count: 10000 } },
            { time: 60, properties: { intensity: 1.0, count: 5000 } }
          ]
        },
        {
          id: 'lighting',
          keyframes: [
            { time: 0, properties: { color: '#4466ff', intensity: 1.0 } },
            { time: 30, properties: { color: '#6644ff', intensity: 1.2 } },
            { time: 60, properties: { color: '#4466ff', intensity: 1.0 } }
          ]
        }
      ]
    });

    // Fire sequence
    this.addSequence({
      id: 'fire',
      name: 'Elemental Fire',
      description: 'Intense fire effects with heat distortion and ember particles',
      duration: 45,
      loop: true,
      tracks: [
        {
          id: 'camera',
          keyframes: [
            { time: 0, properties: { position: [15, 25, 45], target: [0, 5, 0] } },
            { time: 15, properties: { position: [30, 20, 30], target: [5, 8, 5] } },
            { time: 30, properties: { position: [0, 35, 50], target: [0, 10, 0] } },
            { time: 45, properties: { position: [15, 25, 45], target: [0, 5, 0] } }
          ]
        },
        {
          id: 'fire_intensity',
          keyframes: [
            { time: 0, properties: { heat: 1.0, spread: 1.0 } },
            { time: 10, properties: { heat: 1.8, spread: 1.5 } },
            { time: 25, properties: { heat: 2.2, spread: 2.0 } },
            { time: 35, properties: { heat: 1.5, spread: 1.2 } },
            { time: 45, properties: { heat: 1.0, spread: 1.0 } }
          ]
        }
      ]
    });

    // Water sequence
    this.addSequence({
      id: 'water',
      name: 'Aquatic Flow',
      description: 'Fluid dynamics with waves, splashes, and underwater effects',
      duration: 50,
      loop: true,
      tracks: [
        {
          id: 'camera',
          keyframes: [
            { time: 0, properties: { position: [-20, 20, 60], target: [0, 0, 0] } },
            { time: 20, properties: { position: [40, 15, 40], target: [10, -5, 10] } },
            { time: 40, properties: { position: [-10, 30, 80], target: [-5, 5, -5] } },
            { time: 50, properties: { position: [-20, 20, 60], target: [0, 0, 0] } }
          ]
        },
        {
          id: 'water_flow',
          keyframes: [
            { time: 0, properties: { speed: 1.0, turbulence: 0.5 } },
            { time: 15, properties: { speed: 1.5, turbulence: 0.8 } },
            { time: 30, properties: { speed: 2.0, turbulence: 1.2 } },
            { time: 50, properties: { speed: 1.0, turbulence: 0.5 } }
          ]
        }
      ]
    });

    // Crystal sequence
    this.addSequence({
      id: 'crystal',
      name: 'Crystal Resonance',
      description: 'Geometric crystal formations with refractive light effects',
      duration: 40,
      loop: true,
      tracks: [
        {
          id: 'camera',
          keyframes: [
            { time: 0, properties: { position: [30, 35, 50], target: [0, 15, 0] } },
            { time: 20, properties: { position: [60, 25, 30], target: [20, 10, 10] } },
            { time: 40, properties: { position: [30, 35, 50], target: [0, 15, 0] } }
          ]
        },
        {
          id: 'crystal_growth',
          keyframes: [
            { time: 0, properties: { scale: 0.8, energy: 1.0 } },
            { time: 10, properties: { scale: 1.2, energy: 1.5 } },
            { time: 20, properties: { scale: 1.5, energy: 2.0 } },
            { time: 30, properties: { scale: 1.1, energy: 1.3 } },
            { time: 40, properties: { scale: 0.8, energy: 1.0 } }
          ]
        }
      ]
    });

    // Plasma sequence
    this.addSequence({
      id: 'plasma',
      name: 'Plasma Storm',
      description: 'High-energy electromagnetic fields and plasma discharge',
      duration: 35,
      loop: true,
      tracks: [
        {
          id: 'camera',
          keyframes: [
            { time: 0, properties: { position: [0, 60, 100], target: [0, 20, 0] } },
            { time: 12, properties: { position: [80, 40, 60], target: [30, 25, 20] } },
            { time: 25, properties: { position: [-60, 80, 80], target: [-20, 30, 20] } },
            { time: 35, properties: { position: [0, 60, 100], target: [0, 20, 0] } }
          ]
        },
        {
          id: 'plasma_energy',
          keyframes: [
            { time: 0, properties: { field_strength: 1.0, frequency: 8.0 } },
            { time: 8, properties: { field_strength: 2.5, frequency: 15.0 } },
            { time: 18, properties: { field_strength: 3.0, frequency: 20.0 } },
            { time: 28, properties: { field_strength: 1.8, frequency: 12.0 } },
            { time: 35, properties: { field_strength: 1.0, frequency: 8.0 } }
          ]
        }
      ]
    });
  }

  /**
   * Add a new animation sequence
   */
  addSequence(sequence: AnimationSequence): void {
    this.sequences.set(sequence.id, sequence);
    this.emit('sequenceAdded', sequence);
  }

  /**
   * Remove an animation sequence
   */
  removeSequence(id: string): void {
    if (this.sequences.delete(id)) {
      this.emit('sequenceRemoved', id);
    }
  }

  /**
   * Get all available sequences
   */
  getSequences(): AnimationSequence[] {
    return Array.from(this.sequences.values());
  }

  /**
   * Get a specific sequence
   */
  getSequence(id: string): AnimationSequence | undefined {
    return this.sequences.get(id);
  }

  /**
   * Start playing a sequence
   */
  play(sequenceId?: string): void {
    if (sequenceId) {
      const sequence = this.sequences.get(sequenceId);
      if (!sequence) {
        console.warn(`Sequence ${sequenceId} not found`);
        return;
      }
      this.currentSequence = sequence;
    }

    if (!this.currentSequence) {
      console.warn('No sequence to play');
      return;
    }

    this.isPlaying = true;
    this.startTime = Date.now();
    this.currentSequence.onStart?.();
    this.emit('play', this.currentSequence);
  }

  /**
   * Pause the current sequence
   */
  pause(): void {
    this.isPlaying = false;
    this.emit('pause', this.currentSequence);
  }

  /**
   * Stop the current sequence
   */
  stop(): void {
    this.isPlaying = false;
    this.progress = 0;
    this.startTime = 0;
    this.emit('stop', this.currentSequence);
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(5, speed));
    this.emit('speedChanged', this.speed);
  }

  /**
   * Update the sequencer (call this in your animation loop)
   */
  update(): void {
    if (!this.isPlaying || !this.currentSequence) return;

    const now = Date.now();
    const elapsed = (now - this.startTime) * 0.001 * this.speed; // Convert to seconds
    this.progress = elapsed / this.currentSequence.duration;

    // Handle looping
    if (this.progress >= 1) {
      if (this.currentSequence.loop) {
        this.startTime = now;
        this.progress = 0;
        this.emit('loop', this.currentSequence);
      } else {
        this.progress = 1;
        this.isPlaying = false;
        this.currentSequence.onComplete?.();
        this.emit('complete', this.currentSequence);
        return;
      }
    }

    // Update tracks
    const currentTime = this.progress * this.currentSequence.duration;
    const frameData: Record<string, any> = {};

    for (const track of this.currentSequence.tracks) {
      frameData[track.id] = this.interpolateTrack(track, currentTime);
    }

    this.currentSequence.onUpdate?.(this.progress);
    this.emit('update', { sequence: this.currentSequence, progress: this.progress, data: frameData });
  }

  /**
   * Interpolate values for a track at the given time
   */
  private interpolateTrack(track: AnimationTrack, time: number): any {
    const keyframes = track.keyframes;
    if (keyframes.length === 0) return {};

    // Find surrounding keyframes
    let prevKeyframe = keyframes[0];
    let nextKeyframe = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        prevKeyframe = keyframes[i];
        nextKeyframe = keyframes[i + 1];
        break;
      }
    }

    // If time is before first or after last keyframe
    if (time <= prevKeyframe.time) return prevKeyframe.properties;
    if (time >= nextKeyframe.time) return nextKeyframe.properties;

    // Interpolate between keyframes
    const duration = nextKeyframe.time - prevKeyframe.time;
    const t = (time - prevKeyframe.time) / duration;
    const easedT = nextKeyframe.easing ? nextKeyframe.easing(t) : t;

    const result: Record<string, any> = {};
    
    for (const key in prevKeyframe.properties) {
      const prevValue = prevKeyframe.properties[key];
      const nextValue = nextKeyframe.properties[key];

      if (typeof prevValue === 'number' && typeof nextValue === 'number') {
        result[key] = prevValue + (nextValue - prevValue) * easedT;
      } else if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
        result[key] = prevValue.map((val, index) => 
          val + (nextValue[index] - val) * easedT
        );
      } else {
        result[key] = easedT < 0.5 ? prevValue : nextValue;
      }
    }

    return result;
  }

  /**
   * Get current sequence info
   */
  getCurrentSequence(): AnimationSequence | null {
    return this.currentSequence;
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Seek to a specific time in the current sequence
   */
  seek(progress: number): void {
    if (!this.currentSequence) return;
    
    this.progress = Math.max(0, Math.min(1, progress));
    this.startTime = Date.now() - (this.progress * this.currentSequence.duration * 1000 / this.speed);
    this.emit('seek', this.progress);
  }
}
