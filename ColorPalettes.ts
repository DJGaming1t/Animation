import * as THREE from "three";

/**
 * Color palette management system for dynamic visual themes
 * Provides predefined color schemes and tools for color manipulation
 */

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  primary: THREE.Color[];
  secondary: THREE.Color[];
  accent: THREE.Color[];
  background: THREE.Color;
  foreground: THREE.Color;
  temperature: 'warm' | 'cool' | 'neutral';
  tags: string[];
}

export interface GradientStop {
  position: number; // 0-1
  color: THREE.Color;
}

export interface Gradient {
  id: string;
  name: string;
  stops: GradientStop[];
  type: 'linear' | 'radial' | 'conical';
}

export class ColorPalettes {
  private palettes: Map<string, ColorPalette> = new Map();
  private gradients: Map<string, Gradient> = new Map();
  private currentPalette: string | null = null;

  constructor() {
    this.initializeDefaultPalettes();
    this.initializeDefaultGradients();
  }

  /**
   * Initialize default color palettes
   */
  private initializeDefaultPalettes(): void {
    const defaultPalettes: ColorPalette[] = [
      {
        id: 'cosmic_blue',
        name: 'Cosmic Blue',
        description: 'Deep space blues with stellar accents',
        primary: [
          new THREE.Color('#001122'),
          new THREE.Color('#003366'),
          new THREE.Color('#4466ff'),
          new THREE.Color('#6688ff')
        ],
        secondary: [
          new THREE.Color('#001144'),
          new THREE.Color('#002255'),
          new THREE.Color('#0044aa')
        ],
        accent: [
          new THREE.Color('#88ccff'),
          new THREE.Color('#aaeeff'),
          new THREE.Color('#ffffff')
        ],
        background: new THREE.Color('#000011'),
        foreground: new THREE.Color('#ffffff'),
        temperature: 'cool',
        tags: ['space', 'cosmic', 'blue', 'cool']
      },
      {
        id: 'fire_orange',
        name: 'Fire Orange',
        description: 'Intense fire and ember colors',
        primary: [
          new THREE.Color('#331100'),
          new THREE.Color('#661100'),
          new THREE.Color('#ff4400'),
          new THREE.Color('#ff6600')
        ],
        secondary: [
          new THREE.Color('#441100'),
          new THREE.Color('#882200'),
          new THREE.Color('#cc3300')
        ],
        accent: [
          new THREE.Color('#ff8800'),
          new THREE.Color('#ffaa00'),
          new THREE.Color('#ffcc44')
        ],
        background: new THREE.Color('#220011'),
        foreground: new THREE.Color('#ffeeaa'),
        temperature: 'warm',
        tags: ['fire', 'orange', 'warm', 'energy']
      },
      {
        id: 'water_cyan',
        name: 'Water Cyan',
        description: 'Ocean depths and aquatic blues',
        primary: [
          new THREE.Color('#001122'),
          new THREE.Color('#002244'),
          new THREE.Color('#0066ff'),
          new THREE.Color('#0088ff')
        ],
        secondary: [
          new THREE.Color('#001133'),
          new THREE.Color('#003355'),
          new THREE.Color('#0055aa')
        ],
        accent: [
          new THREE.Color('#44ccff'),
          new THREE.Color('#88ddff'),
          new THREE.Color('#ccf0ff')
        ],
        background: new THREE.Color('#001122'),
        foreground: new THREE.Color('#ccf0ff'),
        temperature: 'cool',
        tags: ['water', 'cyan', 'ocean', 'blue']
      },
      {
        id: 'crystal_purple',
        name: 'Crystal Purple',
        description: 'Mystical purples and crystal refractions',
        primary: [
          new THREE.Color('#220033'),
          new THREE.Color('#440066'),
          new THREE.Color('#ff44ff'),
          new THREE.Color('#ff66ff')
        ],
        secondary: [
          new THREE.Color('#330044'),
          new THREE.Color('#550077'),
          new THREE.Color('#cc44cc')
        ],
        accent: [
          new THREE.Color('#ff88ff'),
          new THREE.Color('#ffaaff'),
          new THREE.Color('#ffccff')
        ],
        background: new THREE.Color('#110022'),
        foreground: new THREE.Color('#ffccff'),
        temperature: 'cool',
        tags: ['crystal', 'purple', 'mystical', 'magic']
      },
      {
        id: 'plasma_electric',
        name: 'Plasma Electric',
        description: 'High-energy electric blues and whites',
        primary: [
          new THREE.Color('#002211'),
          new THREE.Color('#004422'),
          new THREE.Color('#44ffff'),
          new THREE.Color('#66ffff')
        ],
        secondary: [
          new THREE.Color('#003322'),
          new THREE.Color('#005544'),
          new THREE.Color('#33cccc')
        ],
        accent: [
          new THREE.Color('#88ffff'),
          new THREE.Color('#aaffff'),
          new THREE.Color('#ffffff')
        ],
        background: new THREE.Color('#001111'),
        foreground: new THREE.Color('#ffffff'),
        temperature: 'cool',
        tags: ['plasma', 'electric', 'cyan', 'energy']
      },
      {
        id: 'nature_green',
        name: 'Nature Green',
        description: 'Forest and plant life greens',
        primary: [
          new THREE.Color('#003300'),
          new THREE.Color('#006600'),
          new THREE.Color('#44ff44'),
          new THREE.Color('#66ff66')
        ],
        secondary: [
          new THREE.Color('#004400'),
          new THREE.Color('#007700'),
          new THREE.Color('#33cc33')
        ],
        accent: [
          new THREE.Color('#88ff88'),
          new THREE.Color('#aaffaa'),
          new THREE.Color('#ccffcc')
        ],
        background: new THREE.Color('#001100'),
        foreground: new THREE.Color('#ccffcc'),
        temperature: 'cool',
        tags: ['nature', 'green', 'forest', 'organic']
      },
      {
        id: 'sunset_warm',
        name: 'Sunset Warm',
        description: 'Warm sunset oranges and pinks',
        primary: [
          new THREE.Color('#332200'),
          new THREE.Color('#664400'),
          new THREE.Color('#ff8844'),
          new THREE.Color('#ffaa66')
        ],
        secondary: [
          new THREE.Color('#443300'),
          new THREE.Color('#775500'),
          new THREE.Color('#cc6633')
        ],
        accent: [
          new THREE.Color('#ffcc88'),
          new THREE.Color('#ffddaa'),
          new THREE.Color('#ffeecc')
        ],
        background: new THREE.Color('#221100'),
        foreground: new THREE.Color('#ffeecc'),
        temperature: 'warm',
        tags: ['sunset', 'warm', 'orange', 'pink']
      },
      {
        id: 'monochrome',
        name: 'Monochrome',
        description: 'Classic black and white with grays',
        primary: [
          new THREE.Color('#000000'),
          new THREE.Color('#333333'),
          new THREE.Color('#666666'),
          new THREE.Color('#999999')
        ],
        secondary: [
          new THREE.Color('#111111'),
          new THREE.Color('#444444'),
          new THREE.Color('#777777')
        ],
        accent: [
          new THREE.Color('#cccccc'),
          new THREE.Color('#eeeeee'),
          new THREE.Color('#ffffff')
        ],
        background: new THREE.Color('#000000'),
        foreground: new THREE.Color('#ffffff'),
        temperature: 'neutral',
        tags: ['monochrome', 'black', 'white', 'minimal']
      }
    ];

    defaultPalettes.forEach(palette => {
      this.palettes.set(palette.id, palette);
    });

    this.currentPalette = 'cosmic_blue';
  }

  /**
   * Initialize default gradients
   */
  private initializeDefaultGradients(): void {
    const defaultGradients: Gradient[] = [
      {
        id: 'cosmic_gradient',
        name: 'Cosmic Gradient',
        type: 'linear',
        stops: [
          { position: 0, color: new THREE.Color('#000011') },
          { position: 0.3, color: new THREE.Color('#001144') },
          { position: 0.7, color: new THREE.Color('#4466ff') },
          { position: 1, color: new THREE.Color('#88ccff') }
        ]
      },
      {
        id: 'fire_gradient',
        name: 'Fire Gradient',
        type: 'radial',
        stops: [
          { position: 0, color: new THREE.Color('#ffffff') },
          { position: 0.2, color: new THREE.Color('#ffff44') },
          { position: 0.5, color: new THREE.Color('#ff6600') },
          { position: 0.8, color: new THREE.Color('#cc2200') },
          { position: 1, color: new THREE.Color('#330000') }
        ]
      },
      {
        id: 'water_gradient',
        name: 'Water Gradient',
        type: 'linear',
        stops: [
          { position: 0, color: new THREE.Color('#001122') },
          { position: 0.4, color: new THREE.Color('#0066ff') },
          { position: 0.8, color: new THREE.Color('#44ccff') },
          { position: 1, color: new THREE.Color('#ccf0ff') }
        ]
      },
      {
        id: 'spectrum_gradient',
        name: 'Full Spectrum',
        type: 'linear',
        stops: [
          { position: 0, color: new THREE.Color('#ff0000') },
          { position: 0.17, color: new THREE.Color('#ff8800') },
          { position: 0.33, color: new THREE.Color('#ffff00') },
          { position: 0.5, color: new THREE.Color('#00ff00') },
          { position: 0.67, color: new THREE.Color('#0088ff') },
          { position: 0.83, color: new THREE.Color('#4400ff') },
          { position: 1, color: new THREE.Color('#8800ff') }
        ]
      }
    ];

    defaultGradients.forEach(gradient => {
      this.gradients.set(gradient.id, gradient);
    });
  }

  /**
   * Get all available palettes
   */
  getAllPalettes(): ColorPalette[] {
    return Array.from(this.palettes.values());
  }

  /**
   * Get a specific palette
   */
  getPalette(id: string): ColorPalette | undefined {
    return this.palettes.get(id);
  }

  /**
   * Get current active palette
   */
  getCurrentPalette(): ColorPalette | null {
    return this.currentPalette ? this.palettes.get(this.currentPalette) || null : null;
  }

  /**
   * Set current palette
   */
  setCurrentPalette(id: string): boolean {
    if (this.palettes.has(id)) {
      this.currentPalette = id;
      return true;
    }
    return false;
  }

  /**
   * Get palettes by tag
   */
  getPalettesByTag(tag: string): ColorPalette[] {
    return Array.from(this.palettes.values()).filter(palette => 
      palette.tags.includes(tag)
    );
  }

  /**
   * Get palettes by temperature
   */
  getPalettesByTemperature(temperature: ColorPalette['temperature']): ColorPalette[] {
    return Array.from(this.palettes.values()).filter(palette => 
      palette.temperature === temperature
    );
  }

  /**
   * Create a custom palette
   */
  createPalette(palette: ColorPalette): void {
    this.palettes.set(palette.id, palette);
  }

  /**
   * Remove a palette
   */
  removePalette(id: string): boolean {
    return this.palettes.delete(id);
  }

  /**
   * Generate a random color from current palette
   */
  getRandomColor(type: 'primary' | 'secondary' | 'accent' = 'primary'): THREE.Color {
    const palette = this.getCurrentPalette();
    if (!palette) return new THREE.Color('#ffffff');

    const colors = palette[type];
    return colors[Math.floor(Math.random() * colors.length)].clone();
  }

  /**
   * Interpolate between two colors
   */
  interpolateColors(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return color1.clone().lerp(color2, t);
  }

  /**
   * Generate color from gradient
   */
  getGradientColor(gradientId: string, position: number): THREE.Color {
    const gradient = this.gradients.get(gradientId);
    if (!gradient) return new THREE.Color('#ffffff');

    position = Math.max(0, Math.min(1, position));

    // Find surrounding stops
    let stop1 = gradient.stops[0];
    let stop2 = gradient.stops[gradient.stops.length - 1];

    for (let i = 0; i < gradient.stops.length - 1; i++) {
      if (position >= gradient.stops[i].position && position <= gradient.stops[i + 1].position) {
        stop1 = gradient.stops[i];
        stop2 = gradient.stops[i + 1];
        break;
      }
    }

    // Interpolate between stops
    const range = stop2.position - stop1.position;
    const t = range > 0 ? (position - stop1.position) / range : 0;
    
    return stop1.color.clone().lerp(stop2.color, t);
  }

  /**
   * Generate complementary color
   */
  getComplementaryColor(color: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  /**
   * Generate triadic colors
   */
  getTriadicColors(color: THREE.Color): THREE.Color[] {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    return [
      new THREE.Color().setHSL((hsl.h + 1/3) % 1, hsl.s, hsl.l),
      new THREE.Color().setHSL((hsl.h + 2/3) % 1, hsl.s, hsl.l)
    ];
  }

  /**
   * Generate analogous colors
   */
  getAnalogousColors(color: THREE.Color, count: number = 2): THREE.Color[] {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    const colors: THREE.Color[] = [];
    const step = 0.083; // 30 degrees / 360 degrees
    
    for (let i = 1; i <= count; i++) {
      colors.push(new THREE.Color().setHSL((hsl.h + step * i) % 1, hsl.s, hsl.l));
      colors.push(new THREE.Color().setHSL((hsl.h - step * i + 1) % 1, hsl.s, hsl.l));
    }
    
    return colors;
  }

  /**
   * Adjust color brightness
   */
  adjustBrightness(color: THREE.Color, factor: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.max(0, Math.min(1, hsl.l * factor));
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  /**
   * Adjust color saturation
   */
  adjustSaturation(color: THREE.Color, factor: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.max(0, Math.min(1, hsl.s * factor));
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  /**
   * Generate color scheme based on sequence type
   */
  getSequenceColors(sequenceType: string): {
    primary: THREE.Color;
    secondary: THREE.Color;
    accent: THREE.Color;
    background: THREE.Color;
  } {
    const paletteMap: Record<string, string> = {
      cosmic: 'cosmic_blue',
      fire: 'fire_orange',
      water: 'water_cyan',
      crystal: 'crystal_purple',
      plasma: 'plasma_electric',
      nature: 'nature_green',
      sunset: 'sunset_warm'
    };

    const paletteId = paletteMap[sequenceType] || 'cosmic_blue';
    const palette = this.getPalette(paletteId);
    
    if (!palette) {
      return {
        primary: new THREE.Color('#ffffff'),
        secondary: new THREE.Color('#cccccc'),
        accent: new THREE.Color('#ffff00'),
        background: new THREE.Color('#000000')
      };
    }

    return {
      primary: palette.primary[0].clone(),
      secondary: palette.secondary[0].clone(),
      accent: palette.accent[0].clone(),
      background: palette.background.clone()
    };
  }

  /**
   * Generate particle colors based on properties
   */
  generateParticleColors(type: string, count: number): THREE.Color[] {
    const colors: THREE.Color[] = [];
    const palette = this.getCurrentPalette();
    
    if (!palette) {
      // Fallback colors
      for (let i = 0; i < count; i++) {
        colors.push(new THREE.Color().setHSL(i / count, 0.8, 0.6));
      }
      return colors;
    }

    const colorSet = type === 'primary' ? palette.primary :
                    type === 'secondary' ? palette.secondary :
                    palette.accent;

    for (let i = 0; i < count; i++) {
      const baseColor = colorSet[i % colorSet.length];
      const variation = 0.2 * (Math.random() - 0.5);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      colors.push(new THREE.Color().setHSL(
        (hsl.h + variation) % 1,
        Math.max(0, Math.min(1, hsl.s + variation)),
        Math.max(0, Math.min(1, hsl.l + variation))
      ));
    }

    return colors;
  }

  /**
   * Export current palette configuration
   */
  exportConfiguration(): Record<string, any> {
    return {
      currentPalette: this.currentPalette,
      customPalettes: Array.from(this.palettes.entries())
        .filter(([id]) => !['cosmic_blue', 'fire_orange', 'water_cyan', 'crystal_purple', 'plasma_electric', 'nature_green', 'sunset_warm', 'monochrome'].includes(id))
        .map(([id, palette]) => ({ id, ...palette }))
    };
  }

  /**
   * Import palette configuration
   */
  importConfiguration(config: Record<string, any>): void {
    if (config.currentPalette && this.palettes.has(config.currentPalette)) {
      this.currentPalette = config.currentPalette;
    }

    if (config.customPalettes && Array.isArray(config.customPalettes)) {
      config.customPalettes.forEach((paletteData: any) => {
        this.createPalette(paletteData);
      });
    }
  }
}
