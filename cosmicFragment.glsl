uniform float uTime;
uniform float uCosmicEnergy;

varying float vEnergy;
varying float vAge;
varying float vType;
varying vec3 vPosition;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  
  vec3 color;
  float alpha;
  
  if (vType < 0.5) { // Dust
    color = vec3(0.4, 0.3, 0.2); // Brown dust
    float dust = 1.0 - distanceToCenter * 2.0;
    alpha = smoothstep(0.0, 1.0, dust) * (1.0 - vAge * 0.5) * 0.3;
  }
  else if (vType < 1.5) { // Stars
    // Star color based on energy (temperature)
    if (vEnergy > 0.8) {
      color = vec3(0.9, 0.9, 1.0); // Blue-white hot stars
    } else if (vEnergy > 0.6) {
      color = vec3(1.0, 1.0, 0.8); // White stars
    } else if (vEnergy > 0.4) {
      color = vec3(1.0, 0.9, 0.6); // Yellow stars
    } else {
      color = vec3(1.0, 0.6, 0.4); // Red stars
    }
    
    // Create star shape with rays
    float star = 1.0 - distanceToCenter * 2.0;
    star = smoothstep(0.0, 1.0, star);
    
    // Add stellar flare
    float flare = 1.0 - smoothstep(0.0, 0.8, distanceToCenter);
    star += flare * 0.3;
    
    alpha = star * vEnergy;
    
    // Supernova effect
    if (vAge > 0.8) {
      float explosion = (vAge - 0.8) * 5.0;
      color = mix(color, vec3(1.0, 0.8, 0.6), explosion);
      alpha *= (1.0 + explosion * 3.0);
    }
    
    // Twinkling effect
    float twinkle = sin(uTime * 5.0 + vPosition.x + vPosition.y + vPosition.z) * 0.2 + 0.8;
    alpha *= twinkle;
  }
  else if (vType < 2.5) { // Gas
    // Nebula colors
    vec3 nebulaColor1 = vec3(0.8, 0.2, 0.6); // Magenta
    vec3 nebulaColor2 = vec3(0.2, 0.6, 0.8); // Cyan
    vec3 nebulaColor3 = vec3(0.6, 0.8, 0.2); // Green
    
    float colorPhase = sin(uTime * 0.3 + vPosition.x * 0.01) * 0.5 + 0.5;
    if (colorPhase < 0.33) {
      color = nebulaColor1;
    } else if (colorPhase < 0.66) {
      color = nebulaColor2;
    } else {
      color = nebulaColor3;
    }
    
    float gas = 1.0 - smoothstep(0.0, 1.0, distanceToCenter);
    alpha = gas * vEnergy * 0.6;
    
    // Add turbulent structure
    float turbulence = sin(uTime + vPosition.x * 0.1) * cos(uTime + vPosition.z * 0.1);
    alpha *= (0.7 + turbulence * 0.3);
  }
  else { // Cosmic rays
    color = vec3(0.9, 0.7, 1.0); // Purple-white
    
    // Create streak effect
    float streak = 1.0 - abs(gl_PointCoord.y - 0.5) * 4.0;
    streak = smoothstep(0.0, 1.0, streak);
    
    alpha = streak * vEnergy * 0.8;
    
    // High energy glow
    float glow = 1.0 - smoothstep(0.0, 0.7, distanceToCenter);
    alpha += glow * vEnergy * 0.5;
  }
  
  // Apply cosmic energy modifier
  alpha *= uCosmicEnergy;
  
  // Distance fade
  float distance = length(vPosition);
  alpha *= smoothstep(300.0, 100.0, distance);
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha);
}
