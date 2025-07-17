import { useState } from "react";
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "./button";
import { Slider } from "./slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useAnimation } from "../../lib/stores/useAnimation";
import { useAudio } from "../../lib/stores/useAudio";

/**
 * Animation control panel for managing playback and sequence selection
 */
export default function AnimationControls() {
  const {
    isPlaying,
    currentSequence,
    speed,
    sequences,
    play,
    pause,
    restart,
    setSequence,
    setSpeed
  } = useAnimation();
  
  const { isMuted, toggleMute } = useAudio();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleSequenceChange = (sequence: string) => {
    setSequence(sequence);
  };

  const handleSpeedChange = (value: number[]) => {
    setSpeed(value[0]);
  };

  return (
    <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Animation Controls</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Controls */}
      <div className="flex items-center space-x-2 mb-4">
        <Button
          onClick={handlePlayPause}
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          onClick={restart}
          variant="outline"
          size="sm"
          className="border-white text-white hover:bg-white hover:text-black"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          onClick={toggleMute}
          variant="ghost"
          size="sm"
          className="text-white hover:text-gray-300"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Sequence Selection */}
      <div className="mb-4">
        <label className="text-white text-sm mb-2 block">Animation Sequence</label>
        <Select value={currentSequence || ""} onValueChange={handleSequenceChange}>
          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Select sequence" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {sequences.map((sequence) => (
              <SelectItem
                key={sequence.id}
                value={sequence.id}
                className="text-white hover:bg-gray-700 focus:bg-gray-700"
              >
                <div>
                  <div className="font-medium">{sequence.name}</div>
                  <div className="text-xs text-gray-400">{sequence.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          {/* Speed Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white text-sm">Speed</label>
              <span className="text-gray-300 text-sm">{speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speed]}
              onValueChange={handleSpeedChange}
              min={0.1}
              max={3.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Quick Actions */}
          <div>
            <label className="text-white text-sm mb-2 block">Quick Actions</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setSpeed(0.5)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Slow
              </Button>
              <Button
                onClick={() => setSpeed(1.0)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Normal
              </Button>
              <Button
                onClick={() => setSpeed(1.5)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Fast
              </Button>
              <Button
                onClick={() => setSpeed(2.0)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Very Fast
              </Button>
            </div>
          </div>

          {/* Animation Info */}
          {currentSequence && (
            <div className="bg-gray-800 bg-opacity-50 rounded p-3">
              <h4 className="text-white font-medium mb-1">
                {sequences.find(s => s.id === currentSequence)?.name}
              </h4>
              <p className="text-gray-300 text-xs">
                {sequences.find(s => s.id === currentSequence)?.description}
              </p>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Status: {isPlaying ? 'Playing' : 'Paused'}</span>
                <span>Speed: {speed}x</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-300">
            {isPlaying ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          3D Animation System
        </div>
      </div>
    </div>
  );
}
