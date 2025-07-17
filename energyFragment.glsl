uniform float uTime;
uniform float uIntensity;
uniform float uCharge;
uniform vec3 uColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vEnergy;

void main() {
  // Base energy color
  vec3 color = uColor;
  
  // Charge-based color modification
  if (uCharge > 0.0) {
    color = mix(color, vec3(1.0, 0.8, 0.2), 0.3); // Warm for positive
  } else {
    color = mix(color, vec3(0.2, 0.8, 1.0), 0.3); // Cool for negative
  }
  
  // Energy surface patterns
  float pattern = sin(vPosition.x * 10.0 + uTime * 3.0) *
                 cos(vPosition.y * 10.0 + uTime * 2.5) *
                 sin(vPosition.z * 10.0 + uTime * 2.0);
  color += pattern * 0.2 * vEnergy;
  
  // Fresnel effect for energy glow
  vec3 eyeVector = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(eyeVector, vNormal));
  color += fresnel * 0.5 * vEnergy;
  
  // Intensity modulation
  color *= uIntensity * vEnergy;
  
  // Core brightness
  float core = pow(fresnel, 2.0);
  color += core * 0.8;
  
  gl_FragColor = vec4(color, 0.8 + fresnel * 0.2);
}
