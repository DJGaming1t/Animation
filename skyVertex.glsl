uniform float uTime;
uniform vec3 uSunPosition;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vSunAngle;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
  vPosition = position;
  vWorldPosition = worldPosition.xyz;
  
  // Calculate angle to sun
  vec3 toSun = normalize(uSunPosition - worldPosition.xyz);
  vec3 toVertex = normalize(worldPosition.xyz);
  vSunAngle = dot(toSun, toVertex);
}
