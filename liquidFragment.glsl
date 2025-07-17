uniform float uTime;
uniform vec3 uLiquidColor;
uniform vec3 uSurfaceColor;
uniform float uRefractionRatio;
uniform float uFresnelBias;
uniform float uFresnelScale;
uniform float uFresnelPower;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vEyeVector;
varying float vFlow;

void main() {
  vec3 normal = normalize(vNormal);
  
  // Fresnel effect
  float fresnel = uFresnelBias + uFresnelScale * 
                 pow(1.0 + dot(vEyeVector, normal), uFresnelPower);
  
  // Base liquid color
  vec3 color = mix(uLiquidColor, uSurfaceColor, fresnel);
  
  // Flow-based color variation
  color += vFlow * 0.1;
  
  // Subsurface scattering approximation
  float scatter = pow(max(0.0, dot(normal, normalize(vec3(1.0, 1.0, 0.5)))), 2.0);
  color += scatter * 0.2;
  
  // Surface foam
  float foam = smoothstep(0.8, 1.0, abs(vFlow));
  color = mix(color, vec3(1.0), foam * 0.5);
  
  // Transparency based on fresnel
  float alpha = 0.7 + fresnel * 0.3;
  
  gl_FragColor = vec4(color, alpha);
}
