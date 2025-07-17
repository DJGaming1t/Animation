import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimation as useAnimationStore } from '../lib/stores/useAnimation';

/**
 * Hook for managing 3D animations with timeline control
 */
export function useAnimation() {
  const store = useAnimationStore();
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Animation frame callback
  useFrame((state, delta) => {
    if (!store.isPlaying) return;

    frameRef.current++;
    const currentTime = state.clock.getElapsedTime();
    
    // Update global time with speed multiplier
    store.updateTime(delta * store.speed);
    
    // Performance monitoring
    if (frameRef.current % 60 === 0) {
      const fps = 60 / (currentTime - lastTimeRef.current);
      lastTimeRef.current = currentTime;
      
      // Auto-adjust speed based on performance
      if (fps < 30 && store.speed > 0.5) {
        console.warn('Low FPS detected, reducing animation speed');
        store.setSpeed(store.speed * 0.9);
      }
    }
  });

  // Animation control functions
  const play = useCallback(() => {
    store.play();
    console.log('Animation playing');
  }, [store]);

  const pause = useCallback(() => {
    store.pause();
    console.log('Animation paused');
  }, [store]);

  const restart = useCallback(() => {
    store.restart();
    console.log('Animation restarted');
  }, [store]);

  const setSequence = useCallback((sequenceId: string) => {
    store.setSequence(sequenceId);
    console.log(`Animation sequence changed to: ${sequenceId}`);
  }, [store]);

  const setSpeed = useCallback((speed: number) => {
    const clampedSpeed = Math.max(0.1, Math.min(3.0, speed));
    store.setSpeed(clampedSpeed);
    console.log(`Animation speed set to: ${clampedSpeed}x`);
  }, [store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target !== document.body) return;
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (store.isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            restart();
          }
          break;
        case 'Digit1':
          setSequence('cosmic');
          break;
        case 'Digit2':
          setSequence('fire');
          break;
        case 'Digit3':
          setSequence('water');
          break;
        case 'Digit4':
          setSequence('crystal');
          break;
        case 'Digit5':
          setSequence('plasma');
          break;
        case 'Equal':
          setSpeed(store.speed + 0.1);
          break;
        case 'Minus':
          setSpeed(store.speed - 0.1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [store.isPlaying, store.speed, play, pause, restart, setSequence, setSpeed]);

  // Animation sequence helpers
  const cycleSequence = useCallback(() => {
    const currentIndex = store.sequences.findIndex(seq => seq.id === store.currentSequence);
    const nextIndex = (currentIndex + 1) % store.sequences.length;
    setSequence(store.sequences[nextIndex].id);
  }, [store.sequences, store.currentSequence, setSequence]);

  // Progress tracking
  const getProgress = useCallback(() => {
    const sequence = store.sequences.find(seq => seq.id === store.currentSequence);
    if (!sequence) return 0;
    
    return (store.globalTime % sequence.duration) / sequence.duration;
  }, [store.globalTime, store.currentSequence, store.sequences]);

  // Timeline seeking
  const seekToProgress = useCallback((progress: number) => {
    const sequence = store.sequences.find(seq => seq.id === store.currentSequence);
    if (!sequence) return;
    
    const targetTime = progress * sequence.duration;
    store.setTime(targetTime);
  }, [store, store.currentSequence, store.sequences]);

  // Animation state
  const getCurrentSequence = useCallback(() => {
    return store.sequences.find(seq => seq.id === store.currentSequence) || null;
  }, [store.sequences, store.currentSequence]);

  return {
    // State
    isPlaying: store.isPlaying,
    currentSequence: store.currentSequence,
    globalTime: store.globalTime,
    speed: store.speed,
    sequences: store.sequences,
    
    // Controls
    play,
    pause,
    restart,
    setSequence,
    setSpeed,
    cycleSequence,
    
    // Progress
    getProgress,
    seekToProgress,
    getCurrentSequence,
    
    // Utilities
    frameCount: frameRef.current
  };
}

/**
 * Hook for creating smooth animation transitions
 */
export function useAnimationTransition(
  targetValue: number,
  duration: number = 1000,
  easing: (t: number) => number = (t) => t
) {
  const currentValueRef = useRef(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);

  useFrame((state) => {
    if (!isAnimatingRef.current) return;

    const elapsed = state.clock.getElapsedTime() * 1000 - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    currentValueRef.current = startValueRef.current + 
      (targetValue - startValueRef.current) * easedProgress;

    if (progress >= 1) {
      isAnimatingRef.current = false;
      currentValueRef.current = targetValue;
    }
  });

  useEffect(() => {
    if (currentValueRef.current !== targetValue) {
      startValueRef.current = currentValueRef.current;
      startTimeRef.current = performance.now();
      isAnimatingRef.current = true;
    }
  }, [targetValue]);

  return currentValueRef.current;
}

/**
 * Hook for spring-based animations
 */
export function useSpringAnimation(
  targetValue: number,
  config: { tension?: number; friction?: number } = {}
) {
  const { tension = 170, friction = 26 } = config;
  const currentValueRef = useRef(targetValue);
  const velocityRef = useRef(0);

  useFrame((state, delta) => {
    const springForce = -tension * (currentValueRef.current - targetValue);
    const dampingForce = -friction * velocityRef.current;
    
    const acceleration = springForce + dampingForce;
    velocityRef.current += acceleration * delta;
    currentValueRef.current += velocityRef.current * delta;

    // Settle when close enough
    if (Math.abs(currentValueRef.current - targetValue) < 0.001 && 
        Math.abs(velocityRef.current) < 0.001) {
      currentValueRef.current = targetValue;
      velocityRef.current = 0;
    }
  });

  useEffect(() => {
    // Reset when target changes
  }, [targetValue]);

  return currentValueRef.current;
}

/**
 * Hook for creating animation loops
 */
export function useAnimationLoop(
  duration: number,
  autoPlay: boolean = true
) {
  const startTimeRef = useRef(0);
  const progressRef = useRef(0);
  const isPlayingRef = useRef(autoPlay);

  useFrame((state) => {
    if (!isPlayingRef.current) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = state.clock.getElapsedTime();
    }

    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    progressRef.current = (elapsed % duration) / duration;
  });

  const start = useCallback(() => {
    isPlayingRef.current = true;
    startTimeRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    progressRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    startTimeRef.current = 0;
    progressRef.current = 0;
  }, []);

  return {
    progress: progressRef.current,
    isPlaying: isPlayingRef.current,
    start,
    stop,
    reset
  };
}
