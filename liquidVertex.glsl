uniform float uTime;
uniform float uFlowSpeed;
uniform float uViscosity;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vEyeVector;
varying float vFlow;

void main() {
  vec3 pos = position;
  
  // Add fluid flow motion
  float flow = sin(pos.x * 0.1 + uTime * uFlowSpeed) * 
              cos(pos.z * 0.1 + uTime * uFlowSpeed * 0.7);
  pos.y += flow * 0.2;
  
  // Surface ripples
  float ripple = sin(pos.x * 0.3 + uTime * 2.0) * 
                cos(pos.z * 0.3 + uTime * 1.5) * 0.1;
  pos.y += ripple;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  gl_Position = projectionMatrix * mvPosition;
  
  vPosition = pos;
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  vEyeVector = normalize(worldPosition.xyz - cameraPosition);
  vFlow = flow;
}
