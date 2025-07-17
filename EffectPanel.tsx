import { useState } from "react";
import { Sparkles, Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "./button";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { useEffects } from "../../lib/stores/useEffects";

/**
 * Effect control panel for managing visual effects and their intensity
 */
export default function EffectPanel() {
  const {
    activeEffects,
    availableEffects,
    intensity,
    toggleEffect,
    setIntensity,
    enableAllEffects,
    disableAllEffects
  } = useEffects();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleIntensityChange = (value: number[]) => {
    setIntensity(value[0]);
  };

  const effectCategories = {
    particles: [
      'fire',
      'water',
      'snow',
      'cosmic',
      'plasma'
    ],
    geometry: [
      'floating_islands',
      'crystals',
      'energy_orbs',
      'waves',
      'fractal_trees',
      'geometric_shapes',
      'liquid'
    ],
    postprocessing: [
      'bloom',
      'chromatic_aberration',
      'film_grain',
      'kaleidoscope',
      'pixelation',
      'vortex'
    ],
    environment: [
      'procedural_terrain',
      'audio_reactive'
    ]
  };

  const isEffectActive = (effectId: string) => {
    return activeEffects.includes(effectId);
  };

  const getEffectInfo = (effectId: string) => {
    return availableEffects.find(effect => effect.id === effectId);
  };

  return (
    <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-4 min-w-[320px] max-h-[600px] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-white" />
          <h3 className="text-white font-semibold">Effects</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Global Controls */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-white text-sm">Global Intensity</label>
          <span className="text-gray-300 text-sm">{Math.round(intensity * 100)}%</span>
        </div>
        <Slider
          value={[intensity]}
          onValueChange={handleIntensityChange}
          min={0}
          max={2}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="flex space-x-2 mb-4">
        <Button
          onClick={enableAllEffects}
          variant="outline"
          size="sm"
          className="flex-1 border-gray-600 text-white hover:bg-gray-700"
        >
          <Eye className="w-3 h-3 mr-1" />
          All On
        </Button>
        <Button
          onClick={disableAllEffects}
          variant="outline"
          size="sm"
          className="flex-1 border-gray-600 text-white hover:bg-gray-700"
        >
          <EyeOff className="w-3 h-3 mr-1" />
          All Off
        </Button>
      </div>

      {/* Effect Categories */}
      <div className="space-y-4">
        {Object.entries(effectCategories).map(([category, effects]) => (
          <div key={category}>
            <h4 className="text-white font-medium mb-2 capitalize border-b border-gray-600 pb-1">
              {category.replace('_', ' ')}
            </h4>
            <div className="space-y-2">
              {effects.map(effectId => {
                const effectInfo = getEffectInfo(effectId);
                const isActive = isEffectActive(effectId);
                
                if (!effectInfo) return null;

                return (
                  <div key={effectId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleEffect(effectId)}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <span className={`text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                          {effectInfo.name}
                        </span>
                      </div>
                      {isExpanded && (
                        <p className="text-xs text-gray-500 ml-6 mt-1">
                          {effectInfo.description}
                        </p>
                      )}
                    </div>
                    
                    {isActive && (
                      <div className={`w-2 h-2 rounded-full ${effectInfo.performanceImpact === 'high' ? 'bg-red-400' : 
                        effectInfo.performanceImpact === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} 
                        title={`${effectInfo.performanceImpact} performance impact`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-600 pt-4 mt-4">
          {/* Preset Configurations */}
          <div>
            <h4 className="text-white font-medium mb-2">Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  disableAllEffects();
                  ['fire', 'bloom', 'chromatic_aberration'].forEach(toggleEffect);
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Fire Scene
              </Button>
              <Button
                onClick={() => {
                  disableAllEffects();
                  ['cosmic', 'crystals', 'energy_orbs', 'kaleidoscope'].forEach(toggleEffect);
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Cosmic
              </Button>
              <Button
                onClick={() => {
                  disableAllEffects();
                  ['water', 'waves', 'floating_islands'].forEach(toggleEffect);
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Water World
              </Button>
              <Button
                onClick={() => {
                  disableAllEffects();
                  ['plasma', 'energy_orbs', 'vortex', 'bloom'].forEach(toggleEffect);
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Plasma Field
              </Button>
            </div>
          </div>

          {/* Performance Impact Legend */}
          <div className="bg-gray-800 bg-opacity-50 rounded p-3">
            <h4 className="text-white font-medium mb-2">Performance Impact</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-300">Low - Minimal impact on performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-300">Medium - Moderate impact on performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-gray-300">High - Significant impact on performance</span>
              </div>
            </div>
          </div>

          {/* Active Effects Summary */}
          <div className="bg-gray-800 bg-opacity-50 rounded p-3">
            <h4 className="text-white font-medium mb-2">Active Effects Summary</h4>
            <div className="text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Total Active:</span>
                <span className="text-blue-400">{activeEffects.length}</span>
              </div>
              <div className="flex justify-between">
                <span>High Impact:</span>
                <span className="text-red-400">
                  {activeEffects.filter(id => {
                    const effect = getEffectInfo(id);
                    return effect?.performanceImpact === 'high';
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Global Intensity:</span>
                <span className="text-white">{Math.round(intensity * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            activeEffects.length > 0 ? 'bg-blue-500' : 'bg-gray-500'
          }`} />
          <span className="text-xs text-gray-300">
            {activeEffects.length} effects active
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Intensity: {Math.round(intensity * 100)}%
        </div>
      </div>
    </div>
  );
}
