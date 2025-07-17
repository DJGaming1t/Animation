import { useState, useEffect } from "react";
import { Monitor, Cpu, Zap, Eye } from "lucide-react";
import { Button } from "./button";
import { usePerformance } from "../../lib/stores/usePerformance";
import { useFrame } from "@react-three/fiber";

/**
 * Performance monitoring panel showing FPS, memory usage, and optimization settings
 */
export default function PerformanceMonitor() {
  const {
    fps,
    memoryUsage,
    particleCount,
    lodLevel,
    isOptimized,
    toggleOptimization,
    setLodLevel,
    setParticleCount
  } = usePerformance();

  const [isExpanded, setIsExpanded] = useState(false);
  const [frameTime, setFrameTime] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  // Performance metrics calculation
  useFrame((state, delta) => {
    setFrameTime(delta * 1000); // Convert to milliseconds
    setRenderTime(state.gl.info.render.frame);
  });

  // Memory monitoring
  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        // Memory info is already handled in the store
      }
    };

    const interval = setInterval(updateMemoryInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return "text-red-400";
    if (value >= thresholds[0]) return "text-yellow-400";
    return "text-green-400";
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-white" />
          <h3 className="text-white font-semibold">Performance</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 bg-opacity-50 rounded p-2">
          <div className="text-xs text-gray-400">FPS</div>
          <div className={`text-lg font-bold ${getPerformanceColor(fps, [30, 60])}`}>
            {fps.toFixed(0)}
          </div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 rounded p-2">
          <div className="text-xs text-gray-400">Frame Time</div>
          <div className={`text-lg font-bold ${getPerformanceColor(frameTime, [16.67, 33.33])}`}>
            {frameTime.toFixed(1)}ms
          </div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 rounded p-2">
          <div className="text-xs text-gray-400">Particles</div>
          <div className="text-lg font-bold text-blue-400">
            {particleCount.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 rounded p-2">
          <div className="text-xs text-gray-400">LOD Level</div>
          <div className="text-lg font-bold text-purple-400">
            {lodLevel}
          </div>
        </div>
      </div>

      {/* Optimization Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white text-sm">Auto Optimization</span>
        <Button
          onClick={toggleOptimization}
          variant={isOptimized ? "default" : "outline"}
          size="sm"
          className={isOptimized ? "bg-green-600 hover:bg-green-700" : "border-white text-white hover:bg-white hover:text-black"}
        >
          {isOptimized ? "ON" : "OFF"}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          {/* Memory Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm">Memory Usage</span>
              <span className="text-gray-300 text-sm">
                {formatBytes(memoryUsage.used)} / {formatBytes(memoryUsage.total)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  memoryUsage.percentage > 80 ? 'bg-red-500' :
                  memoryUsage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(memoryUsage.percentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {memoryUsage.percentage.toFixed(1)}% used
            </div>
          </div>

          {/* Performance Settings */}
          <div>
            <label className="text-white text-sm mb-2 block">Particle Count</label>
            <div className="flex space-x-2">
              {[1000, 5000, 10000, 20000].map((count) => (
                <Button
                  key={count}
                  onClick={() => setParticleCount(count)}
                  variant={particleCount === count ? "default" : "outline"}
                  size="sm"
                  className={
                    particleCount === count
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-gray-600 text-white hover:bg-gray-700"
                  }
                >
                  {count >= 1000 ? `${count / 1000}K` : count}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Level of Detail</label>
            <div className="flex space-x-2">
              {[0, 1, 2, 3].map((level) => (
                <Button
                  key={level}
                  onClick={() => setLodLevel(level)}
                  variant={lodLevel === level ? "default" : "outline"}
                  size="sm"
                  className={
                    lodLevel === level
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "border-gray-600 text-white hover:bg-gray-700"
                  }
                >
                  {level === 0 ? "High" : level === 1 ? "Med" : level === 2 ? "Low" : "Min"}
                </Button>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gray-800 bg-opacity-50 rounded p-3">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <Cpu className="w-4 h-4 mr-2" />
              System Info
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Renderer:</span>
                <span className="text-white">WebGL 2.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Device Pixel Ratio:</span>
                <span className="text-white">{window.devicePixelRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Viewport:</span>
                <span className="text-white">{window.innerWidth}x{window.innerHeight}</span>
              </div>
            </div>
          </div>

          {/* Performance Warnings */}
          {fps < 30 && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded p-2">
              <div className="flex items-center text-red-400 text-sm">
                <Zap className="w-4 h-4 mr-2" />
                Low FPS detected - consider enabling optimization
              </div>
            </div>
          )}

          {memoryUsage.percentage > 80 && (
            <div className="bg-yellow-900 bg-opacity-50 border border-yellow-500 rounded p-2">
              <div className="flex items-center text-yellow-400 text-sm">
                <Monitor className="w-4 h-4 mr-2" />
                High memory usage - reducing particle count recommended
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${fps > 30 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-300">
            {fps > 30 ? 'Optimal' : 'Degraded'}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Auto-opt: {isOptimized ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  );
}
