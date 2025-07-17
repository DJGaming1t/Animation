attribute vec3 velocity;
attribute float size;
attribute float energy;
attribute float particleType;
attribute float lifetime;
attribute float age;
attribute float orbitalRadius;
attribute float orbitalSpeed;

uniform float uTime;
uniform float uIntensity;
uniform float uSize;
uniform float uGalaxyRotation;
uniform float uCosmicEnergy;

varying float vEnergy;
varying float vAge;
varying float vType;
varying vec3 vPosition;

void main() {
  vec3 pos = position;
  
  // Age calculation
  float normalizedAge = age / lifetime;
  
  // Orbital motion around galaxy center
  if (particleType < 3.0) { // Not cosmic rays
    float currentAngle = atan(pos.z, pos.x) + orbitalSpeed * uTime * uGalaxyRotation;
    pos.x = cos(currentAngle) * orbitalRadius;
    pos.z = sin(currentAngle) * orbitalRadius;
  }
  
  // Movement based on velocity
  pos += velocity * age * uIntensity;
  
  // Gravitational effects towards galaxy center
  if (particleType < 2.0) { // Dust and stars
    vec3 toCenter = -normalize(pos);
    float gravityStrength = 1.0 / max(length(pos), 1.0);
    pos += toCenter * gravityStrength * age * 0.1;
  }
  
  // Cosmic phenomena
  if (particleType == 2.0) { // Gas - turbulent motion
    vec3 turbulence = vec3(
      sin(uTime * 0.5 + pos.x * 0.01),
      sin(uTime * 0.7 + pos.y * 0.01),
      sin(uTime * 0.3 + pos.z * 0.01)
    );
    pos += turbulence * energy * 5.0 * uIntensity;
  }
  
  if (particleType == 3.0) { // Cosmic rays - high speed linear motion
    pos += velocity * uTime * 0.5;
  }
  
  // Stellar evolution for stars
  if (particleType == 1.0) {
    float evolutionPhase = normalizedAge;
    if (evolutionPhase > 0.8) {
      // Supernova expansion
      float expansion = (evolutionPhase - 0.8) * 5.0;
      pos += normalize(pos) * expansion * energy * 10.0;
    }
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size based on type and energy
  float pointSize = size * uSize;
  if (particleType == 1.0) { // Stars
    pointSize *= (1.0 + energy * 2.0);
    if (normalizedAge > 0.8) {
      pointSize *= (1.0 + (normalizedAge - 0.8) * 10.0); // Supernova
    }
  } else if (particleType == 3.0) { // Cosmic rays
    pointSize *= (1.0 + energy * 0.5);
  }
  pointSize *= (1000.0 / -mvPosition.z);
  gl_PointSize = pointSize;
  
  vEnergy = energy;
  vAge = normalizedAge;
  vType = particleType;
  vPosition = pos;
}
