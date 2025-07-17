import { useMemo } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, FilmPass, SMAAPass } from "three/examples/jsm/postprocessing/";
import { FXAAShader, LuminosityHighPassShader, CopyShader } from "three/examples/jsm/shaders/";
import * as THREE from "three";
import { useAnimation } from "../../lib/stores/useAnimation";
import { useEffects } from "../../lib/stores/useEffects";
import { usePerformance } from "../../lib/stores/usePerformance";

// Extend Three.js with post-processing effects
extend({ EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, FilmPass, SMAAPass });

/**
 * Advanced post-processing pipeline with dynamic effects
 * Applies bloom, chromatic aberration, film grain, and custom shaders
 */
export default function PostProcessing() {
  const { gl, scene, camera } = useThree();
  const { currentSequence, isPlaying } = useAnimation();
  const { activeEffects, intensity } = useEffects();
  const { isOptimized } = usePerformance();

  // Create custom shaders for unique effects
  const customShaders = useMemo(() => ({
    chromaticAberration: {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uIntensity: { value: 0.002 },
        uDistortion: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uDistortion;
        
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          
          // Radial distortion
          vec2 center = vec2(0.5);
          vec2 offset = uv - center;
          float distance = length(offset);
          float distortion = 1.0 + distance * uDistortion;
          
          // Chromatic aberration offsets
          vec2 redOffset = offset * (1.0 + uIntensity * distortion);
          vec2 greenOffset = offset * (1.0 + uIntensity * 0.5 * distortion);
          vec2 blueOffset = offset * (1.0 - uIntensity * distortion);
          
          // Sample color channels with offsets
          float r = texture2D(tDiffuse, center + redOffset).r;
          float g = texture2D(tDiffuse, center + greenOffset).g;
          float b = texture2D(tDiffuse, center + blueOffset).b;
          
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `
    },
    
    kaleidoscope: {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uSides: { value: 6.0 },
        uAngle: { value: 0.0 },
        uRadius: { value: 0.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uSides;
        uniform float uAngle;
        uniform float uRadius;
        
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv - 0.5;
          
          // Convert to polar coordinates
          float angle = atan(uv.y, uv.x) + uAngle;
          float radius = length(uv);
          
          // Kaleidoscope effect
          angle = mod(angle, 2.0 * 3.14159 / uSides);
          if (angle > 3.14159 / uSides) {
            angle = 2.0 * 3.14159 / uSides - angle;
          }
          
          // Convert back to cartesian
          vec2 kaleidoUv = vec2(cos(angle), sin(angle)) * radius * uRadius + 0.5;
          
          vec4 color = texture2D(tDiffuse, kaleidoUv);
          gl_FragColor = color;
        }
      `
    },
    
    pixelation: {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uPixelSize: { value: 4.0 },
        uResolution: { value: new THREE.Vector2(1920, 1080) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uPixelSize;
        uniform vec2 uResolution;
        
        varying vec2 vUv;
        
        void main() {
          vec2 dxy = uPixelSize / uResolution;
          vec2 coord = dxy * floor(vUv / dxy);
          
          gl_FragColor = texture2D(tDiffuse, coord);
        }
      `
    },
    
    vortex: {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uStrength: { value: 1.0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uStrength;
        uniform vec2 uCenter;
        
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          vec2 center = uCenter;
          
          vec2 offset = uv - center;
          float distance = length(offset);
          float angle = atan(offset.y, offset.x);
          
          // Vortex distortion
          float vortexStrength = uStrength * (1.0 - distance);
          angle += vortexStrength * sin(uTime * 2.0);
          
          vec2 distortedUv = center + vec2(cos(angle), sin(angle)) * distance;
          
          gl_FragColor = texture2D(tDiffuse, distortedUv);
        }
      `
    }
  }), []);

  // Effect composer setup
  const composer = useMemo(() => {
    const effectComposer = new EffectComposer(gl);
    effectComposer.setSize(gl.domElement.width, gl.domElement.height);
    effectComposer.setPixelRatio(isOptimized ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);

    // Base render pass
    const renderPass = new RenderPass(scene, camera);
    effectComposer.addPass(renderPass);

    // Bloom pass for glowing effects
    if (activeEffects.includes('bloom')) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(gl.domElement.width, gl.domElement.height),
        intensity * 0.8, // strength
        0.8, // radius
        0.3  // threshold
      );
      effectComposer.addPass(bloomPass);
    }

    // Chromatic aberration
    if (activeEffects.includes('chromatic_aberration')) {
      const chromaticAberrationPass = new ShaderPass(customShaders.chromaticAberration);
      effectComposer.addPass(chromaticAberrationPass);
    }

    // Kaleidoscope effect for cosmic sequence
    if (currentSequence === 'cosmic' && activeEffects.includes('kaleidoscope')) {
      const kaleidoscopePass = new ShaderPass(customShaders.kaleidoscope);
      effectComposer.addPass(kaleidoscopePass);
    }

    // Pixelation effect for retro sequences
    if (activeEffects.includes('pixelation')) {
      const pixelationPass = new ShaderPass(customShaders.pixelation);
      effectComposer.addPass(pixelationPass);
    }

    // Vortex distortion for plasma sequence
    if (currentSequence === 'plasma' && activeEffects.includes('vortex')) {
      const vortexPass = new ShaderPass(customShaders.vortex);
      effectComposer.addPass(vortexPass);
    }

    // Film grain and noise
    if (activeEffects.includes('film_grain')) {
      const filmPass = new FilmPass(
        intensity * 0.3, // noise intensity
        0.4, // scanlines intensity
        648, // scanlines count
        false // grayscale
      );
      effectComposer.addPass(filmPass);
    }

    // Anti-aliasing (SMAA for better quality, FXAA for performance)
    if (!isOptimized) {
      const smaaPass = new SMAAPass(gl.domElement.width, gl.domElement.height);
      effectComposer.addPass(smaaPass);
    } else {
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.uniforms.resolution.value.set(1 / gl.domElement.width, 1 / gl.domElement.height);
      effectComposer.addPass(fxaaPass);
    }

    // Copy pass (final output)
    const copyPass = new ShaderPass(CopyShader);
    copyPass.renderToScreen = true;
    effectComposer.addPass(copyPass);

    return effectComposer;
  }, [gl, scene, camera, activeEffects, currentSequence, intensity, isOptimized, customShaders]);

  // Effect configurations for different sequences
  const sequenceEffects = useMemo(() => ({
    cosmic: {
      bloom: { strength: 1.2, threshold: 0.2 },
      kaleidoscope: { sides: 6, rotation: 0.1 },
      chromatic: { intensity: 0.003 }
    },
    fire: {
      bloom: { strength: 1.5, threshold: 0.1 },
      chromatic: { intensity: 0.002 },
      film: { intensity: 0.4 }
    },
    water: {
      bloom: { strength: 0.8, threshold: 0.3 },
      chromatic: { intensity: 0.001 },
      vortex: { strength: 0.5 }
    },
    crystal: {
      bloom: { strength: 1.0, threshold: 0.25 },
      kaleidoscope: { sides: 8, rotation: 0.05 },
      chromatic: { intensity: 0.0025 }
    },
    plasma: {
      bloom: { strength: 1.8, threshold: 0.15 },
      vortex: { strength: 1.2 },
      chromatic: { intensity: 0.004 },
      film: { intensity: 0.2 }
    }
  }), []);

  // Update post-processing effects
  useFrame((state) => {
    if (!composer || !isPlaying) return;

    const elapsedTime = state.clock.elapsedTime;
    const config = sequenceEffects[currentSequence as keyof typeof sequenceEffects];

    // Update custom shader uniforms
    composer.passes.forEach((pass) => {
      if (pass instanceof ShaderPass && pass.uniforms) {
        // Update time for all time-based effects
        if (pass.uniforms.uTime) {
          pass.uniforms.uTime.value = elapsedTime;
        }

        // Update effect-specific uniforms
        if (pass.uniforms.uIntensity && config?.chromatic) {
          pass.uniforms.uIntensity.value = config.chromatic.intensity * intensity;
        }

        if (pass.uniforms.uSides && config?.kaleidoscope) {
          pass.uniforms.uSides.value = config.kaleidoscope.sides;
          pass.uniforms.uAngle.value = elapsedTime * config.kaleidoscope.rotation;
        }

        if (pass.uniforms.uStrength && config?.vortex) {
          pass.uniforms.uStrength.value = config.vortex.strength * intensity;
        }

        if (pass.uniforms.uPixelSize) {
          const pixelSize = 2 + Math.sin(elapsedTime * 0.5) * 2;
          pass.uniforms.uPixelSize.value = pixelSize;
        }
      }

      // Update bloom pass
      if (pass instanceof UnrealBloomPass && config?.bloom) {
        pass.strength = config.bloom.strength * intensity;
        pass.threshold = config.bloom.threshold;
      }

      // Update film pass
      if (pass instanceof FilmPass && config?.film) {
        pass.uniforms.nIntensity.value = config.film.intensity * intensity;
      }
    });

    // Render the scene through the post-processing pipeline
    composer.render();
  });

  // Handle resize
  useFrame(() => {
    const width = gl.domElement.width;
    const height = gl.domElement.height;
    
    if (composer.getSize().width !== width || composer.getSize().height !== height) {
      composer.setSize(width, height);
    }
  });

  return null; // This component doesn't render anything directly
}
