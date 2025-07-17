uniform float uTime;

varying float vTemperature;
varying float vAge;
varying vec3 vPosition;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  
  // Create fire-like shape
  float fire = 1.0 - distanceToCenter * 2.0;
  fire = smoothstep(0.0, 1.0, fire);
  
  // Temperature-based color
  vec3 hotColor = vec3(1.0, 1.0, 0.8); // White-yellow
  vec3 mediumColor = vec3(1.0, 0.5, 0.1); // Orange
  vec3 coolColor = vec3(1.0, 0.1, 0.0); // Red
  vec3 smokeColor = vec3(0.3, 0.3, 0.3); // Gray
  
  vec3 color;
  if (vTemperature > 0.8) {
    color = mix(mediumColor, hotColor, (vTemperature - 0.8) * 5.0);
  } else if (vTemperature > 0.5) {
    color = mix(coolColor, mediumColor, (vTemperature - 0.5) * 3.33);
  } else {
    color = mix(smokeColor, coolColor, vTemperature * 2.0);
  }
  
  // Age affects transparency and color
  float alpha = fire * (1.0 - vAge) * vTemperature;
  
  // Add flickering
  float flicker = sin(uTime * 10.0 + vPosition.x + vPosition.z) * 0.1 + 0.9;
  alpha *= flicker;
  
  // Smoke transition
  if (vAge > 0.7) {
    color = mix(color, smokeColor, (vAge - 0.7) * 3.33);
    alpha *= 0.5;
  }
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha);
}
