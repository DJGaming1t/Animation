/**
 * Performance optimization utility for managing 3D scene complexity
 * Dynamically adjusts rendering parameters based on performance metrics
 */
export class PerformanceOptimizer {
  private frameRates: number[] = [];
  private maxSamples = 60;
  private targetFPS = 60;
  private minFPS = 30;
  
  constructor() {
    this.reset();
  }

  /**
   * Add a frame time measurement
   */
  addFrameTime(deltaTime: number): void {
    const fps = 1 / deltaTime;
    this.frameRates.push(fps);
    
    if (this.frameRates.length > this.maxSamples) {
      this.frameRates.shift();
    }
  }

  /**
   * Get current average FPS
   */
  getAverageFPS(): number {
    if (this.frameRates.length === 0) return 60;
    
    const sum = this.frameRates.reduce((a, b) => a + b, 0);
    return sum / this.frameRates.length;
  }

  /**
   * Get performance level (0-1, where 1 is best performance)
   */
  getPerformanceLevel(): number {
    const avgFPS = this.getAverageFPS();
    return Math.min(1, Math.max(0, (avgFPS - this.minFPS) / (this.targetFPS - this.minFPS)));
  }

  /**
   * Adjust particle count based on performance
   */
  adjustParticleCount(requestedCount: number): number {
    const performanceLevel = this.getPerformanceLevel();
    
    if (performanceLevel < 0.3) {
      return Math.floor(requestedCount * 0.25); // Very low performance
    } else if (performanceLevel < 0.6) {
      return Math.floor(requestedCount * 0.5); // Low performance
    } else if (performanceLevel < 0.8) {
      return Math.floor(requestedCount * 0.75); // Medium performance
    }
    
    return requestedCount; // Good performance
  }

  /**
   * Adjust delta time for consistent animation speed
   */
  adjustDelta(deltaTime: number): number {
    const maxDelta = 1 / 30; // Cap at 30 FPS equivalent
    return Math.min(deltaTime, maxDelta);
  }

  /**
   * Get recommended LOD level based on performance
   */
  getRecommendedLOD(): number {
    const performanceLevel = this.getPerformanceLevel();
    
    if (performanceLevel < 0.3) return 3; // Lowest detail
    if (performanceLevel < 0.6) return 2; // Low detail
    if (performanceLevel < 0.8) return 1; // Medium detail
    return 0; // High detail
  }

  /**
   * Should skip expensive operations based on performance
   */
  shouldSkipExpensiveOperations(): boolean {
    return this.getPerformanceLevel() < 0.4;
  }

  /**
   * Get render scale factor for resolution adjustment
   */
  getRenderScale(): number {
    const performanceLevel = this.getPerformanceLevel();
    
    if (performanceLevel < 0.3) return 0.5;
    if (performanceLevel < 0.6) return 0.75;
    return 1.0;
  }

  /**
   * Get shadow quality setting
   */
  getShadowQuality(): 'none' | 'low' | 'medium' | 'high' {
    const performanceLevel = this.getPerformanceLevel();
    
    if (performanceLevel < 0.3) return 'none';
    if (performanceLevel < 0.5) return 'low';
    if (performanceLevel < 0.8) return 'medium';
    return 'high';
  }

  /**
   * Reset performance tracking
   */
  reset(): void {
    this.frameRates = [];
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const avgFPS = this.getAverageFPS();
    const minFPS = Math.min(...this.frameRates);
    const maxFPS = Math.max(...this.frameRates);
    
    return {
      averageFPS: avgFPS,
      minimumFPS: minFPS,
      maximumFPS: maxFPS,
      performanceLevel: this.getPerformanceLevel(),
      recommendedLOD: this.getRecommendedLOD(),
      renderScale: this.getRenderScale()
    };
  }
}
