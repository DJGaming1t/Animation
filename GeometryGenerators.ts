import * as THREE from "three";

/**
 * Procedural geometry generation utilities for complex 3D shapes
 * Creates mathematical and organic geometries for the animation system
 */
export class GeometryGenerators {
  
  /**
   * Create a morphing cube with animated vertices
   */
  static createMorphingCube(size: number = 1, detail: number = 2): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(size, size, size, detail, detail, detail);
    
    // Add custom attributes for morphing
    const positions = geometry.attributes.position;
    const morphTargets = new Float32Array(positions.count * 3);
    
    for (let i = 0; i < positions.count; i++) {
      const i3 = i * 3;
      morphTargets[i3] = positions.array[i3] * (1 + Math.random() * 0.3);
      morphTargets[i3 + 1] = positions.array[i3 + 1] * (1 + Math.random() * 0.3);
      morphTargets[i3 + 2] = positions.array[i3 + 2] * (1 + Math.random() * 0.3);
    }
    
    geometry.setAttribute('morphTarget', new THREE.BufferAttribute(morphTargets, 3));
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a spiral sphere with helical vertex distribution
   */
  static createSpiralSphere(radius: number = 1, detail: number = 3): THREE.BufferGeometry {
    const segments = Math.max(8, 16 << detail);
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Apply spiral distortion
      const phi = Math.atan2(vertex.z, vertex.x);
      const theta = Math.acos(vertex.y / radius);
      const spiralOffset = Math.sin(theta * 8 + phi * 4) * 0.1;
      
      vertex.multiplyScalar(1 + spiralOffset);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Create a twisted torus with helical deformation
   */
  static createTwistedTorus(radius: number = 1, tube: number = 0.4, detail: number = 2): THREE.BufferGeometry {
    const radialSegments = Math.max(8, 16 << detail);
    const tubularSegments = Math.max(16, 32 << detail);
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Calculate twist based on angle around torus
      const angle = Math.atan2(vertex.z, vertex.x);
      const twist = angle * 2; // Two full twists
      
      // Apply rotation around Y axis
      const cos = Math.cos(twist);
      const sin = Math.sin(twist);
      const newX = vertex.x * cos - vertex.z * sin;
      const newZ = vertex.x * sin + vertex.z * cos;
      
      positions.setXYZ(i, newX, vertex.y, newZ);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Create a fractal tetrahedron with recursive subdivision
   */
  static createFractalTetrahedron(size: number = 1, iterations: number = 3): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Initial tetrahedron vertices
    const height = Math.sqrt(2/3) * size;
    const initialVertices = [
      [0, height, 0],
      [-size/2, -height/3, size/2],
      [size/2, -height/3, size/2],
      [0, -height/3, -size]
    ];
    
    // Recursive subdivision function
    const subdivide = (v1: number[], v2: number[], v3: number[], depth: number) => {
      if (depth === 0) {
        const baseIndex = vertices.length / 3;
        vertices.push(...v1, ...v2, ...v3);
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        return;
      }
      
      // Calculate midpoints
      const m1 = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
      const m2 = [(v2[0] + v3[0]) / 2, (v2[1] + v3[1]) / 2, (v2[2] + v3[2]) / 2];
      const m3 = [(v3[0] + v1[0]) / 2, (v3[1] + v1[1]) / 2, (v3[2] + v1[2]) / 2];
      
      // Recursively subdivide
      subdivide(v1, m1, m3, depth - 1);
      subdivide(m1, v2, m2, depth - 1);
      subdivide(m3, m2, v3, depth - 1);
      subdivide(m1, m2, m3, depth - 1);
    };
    
    // Generate all faces
    subdivide(initialVertices[0], initialVertices[1], initialVertices[2], iterations);
    subdivide(initialVertices[0], initialVertices[2], initialVertices[3], iterations);
    subdivide(initialVertices[0], initialVertices[3], initialVertices[1], iterations);
    subdivide(initialVertices[1], initialVertices[3], initialVertices[2], iterations);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a helix cylinder with spiral geometry
   */
  static createHelixCylinder(radius: number = 0.5, height: number = 2, detail: number = 2): THREE.BufferGeometry {
    const radialSegments = Math.max(8, 16 << detail);
    const heightSegments = Math.max(16, 32 << detail);
    const turns = 3;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    for (let i = 0; i <= heightSegments; i++) {
      const y = (i / heightSegments) * height - height / 2;
      const angle = (i / heightSegments) * turns * Math.PI * 2;
      
      for (let j = 0; j <= radialSegments; j++) {
        const phi = (j / radialSegments) * Math.PI * 2;
        
        // Helix center point
        const centerX = Math.cos(angle) * radius * 0.3;
        const centerZ = Math.sin(angle) * radius * 0.3;
        
        // Point on circle around helix center
        const x = centerX + Math.cos(phi) * radius;
        const z = centerZ + Math.sin(phi) * radius;
        
        vertices.push(x, y, z);
        uvs.push(j / radialSegments, i / heightSegments);
        
        if (i < heightSegments && j < radialSegments) {
          const a = i * (radialSegments + 1) + j;
          const b = a + radialSegments + 1;
          
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a Möbius strip
   */
  static createMobiusStrip(radius: number = 1, detail: number = 2): THREE.BufferGeometry {
    const segments = Math.max(32, 64 << detail);
    const width = 0.3;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI * 2;
      
      for (let j = -1; j <= 1; j += 2) {
        const v = j * width;
        
        // Möbius strip parametric equations
        const x = (radius + v * Math.cos(u / 2)) * Math.cos(u);
        const y = v * Math.sin(u / 2);
        const z = (radius + v * Math.cos(u / 2)) * Math.sin(u);
        
        vertices.push(x, y, z);
        uvs.push(i / segments, (j + 1) / 2);
        
        if (i < segments) {
          const a = i * 2 + (j === -1 ? 0 : 1);
          const b = (i + 1) * 2 + (j === -1 ? 0 : 1);
          const c = a + 1;
          const d = b + 1;
          
          if (j === -1) {
            indices.push(a, b, c);
            indices.push(c, b, d);
          }
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a Klein bottle (4D object projected to 3D)
   */
  static createKleinBottle(radius: number = 1, detail: number = 32): THREE.BufferGeometry {
    const segments = detail;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI * 2;
      
      for (let j = 0; j <= segments; j++) {
        const v = (j / segments) * Math.PI * 2;
        
        // Klein bottle parametric equations (figure-8 immersion)
        let x, y, z;
        
        if (u < Math.PI) {
          x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
          z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
        } else {
          x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
          z = -8 * Math.sin(u);
        }
        
        y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);
        
        vertices.push(x * radius * 0.1, y * radius * 0.1, z * radius * 0.1);
        uvs.push(i / segments, j / segments);
        
        if (i < segments && j < segments) {
          const a = i * (segments + 1) + j;
          const b = a + segments + 1;
          
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a hypercube projection (tesseract) to 3D
   */
  static createHypercubeProjection(size: number = 1): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // 4D hypercube vertices (16 vertices)
    const hypercubeVertices = [];
    for (let w = 0; w < 2; w++) {
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 2; z++) {
            hypercubeVertices.push([
              (x - 0.5) * size,
              (y - 0.5) * size,
              (z - 0.5) * size,
              (w - 0.5) * size
            ]);
          }
        }
      }
    }
    
    // Project 4D to 3D using stereographic projection
    const projectedVertices = hypercubeVertices.map(vertex => {
      const [x, y, z, w] = vertex;
      const scale = 2 / (2 - w); // Stereographic projection
      return [x * scale, y * scale, z * scale];
    });
    
    // Add vertices
    projectedVertices.forEach(vertex => {
      vertices.push(...vertex);
    });
    
    // Create edges (hypercube has specific connectivity)
    const edges = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        // Check if vertices differ by exactly one bit (connected in hypercube)
        const diff = i ^ j;
        if (diff && (diff & (diff - 1)) === 0) {
          edges.push([i, j]);
        }
      }
    }
    
    // Convert edges to line indices
    edges.forEach(edge => {
      indices.push(edge[0], edge[1]);
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    
    return geometry;
  }

  /**
   * Create a Fibonacci sphere (uniform point distribution)
   */
  static createFibonacciSphere(radius: number = 1, points: number = 500): THREE.BufferGeometry {
    const vertices: number[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    
    for (let i = 0; i < points; i++) {
      const y = 1 - (i / (points - 1)) * 2; // y from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      vertices.push(x * radius, y * radius, z * radius);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    return geometry;
  }

  /**
   * Create a fractal pyramid with recursive detail
   */
  static createFractalPyramid(size: number = 1, iterations: number = 3): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Base pyramid vertices
    const baseVertices = [
      [0, size, 0],           // Top
      [-size/2, 0, size/2],   // Base corner 1
      [size/2, 0, size/2],    // Base corner 2
      [size/2, 0, -size/2],   // Base corner 3
      [-size/2, 0, -size/2]   // Base corner 4
    ];
    
    const subdivide = (pyramid: number[][], depth: number) => {
      if (depth === 0) {
        // Add pyramid to geometry
        const baseIndex = vertices.length / 3;
        pyramid.forEach(vertex => vertices.push(...vertex));
        
        // Add faces
        const [top, b1, b2, b3, b4] = [0, 1, 2, 3, 4].map(i => baseIndex + i);
        
        // Side faces
        indices.push(top, b1, b2);
        indices.push(top, b2, b3);
        indices.push(top, b3, b4);
        indices.push(top, b4, b1);
        
        // Base
        indices.push(b1, b4, b3);
        indices.push(b1, b3, b2);
        
        return;
      }
      
      // Create smaller pyramids on each face
      const scale = 0.4;
      const [top, b1, b2, b3, b4] = pyramid;
      
      // Side face pyramids
      const faces = [
        [b1, b2], [b2, b3], [b3, b4], [b4, b1]
      ];
      
      faces.forEach(([v1, v2]) => {
        const center = [
          (top[0] + v1[0] + v2[0]) / 3,
          (top[1] + v1[1] + v2[1]) / 3,
          (top[2] + v1[2] + v2[2]) / 3
        ];
        
        const newTop = [
          center[0] + (top[0] - center[0]) * scale,
          center[1] + (top[1] - center[1]) * scale,
          center[2] + (top[2] - center[2]) * scale
        ];
        
        const newV1 = [
          center[0] + (v1[0] - center[0]) * scale,
          center[1] + (v1[1] - center[1]) * scale,
          center[2] + (v1[2] - center[2]) * scale
        ];
        
        const newV2 = [
          center[0] + (v2[0] - center[0]) * scale,
          center[1] + (v2[1] - center[1]) * scale,
          center[2] + (v2[2] - center[2]) * scale
        ];
        
        subdivide([newTop, newV1, newV2, newV2, newV1], depth - 1);
      });
    };
    
    subdivide(baseVertices, iterations);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a procedural crystal formation
   */
  static createCrystalFormation(baseRadius: number = 1, height: number = 2, faces: number = 6): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    // Create crystal base (polygon)
    const baseVertices = [];
    for (let i = 0; i < faces; i++) {
      const angle = (i / faces) * Math.PI * 2;
      const radius = baseRadius * (0.8 + Math.random() * 0.4); // Irregular base
      baseVertices.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ]);
    }
    
    // Crystal tip (with some randomness)
    const tip = [
      (Math.random() - 0.5) * baseRadius * 0.3,
      height * (0.8 + Math.random() * 0.4),
      (Math.random() - 0.5) * baseRadius * 0.3
    ];
    
    // Add base center
    vertices.push(0, 0, 0);
    uvs.push(0.5, 0.5);
    
    // Add base vertices
    baseVertices.forEach(vertex => {
      vertices.push(...vertex);
      uvs.push((vertex[0] / baseRadius + 1) / 2, (vertex[2] / baseRadius + 1) / 2);
    });
    
    // Add tip
    vertices.push(...tip);
    uvs.push(0.5, 1);
    
    // Create faces
    const centerIndex = 0;
    const tipIndex = baseVertices.length + 1;
    
    // Base faces
    for (let i = 0; i < faces; i++) {
      const next = (i + 1) % faces;
      indices.push(centerIndex, i + 1, next + 1);
    }
    
    // Side faces
    for (let i = 0; i < faces; i++) {
      const next = (i + 1) % faces;
      indices.push(i + 1, tipIndex, next + 1);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Create a Lissajous curve in 3D
   */
  static createLissajousCurve(
    A: number = 1, B: number = 1, C: number = 1,
    a: number = 3, b: number = 2, c: number = 1,
    delta: number = Math.PI / 2,
    segments: number = 1000
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      
      const x = A * Math.sin(a * t + delta);
      const y = B * Math.sin(b * t);
      const z = C * Math.sin(c * t);
      
      vertices.push(x, y, z);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    return geometry;
  }

  /**
   * Create a parametric surface from mathematical function
   */
  static createParametricSurface(
    func: (u: number, v: number) => [number, number, number],
    uMin: number = 0, uMax: number = Math.PI * 2,
    vMin: number = 0, vMax: number = Math.PI,
    uSegments: number = 32, vSegments: number = 32
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    for (let i = 0; i <= uSegments; i++) {
      const u = uMin + (uMax - uMin) * (i / uSegments);
      
      for (let j = 0; j <= vSegments; j++) {
        const v = vMin + (vMax - vMin) * (j / vSegments);
        
        const [x, y, z] = func(u, v);
        vertices.push(x, y, z);
        uvs.push(i / uSegments, j / vSegments);
        
        if (i < uSegments && j < vSegments) {
          const a = i * (vSegments + 1) + j;
          const b = a + vSegments + 1;
          
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }
}
