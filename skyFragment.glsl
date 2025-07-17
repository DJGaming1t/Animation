uniform float uTime;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;
uniform vec3 uSunColor;
uniform vec3 uSunPosition;
uniform float uAtmosphereThickness;
uniform float uScattering;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vSunAngle;

void main() {
  vec3 direction = normalize(vPosition);
  
  // Sky gradient based on height
  float heightFactor = direction.y * 0.5 + 0.5;
  vec3 skyGradient = mix(uHorizonColor, uSkyColor, heightFactor);
  
  // Atmospheric scattering
  float scattering = pow(1.0 - abs(direction.y), 2.0) * uScattering;
  skyGradient += scattering * uSunColor * 0.3;
  
  // Sun
  float sunDist = distance(direction, normalize(uSunPosition));
  float sunEffect = 1.0 - smoothstep(0.0, 0.1, sunDist);
  sunEffect = pow(sunEffect, 3.0);
  
  vec3 color = skyGradient + uSunColor * sunEffect;
  
  // Sun glow
  float sunGlow = 1.0 - smoothstep(0.0, 0.3, sunDist);
  color += uSunColor * sunGlow * 0.3;
  
  // Atmospheric perspective
  float atmosphere = pow(1.0 - abs(direction.y), 3.0) * uAtmosphereThickness;
  color += atmosphere * uSunColor * 0.2;
  
  // Time-based color shifts
  float timeShift = sin(uTime * 0.1) * 0.1;
  color += timeShift;
  
  gl_FragColor = vec4(color, 1.0);
}
