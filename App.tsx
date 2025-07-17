import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { useAnimation } from "./lib/stores/useAnimation";
import { useEffects } from "./lib/stores/useEffects";
import { usePerformance } from "./lib/stores/usePerformance";
import "@fontsource/inter";

// Import 3D components
import Scene from "./components/3d/Scene";
import PostProcessing from "./components/3d/PostProcessing";

// Import UI components
import AnimationControls from "./components/ui/AnimationControls";
import PerformanceMonitor from "./components/ui/PerformanceMonitor";
import EffectPanel from "./components/ui/EffectPanel";

// Define control keys for the animation system
const controls = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "up", keys: ["KeyQ"] },
  { name: "down", keys: ["KeyE"] },
  { name: "boost", keys: ["Shift"] },
  { name: "slow", keys: ["Control"] },
  { name: "reset", keys: ["KeyR"] },
  { name: "toggle_effects", keys: ["KeyT"] },
  { name: "cycle_animation", keys: ["Space"] },
  { name: "toggle_audio", keys: ["KeyM"] },
  { name: "increase_particles", keys: ["Equal"] },
  { name: "decrease_particles", keys: ["Minus"] },
  { name: "toggle_postprocessing", keys: ["KeyP"] },
];

// Loading component
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Loading 3D Animation System</h2>
        <p className="text-gray-400">Initializing particle systems and shaders...</p>
      </div>
    </div>
  );
}

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Animation system error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 bg-red-900 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Animation System Error</h2>
          <p className="text-gray-300 mb-4">Something went wrong with the 3D rendering.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Main App component
function App() {
  const { isPlaying } = useAnimation();
  const { activeEffects } = useEffects();
  const { isOptimized } = usePerformance();
  const [showCanvas, setShowCanvas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the application
  useEffect(() => {
    const initializeApp = async () => {
      // Simulate loading time for complex systems
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("3D Animation System initialized");
      console.log("Active effects:", activeEffects.length);
      console.log("Performance optimization:", isOptimized ? "enabled" : "disabled");
      
      setShowCanvas(true);
      setIsLoading(false);
    };

    initializeApp();
  }, [activeEffects.length, isOptimized]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'F11':
          event.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'relative', 
        overflow: 'hidden',
        background: '#000011'
      }}>
        {showCanvas && (
          <KeyboardControls map={controls}>
            {/* Main 3D Canvas */}
            <Canvas
              shadows
              camera={{
                position: [0, 15, 25],
                fov: 75,
                near: 0.1,
                far: 2000
              }}
              gl={{
                antialias: true,
                powerPreference: "high-performance",
                alpha: false,
                depth: true,
                stencil: false,
                preserveDrawingBuffer: false
              }}
              dpr={isOptimized ? [1, 1.5] : [1, 2]}
              performance={{ min: 0.5 }}
            >
              {/* Set background color */}
              <color attach="background" args={["#000011"]} />
              
              {/* Fog for depth perception */}
              <fog attach="fog" args={["#000011", 50, 200]} />

              <Suspense fallback={null}>
                {/* Main scene with all 3D components */}
                <Scene />
                
                {/* Post-processing effects */}
                <PostProcessing />
              </Suspense>
            </Canvas>

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-left: Animation controls */}
              <div className="absolute top-4 left-4 pointer-events-auto">
                <AnimationControls />
              </div>

              {/* Top-right: Performance monitor */}
              <div className="absolute top-4 right-4 pointer-events-auto">
                <PerformanceMonitor />
              </div>

              {/* Bottom-left: Effect panel */}
              <div className="absolute bottom-4 left-4 pointer-events-auto">
                <EffectPanel />
              </div>

              {/* Bottom-center: Instructions */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>WASD: Move | Q/E: Up/Down</div>
                    <div>Space: Cycle Animation | T: Toggle Effects</div>
                    <div>M: Audio | P: Post-processing | R: Reset</div>
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                  <div className="text-white text-xs writing-mode-vertical">
                    {isPlaying ? 'PLAYING' : 'PAUSED'}
                  </div>
                </div>
              </div>
            </div>
          </KeyboardControls>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
