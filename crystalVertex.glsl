uniform float uTime;
uniform float uIntensity;
uniform float uEnergyLevel;
uniform float uPulseSpeed;
uniform float uFresnelBias;
uniform float uFresnelScale;
uniform float uFresnelPower;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vEyeVector;
varying float vFresnel;
varying float vEnergy;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(normalMatrix * normal);
  vEyeVector = normalize(worldPosition.xyz - cameraPosition);
  
  // Fresnel effect
  vFresnel = uFresnelBias + uFresnelScale * pow(1.0 + dot(vEyeVector, vWorldNormal), uFresnelPower);
  
  // Energy pulsing
  vEnergy = uEnergyLevel * (0.5 + 0.5 * sin(uTime * uPulseSpeed));
  
  // Crystal growth animation
  vec3 pos = position;
  float growth = 0.8 + 0.2 * sin(uTime * 0.5);
  pos.y *= growth;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
