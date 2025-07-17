attribute vec3 velocity;
attribute float size;
attribute float charge;
attribute float energy;
attribute vec3 magneticField;
attribute float lifetime;
attribute float age;

uniform float uTime;
uniform float uIntensity;
uniform float uSize;
uniform float uElectricField;
uniform float uMagneticStrength;
uniform float uPlasmaFrequency;

varying float vCharge;
varying float vEnergy;
varying float vAge;
varying vec3 vPosition;
varying float vSpeed;

void main() {
  vec3 pos = position;
  
  // Age calculation
  float normalizedAge = age / lifetime;
  
  // Electromagnetic forces
  vec3 electricForce = vec3(
    sin(uTime * uPlasmaFrequency + pos.x * 0.1) * uElectricField,
    cos(uTime * uPlasmaFrequency + pos.y * 0.1) * uElectricField,
    sin(uTime * uPlasmaFrequency + pos.z * 0.1) * uElectricField
  );
  electricForce *= charge * energy;
  
  // Magnetic force (Lorentz force approximation)
  vec3 magneticForce = cross(velocity, magneticField) * uMagneticStrength * charge;
  
  // Apply forces
  pos += (electricForce + magneticForce) * age * uIntensity;
  
  // Cyclotron motion (charged particles in magnetic field)
  float cyclotronFreq = abs(charge) * uMagneticStrength;
  float cyclotronRadius = length(velocity) / cyclotronFreq;
  float cyclotronAngle = cyclotronFreq * uTime;
  
  vec3 cyclotronMotion = vec3(
    cos(cyclotronAngle) * cyclotronRadius,
    0.0,
    sin(cyclotronAngle) * cyclotronRadius
  );
  pos += cyclotronMotion * 0.1 * energy * uIntensity;
  
  // Plasma oscillations
  float plasmaOsc = sin(uTime * uPlasmaFrequency * 2.0 + pos.x + pos.y + pos.z);
  pos += normalize(pos) * plasmaOsc * 0.5 * energy * uIntensity;
  
  // Electric arcing between particles (simplified)
  float arcEffect = sin(uTime * 15.0 + length(pos) * 0.1) * 0.3;
  pos += vec3(arcEffect, arcEffect * 0.5, arcEffect) * charge * energy;
  
  // Confinement by magnetic field
  float distanceFromCenter = length(pos);
  if (distanceFromCenter > 30.0) {
    vec3 confinementForce = -normalize(pos) * (distanceFromCenter - 30.0) * 0.1;
    pos += confinementForce;
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size based on energy and charge
  float pointSize = size * uSize * (1.0 + energy * 2.0);
  pointSize *= (1.0 + abs(charge) * 0.5);
  pointSize *= (400.0 / -mvPosition.z);
  gl_PointSize = pointSize;
  
  vCharge = charge;
  vEnergy = energy;
  vAge = normalizedAge;
  vPosition = pos;
  vSpeed = length(velocity);
}
