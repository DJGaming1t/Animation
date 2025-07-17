attribute vec3 velocity;
attribute float size;
attribute float temperature;
attribute float lifetime;
attribute float age;

uniform float uTime;
uniform float uIntensity;
uniform float uSize;
uniform float uHeatDistortion;

varying float vTemperature;
varying float vAge;
varying vec3 vPosition;

void main() {
  vec3 pos = position;
  
  // Age calculation
  float normalizedAge = age / lifetime;
  
  // Fire physics - upward movement with turbulence
  pos += velocity * age;
  
  // Heat-based turbulence
  float turbulence = sin(uTime * 3.0 + pos.x * 0.1) * cos(uTime * 2.0 + pos.z * 0.1);
  pos.x += turbulence * temperature * 2.0 * uHeatDistortion;
  pos.z += turbulence * temperature * 1.5 * uHeatDistortion;
  
  // Cooling expansion as fire rises
  float expansion = normalizedAge * temperature * 3.0;
  pos.x += sin(uTime + pos.y * 0.1) * expansion;
  pos.z += cos(uTime + pos.y * 0.1) * expansion;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size increases as fire cools and expands
  float pointSize = size * uSize * (1.0 + normalizedAge * 2.0);
  pointSize *= temperature; // Hotter = smaller, more intense
  pointSize *= (200.0 / -mvPosition.z);
  gl_PointSize = pointSize;
  
  vTemperature = temperature;
  vAge = normalizedAge;
  vPosition = pos;
}
