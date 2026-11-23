/**
 * ARCHITECTURAL CAD BLUEPRINT DRAFTING ENGINE
 *
 * Reverse-engineered, production-grade 2D vector CAD blueprint & elevation drafting engine.
 * Extracted & synthesized from:
 * 1. oh_architecture: Technical drafting preloader, hairline vector linework, structural grid datums,
 *    precision coordinate readouts, and architectural elevation drawing standards.
 * 2. 40_otto_objects: Parametric CAD dimension callouts, dynamic extension lines, isometric transformations,
 *    real-world millimeter measurement geometry, and clean vector SVG exporting.
 *
 * Capabilities:
 * 1. High-DPI 2D Vector CAD Canvas:
 *    - Device-pixel-ratio (DPR) scaled 2D canvas with sub-pixel crispness on Retina/4K displays.
 *    - Smooth 2D camera with Pan and Zoom (0.25x to 8.0x) with cursor-anchored focal zoom.
 *    - Infinite architectural drafting grid (10mm minor / 100mm major / 1,000mm bay module lines).
 *    - Dynamic grid level-of-detail (LOD) fading to eliminate moiré interference at low zooms.
 * 2. Procedural CAD Elevation Drawing Generator:
 *    - Fluted Master Suite (RUB-MS-01): Fluted Sal timber walls, cantilevered floating nightstands,
 *      flush concealed pivot door, fluted glass and bronze screen partition, stone skirting.
 *    - Formal Drawing Room (RUB-DR-02): Bookmatched marble fireplace breast, refractory herringbone firebox,
 *      symmetrical multi-bay Sal wood library joinery, coffered structural ceiling beams.
 *    - Heritage Panelled Gallery (RUB-PG-03): Classical boiserie wall, fluted pilasters, twin arched
 *      sculpture niches with carved keystones, stone plinths, continuous brass picture rail, clerestory fenestration.
 *    - Complete CAD elevation datums (T.O.C., F.F.L., S.S.L., etc.) with level marker symbols.
 *    - Multi-tier dimension callout strings with 45° architectural slash ticks and dynamic extension lines.
 *    - Material joinery section hatching (wood grain, stone stipple, brick herringbone, glass reeding).
 * 3. Interactive Measurement Tool:
 *    - Click-and-drag architectural ruler measuring distances in real-world millimeters (mm).
 *    - Object Snapping (O-SNAP): Magnetic snapping to endpoints, midpoints, centers, datums, and grid lines.
 *    - Orthogonal lock mode (Shift key) for precise horizontal/vertical alignment.
 *    - Dynamic CAD dimension extension lines and live floating dimension readout pill badge.
 * 4. Export to CAD Vector SVG:
 *    - 1-click export to clean, scalable, standalone vector SVG.
 *    - DIN EN ISO 7200 / ANSI architectural title block with studio branding, principal architect,
 *      date, scale (1:20 / 1:50), drawing code, revision, and graphic metric bar scale.
 */

// ============================================================================
// 01. TYPE DEFINITIONS & CONTRACTS
// ============================================================================

export type RubiconiusCommissionId =
  | 'fluted_master_suite'
  | 'formal_drawing_room'
  | 'heritage_panelled_gallery';

export type BlueprintThemeId =
  | 'classic_cyan'
  | 'dark_obsidian'
  | 'warm_vellum'
  | 'monochrome_cad'
  | 'blueprint_deep';

export type BlueprintTool =
  | 'pan'
  | 'select'
  | 'measure'
  | 'dimension';

export type SnapType =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'datum'
  | 'grid'
  | 'perpendicular';

export interface CADPoint {
  x: number;
  y: number;
}

export interface CADBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CADLineStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  opacity?: number;
}

export interface SnapPoint {
  x: number;
  y: number;
  type: SnapType;
  label: string;
  sourceId?: string;
  distance?: number;
}

export interface CADLineElement {
  type: 'line';
  id: string;
  layer: string;
  p1: CADPoint;
  p2: CADPoint;
  style: CADLineStyle;
  weightClass?: 'primary' | 'secondary' | 'hairline' | 'hidden' | 'centerline';
}

export interface CADRectElement {
  type: 'rect';
  id: string;
  layer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: CADLineStyle;
  fill?: string;
  weightClass?: 'primary' | 'secondary' | 'hairline';
}

export interface CADArcElement {
  type: 'arc';
  id: string;
  layer: string;
  center: CADPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterClockwise?: boolean;
  style: CADLineStyle;
  weightClass?: 'primary' | 'secondary' | 'hairline' | 'hidden' | 'centerline';
}

export interface CADPolylineElement {
  type: 'polyline';
  id: string;
  layer: string;
  points: CADPoint[];
  closed?: boolean;
  style: CADLineStyle;
  fill?: string;
  weightClass?: 'primary' | 'secondary' | 'hairline' | 'hidden' | 'centerline';
}

export interface CADTextElement {
  type: 'text';
  id: string;
  layer: string;
  text: string;
  position: CADPoint;
  fontSize: number;
  fontFamily?: string;
  color: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  rotation?: number;
}

export type CADGeometryElement =
  | CADLineElement
  | CADRectElement
  | CADArcElement
  | CADPolylineElement
  | CADTextElement;

export interface CADDatum {
  id: string;
  elevationMm: number;
  code: string;
  label: string;
  xStart: number;
  xEnd: number;
  side: 'left' | 'right' | 'both';
  isKeyDatum?: boolean;
}

export interface CADDimension {
  id: string;
  p1: CADPoint;
  p2: CADPoint;
  offsetMm: number;
  text: string;
  tier: 1 | 2 | 3; // 1 = detail, 2 = bay/zone, 3 = overall room
  orientation: 'horizontal' | 'vertical' | 'aligned';
  leaderOffset?: number;
}

export interface CADLeader {
  id: string;
  target: CADPoint;
  elbow: CADPoint;
  shelfEnd: CADPoint;
  note: string;
  secondaryNote?: string;
}

export type HatchPattern =
  | 'wood_fluting'
  | 'wood_grain'
  | 'marble_vein'
  | 'stone_stipple'
  | 'brick_herringbone'
  | 'glass_reed'
  | 'metal_hatch'
  | 'insulation_batting';

export interface CADHatch {
  id: string;
  polygon: CADPoint[];
  pattern: HatchPattern;
  pitchMm: number;
  angleRad: number;
  color?: string;
  opacity?: number;
}

export interface CADMeasurement {
  id: string;
  p1: CADPoint;
  p2: CADPoint;
  lengthMm: number;
  deltaX: number;
  deltaY: number;
  angleDeg: number;
  isOrtho: boolean;
  timestamp: number;
}

export interface RubiconiusCommission {
  id: RubiconiusCommissionId;
  code: string;
  title: string;
  subtitle: string;
  scaleText: string;
  nominalScale: number; // e.g. 50 for 1:50
  roomDimensions: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
  };
  client: string;
  location: string;
  leadArchitect: string;
  dateStr: string;
  revision: string;
  sheetNo: string;
  drawingTitle: string;
  bounds: CADBounds;
  elements: CADGeometryElement[];
  datums: CADDatum[];
  dimensions: CADDimension[];
  leaders: CADLeader[];
  hatches: CADHatch[];
  notes: string[];
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
  canvasWidth: number;
  canvasHeight: number;
  dpr: number;
}

export interface BlueprintTheme {
  id: BlueprintThemeId;
  name: string;
  background: string;
  paperTexture?: string;
  minorGrid: string;
  majorGrid: string;
  moduleLine: string;
  axisLine: string;
  primaryProfile: string;
  secondaryJoinery: string;
  hairlineDetail: string;
  hiddenLine: string;
  centerLine: string;
  dimensionLine: string;
  dimensionText: string;
  datumLine: string;
  datumMarkerFill: string;
  datumMarkerStroke: string;
  datumText: string;
  leaderLine: string;
  leaderText: string;
  hatchWood: string;
  hatchStone: string;
  hatchMarble: string;
  hatchBrick: string;
  hatchGlass: string;
  hatchMetal: string;
  hatchInsulation: string;
  rulerMeasurement: string;
  rulerBadgeBg: string;
  rulerBadgeText: string;
  snapMarker: string;
  titleBlockBorder: string;
  titleBlockText: string;
  titleBlockBg: string;
}

export interface SVGExportOptions {
  paperSize?: 'A1' | 'A2' | 'A3' | 'A4';
  orientation?: 'landscape' | 'portrait';
  scale?: string;
  includeGrid?: boolean;
  includeDatums?: boolean;
  includeDimensions?: boolean;
  includeLeaders?: boolean;
  includeHatching?: boolean;
  includeTitleBlock?: boolean;
  includeMeasurements?: boolean;
  themeId?: BlueprintThemeId;
}

export interface BlueprintEngineOptions {
  themeId?: BlueprintThemeId;
  initialCommissionId?: RubiconiusCommissionId;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  showGrid?: boolean;
  showDatums?: boolean;
  showDimensions?: boolean;
  showLeaders?: boolean;
  showHatching?: boolean;
  snapEnabled?: boolean;
  orthoEnabled?: boolean;
  tool?: BlueprintTool;
  onTelemetryUpdate?: (telemetry: CADTelemetry) => void;
  onMeasurementAdded?: (measurement: CADMeasurement) => void;
  onCommissionChanged?: (commission: RubiconiusCommission) => void;
}

export interface CADTelemetry {
  commissionId: RubiconiusCommissionId;
  commissionCode: string;
  zoom: number;
  cursorWorld: CADPoint;
  activeSnap: SnapPoint | null;
  activeMeasurement: CADMeasurement | null;
  measurementsCount: number;
  fps: number;
  elementCount: number;
}

// ============================================================================
// 02. COLOR THEMES & VISUAL TOKENS
// ============================================================================

export const BLUEPRINT_THEMES: Record<BlueprintThemeId, BlueprintTheme> = {
  classic_cyan: {
    id: 'classic_cyan',
    name: 'Cyan Blueprint',
    background: '#071626',
    minorGrid: 'rgba(0, 210, 255, 0.07)',
    majorGrid: 'rgba(0, 210, 255, 0.18)',
    moduleLine: 'rgba(0, 210, 255, 0.32)',
    axisLine: 'rgba(0, 255, 204, 0.55)',
    primaryProfile: '#E6F6FF',
    secondaryJoinery: '#7AD7FF',
    hairlineDetail: '#3AA7DB',
    hiddenLine: 'rgba(122, 215, 255, 0.45)',
    centerLine: 'rgba(255, 170, 50, 0.65)',
    dimensionLine: '#00E5FF',
    dimensionText: '#E6F6FF',
    datumLine: 'rgba(0, 229, 255, 0.4)',
    datumMarkerFill: '#00E5FF',
    datumMarkerStroke: '#071626',
    datumText: '#C8EEFF',
    leaderLine: '#FFCC00',
    leaderText: '#FFF4CC',
    hatchWood: 'rgba(122, 215, 255, 0.22)',
    hatchStone: 'rgba(255, 255, 255, 0.18)',
    hatchMarble: 'rgba(230, 246, 255, 0.28)',
    hatchBrick: 'rgba(255, 150, 100, 0.28)',
    hatchGlass: 'rgba(0, 255, 230, 0.3)',
    hatchMetal: 'rgba(255, 204, 0, 0.35)',
    hatchInsulation: 'rgba(255, 255, 150, 0.25)',
    rulerMeasurement: '#FF3366',
    rulerBadgeBg: '#0F263D',
    rulerBadgeText: '#FF5E85',
    snapMarker: '#00FFB2',
    titleBlockBorder: '#00D2FF',
    titleBlockText: '#E6F6FF',
    titleBlockBg: 'rgba(7, 22, 38, 0.94)',
  },
  dark_obsidian: {
    id: 'dark_obsidian',
    name: 'Obsidian & Bronze (Rubiconius Signature)',
    background: '#090A0D',
    minorGrid: 'rgba(167, 124, 77, 0.06)',
    majorGrid: 'rgba(167, 124, 77, 0.16)',
    moduleLine: 'rgba(197, 168, 128, 0.28)',
    axisLine: 'rgba(225, 195, 150, 0.45)',
    primaryProfile: '#F0ECE6',
    secondaryJoinery: '#C5A880',
    hairlineDetail: '#7A6B58',
    hiddenLine: 'rgba(197, 168, 128, 0.35)',
    centerLine: 'rgba(200, 80, 50, 0.55)',
    dimensionLine: '#A77C4D',
    dimensionText: '#F0ECE6',
    datumLine: 'rgba(197, 168, 128, 0.35)',
    datumMarkerFill: '#A77C4D',
    datumMarkerStroke: '#090A0D',
    datumText: '#D9C8B2',
    leaderLine: '#D4AF37',
    leaderText: '#F7EED2',
    hatchWood: 'rgba(167, 124, 77, 0.22)',
    hatchStone: 'rgba(220, 215, 205, 0.16)',
    hatchMarble: 'rgba(240, 236, 230, 0.25)',
    hatchBrick: 'rgba(180, 100, 70, 0.25)',
    hatchGlass: 'rgba(180, 210, 220, 0.25)',
    hatchMetal: 'rgba(212, 175, 55, 0.3)',
    hatchInsulation: 'rgba(197, 168, 128, 0.2)',
    rulerMeasurement: '#FF6B4A',
    rulerBadgeBg: '#181A20',
    rulerBadgeText: '#FF8A65',
    snapMarker: '#50E3C2',
    titleBlockBorder: '#A77C4D',
    titleBlockText: '#F0ECE6',
    titleBlockBg: 'rgba(12, 13, 17, 0.95)',
  },
  warm_vellum: {
    id: 'warm_vellum',
    name: 'Drafting Vellum',
    background: '#F7F5EE',
    minorGrid: 'rgba(100, 90, 80, 0.06)',
    majorGrid: 'rgba(90, 80, 70, 0.15)',
    moduleLine: 'rgba(70, 60, 50, 0.28)',
    axisLine: 'rgba(160, 50, 40, 0.5)',
    primaryProfile: '#1C1A17',
    secondaryJoinery: '#4A443B',
    hairlineDetail: '#7F786C',
    hiddenLine: 'rgba(80, 70, 60, 0.45)',
    centerLine: 'rgba(180, 60, 40, 0.65)',
    dimensionLine: '#544A3D',
    dimensionText: '#1C1A17',
    datumLine: 'rgba(84, 74, 61, 0.45)',
    datumMarkerFill: '#544A3D',
    datumMarkerStroke: '#F7F5EE',
    datumText: '#302A22',
    leaderLine: '#8C3D28',
    leaderText: '#1C1A17',
    hatchWood: 'rgba(84, 74, 61, 0.2)',
    hatchStone: 'rgba(50, 45, 40, 0.18)',
    hatchMarble: 'rgba(40, 35, 30, 0.22)',
    hatchBrick: 'rgba(140, 60, 40, 0.25)',
    hatchGlass: 'rgba(60, 110, 130, 0.25)',
    hatchMetal: 'rgba(160, 110, 30, 0.3)',
    hatchInsulation: 'rgba(100, 90, 80, 0.2)',
    rulerMeasurement: '#C82333',
    rulerBadgeBg: '#FFFFFF',
    rulerBadgeText: '#C82333',
    snapMarker: '#00875A',
    titleBlockBorder: '#302A22',
    titleBlockText: '#1C1A17',
    titleBlockBg: 'rgba(255, 255, 255, 0.95)',
  },
  monochrome_cad: {
    id: 'monochrome_cad',
    name: 'Precision Monochrome',
    background: '#121316',
    minorGrid: 'rgba(255, 255, 255, 0.05)',
    majorGrid: 'rgba(255, 255, 255, 0.14)',
    moduleLine: 'rgba(255, 255, 255, 0.26)',
    axisLine: 'rgba(255, 255, 255, 0.45)',
    primaryProfile: '#FFFFFF',
    secondaryJoinery: '#C8CBD0',
    hairlineDetail: '#7A7E85',
    hiddenLine: 'rgba(180, 185, 190, 0.4)',
    centerLine: 'rgba(255, 255, 255, 0.55)',
    dimensionLine: '#A0A5AE',
    dimensionText: '#FFFFFF',
    datumLine: 'rgba(200, 205, 210, 0.35)',
    datumMarkerFill: '#FFFFFF',
    datumMarkerStroke: '#121316',
    datumText: '#E0E3E8',
    leaderLine: '#D0D4DC',
    leaderText: '#FFFFFF',
    hatchWood: 'rgba(255, 255, 255, 0.18)',
    hatchStone: 'rgba(255, 255, 255, 0.16)',
    hatchMarble: 'rgba(255, 255, 255, 0.2)',
    hatchBrick: 'rgba(255, 255, 255, 0.22)',
    hatchGlass: 'rgba(255, 255, 255, 0.25)',
    hatchMetal: 'rgba(255, 255, 255, 0.28)',
    hatchInsulation: 'rgba(255, 255, 255, 0.18)',
    rulerMeasurement: '#FF4D4F',
    rulerBadgeBg: '#1F2228',
    rulerBadgeText: '#FF7875',
    snapMarker: '#52C41A',
    titleBlockBorder: '#808690',
    titleBlockText: '#FFFFFF',
    titleBlockBg: 'rgba(20, 22, 26, 0.95)',
  },
  blueprint_deep: {
    id: 'blueprint_deep',
    name: 'Deep Prussian Blueprint',
    background: '#04101E',
    minorGrid: 'rgba(64, 169, 255, 0.08)',
    majorGrid: 'rgba(64, 169, 255, 0.2)',
    moduleLine: 'rgba(64, 169, 255, 0.35)',
    axisLine: 'rgba(105, 192, 255, 0.55)',
    primaryProfile: '#BAE7FF',
    secondaryJoinery: '#69C0FF',
    hairlineDetail: '#1890FF',
    hiddenLine: 'rgba(105, 192, 255, 0.4)',
    centerLine: 'rgba(255, 197, 61, 0.65)',
    dimensionLine: '#40A9FF',
    dimensionText: '#E6F7FF',
    datumLine: 'rgba(64, 169, 255, 0.45)',
    datumMarkerFill: '#40A9FF',
    datumMarkerStroke: '#04101E',
    datumText: '#BAE7FF',
    leaderLine: '#FFC53D',
    leaderText: '#FFFBE6',
    hatchWood: 'rgba(105, 192, 255, 0.22)',
    hatchStone: 'rgba(186, 231, 255, 0.18)',
    hatchMarble: 'rgba(230, 247, 255, 0.25)',
    hatchBrick: 'rgba(255, 122, 69, 0.25)',
    hatchGlass: 'rgba(54, 207, 201, 0.3)',
    hatchMetal: 'rgba(255, 214, 102, 0.32)',
    hatchInsulation: 'rgba(255, 241, 184, 0.22)',
    rulerMeasurement: '#FF4D4F',
    rulerBadgeBg: '#09213D',
    rulerBadgeText: '#FF7875',
    snapMarker: '#36CFC9',
    titleBlockBorder: '#1890FF',
    titleBlockText: '#E6F7FF',
    titleBlockBg: 'rgba(4, 16, 30, 0.96)',
  },
};

// ============================================================================
// 03. MATHEMATICAL & GEOMETRIC HELPER UTILITIES
// ============================================================================

export function distance(p1: CADPoint, p2: CADPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(p1: CADPoint, p2: CADPoint): CADPoint {
  return {
    x: (p1.x + p2.x) * 0.5,
    y: (p1.y + p2.y) * 0.5,
  };
}

export function angleRadians(p1: CADPoint, p2: CADPoint): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function angleDegrees(p1: CADPoint, p2: CADPoint): number {
  let deg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function formatMetricMm(mm: number, includeUnit = true): string {
  const rounded = Math.round(mm);
  const formatted = rounded.toLocaleString('en-US');
  return includeUnit ? `${formatted} mm` : formatted;
}

export function formatElevationM(elevationMm: number): string {
  const meters = elevationMm / 1000.0;
  if (Math.abs(meters) < 0.001) {
    return '±0.000 M';
  }
  const sign = meters > 0 ? '+' : '';
  return `${sign}${meters.toFixed(3)} M`;
}

export function snapToOrtho(p1: CADPoint, p2: CADPoint): CADPoint {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  if (dx >= dy) {
    // Horizontal lock
    return { x: p2.x, y: p1.y };
  } else {
    // Vertical lock
    return { x: p1.x, y: p2.y };
  }
}

export function projectPointOnLineSegment(
  p: CADPoint,
  a: CADPoint,
  b: CADPoint
): { point: CADPoint; t: number; distance: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    return { point: a, t: 0, distance: distance(p, a) };
  }
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  let t = (apx * abx + apy * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * abx, y: a.y + t * aby };
  return { point: proj, t, distance: distance(p, proj) };
}

export function lineIntersection(
  a1: CADPoint,
  a2: CADPoint,
  b1: CADPoint,
  b2: CADPoint
): CADPoint | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-9) return null; // Parallel

  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom;
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * dax,
      y: a1.y + t * day,
    };
  }
  return null;
}

export function computeBounds(elements: CADGeometryElement[]): CADBounds {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    switch (el.type) {
      case 'line':
        minX = Math.min(minX, el.p1.x, el.p2.x);
        minY = Math.min(minY, el.p1.y, el.p2.y);
        maxX = Math.max(maxX, el.p1.x, el.p2.x);
        maxY = Math.max(maxY, el.p1.y, el.p2.y);
        break;
      case 'rect':
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
        break;
      case 'arc':
        minX = Math.min(minX, el.center.x - el.radius);
        minY = Math.min(minY, el.center.y - el.radius);
        maxX = Math.max(maxX, el.center.x + el.radius);
        maxY = Math.max(maxY, el.center.y + el.radius);
        break;
      case 'polyline':
        for (const pt of el.points) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
        break;
      case 'text':
        minX = Math.min(minX, el.position.x);
        minY = Math.min(minY, el.position.y);
        maxX = Math.max(maxX, el.position.x + 200);
        maxY = Math.max(maxY, el.position.y + el.fontSize);
        break;
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(10, maxX - minX),
    height: Math.max(10, maxY - minY),
  };
}

// ============================================================================
// 04. PROCEDURAL COMMISSIONS ELEVATION DATA GENERATOR
// ============================================================================

/**
 * 01. FLUTED MASTER SUITE (RUB-MS-01)
 * Width: 8,450 mm, Height: 3,400 mm
 */
function createFlutedMasterSuite(): RubiconiusCommission {
  const elements: CADGeometryElement[] = [];
  const datums: CADDatum[] = [];
  const dimensions: CADDimension[] = [];
  const leaders: CADLeader[] = [];
  const hatches: CADHatch[] = [];

  const W = 8450;
  const H = 3400;

  // 1. Structural Perimeter & Slab Boundaries
  // Floor Line (F.F.L. = 0)
  elements.push({
    type: 'line',
    id: 'fms-ffl',
    layer: 'structural',
    p1: { x: -400, y: 0 },
    p2: { x: W + 400, y: 0 },
    style: { stroke: '#E6F6FF', strokeWidth: 2.5 },
    weightClass: 'primary',
  });

  // Structural Concrete Slab (S.S.L. = -150)
  elements.push({
    type: 'line',
    id: 'fms-ssl',
    layer: 'structural',
    p1: { x: -400, y: -150 },
    p2: { x: W + 400, y: -150 },
    style: { stroke: '#7AD7FF', strokeWidth: 1.5, strokeDasharray: [8, 4] },
    weightClass: 'hidden',
  });

  // Structural Walls Left & Right
  elements.push(
    {
      type: 'line',
      id: 'fms-wall-l',
      layer: 'structural',
      p1: { x: 0, y: -150 },
      p2: { x: 0, y: H + 200 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.0 },
      weightClass: 'primary',
    },
    {
      type: 'line',
      id: 'fms-wall-r',
      layer: 'structural',
      p1: { x: W, y: -150 },
      p2: { x: W, y: H + 200 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.0 },
      weightClass: 'primary',
    }
  );

  // Ceiling Soffit (+3,400 mm)
  elements.push({
    type: 'line',
    id: 'fms-ceiling',
    layer: 'structural',
    p1: { x: -400, y: H },
    p2: { x: W + 400, y: H },
    style: { stroke: '#E6F6FF', strokeWidth: 2.5 },
    weightClass: 'primary',
  });

  // 2. Baseboard: Honed Kota Stone Skirting (+120 mm) with 15mm shadowline
  elements.push(
    {
      type: 'rect',
      id: 'fms-skirting',
      layer: 'joinery',
      x: 0,
      y: 0,
      width: W,
      height: 120,
      style: { stroke: '#7AD7FF', strokeWidth: 1.2 },
      weightClass: 'secondary',
    },
    {
      type: 'line',
      id: 'fms-skirting-shadowline',
      layer: 'joinery',
      p1: { x: 0, y: 135 },
      p2: { x: W, y: 135 },
      style: { stroke: '#3AA7DB', strokeWidth: 0.8 },
      weightClass: 'hairline',
    }
  );

  // 3. Zone 1: Concealed Sal Timber Pivot Door (x: 200 to 1,150 mm, W: 950mm, H: 2,700mm)
  const doorX = 200;
  const doorW = 950;
  const doorH = 2700;
  elements.push(
    // Door outer frame
    {
      type: 'rect',
      id: 'fms-door-frame',
      layer: 'joinery',
      x: doorX,
      y: 120,
      width: doorW,
      height: doorH - 120,
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    // Door Leaf
    {
      type: 'rect',
      id: 'fms-door-leaf',
      layer: 'joinery',
      x: doorX + 15,
      y: 120,
      width: doorW - 30,
      height: doorH - 120 - 15,
      style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
      weightClass: 'secondary',
    },
    // Pivot axis centerline
    {
      type: 'line',
      id: 'fms-door-pivot-axis',
      layer: 'centerlines',
      p1: { x: doorX + 90, y: 100 },
      p2: { x: doorX + 90, y: doorH + 20 },
      style: { stroke: '#FFCC00', strokeWidth: 0.8, strokeDasharray: [10, 4, 2, 4] },
      weightClass: 'centerline',
    },
    // Minimalist brass latch rebate & pull
    {
      type: 'rect',
      id: 'fms-door-pull',
      layer: 'joinery',
      x: doorX + doorW - 70,
      y: 1050,
      width: 18,
      height: 220,
      style: { stroke: '#FFCC00', strokeWidth: 1.2 },
      weightClass: 'secondary',
    },
    // Transom panelling above door to ceiling
    {
      type: 'rect',
      id: 'fms-door-transom',
      layer: 'joinery',
      x: doorX,
      y: doorH,
      width: doorW,
      height: H - doorH,
      style: { stroke: '#7AD7FF', strokeWidth: 1.2 },
      weightClass: 'secondary',
    }
  );

  // 4. Zone 2: Fluted Sal Wood Feature Wall Panelling (x: 1,350 mm to 6,150 mm)
  const fluteStartX = 1350;
  const fluteEndX = 6150;
  const flutePitch = 50; // 50mm flute spacing (96 flutes)
  const fluteCount = Math.floor((fluteEndX - fluteStartX) / flutePitch);

  for (let i = 0; i <= fluteCount; i++) {
    const fx = fluteStartX + i * flutePitch;
    elements.push({
      type: 'line',
      id: `fms-flute-${i}`,
      layer: 'joinery',
      p1: { x: fx, y: 135 },
      p2: { x: fx, y: H - 80 },
      style: { stroke: '#3AA7DB', strokeWidth: 0.6 },
      weightClass: 'hairline',
    });
  }

  // Fluted panel boundary frame
  elements.push({
    type: 'rect',
    id: 'fms-flute-frame',
    layer: 'joinery',
    x: fluteStartX,
    y: 135,
    width: fluteEndX - fluteStartX,
    height: H - 135 - 80,
    style: { stroke: '#7AD7FF', strokeWidth: 1.6 },
    weightClass: 'secondary',
  });

  // 5. Upholstered Master Bed Headboard & Floating Nightstands
  // Central Headboard: W: 2,400mm, H: 1,150mm (x: 2,550 to 4,950 mm)
  const hbX = 2550;
  const hbW = 2400;
  const hbH = 1150;
  elements.push(
    {
      type: 'rect',
      id: 'fms-headboard-outer',
      layer: 'furniture',
      x: hbX,
      y: 120,
      width: hbW,
      height: hbH - 120,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    },
    // Recessed LED cove trough at top of headboard
    {
      type: 'rect',
      id: 'fms-led-cove',
      layer: 'electrical',
      x: hbX - 20,
      y: hbH,
      width: hbW + 40,
      height: 35,
      style: { stroke: '#FFCC00', strokeWidth: 1.0 },
      weightClass: 'secondary',
    }
  );

  // Nightstand Left (x: 1,600 to 2,300 mm, W: 700mm, H: 220mm, cantilevered at +450mm)
  const nsLW = 700;
  const nsLX = 1700;
  const nsH = 200;
  const nsY = 450;
  elements.push(
    {
      type: 'rect',
      id: 'fms-nightstand-l',
      layer: 'furniture',
      x: nsLX,
      y: nsY - nsH,
      width: nsLW,
      height: nsH,
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    // Concealed brass edge pull
    {
      type: 'line',
      id: 'fms-ns-pull-l',
      layer: 'furniture',
      p1: { x: nsLX + 50, y: nsY - 8 },
      p2: { x: nsLX + nsLW - 50, y: nsY - 8 },
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // Nightstand Right (x: 5,200 to 5,900 mm)
  const nsRX = 5100;
  elements.push(
    {
      type: 'rect',
      id: 'fms-nightstand-r',
      layer: 'furniture',
      x: nsRX,
      y: nsY - nsH,
      width: nsLW,
      height: nsH,
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    {
      type: 'line',
      id: 'fms-ns-pull-r',
      layer: 'furniture',
      p1: { x: nsRX + 50, y: nsY - 8 },
      p2: { x: nsRX + nsLW - 50, y: nsY - 8 },
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // Spun Brass Sconces (+1,650mm F.F.L.)
  elements.push(
    {
      type: 'rect',
      id: 'fms-sconce-l',
      layer: 'electrical',
      x: nsLX + nsLW / 2 - 25,
      y: 1650 - 150,
      width: 50,
      height: 300,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    },
    {
      type: 'rect',
      id: 'fms-sconce-r',
      layer: 'electrical',
      x: nsRX + nsLW / 2 - 25,
      y: 1650 - 150,
      width: 50,
      height: 300,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // 6. Zone 3: Fluted Glass & Architectural Bronze Partition (x: 6,350 to 8,250 mm, W: 1,900mm, H: 2,800mm)
  const glassX = 6350;
  const glassW = 1900;
  const glassH = 2800;
  elements.push(
    // Bronze outer frame
    {
      type: 'rect',
      id: 'fms-glass-outer',
      layer: 'joinery',
      x: glassX,
      y: 120,
      width: glassW,
      height: glassH - 120,
      style: { stroke: '#FFCC00', strokeWidth: 2.2 },
      weightClass: 'primary',
    },
    // Center Mullion
    {
      type: 'line',
      id: 'fms-glass-mullion',
      layer: 'joinery',
      p1: { x: glassX + glassW / 2, y: 120 },
      p2: { x: glassX + glassW / 2, y: glassH },
      style: { stroke: '#FFCC00', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    // Horizontal Transom Rail at +2,200mm
    {
      type: 'line',
      id: 'fms-glass-transom',
      layer: 'joinery',
      p1: { x: glassX, y: 2200 },
      p2: { x: glassX + glassW, y: 2200 },
      style: { stroke: '#FFCC00', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    // Vertical tubular bronze door handle (1,200mm length)
    {
      type: 'line',
      id: 'fms-glass-door-pull',
      layer: 'joinery',
      p1: { x: glassX + glassW / 2 + 60, y: 800 },
      p2: { x: glassX + glassW / 2 + 60, y: 2000 },
      style: { stroke: '#FFCC00', strokeWidth: 2.5 },
      weightClass: 'primary',
    }
  );

  // Section Hatching for Fluted Glass (reed pattern)
  hatches.push({
    id: 'fms-hatch-glass-l',
    polygon: [
      { x: glassX + 10, y: 130 },
      { x: glassX + glassW / 2 - 10, y: 130 },
      { x: glassX + glassW / 2 - 10, y: 2190 },
      { x: glassX + 10, y: 2190 },
    ],
    pattern: 'glass_reed',
    pitchMm: 30,
    angleRad: Math.PI / 2, // Vertical reeds
  });
  hatches.push({
    id: 'fms-hatch-glass-r',
    polygon: [
      { x: glassX + glassW / 2 + 10, y: 130 },
      { x: glassX + glassW - 10, y: 130 },
      { x: glassX + glassW - 10, y: 2190 },
      { x: glassX + glassW / 2 + 10, y: 2190 },
    ],
    pattern: 'glass_reed',
    pitchMm: 30,
    angleRad: Math.PI / 2,
  });

  // Ceiling dropped lighting trough at perimeter
  elements.push(
    {
      type: 'rect',
      id: 'fms-ceiling-cove',
      layer: 'structural',
      x: 0,
      y: H - 150,
      width: W,
      height: 150,
      style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
      weightClass: 'secondary',
    },
    {
      type: 'line',
      id: 'fms-cove-shadowline',
      layer: 'structural',
      p1: { x: 0, y: H - 170 },
      p2: { x: W, y: H - 170 },
      style: { stroke: '#3AA7DB', strokeWidth: 0.8 },
      weightClass: 'hairline',
    }
  );

  // 7. Elevation Datums
  datums.push(
    {
      id: 'fms-dat-ssl',
      elevationMm: -150,
      code: 'S.S.L.',
      label: 'STRUCTURAL CONCRETE SLAB',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
    },
    {
      id: 'fms-dat-ffl',
      elevationMm: 0,
      code: 'F.F.L.',
      label: 'FINISHED FLOOR LEVEL',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
      isKeyDatum: true,
    },
    {
      id: 'fms-dat-skirting',
      elevationMm: 120,
      code: 'T.O.B.B.',
      label: 'HONED KOTA STONE SKIRTING',
      xStart: -150,
      xEnd: W + 150,
      side: 'left',
    },
    {
      id: 'fms-dat-nightstand',
      elevationMm: 450,
      code: 'T.O.N.S.',
      label: 'CANTILEVERED NIGHTSTAND TOP',
      xStart: nsLX - 80,
      xEnd: nsRX + nsLW + 80,
      side: 'left',
    },
    {
      id: 'fms-dat-headboard',
      elevationMm: 1150,
      code: 'T.O.H.B.',
      label: 'FLUTED LINEN HEADBOARD / LED COVE',
      xStart: hbX - 100,
      xEnd: hbX + hbW + 100,
      side: 'left',
    },
    {
      id: 'fms-dat-sconce',
      elevationMm: 1650,
      code: 'C.L. SCONCE',
      label: 'SPUN BRASS SCONCE CENTERLINE',
      xStart: nsLX - 50,
      xEnd: nsRX + nsLW + 50,
      side: 'right',
    },
    {
      id: 'fms-dat-door',
      elevationMm: 2700,
      code: 'T.O.D.',
      label: 'CONCEALED PIVOT DOOR HEAD',
      xStart: doorX - 80,
      xEnd: doorX + doorW + 80,
      side: 'left',
    },
    {
      id: 'fms-dat-glass',
      elevationMm: 2800,
      code: 'T.O.F.G.',
      label: 'FLUTED GLASS BRONZE TRANSOM',
      xStart: glassX - 80,
      xEnd: glassX + glassW + 80,
      side: 'right',
    },
    {
      id: 'fms-dat-ceiling',
      elevationMm: 3400,
      code: 'T.O.C.',
      label: 'CEILING SOFFIT LEVEL',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
      isKeyDatum: true,
    }
  );

  // 8. Multi-Tier Dimensions
  // Horizontal Tier 1: Sub-elements
  dimensions.push(
    {
      id: 'fms-dim-door-w',
      p1: { x: doorX, y: doorH + 100 },
      p2: { x: doorX + doorW, y: doorH + 100 },
      offsetMm: 150,
      text: `${doorW}`,
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fms-dim-flute-w',
      p1: { x: fluteStartX, y: H + 80 },
      p2: { x: fluteEndX, y: H + 80 },
      offsetMm: 120,
      text: `${fluteEndX - fluteStartX}`,
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fms-dim-headboard-w',
      p1: { x: hbX, y: hbH + 80 },
      p2: { x: hbX + hbW, y: hbH + 80 },
      offsetMm: 100,
      text: `${hbW}`,
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fms-dim-glass-w',
      p1: { x: glassX, y: glassH + 80 },
      p2: { x: glassX + glassW, y: glassH + 80 },
      offsetMm: 120,
      text: `${glassW}`,
      tier: 1,
      orientation: 'horizontal',
    }
  );

  // Horizontal Tier 2: Major Architectural Bays
  dimensions.push(
    {
      id: 'fms-dim-bay-1',
      p1: { x: 0, y: H + 280 },
      p2: { x: fluteStartX, y: H + 280 },
      offsetMm: 180,
      text: `${fluteStartX}`,
      tier: 2,
      orientation: 'horizontal',
    },
    {
      id: 'fms-dim-bay-2',
      p1: { x: fluteStartX, y: H + 280 },
      p2: { x: fluteEndX, y: H + 280 },
      offsetMm: 180,
      text: `${fluteEndX - fluteStartX}`,
      tier: 2,
      orientation: 'horizontal',
    },
    {
      id: 'fms-dim-bay-3',
      p1: { x: fluteEndX, y: H + 280 },
      p2: { x: W, y: H + 280 },
      offsetMm: 180,
      text: `${W - fluteEndX}`,
      tier: 2,
      orientation: 'horizontal',
    }
  );

  // Horizontal Tier 3: Overall Room Span
  dimensions.push({
    id: 'fms-dim-overall-w',
    p1: { x: 0, y: H + 520 },
    p2: { x: W, y: H + 520 },
    offsetMm: 250,
    text: `${W}`,
    tier: 3,
    orientation: 'horizontal',
  });

  // Vertical Dimensions Left Side (Floor to ceiling)
  dimensions.push(
    {
      id: 'fms-dim-v-skirt',
      p1: { x: -280, y: 0 },
      p2: { x: -280, y: 120 },
      offsetMm: 120,
      text: '120',
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fms-dim-v-ns',
      p1: { x: -280, y: 120 },
      p2: { x: -280, y: 450 },
      offsetMm: 120,
      text: '330',
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fms-dim-v-hb',
      p1: { x: -280, y: 450 },
      p2: { x: -280, y: 1150 },
      offsetMm: 120,
      text: '700',
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fms-dim-v-door',
      p1: { x: -280, y: 1150 },
      p2: { x: -280, y: 2700 },
      offsetMm: 120,
      text: '1550',
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fms-dim-v-clg-top',
      p1: { x: -280, y: 2700 },
      p2: { x: -280, y: H },
      offsetMm: 120,
      text: '700',
      tier: 1,
      orientation: 'vertical',
    },
    // Overall Height
    {
      id: 'fms-dim-overall-h',
      p1: { x: -500, y: 0 },
      p2: { x: -500, y: H },
      offsetMm: 220,
      text: `${H}`,
      tier: 3,
      orientation: 'vertical',
    }
  );

  // 9. Leader Annotations
  leaders.push(
    {
      id: 'fms-lead-door',
      target: { x: doorX + doorW / 2, y: 2000 },
      elbow: { x: doorX + doorW / 2 - 120, y: 2250 },
      shelfEnd: { x: doorX - 180, y: 2250 },
      note: 'SEASONED SAL TIMBER PIVOT DOOR',
      secondaryNote: '950 × 2,700 MM · CONCEALED TECTUS HINGES',
    },
    {
      id: 'fms-lead-fluting',
      target: { x: 2100, y: 2400 },
      elbow: { x: 2300, y: 2650 },
      shelfEnd: { x: 3100, y: 2650 },
      note: 'FLUTED SAL WOOD WALL PANELLING',
      secondaryNote: '50MM O.C. HALF-ROUND RIBS · MATTE POLYURETHANE FINISH',
    },
    {
      id: 'fms-lead-sconce',
      target: { x: nsLX + nsLW / 2, y: 1650 },
      elbow: { x: nsLX + nsLW / 2 - 120, y: 1800 },
      shelfEnd: { x: 800, y: 1800 },
      note: 'SPUN ARCHITECTURAL BRASS SCONCE',
      secondaryNote: '2200K WARM INDIRECT LIGHTING TUBE',
    },
    {
      id: 'fms-lead-glass',
      target: { x: glassX + glassW / 2, y: 1600 },
      elbow: { x: glassX + glassW / 2 + 150, y: 1900 },
      shelfEnd: { x: glassX + glassW + 350, y: 1900 },
      note: 'FLUTED GLASS & PATINATED BRONZE SCREEN',
      secondaryNote: '12MM TEMPERED REEDED GLASS · 45MM BRONZE MULLIONS',
    },
    {
      id: 'fms-lead-skirt',
      target: { x: 7200, y: 60 },
      elbow: { x: 7400, y: -80 },
      shelfEnd: { x: 8200, y: -80 },
      note: 'HONED KOTA STONE BASEBOARD',
      secondaryNote: '120MM PROFILE WITH 15MM NEGATIVE SHADOWLINE REVEAL',
    }
  );

  return {
    id: 'fluted_master_suite',
    code: 'RUB-MS-01',
    title: 'Fluted Master Suite & Bedroom Sanctuary',
    subtitle: 'Primary Architectural Elevation & Detailed Joinery Section',
    scaleText: '1:50 @ A3 / 1:20 @ A1',
    nominalScale: 50,
    roomDimensions: { widthMm: W, heightMm: H, depthMm: 5600 },
    client: 'Private Residential Commission',
    location: 'Biratnagar, Koshi Province, Nepal',
    leadArchitect: 'Riya Agrawal · Rubiconius Studio',
    dateStr: '2026-11-23',
    revision: 'REV 04 · CONSTRUCTION ISSUE',
    sheetNo: 'ELEV-01',
    drawingTitle: 'BEDROOM SUITE ELEVATION & JOINERY',
    bounds: { minX: -600, minY: -300, maxX: W + 600, maxY: H + 700, width: W + 1200, height: H + 1000 },
    elements,
    datums,
    dimensions,
    leaders,
    hatches,
    notes: [
      'ALL DIMENSIONS ARE IN MILLIMETERS (MM) UNLESS NOTED OTHERWISE.',
      'CONTRACTOR TO VERIFY ALL SITE LEVELS PRIOR TO SHOP DRAWING FABRICATION.',
      'ALL SAL TIMBER TO BE AIR-DRIED AND SEASONED TO MC 10-12% REGIONAL CLIMATE SPEC.',
      'BRASS HARDWARE TO BE SOLID UNLACQUERED ARCHITECTURAL ALLOY WITH NATURAL PATINATION.',
    ],
  };
}

/**
 * 02. FORMAL DRAWING ROOM (RUB-DR-02)
 * Width: 10,800 mm, Height: 3,800 mm
 */
function createFormalDrawingRoom(): RubiconiusCommission {
  const elements: CADGeometryElement[] = [];
  const datums: CADDatum[] = [];
  const dimensions: CADDimension[] = [];
  const leaders: CADLeader[] = [];
  const hatches: CADHatch[] = [];

  const W = 10800;
  const H = 3800;

  // 1. Structural Boundaries
  elements.push(
    // Floor
    {
      type: 'line',
      id: 'fdr-ffl',
      layer: 'structural',
      p1: { x: -450, y: 0 },
      p2: { x: W + 450, y: 0 },
      style: { stroke: '#E6F6FF', strokeWidth: 2.8 },
      weightClass: 'primary',
    },
    // Subfloor Slab
    {
      type: 'line',
      id: 'fdr-ssl',
      layer: 'structural',
      p1: { x: -450, y: -200 },
      p2: { x: W + 450, y: -200 },
      style: { stroke: '#7AD7FF', strokeWidth: 1.6, strokeDasharray: [8, 4] },
      weightClass: 'hidden',
    },
    // Walls
    {
      type: 'line',
      id: 'fdr-wall-l',
      layer: 'structural',
      p1: { x: 0, y: -200 },
      p2: { x: 0, y: H + 250 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.2 },
      weightClass: 'primary',
    },
    {
      type: 'line',
      id: 'fdr-wall-r',
      layer: 'structural',
      p1: { x: W, y: -200 },
      p2: { x: W, y: H + 250 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.2 },
      weightClass: 'primary',
    },
    // Ceiling Line
    {
      type: 'line',
      id: 'fdr-clg',
      layer: 'structural',
      p1: { x: -450, y: H },
      p2: { x: W + 450, y: H },
      style: { stroke: '#E6F6FF', strokeWidth: 2.8 },
      weightClass: 'primary',
    }
  );

  // 2. Heavy Coffered Ceiling Beams (3 monumental beams, 280mm deep × 350mm wide)
  const beamY = H - 280;
  elements.push(
    {
      type: 'rect',
      id: 'fdr-beam-1',
      layer: 'structural',
      x: 3400,
      y: beamY,
      width: 350,
      height: 280,
      style: { stroke: '#7AD7FF', strokeWidth: 2.0 },
      weightClass: 'secondary',
    },
    {
      type: 'rect',
      id: 'fdr-beam-2',
      layer: 'structural',
      x: 7050,
      y: beamY,
      width: 350,
      height: 280,
      style: { stroke: '#7AD7FF', strokeWidth: 2.0 },
      weightClass: 'secondary',
    },
    // Continuous beam soffit line
    {
      type: 'line',
      id: 'fdr-beam-soffit',
      layer: 'structural',
      p1: { x: 0, y: beamY },
      p2: { x: W, y: beamY },
      style: { stroke: '#3AA7DB', strokeWidth: 1.2, strokeDasharray: [12, 6] },
      weightClass: 'hairline',
    }
  );

  // 3. Central Monumental Fireplace Breast & Marble Cladding (x: 3,750 to 7,050 mm, W: 3,300mm)
  const fpX = 3750;
  const fpW = 3300;
  elements.push(
    // Monumental stone fireplace breast (floor to ceiling)
    {
      type: 'rect',
      id: 'fdr-fp-breast',
      layer: 'joinery',
      x: fpX,
      y: 0,
      width: fpW,
      height: H,
      style: { stroke: '#E6F6FF', strokeWidth: 2.4 },
      weightClass: 'primary',
    },
    // Marble Raised Plinth Hearth (+150mm F.F.L., W: 3,500mm projecting 100mm each side)
    {
      type: 'rect',
      id: 'fdr-fp-hearth',
      layer: 'joinery',
      x: fpX - 100,
      y: 0,
      width: fpW + 200,
      height: 150,
      style: { stroke: '#7AD7FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    },
    // Firebox Opening (1,600mm wide × 900mm high, centered in fireplace breast)
    {
      type: 'rect',
      id: 'fdr-fp-opening',
      layer: 'joinery',
      x: fpX + (fpW - 1600) / 2,
      y: 150,
      width: 1600,
      height: 900,
      style: { stroke: '#FFCC00', strokeWidth: 2.5 },
      weightClass: 'primary',
    },
    // Firebox Solid Brass Trim Reveal (50mm frame)
    {
      type: 'rect',
      id: 'fdr-fp-brass-trim',
      layer: 'joinery',
      x: fpX + (fpW - 1600) / 2 - 50,
      y: 150,
      width: 1600 + 100,
      height: 900 + 50,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    },
    // Cantilevered Stone Mantel Shelf (+1,200mm F.F.L., 2,200mm wide × 100mm thick)
    {
      type: 'rect',
      id: 'fdr-fp-mantel',
      layer: 'joinery',
      x: fpX + (fpW - 2200) / 2,
      y: 1200,
      width: 2200,
      height: 100,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    },
    // Recessed Artwork Niche above Mantel (W: 1,800mm × H: 1,450mm, +1,500mm to +2,950mm)
    {
      type: 'rect',
      id: 'fdr-fp-art-niche',
      layer: 'joinery',
      x: fpX + (fpW - 1800) / 2,
      y: 1500,
      width: 1800,
      height: 1450,
      style: { stroke: '#7AD7FF', strokeWidth: 1.6 },
      weightClass: 'secondary',
    },
    // Directional Architectural Picture Light (+3,100mm)
    {
      type: 'rect',
      id: 'fdr-fp-picture-light',
      layer: 'electrical',
      x: fpX + (fpW - 900) / 2,
      y: 3100,
      width: 900,
      height: 40,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // Marble Vein Hatching in Breast
  hatches.push({
    id: 'fdr-hatch-marble-l',
    polygon: [
      { x: fpX + 30, y: 1350 },
      { x: fpX + (fpW - 1800) / 2 - 20, y: 1350 },
      { x: fpX + (fpW - 1800) / 2 - 20, y: H - 320 },
      { x: fpX + 30, y: H - 320 },
    ],
    pattern: 'marble_vein',
    pitchMm: 120,
    angleRad: Math.PI / 4,
  });
  hatches.push({
    id: 'fdr-hatch-marble-r',
    polygon: [
      { x: fpX + (fpW + 1800) / 2 + 20, y: 1350 },
      { x: fpX + fpW - 30, y: 1350 },
      { x: fpX + fpW - 30, y: H - 320 },
      { x: fpX + (fpW + 1800) / 2 + 20, y: H - 320 },
    ],
    pattern: 'marble_vein',
    pitchMm: 120,
    angleRad: -Math.PI / 4, // Bookmatched reverse angle
  });

  // Refractory Herringbone Brick Hatch in Firebox
  hatches.push({
    id: 'fdr-hatch-firebox',
    polygon: [
      { x: fpX + (fpW - 1600) / 2 + 10, y: 160 },
      { x: fpX + (fpW + 1600) / 2 - 10, y: 160 },
      { x: fpX + (fpW + 1600) / 2 - 10, y: 1040 },
      { x: fpX + (fpW - 1600) / 2 + 10, y: 1040 },
    ],
    pattern: 'brick_herringbone',
    pitchMm: 65,
    angleRad: Math.PI / 4,
  });

  // 4. Symmetrical Library Millwork (Left: 0 to 3,400mm; Right: 7,400 to 10,800mm)
  // Left Library
  const libLW = 3400;
  const credenzaH = 850;
  // Lower Credenza Cabinets
  elements.push(
    {
      type: 'rect',
      id: 'fdr-lib-credenza-l',
      layer: 'joinery',
      x: 0,
      y: 0,
      width: libLW,
      height: credenzaH,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    },
    // Countertop reveal
    {
      type: 'rect',
      id: 'fdr-lib-top-l',
      layer: 'joinery',
      x: 0,
      y: credenzaH - 40,
      width: libLW,
      height: 40,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // 4 Credenza Doors Left
  const doorWidthL = libLW / 4;
  for (let i = 0; i < 4; i++) {
    elements.push({
      type: 'rect',
      id: 'fdr-credenza-door-l-' + i,
      layer: 'joinery',
      x: i * doorWidthL + 15,
      y: 120,
      width: doorWidthL - 30,
      height: credenzaH - 120 - 45,
      style: { stroke: '#7AD7FF', strokeWidth: 1.2 },
      weightClass: 'secondary',
    });
  }

  // Upper Library Shelves Left: 4 bays, each with 5 adjustable shelves
  const shelfCount = 5;
  const upperH = H - 320 - credenzaH;
  for (let b = 0; b < 4; b++) {
    const bx = b * doorWidthL;
    // Stile / partition line
    elements.push({
      type: 'line',
      id: 'fdr-lib-stile-l-' + b,
      layer: 'joinery',
      p1: { x: bx, y: credenzaH },
      p2: { x: bx, y: H - 320 },
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    });

    // Horizontal Shelves
    for (let s = 1; s <= shelfCount; s++) {
      const sy = credenzaH + (s * upperH) / (shelfCount + 1);
      elements.push({
        type: 'line',
        id: `fdr-shelf-l-${b}-${s}`,
        layer: 'joinery',
        p1: { x: bx + 10, y: sy },
        p2: { x: bx + doorWidthL - 10, y: sy },
        style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
        weightClass: 'secondary',
      });
    }
  }

  // Right Library (x: 7,400 to 10,800mm)
  const libRX = 7400;
  elements.push(
    {
      type: 'rect',
      id: 'fdr-lib-credenza-r',
      layer: 'joinery',
      x: libRX,
      y: 0,
      width: libLW,
      height: credenzaH,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    },
    {
      type: 'rect',
      id: 'fdr-lib-top-r',
      layer: 'joinery',
      x: libRX,
      y: credenzaH - 40,
      width: libLW,
      height: 40,
      style: { stroke: '#FFCC00', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  for (let i = 0; i < 4; i++) {
    elements.push({
      type: 'rect',
      id: 'fdr-credenza-door-r-' + i,
      layer: 'joinery',
      x: libRX + i * doorWidthL + 15,
      y: 120,
      width: doorWidthL - 30,
      height: credenzaH - 120 - 45,
      style: { stroke: '#7AD7FF', strokeWidth: 1.2 },
      weightClass: 'secondary',
    });
  }

  for (let b = 0; b < 4; b++) {
    const bx = libRX + b * doorWidthL;
    elements.push({
      type: 'line',
      id: 'fdr-lib-stile-r-' + b,
      layer: 'joinery',
      p1: { x: bx, y: credenzaH },
      p2: { x: bx, y: H - 320 },
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'secondary',
    });

    for (let s = 1; s <= shelfCount; s++) {
      const sy = credenzaH + (s * upperH) / (shelfCount + 1);
      elements.push({
        type: 'line',
        id: `fdr-shelf-r-${b}-${s}`,
        layer: 'joinery',
        p1: { x: bx + 10, y: sy },
        p2: { x: bx + doorWidthL - 10, y: sy },
        style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
        weightClass: 'secondary',
      });
    }
  }

  // Continuous Solid Brass Library Rolling Ladder Rail (+3,200mm F.F.L.)
  elements.push(
    {
      type: 'line',
      id: 'fdr-ladder-rail-l',
      layer: 'joinery',
      p1: { x: 50, y: 3200 },
      p2: { x: libLW - 50, y: 3200 },
      style: { stroke: '#FFCC00', strokeWidth: 2.2 },
      weightClass: 'primary',
    },
    {
      type: 'line',
      id: 'fdr-ladder-rail-r',
      layer: 'joinery',
      p1: { x: libRX + 50, y: 3200 },
      p2: { x: W - 50, y: 3200 },
      style: { stroke: '#FFCC00', strokeWidth: 2.2 },
      weightClass: 'primary',
    }
  );

  // 5. Elevation Datums
  datums.push(
    {
      id: 'fdr-dat-ssl',
      elevationMm: -200,
      code: 'S.S.L.',
      label: 'STRUCTURAL CONCRETE FOUNDATION',
      xStart: -300,
      xEnd: W + 300,
      side: 'both',
    },
    {
      id: 'fdr-dat-ffl',
      elevationMm: 0,
      code: 'F.F.L.',
      label: 'FINISHED FLOOR LEVEL',
      xStart: -300,
      xEnd: W + 300,
      side: 'both',
      isKeyDatum: true,
    },
    {
      id: 'fdr-dat-hearth',
      elevationMm: 150,
      code: 'T.O.H.',
      label: 'RAISED STONE HEARTH PLINTH',
      xStart: fpX - 150,
      xEnd: fpX + fpW + 150,
      side: 'left',
    },
    {
      id: 'fdr-dat-credenza',
      elevationMm: 850,
      code: 'T.O.C.C.',
      label: 'JOINERY CREDENZA COUNTERTOP',
      xStart: -150,
      xEnd: libLW + 100,
      side: 'left',
    },
    {
      id: 'fdr-dat-firebox',
      elevationMm: 1050,
      code: 'T.O.F.O.',
      label: 'FIREBOX APERTURE HEAD',
      xStart: fpX,
      xEnd: fpX + fpW,
      side: 'right',
    },
    {
      id: 'fdr-dat-mantel',
      elevationMm: 1200,
      code: 'T.O.M.',
      label: 'CANTILEVERED STONE MANTEL SHELF',
      xStart: fpX - 80,
      xEnd: fpX + fpW + 80,
      side: 'left',
    },
    {
      id: 'fdr-dat-art',
      elevationMm: 2950,
      code: 'T.O.A.N.',
      label: 'ARTWORK DISPLAY NICHE APEX',
      xStart: fpX + (fpW - 1800) / 2 - 50,
      xEnd: fpX + (fpW + 1800) / 2 + 50,
      side: 'right',
    },
    {
      id: 'fdr-dat-rail',
      elevationMm: 3200,
      code: 'C.L. RAIL',
      label: 'BRASS LIBRARY LADDER RAIL',
      xStart: -150,
      xEnd: W + 150,
      side: 'left',
    },
    {
      id: 'fdr-dat-beam',
      elevationMm: beamY,
      code: 'U.S.B.',
      label: 'UNDERSIDE OF COFFERED CEILING BEAM',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
    },
    {
      id: 'fdr-dat-clg',
      elevationMm: H,
      code: 'T.O.C.',
      label: 'CEILING STRUCTURAL SOFFIT',
      xStart: -300,
      xEnd: W + 300,
      side: 'both',
      isKeyDatum: true,
    }
  );

  // 6. Dimensions
  // Tier 1: Detailed elements
  dimensions.push(
    {
      id: 'fdr-dim-lib-l',
      p1: { x: 0, y: credenzaH + 80 },
      p2: { x: libLW, y: credenzaH + 80 },
      offsetMm: 100,
      text: `${libLW}`,
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fdr-dim-fp-w',
      p1: { x: fpX, y: 1350 },
      p2: { x: fpX + fpW, y: 1350 },
      offsetMm: 120,
      text: `${fpW}`,
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fdr-dim-fbox-w',
      p1: { x: fpX + (fpW - 1600) / 2, y: 1100 },
      p2: { x: fpX + (fpW + 1600) / 2, y: 1100 },
      offsetMm: 80,
      text: '1600',
      tier: 1,
      orientation: 'horizontal',
    },
    {
      id: 'fdr-dim-lib-r',
      p1: { x: libRX, y: credenzaH + 80 },
      p2: { x: W, y: credenzaH + 80 },
      offsetMm: 100,
      text: `${libLW}`,
      tier: 1,
      orientation: 'horizontal',
    }
  );

  // Tier 2: 3 Symmetrical Bays (Library Left, Fireplace Center, Library Right)
  dimensions.push(
    {
      id: 'fdr-dim-bay-1',
      p1: { x: 0, y: H + 120 },
      p2: { x: fpX, y: H + 120 },
      offsetMm: 180,
      text: `${fpX}`,
      tier: 2,
      orientation: 'horizontal',
    },
    {
      id: 'fdr-dim-bay-2',
      p1: { x: fpX, y: H + 120 },
      p2: { x: fpX + fpW, y: H + 120 },
      offsetMm: 180,
      text: `${fpW}`,
      tier: 2,
      orientation: 'horizontal',
    },
    {
      id: 'fdr-dim-bay-3',
      p1: { x: fpX + fpW, y: H + 120 },
      p2: { x: W, y: H + 120 },
      offsetMm: 180,
      text: `${W - (fpX + fpW)}`,
      tier: 2,
      orientation: 'horizontal',
    }
  );

  // Tier 3: Overall Room Width
  dimensions.push({
    id: 'fdr-dim-overall-w',
    p1: { x: 0, y: H + 360 },
    p2: { x: W, y: H + 360 },
    offsetMm: 240,
    text: `${W}`,
    tier: 3,
    orientation: 'horizontal',
  });

  // Vertical Dimensions Left Side
  dimensions.push(
    {
      id: 'fdr-dim-v-credenza',
      p1: { x: -250, y: 0 },
      p2: { x: -250, y: credenzaH },
      offsetMm: 100,
      text: `${credenzaH}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fdr-dim-v-upper-lib',
      p1: { x: -250, y: credenzaH },
      p2: { x: -250, y: beamY },
      offsetMm: 100,
      text: `${beamY - credenzaH}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fdr-dim-v-beam',
      p1: { x: -250, y: beamY },
      p2: { x: -250, y: H },
      offsetMm: 100,
      text: `${H - beamY}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'fdr-dim-overall-h',
      p1: { x: -480, y: 0 },
      p2: { x: -480, y: H },
      offsetMm: 200,
      text: `${H}`,
      tier: 3,
      orientation: 'vertical',
    }
  );

  // 7. Leader Annotations
  leaders.push(
    {
      id: 'fdr-lead-marble',
      target: { x: fpX + fpW / 2 + 400, y: 2200 },
      elbow: { x: fpX + fpW / 2 + 650, y: 2450 },
      shelfEnd: { x: fpX + fpW + 350, y: 2450 },
      note: 'BOOKMATCHED ITALIAN FIOR DI BOSCO MARBLE',
      secondaryNote: 'CONTINUOUS FULL-HEIGHT MONOLITHIC SLABS',
    },
    {
      id: 'fdr-lead-firebox',
      target: { x: fpX + fpW / 2, y: 550 },
      elbow: { x: fpX + fpW / 2 - 250, y: 400 },
      shelfEnd: { x: fpX - 250, y: 400 },
      note: 'HERRINGBONE REFRACTORY BRICK FIREBOX',
      secondaryNote: 'SOLID UNLACQUERED BRASS EMBEDDED FRAME',
    },
    {
      id: 'fdr-lead-library',
      target: { x: 1700, y: 2400 },
      elbow: { x: 1400, y: 2650 },
      shelfEnd: { x: 600, y: 2650 },
      note: 'SEASONED SAL TIMBER ARCHITECTURAL LIBRARY',
      secondaryNote: 'ADJUSTABLE SHELVING ON CONCEALED BRASS STANDARDS',
    },
    {
      id: 'fdr-lead-beam',
      target: { x: 3575, y: beamY + 140 },
      elbow: { x: 3800, y: beamY + 350 },
      shelfEnd: { x: 4700, y: beamY + 350 },
      note: 'EXPOSED TIMBER COFFERED CEILING BEAMS',
      secondaryNote: 'INTEGRATED CONCEALED PERIMETER LIGHTING TROUGH',
    }
  );

  return {
    id: 'formal_drawing_room',
    code: 'RUB-DR-02',
    title: 'Formal Drawing Room & Reception Salon',
    subtitle: 'Primary Architectural Elevation & Symmetrical Millwork Study',
    scaleText: '1:50 @ A3 / 1:20 @ A1',
    nominalScale: 50,
    roomDimensions: { widthMm: W, heightMm: H, depthMm: 7200 },
    client: 'Heritage Estate Commission',
    location: 'Dharan, Sunsari District, Nepal',
    leadArchitect: 'Riya Agrawal · Rubiconius Studio',
    dateStr: '2026-11-23',
    revision: 'REV 03 · TENDER ISSUE',
    sheetNo: 'ELEV-02',
    drawingTitle: 'DRAWING ROOM ELEVATION & FIREPLACE',
    bounds: { minX: -650, minY: -350, maxX: W + 650, maxY: H + 650, width: W + 1300, height: H + 1000 },
    elements,
    datums,
    dimensions,
    leaders,
    hatches,
    notes: [
      'MARBLE SLABS MUST BE SOURCED FROM CONSECUTIVE QUARRY BLOCKS FOR SERRATED VEIN CONTINUITY.',
      'LIBRARY CARCASS FABRICATED FROM KILN-DRIED SAL TIMBER WITH 2.5MM BRASS EDGE PROFILES.',
      'FIREPLACE COMPLIES WITH REGIONAL SOLID FUEL COMBUSTION AND FLUE CLEARANCE CODES.',
    ],
  };
}

/**
 * 03. HERITAGE PANELLED GALLERY (RUB-PG-03)
 * Width: 14,200 mm, Height: 3,600 mm
 */
function createHeritagePanelledGallery(): RubiconiusCommission {
  const elements: CADGeometryElement[] = [];
  const datums: CADDatum[] = [];
  const dimensions: CADDimension[] = [];
  const leaders: CADLeader[] = [];
  const hatches: CADHatch[] = [];

  const W = 14200;
  const H = 3600;

  // 1. Structural Boundaries
  elements.push(
    // Floor Level
    {
      type: 'line',
      id: 'hpg-ffl',
      layer: 'structural',
      p1: { x: -500, y: 0 },
      p2: { x: W + 500, y: 0 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.0 },
      weightClass: 'primary',
    },
    // Foundation Slab
    {
      type: 'line',
      id: 'hpg-ssl',
      layer: 'structural',
      p1: { x: -500, y: -150 },
      p2: { x: W + 500, y: -150 },
      style: { stroke: '#7AD7FF', strokeWidth: 1.6, strokeDasharray: [8, 4] },
      weightClass: 'hidden',
    },
    // End Walls
    {
      type: 'line',
      id: 'hpg-wall-l',
      layer: 'structural',
      p1: { x: 0, y: -150 },
      p2: { x: 0, y: H + 250 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.2 },
      weightClass: 'primary',
    },
    {
      type: 'line',
      id: 'hpg-wall-r',
      layer: 'structural',
      p1: { x: W, y: -150 },
      p2: { x: W, y: H + 250 },
      style: { stroke: '#E6F6FF', strokeWidth: 3.2 },
      weightClass: 'primary',
    },
    // Ceiling Line
    {
      type: 'line',
      id: 'hpg-clg',
      layer: 'structural',
      p1: { x: -500, y: H },
      p2: { x: W + 500, y: H },
      style: { stroke: '#E6F6FF', strokeWidth: 3.0 },
      weightClass: 'primary',
    }
  );

  // 2. Continuous Classical Cornice (+3,450 to +3,600mm)
  elements.push(
    {
      type: 'rect',
      id: 'hpg-cornice',
      layer: 'joinery',
      x: 0,
      y: 3450,
      width: W,
      height: 150,
      style: { stroke: '#E6F6FF', strokeWidth: 2.2 },
      weightClass: 'primary',
    },
    {
      type: 'line',
      id: 'hpg-dentil-line',
      layer: 'joinery',
      p1: { x: 0, y: 3500 },
      p2: { x: W, y: 3500 },
      style: { stroke: '#7AD7FF', strokeWidth: 1.0 },
      weightClass: 'secondary',
    }
  );

  // 3. Continuous Boiserie Dado Rail (+1,200 mm) & Skirting (+180 mm)
  const dadoY = 1200;
  elements.push(
    // Dado Rail
    {
      type: 'rect',
      id: 'hpg-dado-rail',
      layer: 'joinery',
      x: 0,
      y: dadoY - 60,
      width: W,
      height: 60,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    },
    // Skirting Board
    {
      type: 'rect',
      id: 'hpg-skirting',
      layer: 'joinery',
      x: 0,
      y: 0,
      width: W,
      height: 180,
      style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
      weightClass: 'primary',
    }
  );

  // 4. Continuous Brass Picture Hanging Rail (+3,200 mm)
  elements.push({
    type: 'line',
    id: 'hpg-picture-rail',
    layer: 'joinery',
    p1: { x: 0, y: 3200 },
    p2: { x: W, y: 3200 },
    style: { stroke: '#FFCC00', strokeWidth: 2.2 },
    weightClass: 'primary',
  });

  // 5. Five Modular Architectural Bays with Pilasters
  // Bay width = 2,400mm, Pilaster width = 350mm
  // Layout: Pilaster(350) + Bay1(2400) + Pil(350) + Bay2(2400) + Pil(350) + Bay3(2400) + Pil(350) + Bay4(2400) + Pil(350) + Bay5(2400) + Pil(350) = 14,200mm
  const pilW = 350;
  const bayW = 2400;

  for (let b = 0; b < 5; b++) {
    const bayStart = pilW + b * (bayW + pilW);

    // Pilaster on the left of each bay
    const pX = b * (bayW + pilW);
    elements.push(
      {
        type: 'rect',
        id: `hpg-pilaster-${b}`,
        layer: 'joinery',
        x: pX,
        y: 180,
        width: pilW,
        height: 3450 - 180,
        style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
        weightClass: 'primary',
      },
      // Pilaster Capital & Base details
      {
        type: 'rect',
        id: `hpg-pil-cap-${b}`,
        layer: 'joinery',
        x: pX - 25,
        y: 3350,
        width: pilW + 50,
        height: 100,
        style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
        weightClass: 'secondary',
      },
      {
        type: 'rect',
        id: `hpg-pil-base-${b}`,
        layer: 'joinery',
        x: pX - 20,
        y: 180,
        width: pilW + 40,
        height: 80,
        style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
        weightClass: 'secondary',
      }
    );

    // Bay Lower Wainscot Panelling (Between +180 and +1,140mm)
    elements.push({
      type: 'rect',
      id: `hpg-wainscot-${b}`,
      layer: 'joinery',
      x: bayStart + 50,
      y: 220,
      width: bayW - 100,
      height: dadoY - 60 - 260,
      style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
      weightClass: 'secondary',
    });

    // Determine Bay Type:
    // Bays 1 & 3: Arched Curated Sculpture Niches (b = 1, 3)
    // Bays 0, 2, 4: Boiserie Exhibition Panels with Fielded Mouldings
    if (b === 1 || b === 3) {
      // Arched Sculpture Niche (Width: 1,500mm, Apex: +2,700mm, Springline: +2,150mm)
      const nicheW = 1500;
      const nicheX = bayStart + (bayW - nicheW) / 2;
      const nicheApex = 2700;
      const nicheSpring = 2150;
      const archRadius = nicheW / 2;

      // Niche vertical jambs
      elements.push(
        {
          type: 'line',
          id: `hpg-niche-jamb-l-${b}`,
          layer: 'joinery',
          p1: { x: nicheX, y: dadoY },
          p2: { x: nicheX, y: nicheSpring },
          style: { stroke: '#FFCC00', strokeWidth: 2.0 },
          weightClass: 'primary',
        },
        {
          type: 'line',
          id: `hpg-niche-jamb-r-${b}`,
          layer: 'joinery',
          p1: { x: nicheX + nicheW, y: dadoY },
          p2: { x: nicheX + nicheW, y: nicheSpring },
          style: { stroke: '#FFCC00', strokeWidth: 2.0 },
          weightClass: 'primary',
        },
        // Semicircular Arch Head
        {
          type: 'arc',
          id: `hpg-niche-arch-${b}`,
          layer: 'joinery',
          center: { x: nicheX + archRadius, y: nicheSpring },
          radius: archRadius,
          startAngle: Math.PI,
          endAngle: 0,
          counterClockwise: false,
          style: { stroke: '#FFCC00', strokeWidth: 2.0 },
        },
        // Carved Keystone at Arch Apex
        {
          type: 'rect',
          id: `hpg-keystone-${b}`,
          layer: 'joinery',
          x: nicheX + archRadius - 50,
          y: nicheApex - 30,
          width: 100,
          height: 120,
          style: { stroke: '#FFCC00', strokeWidth: 1.6 },
          weightClass: 'primary',
        },
        // Stone Sculpture Display Plinth (+900mm F.F.L., W: 850mm × H: 300mm)
        {
          type: 'rect',
          id: `hpg-plinth-${b}`,
          layer: 'furniture',
          x: nicheX + (nicheW - 850) / 2,
          y: dadoY,
          width: 850,
          height: 300,
          style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
          weightClass: 'secondary',
        }
      );

      // Section hatching for niche stone plinth
      hatches.push({
        id: `hpg-hatch-plinth-${b}`,
        polygon: [
          { x: nicheX + (nicheW - 850) / 2 + 10, y: dadoY + 10 },
          { x: nicheX + (nicheW + 850) / 2 - 10, y: dadoY + 10 },
          { x: nicheX + (nicheW + 850) / 2 - 10, y: dadoY + 290 },
          { x: nicheX + (nicheW - 850) / 2 + 10, y: dadoY + 290 },
        ],
        pattern: 'stone_stipple',
        pitchMm: 35,
        angleRad: 0,
      });
    } else {
      // Standard Boiserie Exhibition Panel
      elements.push(
        // Outer Boiserie Frame
        {
          type: 'rect',
          id: `hpg-panel-outer-${b}`,
          layer: 'joinery',
          x: bayStart + 100,
          y: dadoY + 60,
          width: bayW - 200,
          height: 3100 - (dadoY + 60),
          style: { stroke: '#E6F6FF', strokeWidth: 2.0 },
          weightClass: 'primary',
        },
        // Inner Acoustic Linen / Fine Art Mount Panel
        {
          type: 'rect',
          id: `hpg-panel-inner-${b}`,
          layer: 'joinery',
          x: bayStart + 180,
          y: dadoY + 140,
          width: bayW - 360,
          height: 3100 - (dadoY + 60) - 160,
          style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
          weightClass: 'secondary',
        }
      );

      // Wood Grain Hatching
      hatches.push({
        id: `hpg-hatch-wood-${b}`,
        polygon: [
          { x: bayStart + 100, y: dadoY + 60 },
          { x: bayStart + bayW - 100, y: dadoY + 60 },
          { x: bayStart + bayW - 100, y: 3100 },
          { x: bayStart + 100, y: 3100 },
        ],
        pattern: 'wood_grain',
        pitchMm: 60,
        angleRad: Math.PI / 4,
      });
    }
  }

  // End Pilaster on Far Right
  elements.push(
    {
      type: 'rect',
      id: 'hpg-pilaster-end',
      layer: 'joinery',
      x: W - pilW,
      y: 180,
      width: pilW,
      height: 3450 - 180,
      style: { stroke: '#E6F6FF', strokeWidth: 1.8 },
      weightClass: 'primary',
    },
    {
      type: 'rect',
      id: 'hpg-pil-cap-end',
      layer: 'joinery',
      x: W - pilW - 25,
      y: 3350,
      width: pilW + 50,
      height: 100,
      style: { stroke: '#7AD7FF', strokeWidth: 1.4 },
      weightClass: 'secondary',
    }
  );

  // 6. Datums
  datums.push(
    {
      id: 'hpg-dat-ssl',
      elevationMm: -150,
      code: 'S.S.L.',
      label: 'FOUNDATION SLAB LEVEL',
      xStart: -350,
      xEnd: W + 350,
      side: 'both',
    },
    {
      id: 'hpg-dat-ffl',
      elevationMm: 0,
      code: 'F.F.L.',
      label: 'FINISHED FLOOR LEVEL',
      xStart: -350,
      xEnd: W + 350,
      side: 'both',
      isKeyDatum: true,
    },
    {
      id: 'hpg-dat-skirting',
      elevationMm: 180,
      code: 'T.O.S.',
      label: 'STEPPED TIMBER SKIRTING BOARD',
      xStart: -150,
      xEnd: W + 150,
      side: 'left',
    },
    {
      id: 'hpg-dat-dado',
      elevationMm: dadoY,
      code: 'T.O.D.R.',
      label: 'CONTINUOUS BOISERIE DADO RAIL',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
      isKeyDatum: true,
    },
    {
      id: 'hpg-dat-plinth',
      elevationMm: dadoY + 300,
      code: 'T.O.P.',
      label: 'STONE SCULPTURE DISPLAY PLINTH',
      xStart: 2500,
      xEnd: 5500,
      side: 'left',
    },
    {
      id: 'hpg-dat-spring',
      elevationMm: 2150,
      code: 'S.L.',
      label: 'ARCHED NICHE SPRINGLINE LEVEL',
      xStart: 2500,
      xEnd: 5500,
      side: 'right',
    },
    {
      id: 'hpg-dat-apex',
      elevationMm: 2700,
      code: 'T.O.A.',
      label: 'NICHE ARCH APEX & KEYSTONE',
      xStart: 2500,
      xEnd: 5500,
      side: 'right',
    },
    {
      id: 'hpg-dat-rail',
      elevationMm: 3200,
      code: 'C.L. RAIL',
      label: 'CONTINUOUS BRASS PICTURE RAIL',
      xStart: -250,
      xEnd: W + 250,
      side: 'both',
      isKeyDatum: true,
    },
    {
      id: 'hpg-dat-cornice',
      elevationMm: 3450,
      code: 'B.O.C.',
      label: 'BOTTOM OF DENTIL CORNICE',
      xStart: -200,
      xEnd: W + 200,
      side: 'left',
    },
    {
      id: 'hpg-dat-clg',
      elevationMm: H,
      code: 'T.O.C.',
      label: 'GALLERY CEILING LEVEL',
      xStart: -350,
      xEnd: W + 350,
      side: 'both',
      isKeyDatum: true,
    }
  );

  // 7. Dimensions
  // Tier 1: Sub-elements & bays
  for (let b = 0; b < 5; b++) {
    const bayStart = pilW + b * (bayW + pilW);
    dimensions.push({
      id: `hpg-dim-bay-${b}`,
      p1: { x: bayStart, y: dadoY - 120 },
      p2: { x: bayStart + bayW, y: dadoY - 120 },
      offsetMm: 100,
      text: `${bayW}`,
      tier: 1,
      orientation: 'horizontal',
    });
  }

  // Tier 2: Structural bays center-to-center
  for (let b = 0; b < 4; b++) {
    const c1 = pilW / 2 + b * (bayW + pilW);
    const c2 = pilW / 2 + (b + 1) * (bayW + pilW);
    dimensions.push({
      id: `hpg-dim-center-${b}`,
      p1: { x: c1, y: H + 120 },
      p2: { x: c2, y: H + 120 },
      offsetMm: 160,
      text: `${bayW + pilW}`,
      tier: 2,
      orientation: 'horizontal',
    });
  }

  // Tier 3: Overall Gallery Span
  dimensions.push({
    id: 'hpg-dim-overall-w',
    p1: { x: 0, y: H + 360 },
    p2: { x: W, y: H + 360 },
    offsetMm: 240,
    text: `${W}`,
    tier: 3,
    orientation: 'horizontal',
  });

  // Vertical Dimensions Left Side
  dimensions.push(
    {
      id: 'hpg-dim-v-skirt',
      p1: { x: -280, y: 0 },
      p2: { x: -280, y: 180 },
      offsetMm: 100,
      text: '180',
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'hpg-dim-v-dado',
      p1: { x: -280, y: 180 },
      p2: { x: -280, y: dadoY },
      offsetMm: 100,
      text: `${dadoY - 180}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'hpg-dim-v-rail',
      p1: { x: -280, y: dadoY },
      p2: { x: -280, y: 3200 },
      offsetMm: 100,
      text: `${3200 - dadoY}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'hpg-dim-v-clg',
      p1: { x: -280, y: 3200 },
      p2: { x: -280, y: H },
      offsetMm: 100,
      text: `${H - 3200}`,
      tier: 1,
      orientation: 'vertical',
    },
    {
      id: 'hpg-dim-overall-h',
      p1: { x: -520, y: 0 },
      p2: { x: -520, y: H },
      offsetMm: 200,
      text: `${H}`,
      tier: 3,
      orientation: 'vertical',
    }
  );

  // 8. Leaders
  leaders.push(
    {
      id: 'hpg-lead-niche',
      target: { x: pilW + 1 * (bayW + pilW) + bayW / 2, y: 2450 },
      elbow: { x: pilW + 1 * (bayW + pilW) + bayW / 2 - 200, y: 2750 },
      shelfEnd: { x: pilW + 1 * (bayW + pilW) - 300, y: 2750 },
      note: 'ARCHED CURATED SCULPTURE NICHE',
      secondaryNote: 'CARVED TIMBER KEYSTONE & INTEGRATED RECESSED DOWNLIGHT',
    },
    {
      id: 'hpg-lead-boiserie',
      target: { x: pilW + 2 * (bayW + pilW) + 500, y: 2200 },
      elbow: { x: pilW + 2 * (bayW + pilW) + 750, y: 2500 },
      shelfEnd: { x: pilW + 2 * (bayW + pilW) + 1600, y: 2500 },
      note: 'CLASSICAL FIELDED BOISERIE WALL PANELLING',
      secondaryNote: 'SEASONED SAL TIMBER FRAMING WITH ACOUSTIC LINEN INLAY',
    },
    {
      id: 'hpg-lead-rail',
      target: { x: 7100, y: 3200 },
      elbow: { x: 7400, y: 3350 },
      shelfEnd: { x: 8400, y: 3350 },
      note: 'CONTINUOUS ARCHITECTURAL BRASS PICTURE RAIL',
      secondaryNote: 'HEAVY-DUTY CONCEALED FIXING FOR MUSEUM-GRADE SUSPENSION',
    }
  );

  return {
    id: 'heritage_panelled_gallery',
    code: 'RUB-PG-03',
    title: 'Heritage Panelled Gallery & Contemporary Corridor',
    subtitle: 'Rhythmic Classical Boiserie Wall & Curated Sculpture Niches',
    scaleText: '1:50 @ A3 / 1:20 @ A1',
    nominalScale: 50,
    roomDimensions: { widthMm: W, heightMm: H, depthMm: 4200 },
    client: 'Civic Cultural & Residential Foundation',
    location: 'Biratnagar & Itahari Corridor, Nepal',
    leadArchitect: 'Riya Agrawal · Rubiconius Studio',
    dateStr: '2026-11-23',
    revision: 'REV 05 · FINAL CONSTRUCTION ISSUE',
    sheetNo: 'ELEV-03',
    drawingTitle: 'GALLERY ELEVATION & BOISERIE JOINERY',
    bounds: { minX: -700, minY: -300, maxX: W + 700, maxY: H + 650, width: W + 1400, height: H + 950 },
    elements,
    datums,
    dimensions,
    leaders,
    hatches,
    notes: [
      'ALL BOISERIE FIELDED PANELS FABRICATED WITH TRADITIONAL MORTISE AND TENON JOINERY.',
      'NICHE VAULT FORMED WITH CURVED PLASTER OVER TIMBER RIBS FINISHED IN WARM LIME WASH.',
      'CONTINUOUS PICTURE RAIL CAPABLE OF SUPPORTING 150 KG PER RUNNING METER OF ARTWORK.',
    ],
  };
}

export const RUBICONIUS_COMMISSIONS: Record<RubiconiusCommissionId, () => RubiconiusCommission> = {
  fluted_master_suite: createFlutedMasterSuite,
  formal_drawing_room: createFormalDrawingRoom,
  heritage_panelled_gallery: createHeritagePanelledGallery,
};

// ============================================================================
// 05. OBJECT SNAPPING (O-SNAP) ENGINE
// ============================================================================

export class OSnapManager {
  private candidatePoints: SnapPoint[] = [];

  public updateCandidates(commission: RubiconiusCommission, gridPitch = 100): void {
    const pts: SnapPoint[] = [];

    // 1. Gather all element endpoints & midpoints
    for (const el of commission.elements) {
      if (el.type === 'line') {
        pts.push(
          { x: el.p1.x, y: el.p1.y, type: 'endpoint', label: 'Endpoint', sourceId: el.id },
          { x: el.p2.x, y: el.p2.y, type: 'endpoint', label: 'Endpoint', sourceId: el.id },
          { x: (el.p1.x + el.p2.x) * 0.5, y: (el.p1.y + el.p2.y) * 0.5, type: 'midpoint', label: 'Midpoint', sourceId: el.id }
        );
      } else if (el.type === 'rect') {
        const p1 = { x: el.x, y: el.y };
        const p2 = { x: el.x + el.width, y: el.y };
        const p3 = { x: el.x + el.width, y: el.y + el.height };
        const p4 = { x: el.x, y: el.y + el.height };
        pts.push(
          { x: p1.x, y: p1.y, type: 'endpoint', label: 'Corner', sourceId: el.id },
          { x: p2.x, y: p2.y, type: 'endpoint', label: 'Corner', sourceId: el.id },
          { x: p3.x, y: p3.y, type: 'endpoint', label: 'Corner', sourceId: el.id },
          { x: p4.x, y: p4.y, type: 'endpoint', label: 'Corner', sourceId: el.id },
          { x: el.x + el.width * 0.5, y: el.y + el.height * 0.5, type: 'center', label: 'Center', sourceId: el.id },
          { x: el.x + el.width * 0.5, y: el.y, type: 'midpoint', label: 'Midpoint', sourceId: el.id },
          { x: el.x + el.width * 0.5, y: el.y + el.height, type: 'midpoint', label: 'Midpoint', sourceId: el.id },
          { x: el.x, y: el.y + el.height * 0.5, type: 'midpoint', label: 'Midpoint', sourceId: el.id },
          { x: el.x + el.width, y: el.y + el.height * 0.5, type: 'midpoint', label: 'Midpoint', sourceId: el.id }
        );
      } else if (el.type === 'arc') {
        pts.push(
          { x: el.center.x, y: el.center.y, type: 'center', label: 'Arc Center', sourceId: el.id },
          {
            x: el.center.x + el.radius * Math.cos(el.startAngle),
            y: el.center.y + el.radius * Math.sin(el.startAngle),
            type: 'endpoint',
            label: 'Arc Endpoint',
            sourceId: el.id,
          },
          {
            x: el.center.x + el.radius * Math.cos(el.endAngle),
            y: el.center.y + el.radius * Math.sin(el.endAngle),
            type: 'endpoint',
            label: 'Arc Endpoint',
            sourceId: el.id,
          }
        );
      }
    }

    // 2. Gather Datums
    for (const dat of commission.datums) {
      pts.push(
        { x: dat.xStart, y: dat.elevationMm, type: 'datum', label: `Datum ${dat.code}`, sourceId: dat.id },
        { x: dat.xEnd, y: dat.elevationMm, type: 'datum', label: `Datum ${dat.code}`, sourceId: dat.id },
        { x: (dat.xStart + dat.xEnd) * 0.5, y: dat.elevationMm, type: 'datum', label: `Datum ${dat.code}`, sourceId: dat.id }
      );
    }

    this.candidatePoints = pts;
  }

  public findNearestSnap(
    worldPos: CADPoint,
    toleranceMm: number,
    snapToGrid = true,
    gridPitch = 100
  ): SnapPoint | null {
    let bestSnap: SnapPoint | null = null;
    let minDistance = toleranceMm;

    // Check candidate geometry points
    for (const pt of this.candidatePoints) {
      const d = distance(worldPos, pt);
      if (d < minDistance) {
        minDistance = d;
        bestSnap = { ...pt, distance: d };
      }
    }

    // Check grid snapping if no close geometry hit
    if (!bestSnap && snapToGrid && gridPitch > 0) {
      const gx = Math.round(worldPos.x / gridPitch) * gridPitch;
      const gy = Math.round(worldPos.y / gridPitch) * gridPitch;
      const gd = distance(worldPos, { x: gx, y: gy });
      if (gd < toleranceMm) {
        bestSnap = {
          x: gx,
          y: gy,
          type: 'grid',
          label: `Grid (${gx}, ${gy})`,
          distance: gd,
        };
      }
    }

    return bestSnap;
  }
}

// ============================================================================
// 06. ARCHITECTURAL CAD BLUEPRINT DRAFTING ENGINE (MAIN CLASS)
// ============================================================================

export class BlueprintEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;

  // Viewport & Navigation State
  private viewport: ViewportState = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    minZoom: 0.25,
    maxZoom: 8.0,
    canvasWidth: 800,
    canvasHeight: 600,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  };

  // Active Commission & Theme
  private commissionId: RubiconiusCommissionId = 'fluted_master_suite';
  private commission: RubiconiusCommission;
  private theme: BlueprintTheme;

  // Tools & Interactions
  private currentTool: BlueprintTool = 'measure';
  private isPanning = false;
  private panStartScreen: CADPoint = { x: 0, y: 0 };
  private panStartOffset: CADPoint = { x: 0, y: 0 };

  // Measurement State
  private isMeasuring = false;
  private measureStart: CADPoint | null = null;
  private measureCurrent: CADPoint | null = null;
  private measurements: CADMeasurement[] = [];

  // Snapping & Ortho
  private snapManager: OSnapManager = new OSnapManager();
  private snapEnabled = true;
  private orthoEnabled = false;
  private activeSnap: SnapPoint | null = null;
  private cursorWorld: CADPoint = { x: 0, y: 0 };

  // Layer Visibility Toggles
  private showGrid = true;
  private showDatums = true;
  private showDimensions = true;
  private showLeaders = true;
  private showHatching = true;

  // Telemetry & Callbacks
  private lastFrameTime = performance.now();
  private fps = 60;
  private onTelemetryUpdate?: (telemetry: CADTelemetry) => void;
  private onMeasurementAdded?: (measurement: CADMeasurement) => void;
  private onCommissionChanged?: (commission: RubiconiusCommission) => void;

  constructor(options: BlueprintEngineOptions = {}) {
    this.theme = BLUEPRINT_THEMES[options.themeId || 'classic_cyan'];
    this.commissionId = options.initialCommissionId || 'fluted_master_suite';
    this.commission = RUBICONIUS_COMMISSIONS[this.commissionId]();

    if (options.minZoom !== undefined) this.viewport.minZoom = options.minZoom;
    if (options.maxZoom !== undefined) this.viewport.maxZoom = options.maxZoom;
    if (options.initialZoom !== undefined) this.viewport.zoom = options.initialZoom;
    if (options.showGrid !== undefined) this.showGrid = options.showGrid;
    if (options.showDatums !== undefined) this.showDatums = options.showDatums;
    if (options.showDimensions !== undefined) this.showDimensions = options.showDimensions;
    if (options.showLeaders !== undefined) this.showLeaders = options.showLeaders;
    if (options.showHatching !== undefined) this.showHatching = options.showHatching;
    if (options.snapEnabled !== undefined) this.snapEnabled = options.snapEnabled;
    if (options.orthoEnabled !== undefined) this.orthoEnabled = options.orthoEnabled;
    if (options.tool) this.currentTool = options.tool;

    this.onTelemetryUpdate = options.onTelemetryUpdate;
    this.onMeasurementAdded = options.onMeasurementAdded;
    this.onCommissionChanged = options.onCommissionChanged;

    this.snapManager.updateCandidates(this.commission);
  }

  // --------------------------------------------------------------------------
  // Canvas Lifecycle & Event Listeners
  // --------------------------------------------------------------------------

  public attachCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    this.detachCanvas();

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    this.bindEvents();
    this.handleResize();
    this.fitToViewport(false);
    this.startRenderLoop();
  }

  public detachCanvas(): void {
    if (!this.canvas) return;
    this.stopRenderLoop();
    this.unbindEvents();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.canvas = null;
    this.ctx = null;
  }

  private bindEvents(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);

    // Keyboard shortcuts (Shift for Ortho, Space for Pan)
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
  }

  private unbindEvents(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  // --------------------------------------------------------------------------
  // Coordinate Space Transforms
  // --------------------------------------------------------------------------

  public screenToWorld(screenX: number, screenY: number): CADPoint {
    const dpr = this.viewport.dpr;
    // CAD Y-axis is inverted: +Y is UP in architectural drafting, but DOWN in canvas screen pixels
    const worldX = (screenX * dpr - this.viewport.panX) / (this.viewport.zoom * dpr);
    const worldY = (this.viewport.panY - screenY * dpr) / (this.viewport.zoom * dpr);
    return { x: worldX, y: worldY };
  }

  public worldToScreen(worldX: number, worldY: number): CADPoint {
    const dpr = this.viewport.dpr;
    const screenX = (worldX * this.viewport.zoom * dpr + this.viewport.panX) / dpr;
    const screenY = (this.viewport.panY - worldY * this.viewport.zoom * dpr) / dpr;
    return { x: screenX, y: screenY };
  }

  // --------------------------------------------------------------------------
  // Camera & Navigation Controls
  // --------------------------------------------------------------------------

  public setZoom(zoom: number, focalScreenPoint?: CADPoint): void {
    const clampedZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, zoom));
    if (Math.abs(clampedZoom - this.viewport.zoom) < 0.0001) return;

    const dpr = this.viewport.dpr;
    const focal = focalScreenPoint || {
      x: this.viewport.canvasWidth * 0.5,
      y: this.viewport.canvasHeight * 0.5,
    };

    // Calculate world point under the focal point before zoom
    const worldUnderCursor = this.screenToWorld(focal.x, focal.y);

    this.viewport.zoom = clampedZoom;

    // Adjust pan so the world point remains under the focal point after zoom
    this.viewport.panX = focal.x * dpr - worldUnderCursor.x * clampedZoom * dpr;
    this.viewport.panY = focal.y * dpr + worldUnderCursor.y * clampedZoom * dpr;

    this.requestRender();
  }

  public zoomIn(factor = 1.25): void {
    this.setZoom(this.viewport.zoom * factor);
  }

  public zoomOut(factor = 1.25): void {
    this.setZoom(this.viewport.zoom / factor);
  }

  public fitToViewport(animate = true): void {
    if (!this.canvas) return;
    const bounds = this.commission.bounds;
    const dpr = this.viewport.dpr;

    const padding = 120; // Screen padding in CSS pixels
    const availW = Math.max(100, this.viewport.canvasWidth - padding * 2);
    const availH = Math.max(100, this.viewport.canvasHeight - padding * 2);

    const zoomX = availW / bounds.width;
    const zoomY = availH / bounds.height;
    const targetZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, Math.min(zoomX, zoomY) * 0.95));

    const boundsCenterX = (bounds.minX + bounds.maxX) * 0.5;
    const boundsCenterY = (bounds.minY + bounds.maxY) * 0.5;

    const screenCenterX = this.viewport.canvasWidth * 0.5 * dpr;
    const screenCenterY = this.viewport.canvasHeight * 0.5 * dpr;

    this.viewport.zoom = targetZoom;
    this.viewport.panX = screenCenterX - boundsCenterX * targetZoom * dpr;
    this.viewport.panY = screenCenterY + boundsCenterY * targetZoom * dpr;

    this.requestRender();
  }

  public resetView(): void {
    this.fitToViewport(true);
  }

  // --------------------------------------------------------------------------
  // Commission & Theme Management
  // --------------------------------------------------------------------------

  public setCommission(commissionId: RubiconiusCommissionId): void {
    if (this.commissionId === commissionId) return;
    this.commissionId = commissionId;
    this.commission = RUBICONIUS_COMMISSIONS[commissionId]();
    this.snapManager.updateCandidates(this.commission);
    this.clearMeasurements();
    this.fitToViewport(true);
    this.onCommissionChanged?.(this.commission);
    this.requestRender();
  }

  public getCommission(): RubiconiusCommission {
    return this.commission;
  }

  public setTheme(themeId: BlueprintThemeId): void {
    if (BLUEPRINT_THEMES[themeId]) {
      this.theme = BLUEPRINT_THEMES[themeId];
      this.requestRender();
    }
  }

  public getTheme(): BlueprintTheme {
    return this.theme;
  }

  public setTool(tool: BlueprintTool): void {
    this.currentTool = tool;
    if (this.canvas) {
      if (tool === 'pan') {
        this.canvas.style.cursor = 'grab';
      } else if (tool === 'measure' || tool === 'dimension') {
        this.canvas.style.cursor = 'crosshair';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  public getTool(): BlueprintTool {
    return this.currentTool;
  }

  // --------------------------------------------------------------------------
  // Measurement Tools & Measurements List
  // --------------------------------------------------------------------------

  public addMeasurement(m: CADMeasurement): void {
    this.measurements.push(m);
    this.onMeasurementAdded?.(m);
    this.requestRender();
  }

  public clearMeasurements(): void {
    this.measurements = [];
    this.requestRender();
  }

  public getMeasurements(): CADMeasurement[] {
    return [...this.measurements];
  }

  // --------------------------------------------------------------------------
  // Layer Toggles
  // --------------------------------------------------------------------------

  public toggleGrid(visible?: boolean): void {
    this.showGrid = visible !== undefined ? visible : !this.showGrid;
    this.requestRender();
  }

  public toggleDatums(visible?: boolean): void {
    this.showDatums = visible !== undefined ? visible : !this.showDatums;
    this.requestRender();
  }

  public toggleDimensions(visible?: boolean): void {
    this.showDimensions = visible !== undefined ? visible : !this.showDimensions;
    this.requestRender();
  }

  public toggleLeaders(visible?: boolean): void {
    this.showLeaders = visible !== undefined ? visible : !this.showLeaders;
    this.requestRender();
  }

  public toggleHatching(visible?: boolean): void {
    this.showHatching = visible !== undefined ? visible : !this.showHatching;
    this.requestRender();
  }

  public toggleSnap(enabled?: boolean): void {
    this.snapEnabled = enabled !== undefined ? enabled : !this.snapEnabled;
  }

  public toggleOrtho(enabled?: boolean): void {
    this.orthoEnabled = enabled !== undefined ? enabled : !this.orthoEnabled;
  }

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  private handleResize = (): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.viewport.canvasWidth = rect.width;
    this.viewport.canvasHeight = rect.height;
    this.viewport.dpr = dpr;

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);

    this.requestRender();
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Pan with middle mouse button or with left click if in pan mode or spacebar down
    if (e.button === 1 || this.currentTool === 'pan' || e.shiftKey && e.button === 0) {
      this.isPanning = true;
      this.panStartScreen = screenPos;
      this.panStartOffset = { x: this.viewport.panX, y: this.viewport.panY };
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Measure tool
    if (e.button === 0 && (this.currentTool === 'measure' || this.currentTool === 'dimension')) {
      const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
      const snap = this.snapEnabled
        ? this.snapManager.findNearestSnap(worldPos, 25 / this.viewport.zoom, true, 100)
        : null;

      const finalPoint = snap ? { x: snap.x, y: snap.y } : worldPos;
      this.isMeasuring = true;
      this.measureStart = finalPoint;
      this.measureCurrent = finalPoint;
      this.requestRender();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Handle Panning
    if (this.isPanning) {
      const dpr = this.viewport.dpr;
      const dx = (screenPos.x - this.panStartScreen.x) * dpr;
      const dy = (screenPos.y - this.panStartScreen.y) * dpr;
      this.viewport.panX = this.panStartOffset.x + dx;
      this.viewport.panY = this.panStartOffset.y + dy;
      this.requestRender();
      return;
    }

    // World coordinate calculation
    const rawWorld = this.screenToWorld(screenPos.x, screenPos.y);

    // O-SNAP calculation (20 screen pixels snap radius)
    const snapToleranceMm = 20.0 / this.viewport.zoom;
    this.activeSnap = this.snapEnabled
      ? this.snapManager.findNearestSnap(rawWorld, snapToleranceMm, true, 100)
      : null;

    let targetWorld = this.activeSnap ? { x: this.activeSnap.x, y: this.activeSnap.y } : rawWorld;

    // Handle Active Measurement Drag
    if (this.isMeasuring && this.measureStart) {
      if (this.orthoEnabled || e.shiftKey) {
        targetWorld = snapToOrtho(this.measureStart, targetWorld);
      }
      this.measureCurrent = targetWorld;
    }

    this.cursorWorld = targetWorld;
    this.emitTelemetry();
    this.requestRender();
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.canvas) return;

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
      return;
    }

    if (this.isMeasuring && this.measureStart && this.measureCurrent) {
      const len = distance(this.measureStart, this.measureCurrent);
      if (len > 15) {
        // Minimum 15mm to avoid zero clicks
        const dx = Math.abs(this.measureCurrent.x - this.measureStart.x);
        const dy = Math.abs(this.measureCurrent.y - this.measureStart.y);
        const angle = angleDegrees(this.measureStart, this.measureCurrent);

        const newMeasurement: CADMeasurement = {
          id: `meas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          p1: this.measureStart,
          p2: this.measureCurrent,
          lengthMm: len,
          deltaX: dx,
          deltaY: dy,
          angleDeg: angle,
          isOrtho: this.orthoEnabled || e.shiftKey,
          timestamp: Date.now(),
        };

        this.addMeasurement(newMeasurement);
      }

      this.isMeasuring = false;
      this.measureStart = null;
      this.measureCurrent = null;
      this.requestRender();
    }
  };

  private handleMouseLeave = (): void => {
    this.isPanning = false;
    this.isMeasuring = false;
    this.measureStart = null;
    this.measureCurrent = null;
    this.activeSnap = null;
    this.requestRender();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const focalScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Exponential smooth zoom
    const zoomFactor = Math.pow(1.0015, -e.deltaY);
    this.setZoom(this.viewport.zoom * zoomFactor, focalScreen);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') {
      this.orthoEnabled = true;
      if (this.isMeasuring && this.measureStart && this.measureCurrent) {
        this.measureCurrent = snapToOrtho(this.measureStart, this.measureCurrent);
        this.requestRender();
      }
    }
    if (e.key === ' ' && !this.isPanning) {
      if (this.canvas) this.canvas.style.cursor = 'grab';
    }
    if (e.key === 'Escape') {
      if (this.isMeasuring) {
        this.isMeasuring = false;
        this.measureStart = null;
        this.measureCurrent = null;
        this.requestRender();
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.measurements.length > 0) {
        this.measurements.pop();
        this.requestRender();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') {
      this.orthoEnabled = false;
      this.requestRender();
    }
    if (e.key === ' ') {
      if (this.canvas) {
        this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
      }
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  // --------------------------------------------------------------------------
  // Rendering Pipeline
  // --------------------------------------------------------------------------

  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;
    const loop = (time: number) => {
      const delta = time - this.lastFrameTime;
      this.lastFrameTime = time;
      this.fps = delta > 0 ? Math.round(1000 / delta) : 60;

      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private requestRender(): void {
    // If loop is running, RAF will handle next tick
  }

  public render(): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    const dpr = this.viewport.dpr;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Clear & Background
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, width, height);

    // Save initial state
    ctx.save();

    // 2. Render Infinite Drafting Grid (Pre-transform)
    if (this.showGrid) {
      this.renderDraftingGrid(ctx, width, height);
    }

    // 3. Apply World Transform Matrix
    // Canvas coordinate = pan + world * zoom * dpr (Y inverted)
    ctx.translate(this.viewport.panX, this.viewport.panY);
    ctx.scale(this.viewport.zoom * dpr, -this.viewport.zoom * dpr);

    // 4. Render Section Hatching
    if (this.showHatching) {
      this.renderHatches(ctx);
    }

    // 5. Render Architectural CAD Elements
    this.renderElements(ctx);

    // 6. Render Elevation Datums
    if (this.showDatums) {
      this.renderDatums(ctx);
    }

    // 7. Render Multi-Tier Dimensions
    if (this.showDimensions) {
      this.renderDimensions(ctx);
    }

    // 8. Render Leader Annotations
    if (this.showLeaders) {
      this.renderLeaders(ctx);
    }

    // 9. Render User Measurements
    this.renderMeasurements(ctx);

    // 10. Render Active Measurement In-Progress
    if (this.isMeasuring && this.measureStart && this.measureCurrent) {
      this.renderActiveRuler(ctx, this.measureStart, this.measureCurrent);
    }

    // Restore World Transform
    ctx.restore();

    // 11. Render Screen-Space Overlays (O-SNAP Glyphs, Coordinates, Title Block)
    if (this.activeSnap) {
      this.renderSnapGlyph(ctx, this.activeSnap);
    }

    this.renderScreenHUD(ctx, width, height);
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Infinite Drafting Grid
  // --------------------------------------------------------------------------

  private renderDraftingGrid(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    const dpr = this.viewport.dpr;
    const zoom = this.viewport.zoom;

    // Determine visible world bounding box
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(screenW / dpr, screenH / dpr);

    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    ctx.save();

    // 1. Minor Grid Lines: 10mm (Only render if zoomed in enough to prevent dense moiré)
    const minorPixelDist = 10 * zoom * dpr;
    if (minorPixelDist >= 6) {
      const minorAlpha = Math.min(1.0, (minorPixelDist - 6) / 10);
      ctx.strokeStyle = this.theme.minorGrid;
      ctx.globalAlpha = minorAlpha;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const startMinorX = Math.floor(minX / 10) * 10;
      const endMinorX = Math.ceil(maxX / 10) * 10;
      for (let x = startMinorX; x <= endMinorX; x += 10) {
        if (x % 100 === 0) continue; // Major grid draws this
        const s = this.worldToScreen(x, 0);
        ctx.moveTo(Math.round(s.x * dpr) + 0.5, 0);
        ctx.lineTo(Math.round(s.x * dpr) + 0.5, screenH);
      }

      const startMinorY = Math.floor(minY / 10) * 10;
      const endMinorY = Math.ceil(maxY / 10) * 10;
      for (let y = startMinorY; y <= endMinorY; y += 10) {
        if (y % 100 === 0) continue;
        const s = this.worldToScreen(0, y);
        ctx.moveTo(0, Math.round(s.y * dpr) + 0.5);
        ctx.lineTo(screenW, Math.round(s.y * dpr) + 0.5);
      }
      ctx.stroke();
    }

    // 2. Major Grid Lines: 100mm
    const majorPixelDist = 100 * zoom * dpr;
    if (majorPixelDist >= 8) {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = this.theme.majorGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const startMajorX = Math.floor(minX / 100) * 100;
      const endMajorX = Math.ceil(maxX / 100) * 100;
      for (let x = startMajorX; x <= endMajorX; x += 100) {
        if (x % 1000 === 0) continue;
        const s = this.worldToScreen(x, 0);
        ctx.moveTo(Math.round(s.x * dpr) + 0.5, 0);
        ctx.lineTo(Math.round(s.x * dpr) + 0.5, screenH);
      }

      const startMajorY = Math.floor(minY / 100) * 100;
      const endMajorY = Math.ceil(maxY / 100) * 100;
      for (let y = startMajorY; y <= endMajorY; y += 100) {
        if (y % 1000 === 0) continue;
        const s = this.worldToScreen(0, y);
        ctx.moveTo(0, Math.round(s.y * dpr) + 0.5);
        ctx.lineTo(screenW, Math.round(s.y * dpr) + 0.5);
      }
      ctx.stroke();
    }

    // 3. Module Bay Grid Lines: 1,000mm (1.0 Meter) with coordinate label
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = this.theme.moduleLine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    const startModX = Math.floor(minX / 1000) * 1000;
    const endModX = Math.ceil(maxX / 1000) * 1000;
    for (let x = startModX; x <= endModX; x += 1000) {
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(Math.round(s.x * dpr) + 0.5, 0);
      ctx.lineTo(Math.round(s.x * dpr) + 0.5, screenH);
    }

    const startModY = Math.floor(minY / 1000) * 1000;
    const endModY = Math.ceil(maxY / 1000) * 1000;
    for (let y = startModY; y <= endModY; y += 1000) {
      const s = this.worldToScreen(0, y);
      ctx.moveTo(0, Math.round(s.y * dpr) + 0.5);
      ctx.lineTo(screenW, Math.round(s.y * dpr) + 0.5);
    }
    ctx.stroke();

    // 4. Axis Coordinate Origin Marker (0,0)
    const origin = this.worldToScreen(0, 0);
    const ox = Math.round(origin.x * dpr);
    const oy = Math.round(origin.y * dpr);

    ctx.strokeStyle = this.theme.axisLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox - 30, oy);
    ctx.lineTo(ox + 30, oy);
    ctx.moveTo(ox, oy - 30);
    ctx.lineTo(ox, oy + 30);
    ctx.stroke();

    // Origin circle
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Elements & Hatching
  // --------------------------------------------------------------------------

  private renderElements(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.zoom;

    for (const el of this.commission.elements) {
      ctx.save();

      if (el.type === 'text') {
        ctx.translate(el.position.x, el.position.y);
        ctx.scale(1, -1); // Flip text back since Y is inverted in world space
        ctx.font = `${Math.round(el.fontSize / zoom)}px "Inter", "Helvetica Neue", sans-serif`;
        ctx.fillStyle = el.color || this.theme.dimensionText;
        ctx.textAlign = el.align || 'left';
        ctx.textBaseline = el.baseline || 'bottom';
        ctx.fillText(el.text, 0, 0);
        ctx.restore();
        continue;
      }

      // Stroke color based on weight class and theme
      let strokeColor = el.style.stroke;
      if (el.weightClass === 'primary') strokeColor = this.theme.primaryProfile;
      else if (el.weightClass === 'secondary') strokeColor = this.theme.secondaryJoinery;
      else if (el.weightClass === 'hairline') strokeColor = this.theme.hairlineDetail;
      else if (el.weightClass === 'hidden') strokeColor = this.theme.hiddenLine;
      else if (el.weightClass === 'centerline') strokeColor = this.theme.centerLine;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (el.style.strokeWidth || 1.0) / zoom;
      ctx.lineCap = el.style.lineCap || 'round';
      ctx.lineJoin = el.style.lineJoin || 'round';

      if (el.style.strokeDasharray && el.style.strokeDasharray.length > 0) {
        ctx.setLineDash(el.style.strokeDasharray.map((d: number) => d / zoom));
      }

      switch (el.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(el.p1.x, el.p1.y);
          ctx.lineTo(el.p2.x, el.p2.y);
          ctx.stroke();
          break;

        case 'rect':
          if (el.fill) {
            ctx.fillStyle = el.fill;
            ctx.fillRect(el.x, el.y, el.width, el.height);
          }
          ctx.strokeRect(el.x, el.y, el.width, el.height);
          break;

        case 'arc':
          ctx.beginPath();
          ctx.arc(el.center.x, el.center.y, el.radius, el.startAngle, el.endAngle, el.counterClockwise);
          ctx.stroke();
          break;

        case 'polyline':
          if (el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            if (el.closed) {
              ctx.closePath();
              if (el.fill) {
                ctx.fillStyle = el.fill;
                ctx.fill();
              }
            }
            ctx.stroke();
          }
          break;


      }

      ctx.restore();
    }
  }

  private renderHatches(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.zoom;

    for (const hatch of this.commission.hatches) {
      if (hatch.polygon.length < 3) continue;

      ctx.save();
      // Clip to polygon boundary
      ctx.beginPath();
      ctx.moveTo(hatch.polygon[0].x, hatch.polygon[0].y);
      for (let i = 1; i < hatch.polygon.length; i++) {
        ctx.lineTo(hatch.polygon[i].x, hatch.polygon[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // Compute bounding box of polygon
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of hatch.polygon) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      // Select hatch stroke color
      let color = this.theme.hatchWood;
      if (hatch.pattern === 'marble_vein') color = this.theme.hatchMarble;
      else if (hatch.pattern === 'stone_stipple') color = this.theme.hatchStone;
      else if (hatch.pattern === 'brick_herringbone') color = this.theme.hatchBrick;
      else if (hatch.pattern === 'glass_reed') color = this.theme.hatchGlass;
      else if (hatch.pattern === 'metal_hatch') color = this.theme.hatchMetal;
      else if (hatch.pattern === 'insulation_batting') color = this.theme.hatchInsulation;

      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8 / zoom;

      // Procedural vector hatching lines
      const pitch = Math.max(10, hatch.pitchMm);
      const angle = hatch.angleRad;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Rotate bounds into pattern alignment
      const diag = Math.sqrt((maxX - minX) * (maxX - minX) + (maxY - minY) * (maxY - minY));
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;

      ctx.beginPath();
      const count = Math.ceil(diag / pitch);
      for (let i = -count; i <= count; i++) {
        const offset = i * pitch;
        // Line perpendicular to angle
        const lx1 = cx + offset * -sinA - diag * cosA;
        const ly1 = cy + offset * cosA - diag * sinA;
        const lx2 = cx + offset * -sinA + diag * cosA;
        const ly2 = cy + offset * cosA + diag * sinA;
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
      }
      ctx.stroke();

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Elevation Datums
  // --------------------------------------------------------------------------

  private renderDatums(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.zoom;

    for (const dat of this.commission.datums) {
      ctx.save();

      // Datum Line
      ctx.strokeStyle = this.theme.datumLine;
      ctx.lineWidth = (dat.isKeyDatum ? 1.4 : 0.8) / zoom;
      ctx.setLineDash(dat.isKeyDatum ? [10 / zoom, 4 / zoom] : [6 / zoom, 6 / zoom]);

      ctx.beginPath();
      ctx.moveTo(dat.xStart, dat.elevationMm);
      ctx.lineTo(dat.xEnd, dat.elevationMm);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Datum Symbol (Quartered Circle Marker)
      const r = 40 / zoom;
      const drawMarker = (x: number, side: 'left' | 'right') => {
        ctx.save();
        ctx.translate(x, dat.elevationMm);

        // Marker Outer Circle
        ctx.strokeStyle = this.theme.datumMarkerFill;
        ctx.lineWidth = 1.4 / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(-r * 1.4, 0);
        ctx.lineTo(r * 1.4, 0);
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(0, r * 1.4);
        ctx.stroke();

        // Quarter quadrant fill
        ctx.fillStyle = this.theme.datumMarkerFill;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, 0, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, Math.PI, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();

        // Text: Level & Code
        ctx.scale(1, -1);
        ctx.font = `bold ${Math.round(36 / zoom)}px "Inter", sans-serif`;
        ctx.fillStyle = this.theme.datumText;
        ctx.textAlign = side === 'left' ? 'right' : 'left';
        ctx.textBaseline = 'middle';

        const textOffset = (r * 1.8) * (side === 'left' ? -1 : 1);
        const elevStr = formatElevationM(dat.elevationMm);
        ctx.fillText(`${dat.code} ${elevStr}`, textOffset, 0);

        ctx.font = `normal ${Math.round(26 / zoom)}px "Inter", sans-serif`;
        ctx.fillStyle = this.theme.hairlineDetail;
        ctx.fillText(dat.label, textOffset, side === 'left' ? 32 / zoom : 32 / zoom);

        ctx.restore();
      };

      if (dat.side === 'left' || dat.side === 'both') {
        drawMarker(dat.xStart, 'left');
      }
      if (dat.side === 'right' || dat.side === 'both') {
        drawMarker(dat.xEnd, 'right');
      }

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Multi-Tier Dimension Strings
  // --------------------------------------------------------------------------

  private renderDimensions(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.zoom;

    for (const dim of this.commission.dimensions) {
      ctx.save();

      const p1 = dim.p1;
      const p2 = dim.p2;
      const isHoriz = dim.orientation === 'horizontal';
      const tickSize = 35 / zoom;

      ctx.strokeStyle = this.theme.dimensionLine;
      ctx.lineWidth = 1.0 / zoom;

      let d1: CADPoint;
      let d2: CADPoint;

      if (isHoriz) {
        const yDim = p1.y + dim.offsetMm;
        d1 = { x: p1.x, y: yDim };
        d2 = { x: p2.x, y: yDim };

        // Extension Lines with 30mm gap from element
        const gap = 30 / zoom;
        const overshoot = 50 / zoom;
        const dirY = dim.offsetMm >= 0 ? 1 : -1;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + gap * dirY);
        ctx.lineTo(p1.x, yDim + overshoot * dirY);
        ctx.moveTo(p2.x, p2.y + gap * dirY);
        ctx.lineTo(p2.x, yDim + overshoot * dirY);
        ctx.stroke();

        // Dimension Line
        ctx.beginPath();
        ctx.moveTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.stroke();

        // 45° Architectural Ticks (Slash Marks)
        ctx.lineWidth = 1.8 / zoom;
        ctx.beginPath();
        ctx.moveTo(d1.x - tickSize * 0.7, d1.y - tickSize * 0.7);
        ctx.lineTo(d1.x + tickSize * 0.7, d1.y + tickSize * 0.7);
        ctx.moveTo(d2.x - tickSize * 0.7, d2.y - tickSize * 0.7);
        ctx.lineTo(d2.x + tickSize * 0.7, d2.y + tickSize * 0.7);
        ctx.stroke();

        // Dimension Text centered above line
        const midX = (d1.x + d2.x) * 0.5;
        const midY = d1.y + 25 / zoom * dirY;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.scale(1, -1);
        ctx.font = `bold ${Math.round(34 / zoom)}px "Inter", "Helvetica Neue", sans-serif`;
        ctx.fillStyle = this.theme.dimensionText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dim.text, 0, 0);
        ctx.restore();
      } else {
        // Vertical Dimension
        const xDim = p1.x - dim.offsetMm;
        d1 = { x: xDim, y: p1.y };
        d2 = { x: xDim, y: p2.y };

        const gap = 30 / zoom;
        const overshoot = 50 / zoom;
        const dirX = dim.offsetMm >= 0 ? -1 : 1;

        ctx.beginPath();
        ctx.moveTo(p1.x + gap * dirX, p1.y);
        ctx.lineTo(xDim + overshoot * dirX, p1.y);
        ctx.moveTo(p2.x + gap * dirX, p2.y);
        ctx.lineTo(xDim + overshoot * dirX, p2.y);
        ctx.stroke();

        // Dimension Line
        ctx.beginPath();
        ctx.moveTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.stroke();

        // Ticks
        ctx.lineWidth = 1.8 / zoom;
        ctx.beginPath();
        ctx.moveTo(d1.x - tickSize * 0.7, d1.y - tickSize * 0.7);
        ctx.lineTo(d1.x + tickSize * 0.7, d1.y + tickSize * 0.7);
        ctx.moveTo(d2.x - tickSize * 0.7, d2.y - tickSize * 0.7);
        ctx.lineTo(d2.x + tickSize * 0.7, d2.y + tickSize * 0.7);
        ctx.stroke();

        // Dimension Text rotated 90 degrees
        const midX = d1.x - 25 / zoom;
        const midY = (d1.y + d2.y) * 0.5;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(-Math.PI * 0.5);
        ctx.scale(1, -1);
        ctx.font = `bold ${Math.round(34 / zoom)}px "Inter", sans-serif`;
        ctx.fillStyle = this.theme.dimensionText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dim.text, 0, 0);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Leader Lines & Annotations
  // --------------------------------------------------------------------------

  private renderLeaders(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.zoom;

    for (const lead of this.commission.leaders) {
      ctx.save();

      ctx.strokeStyle = this.theme.leaderLine;
      ctx.lineWidth = 1.2 / zoom;

      // Terminal filled dot at target element
      ctx.fillStyle = this.theme.leaderLine;
      ctx.beginPath();
      ctx.arc(lead.target.x, lead.target.y, 25 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Dog-leg leader path (Target -> Elbow -> Shelf)
      ctx.beginPath();
      ctx.moveTo(lead.target.x, lead.target.y);
      ctx.lineTo(lead.elbow.x, lead.elbow.y);
      ctx.lineTo(lead.shelfEnd.x, lead.shelfEnd.y);
      ctx.stroke();

      // Note text above shelf
      const isRight = lead.shelfEnd.x >= lead.elbow.x;
      const textX = lead.elbow.x + (isRight ? 15 : -15) / zoom;
      const textY = lead.shelfEnd.y + 15 / zoom;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.scale(1, -1);
      ctx.font = `bold ${Math.round(32 / zoom)}px "Inter", sans-serif`;
      ctx.fillStyle = this.theme.leaderText;
      ctx.textAlign = isRight ? 'left' : 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lead.note, 0, 0);

      if (lead.secondaryNote) {
        ctx.font = `normal ${Math.round(24 / zoom)}px "Inter", sans-serif`;
        ctx.fillStyle = this.theme.hairlineDetail;
        ctx.fillText(lead.secondaryNote, 0, 26 / zoom);
      }
      ctx.restore();

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Interactive Measurements
  // --------------------------------------------------------------------------

  private renderMeasurements(ctx: CanvasRenderingContext2D): void {
    for (const m of this.measurements) {
      this.drawMeasurementGeometry(ctx, m.p1, m.p2, m.lengthMm, false);
    }
  }

  private renderActiveRuler(ctx: CanvasRenderingContext2D, p1: CADPoint, p2: CADPoint): void {
    const len = distance(p1, p2);
    this.drawMeasurementGeometry(ctx, p1, p2, len, true);
  }

  private drawMeasurementGeometry(
    ctx: CanvasRenderingContext2D,
    p1: CADPoint,
    p2: CADPoint,
    lenMm: number,
    isActive: boolean
  ): void {
    const zoom = this.viewport.zoom;
    const color = isActive ? this.theme.rulerMeasurement : this.theme.dimensionLine;
    const tickSize = 35 / zoom;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = (isActive ? 2.2 : 1.4) / zoom;

    // Measurement Line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // End Terminal Ticks
    const ang = angleRadians(p1, p2);
    const perpAng = ang + Math.PI * 0.5;
    const px = Math.cos(perpAng) * tickSize;
    const py = Math.sin(perpAng) * tickSize;

    ctx.beginPath();
    ctx.moveTo(p1.x - px, p1.y - py);
    ctx.lineTo(p1.x + px, p1.y + py);
    ctx.moveTo(p2.x - px, p2.y - py);
    ctx.lineTo(p2.x + px, p2.y + py);
    ctx.stroke();

    // Floating Dimension Readout Badge
    const mid = midpoint(p1, p2);
    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.scale(1, -1);

    const text = formatMetricMm(lenMm);
    const fontSize = Math.round(36 / zoom);
    ctx.font = `bold ${fontSize}px "Inter", monospace`;

    const metrics = ctx.measureText(text);
    const padX = 35 / zoom;
    const padY = 20 / zoom;
    const rw = metrics.width + padX * 2;
    const rh = fontSize + padY * 2;

    // Rounded rectangle background badge
    ctx.fillStyle = this.theme.rulerBadgeBg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 / zoom;
    ctx.beginPath();
    ctx.roundRect(-rw * 0.5, -rh * 0.5, rw, rh, 8 / zoom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.theme.rulerBadgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);

    ctx.restore();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Sub-Renderer: Screen-Space Overlays & O-SNAP Glyphs
  // --------------------------------------------------------------------------

  private renderSnapGlyph(ctx: CanvasRenderingContext2D, snap: SnapPoint): void {
    const dpr = this.viewport.dpr;
    const screenPos = this.worldToScreen(snap.x, snap.y);
    const sx = Math.round(screenPos.x * dpr);
    const sy = Math.round(screenPos.y * dpr);
    const size = 10 * dpr;

    ctx.save();
    ctx.strokeStyle = this.theme.snapMarker;
    ctx.fillStyle = this.theme.snapMarker;
    ctx.lineWidth = 2 * dpr;

    switch (snap.type) {
      case 'endpoint':
        // Square glyph
        ctx.strokeRect(sx - size, sy - size, size * 2, size * 2);
        break;
      case 'midpoint':
        // Triangle glyph
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 1.2);
        ctx.lineTo(sx + size, sy + size * 0.8);
        ctx.lineTo(sx - size, sy + size * 0.8);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'center':
        // Circle glyph
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'datum':
        // Diamond glyph
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 1.2);
        ctx.lineTo(sx + size * 1.2, sy);
        ctx.lineTo(sx, sy + size * 1.2);
        ctx.lineTo(sx - size * 1.2, sy);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'grid':
      default:
        // Crosshair glyph
        ctx.beginPath();
        ctx.moveTo(sx - size, sy);
        ctx.lineTo(sx + size, sy);
        ctx.moveTo(sx, sy - size);
        ctx.lineTo(sx, sy + size);
        ctx.stroke();
        break;
    }

    // Snap Tooltip Tag
    ctx.font = `600 ${Math.round(11 * dpr)}px "Inter", sans-serif`;
    const tag = `${snap.label} [${Math.round(snap.x)}, ${Math.round(snap.y)}]`;
    const m = ctx.measureText(tag);
    const tagW = m.width + 12 * dpr;
    const tagH = 18 * dpr;

    ctx.fillStyle = 'rgba(7, 22, 38, 0.9)';
    ctx.strokeStyle = this.theme.snapMarker;
    ctx.lineWidth = 1 * dpr;
    ctx.roundRect(sx + size + 6 * dpr, sy - tagH * 0.5, tagW, tagH, 3 * dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.theme.snapMarker;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, sx + size + 12 * dpr, sy);

    ctx.restore();
  }

  private renderScreenHUD(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const dpr = this.viewport.dpr;
    ctx.save();

    // 1. Top-Left HUD Info Badge: Commission & Drawing Code
    const padding = 20 * dpr;
    ctx.fillStyle = 'rgba(7, 22, 38, 0.85)';
    ctx.strokeStyle = this.theme.moduleLine;
    ctx.lineWidth = 1 * dpr;

    const hudW = 320 * dpr;
    const hudH = 80 * dpr;
    ctx.roundRect(padding, padding, hudW, hudH, 6 * dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.theme.primaryProfile;
    ctx.font = `bold ${Math.round(13 * dpr)}px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.commission.code + ' · ' + this.commission.title, padding + 14 * dpr, padding + 12 * dpr);

    ctx.fillStyle = this.theme.hairlineDetail;
    ctx.font = `normal ${Math.round(11 * dpr)}px "Inter", sans-serif`;
    ctx.fillText(this.commission.subtitle, padding + 14 * dpr, padding + 32 * dpr);

    ctx.fillStyle = this.theme.dimensionLine;
    ctx.font = `600 ${Math.round(10 * dpr)}px "Inter", monospace`;
    ctx.fillText(
      `ZOOM ${(this.viewport.zoom * 100).toFixed(0)}% · SCALE ${this.commission.scaleText}`,
      padding + 14 * dpr,
      padding + 52 * dpr
    );

    // 2. Bottom-Left Live Cursor World Coordinate Readout & Snap Status
    const coordH = 36 * dpr;
    const coordW = 280 * dpr;
    const coordY = height - padding - coordH;

    ctx.fillStyle = 'rgba(7, 22, 38, 0.85)';
    ctx.strokeStyle = this.theme.moduleLine;
    ctx.roundRect(padding, coordY, coordW, coordH, 4 * dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.theme.dimensionText;
    ctx.font = `500 ${Math.round(11 * dpr)}px "Inter", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const snapText = this.activeSnap ? ` [SNAP: ${this.activeSnap.type.toUpperCase()}]` : '';
    ctx.fillText(
      `X: ${formatMetricMm(this.cursorWorld.x)}  Y: ${formatMetricMm(this.cursorWorld.y)}${snapText}`,
      padding + 12 * dpr,
      coordY + coordH * 0.5
    );

    // 3. Metric Scale Bar (Bottom Center)
    this.renderGraphicScaleBar(ctx, width * 0.5, height - padding - 15 * dpr);

    ctx.restore();
  }

  private renderGraphicScaleBar(ctx: CanvasRenderingContext2D, centerX: number, bottomY: number): void {
    const dpr = this.viewport.dpr;
    const zoom = this.viewport.zoom;

    // 1,000 mm (1.0 meter) metric scale bar
    const meterWorldMm = 1000;
    const barWidthPx = meterWorldMm * zoom * dpr;

    if (barWidthPx < 30 || barWidthPx > 400) return; // Don't draw if too small or too massive

    const barH = 6 * dpr;
    const barX = centerX - barWidthPx * 0.5;
    const barY = bottomY - barH;

    ctx.save();
    // Alternating solid blocks
    const segments = 4;
    const segW = barWidthPx / segments;

    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = i % 2 === 0 ? this.theme.primaryProfile : 'transparent';
      ctx.fillRect(barX + i * segW, barY, segW, barH);
    }

    ctx.strokeStyle = this.theme.primaryProfile;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(barX, barY, barWidthPx, barH);

    // Labels
    ctx.fillStyle = this.theme.dimensionText;
    ctx.font = `600 ${Math.round(10 * dpr)}px "Inter", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('0', barX, barY - 4 * dpr);
    ctx.fillText('1,000 MM (1M)', barX + barWidthPx, barY - 4 * dpr);

    ctx.restore();
  }

  private emitTelemetry(): void {
    if (!this.onTelemetryUpdate) return;
    this.onTelemetryUpdate({
      commissionId: this.commissionId,
      commissionCode: this.commission.code,
      zoom: this.viewport.zoom,
      cursorWorld: this.cursorWorld,
      activeSnap: this.activeSnap,
      activeMeasurement: this.isMeasuring && this.measureStart && this.measureCurrent ? {
        id: 'active',
        p1: this.measureStart,
        p2: this.measureCurrent,
        lengthMm: distance(this.measureStart, this.measureCurrent),
        deltaX: Math.abs(this.measureCurrent.x - this.measureStart.x),
        deltaY: Math.abs(this.measureCurrent.y - this.measureStart.y),
        angleDeg: angleDegrees(this.measureStart, this.measureCurrent),
        isOrtho: this.orthoEnabled,
        timestamp: Date.now(),
      } : null,
      measurementsCount: this.measurements.length,
      fps: this.fps,
      elementCount: this.commission.elements.length,
    });
  }

  // --------------------------------------------------------------------------
  // Export to CAD Vector SVG (DIN EN ISO 7200 Title Block)
  // --------------------------------------------------------------------------

  public exportSVG(options: SVGExportOptions = {}): string {
    const c = this.commission;
    const theme = BLUEPRINT_THEMES[options.themeId || this.theme.id];

    const bounds = c.bounds;
    const margin = 200; // 200mm sheet border margin
    const sheetMinX = bounds.minX - margin;
    const sheetMinY = bounds.minY - margin;
    const sheetW = bounds.width + margin * 2;
    const sheetH = bounds.height + margin * 2;

    const viewBox = `${sheetMinX} ${sheetMinY} ${sheetW} ${sheetH}`;

    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" style="background-color: ${theme.background}; font-family: 'Inter', sans-serif;">\n`;

    // 1. Defs & Patterns
    svg += `  <defs>\n`;
    svg += `    <style>\n`;
    svg += `      .hairline { vector-effect: non-scaling-stroke; }\n`;
    svg += `      .cad-primary { stroke: ${theme.primaryProfile}; stroke-width: 2.2; fill: none; }\n`;
    svg += `      .cad-secondary { stroke: ${theme.secondaryJoinery}; stroke-width: 1.4; fill: none; }\n`;
    svg += `      .cad-hairline { stroke: ${theme.hairlineDetail}; stroke-width: 0.8; fill: none; }\n`;
    svg += `      .cad-hidden { stroke: ${theme.hiddenLine}; stroke-width: 1.2; stroke-dasharray: 8 4; fill: none; }\n`;
    svg += `      .cad-dim-line { stroke: ${theme.dimensionLine}; stroke-width: 1.0; fill: none; }\n`;
    svg += `      .cad-dim-text { fill: ${theme.dimensionText}; font-size: 34px; font-weight: 600; text-anchor: middle; }\n`;
    svg += `      .cad-datum-line { stroke: ${theme.datumLine}; stroke-width: 1.0; stroke-dasharray: 10 4; fill: none; }\n`;
    svg += `      .cad-leader { stroke: ${theme.leaderLine}; stroke-width: 1.2; fill: none; }\n`;
    svg += `      .cad-title-border { stroke: ${theme.titleBlockBorder}; stroke-width: 1.6; fill: none; }\n`;
    svg += `    </style>\n`;
    svg += `  </defs>\n\n`;

    // 2. Structural & Architectural Elements
    svg += `  <!-- LAYER: ARCHITECTURAL GEOMETRY -->\n`;
    svg += `  <g id="layer-architecture" class="hairline" transform="scale(1, -1) translate(0, ${-(bounds.minY + bounds.maxY)})">\n`;

    for (const el of c.elements) {
      if (el.type === 'line') {
        const cls = el.weightClass === 'primary' ? 'cad-primary' : el.weightClass === 'hidden' ? 'cad-hidden' : 'cad-secondary';
        svg += `    <line x1="${el.p1.x}" y1="${el.p1.y}" x2="${el.p2.x}" y2="${el.p2.y}" class="${cls}" />\n`;
      } else if (el.type === 'rect') {
        const cls = el.weightClass === 'primary' ? 'cad-primary' : 'cad-secondary';
        const fillAttr = el.fill ? `fill="${el.fill}"` : `fill="none"`;
        svg += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" class="${cls}" ${fillAttr} />\n`;
      } else if (el.type === 'arc') {
        const startX = el.center.x + el.radius * Math.cos(el.startAngle);
        const startY = el.center.y + el.radius * Math.sin(el.startAngle);
        const endX = el.center.x + el.radius * Math.cos(el.endAngle);
        const endY = el.center.y + el.radius * Math.sin(el.endAngle);
        svg += `    <path d="M ${startX} ${startY} A ${el.radius} ${el.radius} 0 0 1 ${endX} ${endY}" class="cad-primary" />\n`;
      }
    }
    svg += `  </g>\n\n`;

    // 3. Elevation Datums
    if (options.includeDatums !== false) {
      svg += `  <!-- LAYER: CAD DATUMS -->\n`;
      svg += `  <g id="layer-datums" class="hairline" transform="scale(1, -1) translate(0, ${-(bounds.minY + bounds.maxY)})">\n`;
      for (const d of c.datums) {
        svg += `    <line x1="${d.xStart}" y1="${d.elevationMm}" x2="${d.xEnd}" y2="${d.elevationMm}" class="cad-datum-line" />\n`;
        // Circle marker
        svg += `    <circle cx="${d.xStart}" cy="${d.elevationMm}" r="35" stroke="${theme.datumMarkerFill}" stroke-width="1.2" fill="none" />\n`;
        svg += `    <text x="${d.xStart - 45}" y="${d.elevationMm + 10}" fill="${theme.datumText}" font-size="28px" font-weight="bold" text-anchor="end" transform="scale(1, -1) translate(0, ${-2 * d.elevationMm})">${d.code} ${formatElevationM(d.elevationMm)}</text>\n`;
      }
      svg += `  </g>\n\n`;
    }

    // 4. Dimensions
    if (options.includeDimensions !== false) {
      svg += `  <!-- LAYER: CAD DIMENSIONS -->\n`;
      svg += `  <g id="layer-dimensions" class="hairline" transform="scale(1, -1) translate(0, ${-(bounds.minY + bounds.maxY)})">\n`;
      for (const dim of c.dimensions) {
        if (dim.orientation === 'horizontal') {
          const yDim = dim.p1.y + dim.offsetMm;
          svg += `    <line x1="${dim.p1.x}" y1="${dim.p1.y}" x2="${dim.p1.x}" y2="${yDim + 40}" class="cad-dim-line" />\n`;
          svg += `    <line x1="${dim.p2.x}" y1="${dim.p2.y}" x2="${dim.p2.x}" y2="${yDim + 40}" class="cad-dim-line" />\n`;
          svg += `    <line x1="${dim.p1.x}" y1="${yDim}" x2="${dim.p2.x}" y2="${yDim}" class="cad-dim-line" />\n`;
          // Ticks
          svg += `    <line x1="${dim.p1.x - 20}" y1="${yDim - 20}" x2="${dim.p1.x + 20}" y2="${yDim + 20}" class="cad-primary" />\n`;
          svg += `    <line x1="${dim.p2.x - 20}" y1="${yDim - 20}" x2="${dim.p2.x + 20}" y2="${yDim + 20}" class="cad-primary" />\n`;
          // Text
          const midX = (dim.p1.x + dim.p2.x) * 0.5;
          svg += `    <text x="${midX}" y="${yDim + 25}" class="cad-dim-text" transform="scale(1, -1) translate(0, ${-2 * (yDim + 25)})">${dim.text}</text>\n`;
        }
      }
      svg += `  </g>\n\n`;
    }

    // 5. DIN EN ISO 7200 Title Block (Bottom-Right of Sheet)
    if (options.includeTitleBlock !== false) {
      const tbW = 1200;
      const tbH = 420;
      const tbX = sheetMinX + sheetW - tbW - 80;
      const tbY = sheetMinY + 80;

      svg += `  <!-- LAYER: ISO 7200 TITLE BLOCK -->\n`;
      svg += `  <g id="layer-title-block">\n`;
      svg += `    <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="${theme.titleBlockBg}" stroke="${theme.titleBlockBorder}" stroke-width="2.5" />\n`;
      svg += `    <line x1="${tbX}" y1="${tbY + 90}" x2="${tbX + tbW}" y2="${tbY + 90}" stroke="${theme.titleBlockBorder}" stroke-width="1.2" />\n`;
      svg += `    <line x1="${tbX}" y1="${tbY + 180}" x2="${tbX + tbW}" y2="${tbY + 180}" stroke="${theme.titleBlockBorder}" stroke-width="1.2" />\n`;
      svg += `    <line x1="${tbX}" y1="${tbY + 280}" x2="${tbX + tbW}" y2="${tbY + 280}" stroke="${theme.titleBlockBorder}" stroke-width="1.2" />\n`;
      svg += `    <line x1="${tbX + 450}" y1="${tbY}" x2="${tbX + 450}" y2="${tbY + 180}" stroke="${theme.titleBlockBorder}" stroke-width="1.2" />\n`;

      // Studio Branding
      svg += `    <text x="${tbX + 30}" y="${tbY + 45}" fill="${theme.primaryProfile}" font-size="28px" font-weight="900" letter-spacing="2">RUBICONIUS</text>\n`;
      svg += `    <text x="${tbX + 30}" y="${tbY + 75}" fill="${theme.hairlineDetail}" font-size="16px">INTERIOR ARCHITECTURE &amp; TURNKEY</text>\n`;

      // Architect & Location
      svg += `    <text x="${tbX + 480}" y="${tbY + 40}" fill="${theme.dimensionText}" font-size="18px" font-weight="bold">RIYA AGRAWAL</text>\n`;
      svg += `    <text x="${tbX + 480}" y="${tbY + 70}" fill="${theme.hairlineDetail}" font-size="14px">BIRATNAGAR &amp; DHARAN, NEPAL</text>\n`;

      // Drawing Title & Code
      svg += `    <text x="${tbX + 30}" y="${tbY + 130}" fill="${theme.dimensionText}" font-size="22px" font-weight="bold">${c.title.toUpperCase()}</text>\n`;
      svg += `    <text x="${tbX + 30}" y="${tbY + 160}" fill="${theme.hairlineDetail}" font-size="16px">${c.drawingTitle}</text>\n`;

      // Meta: Scale, Date, Rev, Sheet
      svg += `    <text x="${tbX + 30}" y="${tbY + 230}" fill="${theme.dimensionText}" font-size="18px">SCALE: ${c.scaleText}</text>\n`;
      svg += `    <text x="${tbX + 450}" y="${tbY + 230}" fill="${theme.dimensionText}" font-size="18px">DATE: ${c.dateStr}</text>\n`;
      svg += `    <text x="${tbX + 850}" y="${tbY + 230}" fill="${theme.dimensionText}" font-size="18px">SHEET: ${c.sheetNo}</text>\n`;
      svg += `    <text x="${tbX + 30}" y="${tbY + 340}" fill="${theme.leaderLine}" font-size="20px" font-weight="bold">${c.revision}</text>\n`;
      svg += `    <text x="${tbX + 850}" y="${tbY + 340}" fill="${theme.primaryProfile}" font-size="24px" font-weight="900">${c.code}</text>\n`;

      svg += `  </g>\n\n`;
    }

    svg += `</svg>\n`;
    return svg;
  }

  public downloadSVG(filename?: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const svgString = this.exportSVG();
    const finalFilename = filename || `${this.commission.code}_${this.commissionId}_elevation.svg`;

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// 07. FACTORY HELPER FUNCTION
// ============================================================================

export function createBlueprintEngine(
  canvas?: HTMLCanvasElement,
  options?: BlueprintEngineOptions
): BlueprintEngine {
  const engine = new BlueprintEngine(options);
  if (canvas) {
    engine.attachCanvas(canvas);
  }
  return engine;
}
