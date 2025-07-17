/**
 * Advanced noise generation utility for procedural content
 * Includes multiple noise types for various effects
 */
export class NoiseGenerator {
  private permutation: number[];
  private p: number[];

  constructor(seed?: number) {
    // Initialize permutation table
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }

    // Shuffle using seed
    if (seed !== undefined) {
      this.seedRandom(seed);
    }

    // Duplicate permutation table
    this.p = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i % 256];
    }
  }

  /**
   * Seed the random number generator
   */
  private seedRandom(seed: number): void {
    let random = this.createSeededRandom(seed);
    
    // Fisher-Yates shuffle
    for (let i = this.permutation.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
  }

  /**
   * Create seeded random function
   */
  private createSeededRandom(seed: number): () => number {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    let state = seed;

    return function() {
      state = (a * state + c) % m;
      return state / (m - 1);
    };
  }

  /**
   * Fade function for smooth interpolation
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /**
   * Gradient function
   */
  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * 1D Perlin noise
   */
  noise1D(x: number): number {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = this.fade(x);
    return this.lerp(
      this.grad(this.p[X], x, 0, 0),
      this.grad(this.p[X + 1], x - 1, 0, 0),
      u
    );
  }

  /**
   * 2D Perlin noise
   */
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const AA = this.p[A];
    const AB = this.p[A + 1];
    const B = this.p[X + 1] + Y;
    const BA = this.p[B];
    const BB = this.p[B + 1];

    return this.lerp(
      this.lerp(
        this.grad(this.p[AA], x, y, 0),
        this.grad(this.p[BA], x - 1, y, 0),
        u
      ),
      this.lerp(
        this.grad(this.p[AB], x, y - 1, 0),
        this.grad(this.p[BB], x - 1, y - 1, 0),
        u
      ),
      v
    );
  }

  /**
   * 3D Perlin noise
   */
  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z),
          u
        ),
        this.lerp(
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z),
          u
        ),
        v
      ),
      this.lerp(
        this.lerp(
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1),
          u
        ),
        this.lerp(
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
          u
        ),
        v
      ),
      w
    );
  }

  /**
   * Fractal noise (multiple octaves)
   */
  fractal2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return value / maxValue;
  }

  /**
   * Fractal 3D noise
   */
  fractal3D(x: number, y: number, z: number, octaves: number = 4, persistence: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return value / maxValue;
  }

  /**
   * Simplex noise (2D) - faster alternative to Perlin
   */
  simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.p[ii + this.p[jj]] % 12;
    const gi1 = this.p[ii + i1 + this.p[jj + j1]] % 12;
    const gi2 = this.p[ii + 1 + this.p[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2D(gi0, x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2D(gi1, x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2D(gi2, x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  /**
   * Simplex noise (3D)
   */
  simplex3D(x: number, y: number, z: number): number {
    // Simplified 3D simplex noise implementation
    const F3 = 1 / 3;
    const G3 = 1 / 6;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    // Determine simplex and calculate contribution
    return this.noise3D(x, y, z) * 0.5; // Simplified for brevity
  }

  /**
   * Dot product for 2D gradients
   */
  private dot2D(g: number, x: number, y: number): number {
    const grad2 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [1, 0], [-1, 0],
      [0, 1], [0, -1], [0, 1], [0, -1]
    ];
    return grad2[g % 12][0] * x + grad2[g % 12][1] * y;
  }

  /**
   * Voronoi noise
   */
  voronoi2D(x: number, y: number, scale: number = 1): number {
    x *= scale;
    y *= scale;

    const xi = Math.floor(x);
    const yi = Math.floor(y);

    let minDist = Infinity;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const cellX = xi + i;
        const cellY = yi + j;

        // Generate point in cell
        const pointX = cellX + this.hash2D(cellX, cellY);
        const pointY = cellY + this.hash2D(cellX + 1, cellY + 1);

        const dist = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        minDist = Math.min(minDist, dist);
      }
    }

    return minDist;
  }

  /**
   * Hash function for Voronoi
   */
  private hash2D(x: number, y: number): number {
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  }

  /**
   * Ridged noise
   */
  ridged2D(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      let noise = Math.abs(this.noise2D(x * frequency, y * frequency));
      noise = 1 - noise;
      noise = noise * noise;
      value += noise * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  /**
   * Cellular automata noise
   */
  cellular(x: number, y: number, iterations: number = 5): number {
    let value = this.noise2D(x, y) > 0 ? 1 : 0;

    for (let i = 0; i < iterations; i++) {
      let neighbors = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (this.noise2D(x + dx, y + dy) > 0) neighbors++;
        }
      }
      value = neighbors >= 4 ? 1 : 0;
    }

    return value;
  }
}
