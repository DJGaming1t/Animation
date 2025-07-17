uniform float uTime;
uniform float uHeightScale;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHeight;
varying float vSlope;
varying float vFogDepth;

void main() {
  vec3 pos = position;
  
  // Apply height scaling
  pos.y *= uHeightScale;
  
  // Gentle terrain animation
  pos.y += sin(uTime * 0.1 + pos.x * 0.01 + pos.z * 0.01) * 0.2;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  vPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vHeight = pos.y;
  vSlope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
  vFogDepth = -mvPosition.z;
}
