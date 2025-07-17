attribute vec3 velocity;
attribute float size;
attribute float depth;
attribute float lifetime;
attribute float age;
attribute vec3 flow;

uniform float uTime;
uniform float uIntensity;
uniform float uSize;
uniform float uWaveHeight;
uniform float uWaveFrequency;
uniform float uFlowSpeed;

varying float vDepth;
varying float vAge;
varying vec3 vPosition;
varying float vVelocity;

void main() {
  vec3 pos = position;
  
  // Age calculation
  float normalizedAge = age / lifetime;
  
  // Physics - gravity and flow
  vec3 gravity = vec3(0.0, -9.8, 0.0);
  pos += velocity * age + 0.5 * gravity * age * age;
  
  // Water flow
  pos += flow * uFlowSpeed * age;
  
  // Wave motion
  float waveX = sin(uTime * uWaveFrequency + pos.x * 0.1) * uWaveHeight * depth;
  float waveZ = cos(uTime * uWaveFrequency + pos.z * 0.1) * uWaveHeight * depth;
  pos.x += waveX * uIntensity;
  pos.z += waveZ * uIntensity;
  
  // Surface tension effects
  float surfaceTension = sin(uTime * 2.0 + pos.x * 0.2 + pos.z * 0.2) * 0.5;
  pos.y += surfaceTension * depth * uIntensity;
  
  // Turbulence based on velocity
  float turbulence = length(velocity) * 0.1;
  pos += sin(uTime * 3.0 + pos * 0.1) * turbulence * uIntensity;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size based on depth and age
  float pointSize = size * uSize * (1.0 + depth * 0.5);
  pointSize *= (1.0 - normalizedAge * 0.3); // Shrink as ages
  pointSize *= (300.0 / -mvPosition.z);
  gl_PointSize = pointSize;
  
  vDepth = depth;
  vAge = normalizedAge;
  vPosition = pos;
  vVelocity = length(velocity);
}
