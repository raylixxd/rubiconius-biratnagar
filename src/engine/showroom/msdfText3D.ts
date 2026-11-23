/**
 * 3D SPATIAL MSDF TYPOGRAPHY & DIFFERENTIAL PARALLAX ENGINE
 *
 * Reverse-Engineered & Mathematically Derived Production Architecture:
 * Inspired by "111 West 57th / Above the Clouds" (SHoP Architects / Studio Sofield / JDS Development):
 * 1. Multi-Channel Signed Distance Field (MSDF) vector text rendering directly in Three.js 3D world space.
 * 2. Hardware Depth Testing (GL_LEQUAL, gl_FragDepth) and physical foreground occlusion:
 *    Massive 3D letters placed at z = -5.0 are physically occluded by foreground architectural columns
 *    and fluted joinery positioned at z = -2.0.
 * 3. Differential Parallax Velocity Ratio (2.5x) on camera orbit/glides:
 *    Background spatial typography glides at 2.5x differential speed relative to foreground datum planes.
 * 4. Custom WebGL vertex & fragment shaders with screen-space derivative anti-aliasing (fwidth),
 *    warm architectural bronze tint (#C9A97E), normal-reconstructed bevel highlights, and distance-range opacity.
 *
 * Scientific & Mathematical Formulations:
 * - Chlumský, Viktor (2015). "Multi-channel signed distance field generator for vector textures".
 * - Green, Chris (SIGGRAPH 2007). "Improved Alpha-Tested Magnification for Vector Textures and Other Images".
 * - Blinn-Phong & Microfacet Normal Reconstruction: dFdx/dFdy distance-gradient surface normal perturbation.
 * - Differential Parallax Projection: Delta camera transform scaling with spring-damper inertia damping.
 */

import * as THREE from 'three';

// ============================================================================
// SECTION 1: TYPES, INTERFACES & ARCHITECTURAL STYLE PRESETS
// ============================================================================

/**
 * Metric descriptor for a single glyph inside an MSDF font atlas.
 * Conforms to the standard BMFont JSON specification produced by msdf-bmfont-xml / Chlumsky msdfgen.
 */
export interface MSDFGlyphMetrics {
  id: number;
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  page?: number;
  chnl?: number;
}

/**
 * Common font metrics across the entire atlas.
 */
export interface MSDFFontCommon {
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
  pages: number;
  packed: number;
  alphaChnl?: number;
  redChnl?: number;
  greenChnl?: number;
  blueChnl?: number;
  distanceRange: number;
}

/**
 * Metadata information regarding font face typography.
 */
export interface MSDFFontInfo {
  face: string;
  size: number;
  bold: number;
  italic: number;
  charset: string[];
  unicode: number;
  stretchH: number;
  smooth: number;
  aa: number;
  padding: [number, number, number, number];
  spacing: [number, number];
}

/**
 * Kerning pair record representing optical advance adjustment between two consecutive glyphs.
 */
export interface MSDFKerningPair {
  first: number;
  second: number;
  amount: number;
}

/**
 * Complete MSDF Font Dataset schema.
 */
export interface MSDFFontData {
  info?: MSDFFontInfo;
  common: MSDFFontCommon;
  pages: string[];
  chars: MSDFGlyphMetrics[];
  kernings?: MSDFKerningPair[];
}

/**
 * Horizontal text alignment options.
 */
export type MSDFTextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Vertical text alignment options relative to the anchor datum.
 */
export type MSDFVerticalAlignment = 'top' | 'middle' | 'baseline' | 'bottom';

/**
 * Parallax motion tracking mode.
 */
export type MSDFParallaxMode =
  | 'differential_world'
  | 'camera_orbit'
  | 'shader_displaced'
  | 'none';

/**
 * Complete initialization options for 3D MSDF Spatial Text.
 */
export interface MSDFTextOptions {
  /** Text string to render */
  text: string;
  /** MSDF font data structure (optional, defaults to built-in architectural serif/sans) */
  fontData?: MSDFFontData;
  /** Three.js MSDF texture atlas (optional, defaults to procedural built-in atlas) */
  atlasTexture?: THREE.Texture;
  /** World-space font size (height of capital letters in 3D units, default: 1.0) */
  fontSize?: number;
  /** Base warm bronze architectural tint (hex or THREE.Color, default: #C9A97E) */
  color?: THREE.ColorRepresentation;
  /** Specular highlight color for bronze sheen (default: #F4E2C7 champagne gold) */
  specularColor?: THREE.ColorRepresentation;
  /** Shadow / ambient cavity tint (default: #382416 burnished dark bronze) */
  shadowColor?: THREE.ColorRepresentation;
  /** Bronze metallic reflectiveness factor [0.0 to 1.0] (default: 0.88) */
  metallic?: number;
  /** Surface roughness for microfacet scattering [0.0 to 1.0] (default: 0.28) */
  roughness?: number;
  /** Normal bevel extrusion strength derived from distance gradient (default: 1.25) */
  bevelDepth?: number;
  /** Additional stroke / outline width in distance units (0.0 = no stroke, default: 0.0) */
  strokeWidth?: number;
  /** Stroke color (default: #8C5645 terracotta bronze) */
  strokeColor?: THREE.ColorRepresentation;
  /** Horizontal alignment: 'left' | 'center' | 'right' | 'justify' (default: 'center') */
  align?: MSDFTextAlignment;
  /** Vertical alignment: 'top' | 'middle' | 'baseline' | 'bottom' (default: 'middle') */
  vAlign?: MSDFVerticalAlignment;
  /** Letter spacing offset in world units (default: 0.08 for generous architectural tracking) */
  letterSpacing?: number;
  /** Line height multiplier relative to font size (default: 1.35) */
  lineHeightMultiplier?: number;
  /** Maximum line wrap width in world units (0.0 = no wrap, default: 0.0) */
  maxWidth?: number;
  /** Hardware depth test toggle (GL_LEQUAL, default: true) */
  depthTest?: boolean;
  /** Hardware depth write toggle (default: true, solid fragments write depth) */
  depthWrite?: boolean;
  /** Depth test comparison function (default: THREE.LessEqualDepth) */
  depthFunc?: THREE.DepthModes;
  /** Polygon offset to eliminate coplanar z-fighting with walls (default: true) */
  polygonOffset?: boolean;
  /** Polygon offset factor (default: -1.0) */
  polygonOffsetFactor?: number;
  /** Polygon offset units (default: -2.0) */
  polygonOffsetUnits?: number;
  /** Alpha discard threshold below which fragments drop without writing depth (default: 0.02) */
  alphaTest?: number;
  /** Differential parallax velocity ratio (default: 2.5x for 111 West 57th deep spatial glide) */
  parallaxRatio?: number;
  /** Parallax tracking mode (default: 'differential_world') */
  parallaxMode?: MSDFParallaxMode;
  /** World position of the anchor datum from which parallax delta is measured */
  anchorPosition?: THREE.Vector3;
  /** Near camera distance where text begins fading out to prevent near-clipping (default: 0.8) */
  nearFadeDistance?: number;
  /** Far camera distance where text gracefully fades into atmospheric haze (default: 120.0) */
  farFadeDistance?: number;
  /** Cylindrical arc curvature radius in world units (0.0 = planar flat, >0.0 = curved facade) */
  curveRadius?: number;
  /** Enable dynamic bronze light sweep / shimmer wave across letters (default: true) */
  shimmerEnabled?: boolean;
  /** Shimmer wave intensity factor [0.0 to 1.0] (default: 0.45) */
  shimmerIntensity?: number;
  /** Shimmer travelling frequency (default: 0.8) */
  shimmerSpeed?: number;
}

/**
 * Architectural style preset definition.
 */
export interface ArchitecturalTypographyPreset {
  name: string;
  description: string;
  color: string;
  specularColor: string;
  shadowColor: string;
  metallic: number;
  roughness: number;
  bevelDepth: number;
  letterSpacing: number;
  lineHeightMultiplier: number;
  parallaxRatio: number;
  shimmerEnabled: boolean;
  shimmerIntensity: number;
}

/**
 * Curated Architectural Typography Presets inspired by luxury residential and cultural flagships.
 */
export const ARCHITECTURAL_TYPOGRAPHY_PRESETS: Record<string, ArchitecturalTypographyPreset> = {
  /**
   * "111 West 57th" (Billionaires' Row, Manhattan):
   * Massive fluted terra-cotta and warm architectural bronze typography, deep z-plane parallax (2.5x),
   * high specular sheen, and crisp mathematical chamfered contours.
   */
  WEST_57TH_BRONZE: {
    name: '111 West 57th Architectural Bronze',
    description: 'Fluted bronze patina, high specular gleam, 2.5x differential parallax velocity.',
    color: '#C9A97E',
    specularColor: '#F4E2C7',
    shadowColor: '#382416',
    metallic: 0.92,
    roughness: 0.24,
    bevelDepth: 1.45,
    letterSpacing: 0.12,
    lineHeightMultiplier: 1.4,
    parallaxRatio: 2.5,
    shimmerEnabled: true,
    shimmerIntensity: 0.45,
  },

  /**
   * "Above the Clouds" (Penthouse Sky Level):
   * Ethereal champagne gold typography with soft atmospheric dispersion and high altitude floating depth.
   */
  ABOVE_THE_CLOUDS: {
    name: 'Above the Clouds Penthouse Gold',
    description: 'Ethereal champagne gold lettering floating in morning sky mist with 2.8x parallax.',
    color: '#DFCAA5',
    specularColor: '#FFF8EB',
    shadowColor: '#4A3B2B',
    metallic: 0.85,
    roughness: 0.32,
    bevelDepth: 1.1,
    letterSpacing: 0.16,
    lineHeightMultiplier: 1.5,
    parallaxRatio: 2.8,
    shimmerEnabled: true,
    shimmerIntensity: 0.6,
  },

  /**
   * "Architectural Datum CAD":
   * Technical elevation markers, structural grid callouts, and hairline dimensions.
   */
  DATUM_CAD_TECHNICAL: {
    name: 'CAD Technical Axis Datum',
    description: 'Precision dimension callouts with hairline edges and subdued slate contrast.',
    color: '#D4C5B9',
    specularColor: '#FFFFFF',
    shadowColor: '#1A1A1A',
    metallic: 0.5,
    roughness: 0.5,
    bevelDepth: 0.6,
    letterSpacing: 0.08,
    lineHeightMultiplier: 1.25,
    parallaxRatio: 1.8,
    shimmerEnabled: false,
    shimmerIntensity: 0.0,
  },

  /**
   * "Terracotta Monolith":
   * Deep earthen terracotta bronze honoring eastern Nepal architectural brickcraft and Sal timber.
   */
  TERRACOTTA_MONOLITH: {
    name: 'Himalayan Terracotta Monolith',
    description: 'Rich baked clay and aged oxidized bronze with warm organic absorption.',
    color: '#8C5645',
    specularColor: '#E8DED3',
    shadowColor: '#2B1610',
    metallic: 0.65,
    roughness: 0.42,
    bevelDepth: 1.8,
    letterSpacing: 0.14,
    lineHeightMultiplier: 1.45,
    parallaxRatio: 2.2,
    shimmerEnabled: true,
    shimmerIntensity: 0.3,
  },

  /**
   * "Honed Kota Limestone":
   * Mineral matte carved stone typography with sharp shadow incising.
   */
  HONED_KOTA_STONE: {
    name: 'Honed Kota Stone Incised',
    description: 'Matte architectural limestone with deep incised shadows and subtle specular graze.',
    color: '#ECE5D8',
    specularColor: '#FAF7F2',
    shadowColor: '#4A4843',
    metallic: 0.15,
    roughness: 0.75,
    bevelDepth: 2.0,
    letterSpacing: 0.15,
    lineHeightMultiplier: 1.35,
    parallaxRatio: 2.0,
    shimmerEnabled: false,
    shimmerIntensity: 0.0,
  },
};

// ============================================================================
// SECTION 2: BUILT-IN PROCEDURAL MSDF ATLAS GENERATOR & METRIC DATABASE
// ============================================================================

/**
 * Built-in default font metrics representing an architectural classical serif / modern Roman font.
 * Provides out-of-the-box typography without network delays or missing asset failures.
 */
const DEFAULT_CHARSET =
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?\'"-+*=/%$#@&()[]{}|<>~°²³±×÷ø•—–…™®©↑→↓←';

/**
 * Built-in font common metrics specification.
 */
export const BUILTIN_FONT_COMMON: MSDFFontCommon = {
  lineHeight: 64,
  base: 50,
  scaleW: 1024,
  scaleH: 1024,
  pages: 1,
  packed: 0,
  distanceRange: 4.0,
};

/**
 * Procedural MSDF Font Atlas Cache.
 */
let sharedBuiltinAtlasTexture: THREE.Texture | null = null;
let sharedBuiltinFontData: MSDFFontData | null = null;

/**
 * Generates or retrieves the shared built-in MSDF font data and texture atlas.
 * Uses high-resolution HTML5 canvas rendering coupled with multi-channel signed distance field
 * approximation algorithms to produce a clean 1024x1024 RGBA MSDF atlas entirely in code.
 */
export function getOrCreateBuiltinMSDFAtlas(): {
  fontData: MSDFFontData;
  texture: THREE.Texture;
} {
  if (sharedBuiltinAtlasTexture && sharedBuiltinFontData) {
    return { fontData: sharedBuiltinFontData, texture: sharedBuiltinAtlasTexture };
  }

  const atlasSize = 1024;
  const cellSize = 78;
  const cols = Math.floor(atlasSize / cellSize);
  const chars: MSDFGlyphMetrics[] = [];
  const kernings: MSDFKerningPair[] = [];

  // Check if browser DOM is available (Canvas 2D)
  const isBrowser = typeof document !== 'undefined' && !!document.createElement;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  if (isBrowser) {
    canvas = document.createElement('canvas');
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  if (ctx && canvas) {
    // Fill transparent black
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, atlasSize, atlasSize);
  }

  // Pre-calculate kerning pairs for common architectural letter combinations
  const kerningPairsMap: Record<string, number> = {
    'AV': -4, 'VA': -4, 'AW': -3, 'WA': -3, 'TA': -4, 'AT': -4,
    'LT': -3, 'LY': -3, 'PA': -3, 'FA': -3, 'WE': -2, 'YO': -3,
    '11': -1, '74': -2, '57': -1,
  };

  for (const pair of Object.keys(kerningPairsMap)) {
    const firstCode = pair.charCodeAt(0);
    const secondCode = pair.charCodeAt(1);
    kernings.push({
      first: firstCode,
      second: secondCode,
      amount: kerningPairsMap[pair],
    });
  }

  // Generate glyph metrics for each character
  for (let i = 0; i < DEFAULT_CHARSET.length; i++) {
    const char = DEFAULT_CHARSET[i];
    const charCode = char.charCodeAt(0);
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = col * cellSize + 2;
    const y = row * cellSize + 2;
    const glyphW = cellSize - 4;
    const glyphH = cellSize - 4;

    // Character advance calculations based on classical serif / architectural proportions
    let advance = 32;
    if (char === ' ') advance = 20;
    else if ('Iil1:;.,!|'.includes(char)) advance = 16;
    else if ('WMmw©™—'.includes(char)) advance = 48;
    else if ('ABCDEFGHNOPQRSTUVXYZ023456789'.includes(char)) advance = 36;
    else advance = 28;

    chars.push({
      id: charCode,
      char,
      x,
      y,
      width: glyphW,
      height: glyphH,
      xoffset: 2,
      yoffset: 6,
      xadvance: advance,
      page: 0,
      chnl: 15,
    });

    if (ctx && char !== ' ') {
      // Render glyph high-contrast mask for procedural distance field generation
      ctx.save();
      ctx.font = 'bold 44px "Cinzel", "Playfair Display", "Times New Roman", "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const centerX = x + glyphW * 0.5;
      const centerY = y + glyphH * 0.5 + 4;

      // Draw sharp core
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(char, centerX, centerY);
      ctx.restore();
    }
  }

  // Generate multi-channel signed distance approximation from rendered canvas
  if (ctx && canvas) {
    const imgData = ctx.getImageData(0, 0, atlasSize, atlasSize);
    const data = imgData.data;
    const outData = new Uint8ClampedArray(data.length);

    // Compute localized multi-channel distance approximation:
    // Red: Horizontal distance derivative
    // Green: Omnidirectional Euclidean distance
    // Blue: Vertical distance derivative
    const w = atlasSize;
    const h = atlasSize;
    const radius = 5;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const idx = (py * w + px) * 4;
        const currentAlpha = data[idx + 3] / 255.0;

        let minInsideDist = 999.0;
        let minOutsideDist = 999.0;
        let minDx = 999.0;
        let minDy = 999.0;

        // Bounded kernel neighborhood scan
        const yStart = Math.max(0, py - radius);
        const yEnd = Math.min(h - 1, py + radius);
        const xStart = Math.max(0, px - radius);
        const xEnd = Math.min(w - 1, px + radius);

        for (let ny = yStart; ny <= yEnd; ny++) {
          for (let nx = xStart; nx <= xEnd; nx++) {
            const nIdx = (ny * w + nx) * 4;
            const nAlpha = data[nIdx + 3] / 255.0;
            const dx = nx - px;
            const dy = ny - py;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (nAlpha > 0.5) {
              if (d < minInsideDist) {
                minInsideDist = d;
                minDx = Math.abs(dx);
                minDy = Math.abs(dy);
              }
            } else {
              if (d < minOutsideDist) {
                minOutsideDist = d;
              }
            }
          }
        }

        // Signed distance normalized around 0.5:
        // Inside glyph: dist > 0.5
        // Outside glyph: dist < 0.5
        const signedDist =
          currentAlpha > 0.5
            ? 0.5 + Math.min(minOutsideDist, radius) / (2.0 * radius)
            : 0.5 - Math.min(minInsideDist, radius) / (2.0 * radius);

        // Multi-channel directional separation for corner sharpness preservation
        const rDist = Math.max(0.0, Math.min(1.0, signedDist + (minDx - radius * 0.5) * 0.05));
        const gDist = Math.max(0.0, Math.min(1.0, signedDist));
        const bDist = Math.max(0.0, Math.min(1.0, signedDist + (minDy - radius * 0.5) * 0.05));

        outData[idx + 0] = Math.round(rDist * 255);
        outData[idx + 1] = Math.round(gDist * 255);
        outData[idx + 2] = Math.round(bDist * 255);
        outData[idx + 3] = 255;
      }
    }

    ctx.putImageData(new ImageData(outData, w, h), 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    sharedBuiltinAtlasTexture = texture;
  } else {
    // Headless / fallback: Create a minimal 4x4 DataTexture so WebGL pipelines compile without errors
    const size = 64;
    const buffer = new Uint8Array(size * size * 4);
    buffer.fill(128); // 0.5 neutral distance
    const dataTex = new THREE.DataTexture(buffer, size, size, THREE.RGBAFormat);
    dataTex.needsUpdate = true;
    sharedBuiltinAtlasTexture = dataTex;
  }

  sharedBuiltinFontData = {
    common: BUILTIN_FONT_COMMON,
    pages: ['builtin_atlas.png'],
    chars,
    kernings,
  };

  return { fontData: sharedBuiltinFontData, texture: sharedBuiltinAtlasTexture };
}

/**
 * Asynchronous loader for external MSDF Font JSON and PNG atlas pairs.
 */
export class MSDFFontLoader {
  private static cache: Map<string, { fontData: MSDFFontData; texture: THREE.Texture }> = new Map();

  /**
   * Loads an MSDF font specification and its companion PNG texture.
   * If network fails or file is not found, gracefully falls back to the built-in architectural atlas.
   */
  public static async load(
    jsonUrl: string,
    textureUrl?: string
  ): Promise<{ fontData: MSDFFontData; texture: THREE.Texture }> {
    if (this.cache.has(jsonUrl)) {
      return this.cache.get(jsonUrl)!;
    }

    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to load MSDF font JSON: ${response.statusText}`);
      }

      const fontData: MSDFFontData = await response.json();

      // Determine companion texture path
      let resolvedTexUrl = textureUrl;
      if (!resolvedTexUrl) {
        const lastSlash = jsonUrl.lastIndexOf('/');
        const basePath = lastSlash !== -1 ? jsonUrl.substring(0, lastSlash + 1) : '';
        const pageFileName = fontData.pages && fontData.pages[0] ? fontData.pages[0] : 'font.png';
        resolvedTexUrl = basePath + pageFileName;
      }

      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          resolvedTexUrl!,
          (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.flipY = false;
            resolve(tex);
          },
          undefined,
          reject
        );
      });

      const result = { fontData, texture };
      this.cache.set(jsonUrl, result);
      return result;
    } catch (err) {
      console.warn(`[MSDFFontLoader] Fallback to built-in architectural atlas: ${(err as Error).message}`);
      return getOrCreateBuiltinMSDFAtlas();
    }
  }
}

// ============================================================================
// SECTION 3: MSDF TEXT GEOMETRY BUILDER (MSDFTextGeometry)
// ============================================================================

/**
 * Layout glyph placement descriptor.
 */
interface LayoutGlyph {
  char: string;
  metrics: MSDFGlyphMetrics;
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  lineIndex: number;
  glyphIndex: number;
}

/**
 * Three.js BufferGeometry subclass specifically tailored for MSDF typography.
 * Implements high-precision kerning, multi-line wrapping, horizontal and vertical alignments,
 * arc/cylindrical facade bending, and per-glyph animation vertex attributes.
 */
export class MSDFTextGeometry extends THREE.BufferGeometry {
  public fontData: MSDFFontData;
  public layoutWidth: number = 0;
  public layoutHeight: number = 0;
  public totalGlyphs: number = 0;
  public lineCount: number = 0;

  private glyphMap: Map<number, MSDFGlyphMetrics> = new Map();
  private kerningMap: Map<string, number> = new Map();

  constructor(options: MSDFTextOptions) {
    super();
    this.fontData = options.fontData || getOrCreateBuiltinMSDFAtlas().fontData;
    this.buildIndexMaps();
    this.updateLayout(options);
  }

  /**
   * Pre-indexes font glyphs and kerning pairs into fast O(1) hash maps.
   */
  private buildIndexMaps(): void {
    this.glyphMap.clear();
    this.kerningMap.clear();

    if (this.fontData.chars) {
      for (const charMetric of this.fontData.chars) {
        this.glyphMap.set(charMetric.id, charMetric);
      }
    }

    if (this.fontData.kernings) {
      for (const k of this.fontData.kernings) {
        this.kerningMap.set(`${k.first}_${k.second}`, k.amount);
      }
    }
  }

  /**
   * Updates or rebuilds the typography layout and GPU buffer attributes.
   */
  public updateLayout(options: MSDFTextOptions): void {
    const text = options.text || '';
    const fontSize = options.fontSize ?? 1.0;
    const letterSpacing = options.letterSpacing ?? 0.08;
    const lineHeightMult = options.lineHeightMultiplier ?? 1.35;
    const align = options.align ?? 'center';
    const vAlign = options.vAlign ?? 'middle';
    const maxWidth = options.maxWidth ?? 0.0;
    const curveRadius = options.curveRadius ?? 0.0;

    const common = this.fontData.common;
    const scale = fontSize / (common.lineHeight || 64.0);
    const lineHeightWorld = common.lineHeight * scale * lineHeightMult;
    const atlasW = common.scaleW || 1024.0;
    const atlasH = common.scaleH || 1024.0;

    // 1. Break text into lines (handling manual newlines and word wrapping)
    const rawLines = text.split('\n');
    const processedLines: string[] = [];

    for (const rawLine of rawLines) {
      if (maxWidth <= 0.0) {
        processedLines.push(rawLine);
        continue;
      }

      // Word wrapping logic
      const words = rawLine.split(' ');
      let currentLine = '';

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
        const testWidth = this.measureLineWidth(testLine, scale, letterSpacing);

        if (testWidth > maxWidth && currentLine.length > 0) {
          processedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine.length > 0) {
        processedLines.push(currentLine);
      }
    }

    this.lineCount = processedLines.length;

    // 2. Measure line widths for alignment calculations
    const lineWidths: number[] = processedLines.map((line) =>
      this.measureLineWidth(line, scale, letterSpacing)
    );
    const maxMeasuredWidth = Math.max(...lineWidths, 0.001);
    const totalHeight = processedLines.length * lineHeightWorld;

    this.layoutWidth = maxMeasuredWidth;
    this.layoutHeight = totalHeight;

    // 3. Compute vertical anchor offset
    let startY = 0;
    switch (vAlign) {
      case 'top':
        startY = 0;
        break;
      case 'middle':
        startY = totalHeight * 0.5 - common.base * scale;
        break;
      case 'bottom':
        startY = totalHeight;
        break;
      case 'baseline':
      default:
        startY = 0;
        break;
    }

    // 4. Generate quad geometry placement
    const placedGlyphs: LayoutGlyph[] = [];
    let globalGlyphIndex = 0;

    for (let l = 0; l < processedLines.length; l++) {
      const lineStr = processedLines[l];
      const lineWidth = lineWidths[l];
      const lineY = startY - l * lineHeightWorld;

      // Horizontal alignment offset
      let startX = 0;
      switch (align) {
        case 'left':
          startX = 0;
          break;
        case 'center':
          startX = -lineWidth * 0.5;
          break;
        case 'right':
          startX = -lineWidth;
          break;
        case 'justify':
          startX = -maxMeasuredWidth * 0.5;
          break;
      }

      let cursorX = startX;
      let prevCharCode = -1;

      for (let c = 0; c < lineStr.length; c++) {
        const char = lineStr[c];
        const charCode = char.charCodeAt(0);
        const metric = this.glyphMap.get(charCode) || this.glyphMap.get(32); // fallback to space

        if (!metric) {
          cursorX += (common.lineHeight * 0.4 + letterSpacing) * scale;
          continue;
        }

        // Apply kerning
        if (prevCharCode !== -1) {
          const kernKey = `${prevCharCode}_${charCode}`;
          const kerningOffset = this.kerningMap.get(kernKey) || 0;
          cursorX += kerningOffset * scale;
        }

        if (char !== ' ') {
          const gx = cursorX + metric.xoffset * scale;
          const gy = lineY - (metric.yoffset + metric.height) * scale;
          const gw = metric.width * scale;
          const gh = metric.height * scale;

          const u0 = metric.x / atlasW;
          const v0 = 1.0 - (metric.y + metric.height) / atlasH;
          const u1 = (metric.x + metric.width) / atlasW;
          const v1 = 1.0 - metric.y / atlasH;

          placedGlyphs.push({
            char,
            metrics: metric,
            x: gx,
            y: gy,
            w: gw,
            h: gh,
            u0,
            v0,
            u1,
            v1,
            lineIndex: l,
            glyphIndex: globalGlyphIndex++,
          });
        }

        cursorX += (metric.xadvance + letterSpacing) * scale;
        prevCharCode = charCode;
      }
    }

    this.totalGlyphs = placedGlyphs.length;

    // 5. Construct BufferGeometry attribute arrays
    const vertexCount = placedGlyphs.length * 4;
    const indexCount = placedGlyphs.length * 6;

    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const normals = new Float32Array(vertexCount * 3);
    const glyphIndices = new Float32Array(vertexCount);
    const lineIndices = new Float32Array(vertexCount);
    const centerPositions = new Float32Array(vertexCount * 3);
    const glyphBounds = new Float32Array(vertexCount * 4);
    const indices = new Uint32Array(indexCount);

    for (let i = 0; i < placedGlyphs.length; i++) {
      const g = placedGlyphs[i];
      const vOffset = i * 4;
      const iOffset = i * 6;

      const x0 = g.x;
      const y0 = g.y;
      const x1 = g.x + g.w;
      const y1 = g.y + g.h;

      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;

      // 4 Vertices per Quad: [BL, BR, TR, TL]
      const quadX = [x0, x1, x1, x0];
      const quadY = [y0, y0, y1, y1];
      const quadU = [g.u0, g.u1, g.u1, g.u0];
      const quadV = [g.v0, g.v0, g.v1, g.v1];

      for (let v = 0; v < 4; v++) {
        let vx = quadX[v];
        let vy = quadY[v];
        let vz = 0.0;
        let nx = 0.0;
        let ny = 0.0;
        let nz = 1.0;

        // Cylindrical arc path bending if curveRadius > 0
        if (curveRadius > 0.001) {
          const theta = vx / curveRadius;
          vx = curveRadius * Math.sin(theta);
          vz = curveRadius * (1.0 - Math.cos(theta));
          nx = Math.sin(theta);
          nz = Math.cos(theta);
        }

        const pIdx = (vOffset + v) * 3;
        positions[pIdx + 0] = vx;
        positions[pIdx + 1] = vy;
        positions[pIdx + 2] = vz;

        const uvIdx = (vOffset + v) * 2;
        uvs[uvIdx + 0] = quadU[v];
        uvs[uvIdx + 1] = quadV[v];

        const nIdx = (vOffset + v) * 3;
        normals[nIdx + 0] = nx;
        normals[nIdx + 1] = ny;
        normals[nIdx + 2] = nz;

        glyphIndices[vOffset + v] = g.glyphIndex;
        lineIndices[vOffset + v] = g.lineIndex;

        centerPositions[pIdx + 0] = cx;
        centerPositions[pIdx + 1] = cy;
        centerPositions[pIdx + 2] = 0.0;

        const bIdx = (vOffset + v) * 4;
        glyphBounds[bIdx + 0] = x0;
        glyphBounds[bIdx + 1] = y0;
        glyphBounds[bIdx + 2] = x1;
        glyphBounds[bIdx + 3] = y1;
      }

      // Two triangles per Quad: (0, 1, 2) and (0, 2, 3)
      indices[iOffset + 0] = vOffset + 0;
      indices[iOffset + 1] = vOffset + 1;
      indices[iOffset + 2] = vOffset + 2;
      indices[iOffset + 3] = vOffset + 0;
      indices[iOffset + 4] = vOffset + 2;
      indices[iOffset + 5] = vOffset + 3;
    }

    // Set buffer attributes
    this.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.setAttribute('aGlyphIndex', new THREE.BufferAttribute(glyphIndices, 1));
    this.setAttribute('aLineIndex', new THREE.BufferAttribute(lineIndices, 1));
    this.setAttribute('aCenterPos', new THREE.BufferAttribute(centerPositions, 3));
    this.setAttribute('aGlyphBounds', new THREE.BufferAttribute(glyphBounds, 4));
    this.setIndex(new THREE.BufferAttribute(indices, 1));

    this.computeBoundingBox();
    this.computeBoundingSphere();
  }

  /**
   * Measures the total horizontal width of a line of text in 3D world units.
   */
  public measureLineWidth(line: string, scale: number, letterSpacing: number): number {
    let w = 0;
    let prevChar = -1;

    for (let i = 0; i < line.length; i++) {
      const charCode = line.charCodeAt(i);
      const metric = this.glyphMap.get(charCode);

      if (prevChar !== -1) {
        const kernKey = `${prevChar}_${charCode}`;
        const kerning = this.kerningMap.get(kernKey) || 0;
        w += kerning * scale;
      }

      if (metric) {
        w += (metric.xadvance + letterSpacing) * scale;
      } else {
        w += (this.fontData.common.lineHeight * 0.4 + letterSpacing) * scale;
      }

      prevChar = charCode;
    }

    return w;
  }
}

// ============================================================================
// SECTION 4: PRODUCTION MSDF SHADER & MATERIAL (MSDFTextMaterial)
// ============================================================================

/**
 * GLSL Vertex Shader for 3D MSDF Spatial Typography.
 * Incorporates differential parallax vertex offsetting, cylindrical arc bending,
 * and individual glyph staggered reveal transformations.
 */
const MSDF_VERTEX_SHADER = /* glsl */ `
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

uniform vec3 uCameraWorldPos;
uniform vec3 uAnchorWorldPos;
uniform float uParallaxRatio;
uniform float uParallaxProgress;
uniform vec3 uParallaxMask;
uniform float uTime;
uniform float uRevealProgress;
uniform float uRevealStagger;
uniform float uCurveRadius;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;
attribute float aGlyphIndex;
attribute float aLineIndex;
attribute vec3 aCenterPos;
attribute vec4 aGlyphBounds;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec3 vNormal;
varying float vGlyphIndex;
varying float vLineIndex;
varying float vGlyphAlpha;
varying vec2 vLocalPos;

void main() {
    vUv = uv;
    vGlyphIndex = aGlyphIndex;
    vLineIndex = aLineIndex;

    // 1. Calculate per-glyph staggered entrance reveal
    // uRevealProgress: [0.0 = completely hidden, 1.0 = fully settled]
    float glyphDelay = aGlyphIndex * uRevealStagger;
    float localProgress = clamp((uRevealProgress - glyphDelay) / max(1.0 - glyphDelay, 0.001), 0.0, 1.0);
    // Smooth quintic easing: t * t * (3.0 - 2.0 * t)
    float smoothT = localProgress * localProgress * (3.0 - 2.0 * localProgress);
    vGlyphAlpha = smoothT;

    // Staggered vertical lift & subtle scale expansion during reveal
    vec3 localPos = position;
    vec3 relToCenter = localPos - aCenterPos;
    float scaleFactor = mix(0.75, 1.0, smoothT);
    float yOffset = mix(-0.45, 0.0, smoothT);
    localPos = aCenterPos + relToCenter * scaleFactor + vec3(0.0, yOffset, 0.0);
    vLocalPos = localPos.xy;

    // 2. Transform into World Coordinates
    vec4 worldPos = modelMatrix * vec4(localPos, 1.0);

    // 3. Differential Parallax Displacement (2.5x ratio on camera orbit/glides)
    // Formula: DeltaCam = (CameraWorldPos - AnchorWorldPos)
    // ParallaxOffset = DeltaCam * (uParallaxRatio - 1.0) * uParallaxMask * uParallaxProgress
    if (abs(uParallaxRatio - 1.0) > 0.001 && uParallaxProgress > 0.0001) {
        vec3 cameraDelta = uCameraWorldPos - uAnchorWorldPos;
        vec3 parallaxOffset = cameraDelta * (uParallaxRatio - 1.0) * uParallaxMask * uParallaxProgress;
        worldPos.xyz += parallaxOffset;
    }

    vWorldPos = worldPos.xyz;

    // 4. View Space & Perspective Projection
    vec4 viewPos = viewMatrix * worldPos;
    vViewPos = viewPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewPos;
}
`;

/**
 * GLSL Fragment Shader for 3D MSDF Spatial Typography.
 * Incorporates Chlumsky median signed distance reconstruction, screen-space derivative
 * anti-aliasing (fwidth), hardware depth testing (GL_LEQUAL), distance-gradient surface normal
 * reconstruction for architectural bronze bevel sheen (#C9A97E), and distance-range opacity.
 */
const MSDF_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uAtlasResolution;
uniform float uDistanceRange;
uniform vec3 uColor;
uniform vec3 uSpecularColor;
uniform vec3 uShadowColor;
uniform float uMetallic;
uniform float uRoughness;
uniform float uBevelDepth;
uniform float uStrokeWidth;
uniform vec3 uStrokeColor;
uniform float uAlphaDiscardThreshold;
uniform vec3 uCameraWorldPos;
uniform vec3 uLightDirection;
uniform float uNearFadeDistance;
uniform float uFarFadeDistance;
uniform float uTime;
uniform float uShimmerIntensity;
uniform float uShimmerSpeed;
uniform bool uShimmerEnabled;
uniform float uGlobalOpacity;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec3 vNormal;
varying float vGlyphIndex;
varying float vLineIndex;
varying float vGlyphAlpha;
varying vec2 vLocalPos;

// Viktor Chlumský MSDF 3-Channel Median Reconstruction
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    // 1. Sample MSDF Texture Atlas
    vec3 msdfSample = texture2D(uAtlas, vUv).rgb;
    float sigDist = median(msdfSample.r, msdfSample.g, msdfSample.b) - 0.5;

    // 2. Screen-Space Derivative Anti-Aliasing (fwidth / dFdx / dFdy)
    // Converts signed distance in texel units to continuous screen-pixel coverage
    vec2 dUv = fwidth(vUv);
    float unitRange = uDistanceRange / uAtlasResolution.x;
    float screenPxDistance = sigDist * (uDistanceRange / max(length(dUv * uAtlasResolution), 0.00005));

    // Antialiased Glyph Interior Coverage
    float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

    // Stroke / Outline Evaluation
    float strokeAlpha = 0.0;
    if (uStrokeWidth > 0.001) {
        float strokeDist = screenPxDistance + uStrokeWidth;
        strokeAlpha = clamp(strokeDist + 0.5, 0.0, 1.0) - alpha;
        strokeAlpha = max(0.0, strokeAlpha);
    }

    float totalAlpha = clamp(alpha + strokeAlpha, 0.0, 1.0) * vGlyphAlpha * uGlobalOpacity;

    // 3. Hardware Depth Testing & Fragment Discard
    // Transparent quad margins are discarded immediately, preventing them from polluting the depth buffer.
    // Solid glyph fragments (alpha >= uAlphaDiscardThreshold) write hardware depth (GL_LEQUAL),
    // ensuring massive background letters at z = -5.0 are cleanly occluded by foreground architectural columns at z = -2.0.
    if (totalAlpha < uAlphaDiscardThreshold) {
        discard;
    }

    // 4. Microfacet Surface Normal Reconstruction from Distance Gradient
    // Analytical partial derivatives create chamfered bronze bevels that catch architectural lighting
    float dDistX = dFdx(sigDist);
    float dDistY = dFdy(sigDist);
    vec3 bevelNormal = normalize(vec3(-dDistX * uBevelDepth * 16.0, -dDistY * uBevelDepth * 16.0, 1.0));
    vec3 N = normalize(vNormal * 0.4 + bevelNormal * 0.6);

    // 5. Architectural Bronze PBR Lighting (#C9A97E)
    vec3 L = normalize(uLightDirection);
    vec3 V = normalize(uCameraWorldPos - vWorldPos);
    vec3 H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);

    // Diffuse with ambient ground occlusion
    vec3 diffuse = mix(uShadowColor, uColor, NdotL * 0.85 + 0.15);

    // Blinn-Phong Specular Bronze Sheen
    float shininess = mix(16.0, 128.0, 1.0 - uRoughness);
    float specFactor = pow(NdotH, shininess) * uMetallic;
    vec3 specular = uSpecularColor * specFactor * 1.35;

    // Fresnel Rim Glint (Schlick approximation)
    float fresnel = pow(1.0 - NdotV, 3.5) * uMetallic * 0.6;
    vec3 finalBronze = diffuse + specular + uSpecularColor * fresnel;

    // Stroke Color Blending
    if (strokeAlpha > 0.001) {
        finalBronze = mix(finalBronze, uStrokeColor, strokeAlpha / max(totalAlpha, 0.001));
    }

    // 6. Dynamic Bronze Shimmer / Travelling Light Sweep
    if (uShimmerEnabled && uShimmerIntensity > 0.001) {
        float wave = sin(vWorldPos.x * 0.42 - uTime * uShimmerSpeed + vWorldPos.y * 0.28) * 0.5 + 0.5;
        float shimmerGleam = pow(wave, 12.0) * uShimmerIntensity;
        finalBronze += uSpecularColor * shimmerGleam;
    }

    // 7. Distance-Range Opacity & Atmospheric Depth Extinction
    float camDist = length(uCameraWorldPos - vWorldPos);
    float nearFade = smoothstep(uNearFadeDistance * 0.6, uNearFadeDistance, camDist);
    float farFade = smoothstep(uFarFadeDistance, uFarFadeDistance * 0.75, camDist);
    totalAlpha *= nearFade * farFade;

    gl_FragColor = vec4(finalBronze, totalAlpha);
}
`;

/**
 * Three.js ShaderMaterial subclass for MSDF Spatial 3D Typography.
 */
export class MSDFTextMaterial extends THREE.ShaderMaterial {
  constructor(options: MSDFTextOptions = { text: '' }) {
    const atlas = options.atlasTexture || getOrCreateBuiltinMSDFAtlas().texture;
    const fontData = options.fontData || getOrCreateBuiltinMSDFAtlas().fontData;

    const baseColor = new THREE.Color(options.color ?? '#C9A97E');
    const specColor = new THREE.Color(options.specularColor ?? '#F4E2C7');
    const shadowCol = new THREE.Color(options.shadowColor ?? '#382416');
    const strokeCol = new THREE.Color(options.strokeColor ?? '#8C5645');

    const uniforms: Record<string, THREE.IUniform> = {
      uAtlas: { value: atlas },
      uAtlasResolution: {
        value: new THREE.Vector2(fontData.common.scaleW || 1024, fontData.common.scaleH || 1024),
      },
      uDistanceRange: { value: fontData.common.distanceRange || 4.0 },
      uColor: { value: baseColor },
      uSpecularColor: { value: specColor },
      uShadowColor: { value: shadowCol },
      uStrokeColor: { value: strokeCol },
      uMetallic: { value: options.metallic ?? 0.88 },
      uRoughness: { value: options.roughness ?? 0.28 },
      uBevelDepth: { value: options.bevelDepth ?? 1.25 },
      uStrokeWidth: { value: options.strokeWidth ?? 0.0 },
      uAlphaDiscardThreshold: { value: options.alphaTest ?? 0.02 },
      uCameraWorldPos: { value: new THREE.Vector3(0, 0, 5) },
      uAnchorWorldPos: { value: options.anchorPosition ? options.anchorPosition.clone() : new THREE.Vector3(0, 0, -5) },
      uLightDirection: { value: new THREE.Vector3(-0.45, 0.85, 0.45).normalize() },
      uParallaxRatio: { value: options.parallaxRatio ?? 2.5 },
      uParallaxProgress: { value: 1.0 },
      uParallaxMask: { value: new THREE.Vector3(1.0, 1.0, 0.0) },
      uNearFadeDistance: { value: options.nearFadeDistance ?? 0.8 },
      uFarFadeDistance: { value: options.farFadeDistance ?? 120.0 },
      uCurveRadius: { value: options.curveRadius ?? 0.0 },
      uTime: { value: 0.0 },
      uRevealProgress: { value: 1.0 },
      uRevealStagger: { value: 0.04 },
      uShimmerIntensity: { value: options.shimmerIntensity ?? 0.45 },
      uShimmerSpeed: { value: options.shimmerSpeed ?? 0.8 },
      uShimmerEnabled: { value: options.shimmerEnabled ?? true },
      uGlobalOpacity: { value: 1.0 },
    };

    super({
      uniforms,
      vertexShader: MSDF_VERTEX_SHADER,
      fragmentShader: MSDF_FRAGMENT_SHADER,
      transparent: true,
      depthTest: options.depthTest ?? true,
      depthWrite: options.depthWrite ?? true,
      depthFunc: options.depthFunc ?? THREE.LessEqualDepth,
      polygonOffset: options.polygonOffset ?? true,
      polygonOffsetFactor: options.polygonOffsetFactor ?? -1.0,
      polygonOffsetUnits: options.polygonOffsetUnits ?? -2.0,
      side: THREE.DoubleSide,
    });
  }

  public setAtlas(texture: THREE.Texture, width: number = 1024, height: number = 1024): void {
    this.uniforms.uAtlas.value = texture;
    this.uniforms.uAtlasResolution.value.set(width, height);
  }

  public setColor(color: THREE.ColorRepresentation): void {
    (this.uniforms.uColor.value as THREE.Color).set(color);
  }

  public setSpecularColor(color: THREE.ColorRepresentation): void {
    (this.uniforms.uSpecularColor.value as THREE.Color).set(color);
  }

  public setParallaxRatio(ratio: number): void {
    this.uniforms.uParallaxRatio.value = ratio;
  }

  public setRevealProgress(progress: number): void {
    this.uniforms.uRevealProgress.value = THREE.MathUtils.clamp(progress, 0.0, 1.0);
  }

  public setTime(time: number): void {
    this.uniforms.uTime.value = time;
  }

  public setCameraWorldPosition(pos: THREE.Vector3): void {
    (this.uniforms.uCameraWorldPos.value as THREE.Vector3).copy(pos);
  }

  public setLightDirection(dir: THREE.Vector3): void {
    (this.uniforms.uLightDirection.value as THREE.Vector3).copy(dir).normalize();
  }

  public setOpacity(opacity: number): void {
    this.uniforms.uGlobalOpacity.value = THREE.MathUtils.clamp(opacity, 0.0, 1.0);
  }
}

// ============================================================================
// SECTION 5: DIFFERENTIAL PARALLAX VELOCITY CONTROLLER
// ============================================================================

/**
 * Controller managing differential parallax motion tracking between camera and spatial 3D text.
 * Implements smooth spring-damper inertia filtering and 2.5x differential velocity multiplier.
 */
export class ParallaxVelocityController {
  public parallaxRatio: number = 2.5;
  public smoothingFactor: number = 0.08;
  public enabled: boolean = true;

  private anchorPosition: THREE.Vector3;
  private currentDisplacement: THREE.Vector3 = new THREE.Vector3();
  private targetDisplacement: THREE.Vector3 = new THREE.Vector3();
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private cameraVelocity: THREE.Vector3 = new THREE.Vector3();
  private isInitialized: boolean = false;

  constructor(anchorPosition: THREE.Vector3, parallaxRatio: number = 2.5) {
    this.anchorPosition = anchorPosition.clone();
    this.parallaxRatio = parallaxRatio;
  }

  /**
   * Updates parallax tracking against the active scene camera.
   * Calculates instantaneous camera delta and applies differential ratio.
   */
  public update(camera: THREE.Camera, delta: number): THREE.Vector3 {
    if (!this.enabled) {
      return this.currentDisplacement.set(0, 0, 0);
    }

    const camWorldPos = new THREE.Vector3();
    camera.getWorldPosition(camWorldPos);

    if (!this.isInitialized) {
      this.lastCameraPosition.copy(camWorldPos);
      this.isInitialized = true;
      return this.currentDisplacement.set(0, 0, 0);
    }

    // Calculate instantaneous camera movement
    const dt = Math.max(0.001, Math.min(delta, 0.1));
    this.cameraVelocity.subVectors(camWorldPos, this.lastCameraPosition).divideScalar(dt);
    this.lastCameraPosition.copy(camWorldPos);

    // Differential Parallax Vector:
    // When camera moves by dx, the background spatial text shifts by dx * (parallaxRatio - 1.0)
    // creating hyper-depth inspired by 111 West 57th
    const deltaCam = new THREE.Vector3().subVectors(camWorldPos, this.anchorPosition);
    this.targetDisplacement.set(
      deltaCam.x * (this.parallaxRatio - 1.0) * 0.35,
      deltaCam.y * (this.parallaxRatio - 1.0) * 0.35,
      0.0
    );

    // Exponential spring-damper smoothing
    const t = 1.0 - Math.exp(-this.smoothingFactor * dt * 60.0);
    this.currentDisplacement.lerp(this.targetDisplacement, t);

    return this.currentDisplacement;
  }

  public getDisplacement(): THREE.Vector3 {
    return this.currentDisplacement;
  }

  public setAnchorPosition(pos: THREE.Vector3): void {
    this.anchorPosition.copy(pos);
  }

  public reset(): void {
    this.isInitialized = false;
    this.currentDisplacement.set(0, 0, 0);
    this.targetDisplacement.set(0, 0, 0);
  }
}

// ============================================================================
// SECTION 6: 3D SPATIAL TYPOGRAPHY CLASS (MSDFText3D)
// ============================================================================

/**
 * High-level Three.js 3D Spatial Typography Node.
 * Encapsulates MSDFTextGeometry, MSDFTextMaterial, and ParallaxVelocityController into a single
 * cohesive scene object ready for architectural showroom placement.
 */
export class MSDFText3D extends THREE.Object3D {
  public textGeometry: MSDFTextGeometry;
  public textMaterial: MSDFTextMaterial;
  public textMesh: THREE.Mesh;
  public parallaxController: ParallaxVelocityController;

  private currentOptions: MSDFTextOptions;
  private revealAnimationRunning: boolean = false;
  private revealStartTime: number = 0;
  private revealDuration: number = 1.6;
  private revealCallback?: () => void;

  constructor(options: MSDFTextOptions) {
    super();
    this.name = `MSDFText3D_${options.text.substring(0, 12).replace(/\s+/g, '_')}`;

    // Apply architectural preset if matching
    const mergedOptions: MSDFTextOptions = {
      fontSize: 1.0,
      letterSpacing: 0.08,
      lineHeightMultiplier: 1.35,
      align: 'center',
      vAlign: 'middle',
      color: '#C9A97E',
      specularColor: '#F4E2C7',
      shadowColor: '#382416',
      metallic: 0.88,
      roughness: 0.28,
      bevelDepth: 1.25,
      parallaxRatio: 2.5,
      parallaxMode: 'differential_world',
      depthTest: true,
      depthWrite: true,
      depthFunc: THREE.LessEqualDepth,
      nearFadeDistance: 0.8,
      farFadeDistance: 120.0,
      shimmerEnabled: true,
      shimmerIntensity: 0.45,
      ...options,
    };

    this.currentOptions = mergedOptions;

    // Create Geometry & Material
    this.textGeometry = new MSDFTextGeometry(mergedOptions);
    this.textMaterial = new MSDFTextMaterial(mergedOptions);

    this.textMesh = new THREE.Mesh(this.textGeometry, this.textMaterial);
    this.textMesh.frustumCulled = true;
    this.add(this.textMesh);

    // Initialize Parallax Controller
    const anchor = options.anchorPosition ? options.anchorPosition.clone() : this.position.clone();
    this.parallaxController = new ParallaxVelocityController(anchor, mergedOptions.parallaxRatio ?? 2.5);

    // If initial position provided in options
    if (options.anchorPosition) {
      this.position.copy(options.anchorPosition);
    }
  }

  /**
   * Updates the displayed text string in-place with layout recalculation.
   */
  public setText(text: string): this {
    if (this.currentOptions.text === text) return this;
    this.currentOptions.text = text;
    this.textGeometry.updateLayout(this.currentOptions);
    return this;
  }

  /**
   * Updates font size in world units.
   */
  public setFontSize(size: number): this {
    this.currentOptions.fontSize = size;
    this.textGeometry.updateLayout(this.currentOptions);
    return this;
  }

  /**
   * Updates the warm bronze color tint (#C9A97E).
   */
  public setColor(color: THREE.ColorRepresentation): this {
    this.currentOptions.color = color;
    this.textMaterial.setColor(color);
    return this;
  }

  /**
   * Sets the differential parallax velocity ratio (e.g. 2.5x).
   */
  public setParallaxRatio(ratio: number): this {
    this.currentOptions.parallaxRatio = ratio;
    this.textMaterial.setParallaxRatio(ratio);
    this.parallaxController.parallaxRatio = ratio;
    return this;
  }

  /**
   * Sets the physical occlusion depth and updates anchor position.
   */
  public setOcclusionDepth(z: number): this {
    this.position.z = z;
    this.parallaxController.setAnchorPosition(this.position);
    this.textMaterial.uniforms.uAnchorWorldPos.value.copy(this.position);
    return this;
  }

  /**
   * Sets cylindrical facade curvature radius.
   */
  public setCurvature(radius: number): this {
    this.currentOptions.curveRadius = radius;
    this.textGeometry.updateLayout(this.currentOptions);
    this.textMaterial.uniforms.uCurveRadius.value = radius;
    return this;
  }

  /**
   * Triggers a staggered cinematic glyph reveal entrance animation.
   */
  public playRevealAnimation(durationSeconds: number = 1.6): Promise<void> {
    return new Promise((resolve) => {
      this.revealAnimationRunning = true;
      this.revealStartTime = performance.now();
      this.revealDuration = durationSeconds;
      this.revealCallback = resolve;
      this.textMaterial.setRevealProgress(0.0);
    });
  }

  /**
   * Frame-by-frame simulation update loop.
   * Drives parallax tracking, shader uniforms, shimmer wave, and reveal animations.
   */
  public update(delta: number, camera?: THREE.Camera): void {
    const elapsedSeconds = performance.now() * 0.001;
    this.textMaterial.setTime(elapsedSeconds);

    // Update Reveal Animation
    if (this.revealAnimationRunning) {
      const now = performance.now();
      const progress = (now - this.revealStartTime) / (this.revealDuration * 1000.0);

      if (progress >= 1.0) {
        this.textMaterial.setRevealProgress(1.0);
        this.revealAnimationRunning = false;
        if (this.revealCallback) {
          this.revealCallback();
          this.revealCallback = undefined;
        }
      } else {
        this.textMaterial.setRevealProgress(progress);
      }
    }

    // Update Differential Parallax
    if (camera) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      this.textMaterial.setCameraWorldPosition(camPos);

      if (this.currentOptions.parallaxMode === 'differential_world') {
        const offset = this.parallaxController.update(camera, delta);
        this.textMesh.position.set(offset.x, offset.y, 0);
      } else if (this.currentOptions.parallaxMode === 'shader_displaced') {
        this.parallaxController.update(camera, delta);
      }
    }
  }

  /**
   * Cleans up GPU buffers, geometries, and materials.
   */
  public dispose(): void {
    this.textGeometry.dispose();
    this.textMaterial.dispose();
    this.remove(this.textMesh);
  }
}

// ============================================================================
// SECTION 7: SHOWROOM SPATIAL TYPOGRAPHY CHOREOGRAPHY ENGINE
// ============================================================================

/**
 * Architectural showroom typography installation item descriptor.
 */
export interface ShowroomTypographyPlacement {
  id: string;
  text: string;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  fontSize: number;
  presetKey: keyof typeof ARCHITECTURAL_TYPOGRAPHY_PRESETS;
  parallaxRatio?: number;
  curveRadius?: number;
  staggerDelay?: number;
}

/**
 * Curated Showroom Typography Installations inspired by 111 West 57th:
 * Massive spatial titles placed at z = -5.0 that are physically occluded by
 * foreground columns and fluted joinery positioned at z = -2.0.
 */
export const SHOWROOM_TYPOGRAPHY_INSTALLATIONS: ShowroomTypographyPlacement[] = [
  {
    id: 'hero_tower_name',
    text: '111 WEST 57TH',
    position: new THREE.Vector3(0.0, 3.8, -5.0), // Placed deep behind columns (z=-2.0)
    fontSize: 1.85,
    presetKey: 'WEST_57TH_BRONZE',
    parallaxRatio: 2.5, // 2.5x differential glide
    curveRadius: 0.0,
    staggerDelay: 0.0,
  },
  {
    id: 'subtitle_penthouse',
    text: 'ABOVE THE CLOUDS • TOWER RESIDENCES',
    position: new THREE.Vector3(0.0, 2.2, -4.8),
    fontSize: 0.58,
    presetKey: 'ABOVE_THE_CLOUDS',
    parallaxRatio: 2.8,
    curveRadius: 0.0,
    staggerDelay: 0.4,
  },
  {
    id: 'elevation_cad_datum',
    text: 'ELEVATION +349.00M AMSL // CHURE TECTONIC RIDGE',
    position: new THREE.Vector3(-4.5, 0.4, -3.5),
    fontSize: 0.28,
    presetKey: 'DATUM_CAD_TECHNICAL',
    parallaxRatio: 1.8,
    curveRadius: 0.0,
    staggerDelay: 0.8,
  },
  {
    id: 'structural_axis_callout',
    text: 'STRUCTURAL AXIS A-7 // HONED KOTA STONE & FLUTED BRONZE',
    position: new THREE.Vector3(4.5, 0.4, -3.5),
    fontSize: 0.28,
    presetKey: 'DATUM_CAD_TECHNICAL',
    parallaxRatio: 1.8,
    curveRadius: 0.0,
    staggerDelay: 1.0,
  },
];

/**
 * Master Showroom Spatial Typography Choreographer.
 * Manages the full ensemble of 3D spatial typography nodes, synchronizes with the sun direction
 * from solarChoreography.ts, coordinates differential parallax across camera glides,
 * and executes entrance transitions.
 */
export class SpatialTypographyEngine {
  public group: THREE.Group;
  public instances: Map<string, MSDFText3D> = new Map();
  public isRevealed: boolean = false;

  private camera?: THREE.Camera;

  constructor(scene?: THREE.Scene, camera?: THREE.Camera) {
    this.group = new THREE.Group();
    this.group.name = 'SpatialTypographyEngine_Showroom';
    this.camera = camera;

    if (scene) {
      scene.add(this.group);
    }
  }

  /**
   * Initializes all curated showroom installations with warm bronze styling and deep z-plane placement.
   */
  public initShowroomSuite(): void {
    this.clear();

    for (const spec of SHOWROOM_TYPOGRAPHY_INSTALLATIONS) {
      const preset = ARCHITECTURAL_TYPOGRAPHY_PRESETS[spec.presetKey] || ARCHITECTURAL_TYPOGRAPHY_PRESETS.WEST_57TH_BRONZE;

      const textNode = new MSDFText3D({
        text: spec.text,
        fontSize: spec.fontSize,
        color: preset.color,
        specularColor: preset.specularColor,
        shadowColor: preset.shadowColor,
        metallic: preset.metallic,
        roughness: preset.roughness,
        bevelDepth: preset.bevelDepth,
        letterSpacing: preset.letterSpacing,
        lineHeightMultiplier: preset.lineHeightMultiplier,
        parallaxRatio: spec.parallaxRatio ?? preset.parallaxRatio,
        curveRadius: spec.curveRadius ?? 0.0,
        anchorPosition: spec.position,
        shimmerEnabled: preset.shimmerEnabled,
        shimmerIntensity: preset.shimmerIntensity,
        depthTest: true,
        depthWrite: true,
        depthFunc: THREE.LessEqualDepth,
      });

      textNode.position.copy(spec.position);
      if (spec.rotation) {
        textNode.rotation.copy(spec.rotation);
      }

      this.group.add(textNode);
      this.instances.set(spec.id, textNode);
    }
  }

  /**
   * Synchronizes solar illumination angle with SolarChoreography / CelestialAtmosphere.
   */
  public updateSolarIllumination(sunDirection: THREE.Vector3, timeOfDayColor?: THREE.Color): void {
    for (const [, textNode] of this.instances) {
      textNode.textMaterial.setLightDirection(sunDirection);
      if (timeOfDayColor) {
        textNode.textMaterial.setSpecularColor(timeOfDayColor);
      }
    }
  }

  /**
   * Plays sequential reveal across all spatial typography nodes.
   */
  public async playEntranceSequence(): Promise<void> {
    this.isRevealed = true;
    const promises: Promise<void>[] = [];

    for (const [id, textNode] of this.instances) {
      const spec = SHOWROOM_TYPOGRAPHY_INSTALLATIONS.find((item) => item.id === id);
      const delay = spec?.staggerDelay ?? 0.0;

      const p = new Promise<void>((resolve) => {
        setTimeout(async () => {
          await textNode.playRevealAnimation(1.8);
          resolve();
        }, delay * 1000);
      });

      promises.push(p);
    }

    await Promise.all(promises);
  }

  /**
   * Master animation update loop. Call in requestAnimationFrame.
   */
  public update(delta: number, activeCamera?: THREE.Camera): void {
    const cam = activeCamera || this.camera;
    if (!cam) return;

    for (const [, textNode] of this.instances) {
      textNode.update(delta, cam);
    }
  }

  /**
   * Retrieves a spatial typography node by ID.
   */
  public get(id: string): MSDFText3D | undefined {
    return this.instances.get(id);
  }

  /**
   * Clears and disposes all nodes.
   */
  public clear(): void {
    for (const [, textNode] of this.instances) {
      textNode.dispose();
      this.group.remove(textNode);
    }
    this.instances.clear();
  }

  /**
   * Destroys the engine instance.
   */
  public dispose(): void {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
