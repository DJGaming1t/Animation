import * as THREE from "three";

/**
 * Mathematical utility functions for 3D animation calculations
 */
export class MathUtils {
  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Smooth step interpolation
   */
  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * Smoother step interpolation
   */
  static smootherstep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Map a value from one range to another
   */
  static map(value: number, start1: number, stop1: number, start2: number, stop2: number): number {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  /**
   * Convert degrees to radians
   */
  static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  static radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get distance between two 3D points
   */
  static distance3D(p1: THREE.Vector3, p2: THREE.Vector3): number {
    return p1.distanceTo(p2);
  }

  /**
   * Get distance between two 2D points
   */
  static distance2D(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Normalize an angle to 0-2π range
   */
  static normalizeAngle(angle: number): number {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  }

  /**
   * Get angle between two vectors
   */
  static angleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3): number {
    return v1.angleTo(v2);
  }

  /**
   * Spherical coordinates to Cartesian
   */
  static sphericalToCartesian(radius: number, theta: number, phi: number): THREE.Vector3 {
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  /**
   * Cartesian to spherical coordinates
   */
  static cartesianToSpherical(point: THREE.Vector3): { radius: number; theta: number; phi: number } {
    const radius = point.length();
    const theta = Math.atan2(point.z, point.x);
    const phi = Math.acos(point.y / radius);
    return { radius, theta, phi };
  }

  /**
   * Generate random point on sphere surface
   */
  static randomPointOnSphere(radius: number = 1): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return this.sphericalToCartesian(radius, theta, phi);
  }

  /**
   * Generate random point in sphere volume
   */
  static randomPointInSphere(radius: number = 1): THREE.Vector3 {
    const r = Math.cbrt(Math.random()) * radius;
    return this.randomPointOnSphere(r);
  }

  /**
   * Fibonacci sphere distribution
   */
  static fibonacciSphere(samples: number, radius: number = 1): THREE.Vector3[] {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2; // y from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }

    return points;
  }

  /**
   * Ease functions
   */
  static ease = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t: number) => t * t * t * t,
    easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    easeInQuint: (t: number) => t * t * t * t * t,
    easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
    easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
  };

  /**
   * Generate Perlin noise-like value (simplified)
   */
  static noise(x: number, y: number = 0, z: number = 0): number {
    // Simple noise function - in production, use a proper noise library
    return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453 % 1;
  }

  /**
   * Generate fractal noise
   */
  static fractalNoise(x: number, y: number = 0, z: number = 0, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  /**
   * Create rotation matrix from Euler angles
   */
  static createRotationMatrix(x: number, y: number, z: number): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(new THREE.Euler(x, y, z));
    return matrix;
  }

  /**
   * Get bezier curve point
   */
  static getBezierPoint(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const p = p0.clone().multiplyScalar(uuu);
    p.add(p1.clone().multiplyScalar(3 * uu * t));
    p.add(p2.clone().multiplyScalar(3 * u * tt));
    p.add(p3.clone().multiplyScalar(ttt));

    return p;
  }

  /**
   * Check if point is inside sphere
   */
  static pointInSphere(point: THREE.Vector3, center: THREE.Vector3, radius: number): boolean {
    return point.distanceTo(center) <= radius;
  }

  /**
   * Check if point is inside box
   */
  static pointInBox(point: THREE.Vector3, min: THREE.Vector3, max: THREE.Vector3): boolean {
    return point.x >= min.x && point.x <= max.x &&
           point.y >= min.y && point.y <= max.y &&
           point.z >= min.z && point.z <= max.z;
  }

  /**
   * Generate spiral points
   */
  static generateSpiral(turns: number, radius: number, height: number, points: number): THREE.Vector3[] {
    const spiral = [];
    const angleStep = (turns * Math.PI * 2) / points;
    const heightStep = height / points;

    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const y = i * heightStep - height / 2;
      const currentRadius = radius * (1 - i / points); // Spiral inward

      spiral.push(new THREE.Vector3(
        Math.cos(angle) * currentRadius,
        y,
        Math.sin(angle) * currentRadius
      ));
    }

    return spiral;
  }
}
