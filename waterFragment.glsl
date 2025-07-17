uniform float uTime;

varying float vDepth;
varying float vAge;
varying vec3 vPosition;
varying float vVelocity;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  
  // Create water droplet shape
  float water = 1.0 - distanceToCenter * 2.0;
  water = smoothstep(0.0, 1.0, water);
  
  // Add highlight for surface tension
  float highlight = 1.0 - smoothstep(0.3, 0.5, distanceToCenter);
  
  // Water color based on depth and velocity
  vec3 deepWater = vec3(0.0, 0.2, 0.6); // Deep blue
  vec3 shallowWater = vec3(0.4, 0.8, 1.0); // Light blue
  vec3 foam = vec3(0.9, 0.95, 1.0); // White foam
  
  vec3 color = mix(deepWater, shallowWater, 1.0 - vDepth);
  
  // Add foam for high velocity
  if (vVelocity > 5.0) {
    float foamAmount = (vVelocity - 5.0) / 10.0;
    color = mix(color, foam, foamAmount);
  }
  
  // Refraction effect
  vec2 refraction = sin(uTime * 2.0 + vPosition.xz * 0.1) * 0.1;
  color.rgb += refraction.x * 0.1;
  
  // Transparency based on age and depth
  float alpha = water * (1.0 - vAge * 0.5) * (0.7 + vDepth * 0.3);
  
  // Add caustics effect
  float caustics = sin(uTime * 3.0 + vPosition.x * 0.2) * cos(uTime * 2.0 + vPosition.z * 0.2);
  caustics = smoothstep(-0.5, 0.5, caustics) * 0.3;
  color += caustics;
  
  // Highlight
  alpha += highlight * 0.3;
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha);
}
