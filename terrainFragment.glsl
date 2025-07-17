uniform float uTime;
uniform sampler2D uGrassTexture;
uniform sampler2D uSandTexture;
uniform sampler2D uAsphaltTexture;
uniform sampler2D uWoodTexture;
uniform float uTextureScale;
uniform float uSlopeThreshold;
uniform float uHeightThreshold;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHeight;
varying float vSlope;
varying float vFogDepth;

void main() {
  vec2 scaledUv = vUv * uTextureScale;
  
  // Sample textures
  vec4 grassColor = texture2D(uGrassTexture, scaledUv);
  vec4 sandColor = texture2D(uSandTexture, scaledUv);
  vec4 asphaltColor = texture2D(uAsphaltTexture, scaledUv);
  vec4 woodColor = texture2D(uWoodTexture, scaledUv);
  
  // Texture blending based on height and slope
  vec4 finalColor = grassColor;
  
  // Sand in low areas
  if (vHeight < 2.0) {
    float sandMix = smoothstep(2.0, 0.0, vHeight);
    finalColor = mix(finalColor, sandColor, sandMix);
  }
  
  // Asphalt on steep slopes
  if (vSlope > uSlopeThreshold) {
    float asphaltMix = smoothstep(uSlopeThreshold, 1.0, vSlope);
    finalColor = mix(finalColor, asphaltColor, asphaltMix * 0.7);
  }
  
  // Wood on high areas
  if (vHeight > uHeightThreshold) {
    float woodMix = smoothstep(uHeightThreshold, uHeightThreshold + 5.0, vHeight);
    finalColor = mix(finalColor, woodColor, woodMix * 0.8);
  }
  
  // Add some variation
  float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1) * 0.1 + 0.9;
  finalColor.rgb *= noise;
  
  // Lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float ambient = 0.3;
  float lighting = ambient + NdotL * 0.7;
  
  finalColor.rgb *= lighting;
  
  // Fog
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
  finalColor.rgb = mix(finalColor.rgb, uFogColor, fogFactor);
  
  gl_FragColor = finalColor;
}
