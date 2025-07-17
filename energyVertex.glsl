uniform float uTime;
uniform float uIntensity;
uniform float uEnergyLevel;
uniform float uPulseSpeed;
uniform float uSize;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vEnergy;

void main() {
  vec3 pos = position;
  
  // Energy pulsing
  float pulse = 0.9 + 0.1 * sin(uTime * uPulseSpeed);
  pos *= pulse * uSize;
  
  // Surface distortion
  float distortion = sin(pos.x * 5.0 + uTime * 2.0) * 
                    cos(pos.y * 5.0 + uTime * 1.5) * 
                    sin(pos.z * 5.0 + uTime * 1.8);
  pos += normal * distortion * 0.1 * uEnergyLevel;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  
  vPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  vEnergy = uEnergyLevel * pulse;
}
