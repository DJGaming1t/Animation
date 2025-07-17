uniform float uTime;
uniform float uPlasmaFrequency;

varying float vCharge;
varying float vEnergy;
varying float vAge;
varying vec3 vPosition;
varying float vSpeed;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  
  // Create electric plasma shape
  float plasma = 1.0 - distanceToCenter * 2.0;
  plasma = smoothstep(0.0, 1.0, plasma);
  
  // Add electric arc pattern
  float angle = atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5);
  float radius = distance(gl_PointCoord, vec2(0.5));
  
  // Lightning-like branching pattern
  float lightning = sin(angle * 6.0 + uTime * 5.0) * 0.1 + 0.9;
  lightning *= sin(radius * 20.0 + uTime * 10.0) * 0.2 + 0.8;
  plasma *= lightning;
  
  // Color based on charge and energy
  vec3 color;
  if (vCharge > 0.0) {
    // Positive charge - blue-white
    color = vec3(0.6, 0.8, 1.0);
  } else {
    // Negative charge - red-purple
    color = vec3(1.0, 0.4, 0.8);
  }
  
  // Energy affects brightness and color temperature
  color *= (0.5 + vEnergy * 1.5);
  
  // Add electric glow
  float glow = 1.0 - smoothstep(0.0, 0.8, distanceToCenter);
  color += glow * vEnergy * 0.5;
  
  // Plasma frequency modulation
  float freq = sin(uTime * uPlasmaFrequency + vPosition.x + vPosition.y + vPosition.z);
  color *= (0.8 + freq * 0.4);
  
  // Speed-based trail effect
  if (vSpeed > 3.0) {
    float trail = (vSpeed - 3.0) / 7.0;
    color += vec3(1.0, 1.0, 0.8) * trail * 0.3;
  }
  
  // Age affects transparency
  float alpha = plasma * vEnergy * (1.0 - vAge * 0.6);
  
  // Electric discharge flicker
  float flicker = sin(uTime * 20.0 + vPosition.x * 0.1) * 0.1 + 0.9;
  alpha *= flicker;
  
  // Add core intensity
  float core = 1.0 - smoothstep(0.0, 0.3, distanceToCenter);
  alpha += core * vEnergy * 0.5;
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha);
}
