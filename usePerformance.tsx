import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePerformance as usePerformanceStore } from '../lib/stores/usePerformance';

/**
 * Hook for monitoring and optimizing 3D performance
 */
export function usePerformance() {
  const store = usePerformanceStore();
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const memoryCheckIntervalRef = useRef<number>();

  // Monitor frame rate and performance
  useFrame((state, delta) => {
    const now = performance.now();
    
    // Calculate FPS
    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }
    
    // Update FPS every 60 frames
    if (frameTimesRef.current.length === 60) {
      const avgDelta = frameTimesRef.current.reduce((a, b) => a + b) / 60;
      const fps = Math.round(1 / avgDelta);
      store.setFPS(fps);
      
      // Auto-optimization based on performance
      if (store.isOptimized) {
        autoOptimize(fps);
      }
    }
    
    lastFrameTimeRef.current = now;
  });

  // Auto-optimization logic
  const autoOptimize = useCallback((fps: number) => {
    if (fps < 30) {
      // Reduce particle count
      if (store.particleCount > 1000) {
        store.setParticleCount(Math.max(1000, store.particleCount * 0.8));
        console.log('Performance: Reduced particle count to', store.particleCount);
      }
      
      // Increase LOD level
      if (store.lodLevel < 3) {
        store.setLodLevel(Math.min(3, store.lodLevel + 1));
        console.log('Performance: Increased LOD level to', store.lodLevel);
      }
    } else if (fps > 55) {
      // Increase quality if performance is good
      if (store.particleCount < 20000) {
        store.setParticleCount(Math.min(20000, store.particleCount * 1.1));
      }
      
      if (store.lodLevel > 0) {
        store.setLodLevel(Math.max(0, store.lodLevel - 1));
      }
    }
  }, [store]);

  // Memory monitoring
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        store.setMemoryUsage({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        });
      }
    };

    // Check memory every 5 seconds
    memoryCheckIntervalRef.current = window.setInterval(checkMemory, 5000);
    checkMemory(); // Initial check

    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
    };
  }, [store]);

  // Performance presets
  const applyPerformancePreset = useCallback((preset: 'low' | 'medium' | 'high' | 'ultra') => {
    const presets = {
      low: {
        particleCount: 1000,
        lodLevel: 3,
        shadowQuality: 'none',
        antialiasing: false,
        renderScale: 0.5
      },
      medium: {
        particleCount: 5000,
        lodLevel: 2,
        shadowQuality: 'low',
        antialiasing: false,
        renderScale: 0.75
      },
      high: {
        particleCount: 10000,
        lodLevel: 1,
        shadowQuality: 'medium',
        antialiasing: true,
        renderScale: 1.0
      },
      ultra: {
        particleCount: 20000,
        lodLevel: 0,
        shadowQuality: 'high',
        antialiasing: true,
        renderScale: 1.0
      }
    };

    const config = presets[preset];
    store.setParticleCount(config.particleCount);
    store.setLodLevel(config.lodLevel);
    
    console.log(`Applied ${preset} performance preset`);
  }, [store]);

  // Adaptive quality based on device capabilities
  const detectDeviceCapabilities = useCallback(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      console.warn('WebGL not supported, applying low performance preset');
      applyPerformancePreset('low');
      return;
    }

    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    const version = gl.getParameter(gl.VERSION);
    
    console.log('GPU Info:', { renderer, vendor, version });

    // Simple heuristics for device capability detection
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    const hasHighEndGPU = /RTX|GTX|Radeon|NVIDIA|AMD/i.test(renderer);
    const memoryLimit = (performance as any).memory?.jsHeapSizeLimit || 0;
    
    if (isMobile || memoryLimit < 1000000000) { // Less than 1GB
      applyPerformancePreset('low');
    } else if (hasHighEndGPU && memoryLimit > 4000000000) { // More than 4GB
      applyPerformancePreset('ultra');
    } else if (hasHighEndGPU) {
      applyPerformancePreset('high');
    } else {
      applyPerformancePreset('medium');
    }
  }, [applyPerformancePreset]);

  // Initialize device detection
  useEffect(() => {
    detectDeviceCapabilities();
  }, [detectDeviceCapabilities]);

  // Performance monitoring controls
  const startProfiling = useCallback(() => {
    frameTimesRef.current = [];
    console.log('Performance profiling started');
  }, []);

  const getProfilingResults = useCallback(() => {
    if (frameTimesRef.current.length === 0) return null;

    const frameTimes = frameTimesRef.current;
    const fps = frameTimes.map(delta => 1 / delta);
    
    return {
      averageFPS: fps.reduce((a, b) => a + b) / fps.length,
      minFPS: Math.min(...fps),
      maxFPS: Math.max(...fps),
      frameCount: frameTimes.length,
      totalTime: frameTimes.reduce((a, b) => a + b),
      performance: store.fps > 30 ? 'good' : store.fps > 20 ? 'fair' : 'poor'
    };
  }, [store.fps]);

  // Memory management
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window) {
      (window as any).gc();
      console.log('Forced garbage collection');
    } else {
      console.log('Garbage collection not available');
    }
  }, []);

  // Performance warnings
  const getPerformanceWarnings = useCallback(() => {
    const warnings: string[] = [];
    
    if (store.fps < 20) {
      warnings.push('Very low FPS detected - consider reducing quality settings');
    }
    
    if (store.memoryUsage.percentage > 80) {
      warnings.push('High memory usage - consider reducing particle count');
    }
    
    if (store.particleCount > 15000 && store.fps < 30) {
      warnings.push('High particle count with low FPS - reduce particles');
    }
    
    return warnings;
  }, [store.fps, store.memoryUsage.percentage, store.particleCount]);

  // Benchmark test
  const runBenchmark = useCallback(async (duration: number = 10000) => {
    console.log(`Running performance benchmark for ${duration}ms...`);
    
    const startTime = performance.now();
    const originalOptimization = store.isOptimized;
    
    // Disable auto-optimization during benchmark
    store.toggleOptimization();
    
    // Set to maximum quality
    const originalSettings = {
      particleCount: store.particleCount,
      lodLevel: store.lodLevel
    };
    
    store.setParticleCount(20000);
    store.setLodLevel(0);
    
    const frameData: number[] = [];
    
    return new Promise<any>((resolve) => {
      const checkFrame = () => {
        frameData.push(store.fps);
        
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(checkFrame);
        } else {
          // Restore original settings
          store.setParticleCount(originalSettings.particleCount);
          store.setLodLevel(originalSettings.lodLevel);
          
          if (originalOptimization) {
            store.toggleOptimization();
          }
          
          const results = {
            averageFPS: frameData.reduce((a, b) => a + b) / frameData.length,
            minFPS: Math.min(...frameData),
            maxFPS: Math.max(...frameData),
            samples: frameData.length,
            duration: performance.now() - startTime,
            recommendation: frameData.reduce((a, b) => a + b) / frameData.length > 30 ? 'high' : 
                           frameData.reduce((a, b) => a + b) / frameData.length > 20 ? 'medium' : 'low'
          };
          
          console.log('Benchmark results:', results);
          resolve(results);
        }
      };
      
      requestAnimationFrame(checkFrame);
    });
  }, [store]);

  return {
    // State
    fps: store.fps,
    memoryUsage: store.memoryUsage,
    particleCount: store.particleCount,
    lodLevel: store.lodLevel,
    isOptimized: store.isOptimized,
    
    // Controls
    toggleOptimization: store.toggleOptimization,
    setParticleCount: store.setParticleCount,
    setLodLevel: store.setLodLevel,
    
    // Presets and detection
    applyPerformancePreset,
    detectDeviceCapabilities,
    
    // Profiling
    startProfiling,
    getProfilingResults,
    
    // Utilities
    forceGarbageCollection,
    getPerformanceWarnings,
    runBenchmark,
    
    // Performance metrics
    isHighPerformance: store.fps > 45,
    isMediumPerformance: store.fps > 25 && store.fps <= 45,
    isLowPerformance: store.fps <= 25
  };
}

/**
 * Hook for monitoring specific component performance
 */
export function useComponentPerformance(componentName: string) {
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const startMeasure = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endMeasure = useCallback(() => {
    if (startTimeRef.current > 0) {
      const renderTime = performance.now() - startTimeRef.current;
      renderTimesRef.current.push(renderTime);
      
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }
      
      startTimeRef.current = 0;
    }
  }, []);

  const getStats = useCallback(() => {
    if (renderTimesRef.current.length === 0) return null;
    
    const times = renderTimesRef.current;
    return {
      component: componentName,
      averageRenderTime: times.reduce((a, b) => a + b) / times.length,
      minRenderTime: Math.min(...times),
      maxRenderTime: Math.max(...times),
      samples: times.length
    };
  }, [componentName]);

  const reset = useCallback(() => {
    renderTimesRef.current = [];
  }, []);

  // Auto-measure with useFrame
  useFrame(() => {
    startMeasure();
    
    // End measure on next frame
    requestAnimationFrame(() => {
      endMeasure();
    });
  });

  return {
    startMeasure,
    endMeasure,
    getStats,
    reset
  };
}

/**
 * Hook for performance-aware rendering
 */
export function useAdaptiveRendering() {
  const { fps, isOptimized, lodLevel } = usePerformance();
  
  const shouldRender = useCallback((priority: 'low' | 'medium' | 'high') => {
    if (!isOptimized) return true;
    
    switch (priority) {
      case 'high':
        return true;
      case 'medium':
        return fps > 20;
      case 'low':
        return fps > 40;
      default:
        return true;
    }
  }, [fps, isOptimized]);

  const getQualityLevel = useCallback(() => {
    if (fps > 45) return 'high';
    if (fps > 25) return 'medium';
    return 'low';
  }, [fps]);

  const shouldSkipFrame = useCallback((interval: number = 2) => {
    return isOptimized && fps < 25 && Date.now() % (interval * 16) !== 0;
  }, [fps, isOptimized]);

  return {
    shouldRender,
    getQualityLevel,
    shouldSkipFrame,
    lodLevel,
    isOptimized
  };
}
