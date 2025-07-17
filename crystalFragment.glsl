uniform float uTime;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform float uRefractionRatio;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vEyeVector;
varying float vFresnel;
varying float vEnergy;

void main() {
  // Base crystal color
  vec3 color = uBaseColor;
  
  // Refraction effect
  vec3 refracted = refract(vEyeVector, vWorldNormal, uRefractionRatio);
  float refractionFactor = dot(refracted, vWorldNormal);
  
  // Internal light scattering
  float scatter = abs(sin(vWorldPosition.x * 0.1 + uTime)) * 
                 abs(cos(vWorldPosition.z * 0.1 + uTime * 0.7));
  color += scatter * 0.3;
  
  // Energy glow
  color += vEnergy * uIntensity * 0.5;
  
  // Fresnel highlighting
  color += vFresnel * 0.4;
  
  // Internal structure lines
  float lines = sin(vWorldPosition.y * 2.0) * 0.1 + 0.9;
  color *= lines;
  
  // Transparency based on viewing angle
  float alpha = 0.7 + vFresnel * 0.3;
  alpha *= uIntensity;
  
  gl_FragColor = vec4(color, alpha);
}
