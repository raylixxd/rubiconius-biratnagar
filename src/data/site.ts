import realDiningHall from '../assets/real-dining-hall.jpg';
import realLivingRoom from '../assets/real-living-room.jpg';
import realMasterBedroom from '../assets/real-master-bedroom.jpg';
import realReadingCorner from '../assets/real-reading-corner.jpg';
import realLoungeVignette from '../assets/real-lounge-vignette.jpg';
import rubiconiusPracticeStudio from '../assets/rubiconius-practice-studio.jpg';
import rubiconiusHeroAi from '../assets/rubiconius-hero-ai.jpg';

export type GlbPinKey = 'fluted-suite' | 'timber-hearth' | 'courtyard-hall';

export type MaterialSpec = {
  label: string;
  swatchHex: string;
};

export type SurfaceTheme = 'charcoal' | 'walnut' | 'ivory';

export interface ShowcasePlate {
  id: string;
  index: string;                              // '01' | '02' | '03' | '04'
  title: string;                              // Cormorant Garamond / Boska editorial title
  annotation: string;                         // DM Mono uppercase architectural spec
  caption: string;                            // Manrope concise architectural note
  image: ImageMetadata;                       // Real ESM-imported site photograph
  backdropImage?: ImageMetadata;              // Optional Z-Back atmospheric layer
  isConceptRender?: boolean;                  // Explicit transparency tag if ever used
  cropRect: [number, number, number, number]; // [offsetX, offsetY, scaleX, scaleY]
  surfaceTheme: SurfaceTheme;
  swatchHex: string;                          // Real swatch from commission.materials
  materialSpec: string;                       // Extended dossier breakdown for Phase 6 Inspector
}

export type Commission = {
  slug: 'fluted-master-suite' | 'formal-drawing-room' | 'heritage-panelled-gallery';
  title: string;
  scope: string;
  focus: string;
  typology: 'Private Residence' | 'Formal Reception' | 'Private Gallery';
  location: 'Biratnagar' | 'Dharan';
  year: '2024' | '2023';
  summary: string;
  image: ImageMetadata;
  primaryObjectPosition?: string;
  detailImage?: ImageMetadata;
  detailObjectPosition?: string;
  detailScale?: number;
  alt: string;
  materials: MaterialSpec[];
  narrative: { heading: string; text: string }[];
  showcase?: ShowcasePlate[];
};

export type MaterialStudyNote = {
  key: GlbPinKey;
  title: string;
  category: string;
  summary: string;
  image: ImageMetadata;
  alt: string;
  materials: string[];
};

export const site = {
  name: 'Rubiconius',
  tagline: 'Measured interior architecture shaped around daylight, joinery, and quiet material proportion.',
  commitmentQuote: 'Our word is our commitment — and when we commit, we pass into a point of no return.',
  founder: 'Riya Agrawal',
  founderBio: [
    'Each commission is composed around daylight, spatial proportion, and disciplined millwork — shaped around our clients’ daily rituals rather than passing ornamental trends.',
    'Founded by Riya Agrawal after honing an eye for furnishings, textiles, and spatial detail in Kolkata, the practice brings architectural restraint and close collaboration with regional craftspeople to residences and offices across Biratnagar and Dharan.',
  ],
  city: 'Munal Path, Biratnagar & Gita Mandir Line, Dharan, Nepal',
  offices: [
    {
      id: 'biratnagar',
      index: '01',
      city: 'Biratnagar',
      address: 'Munal Path, Kochakhaltol, Biratnagar 56613',
      coords: '26.4678° N, 87.2767° E',
      note: 'Primary design studio & client consultation desk.',
      mapUrl: 'https://maps.google.com/?q=26.4678,87.2767',
      embedUrl: 'https://maps.google.com/maps?q=26.4678,87.2767&z=16&output=embed',
    },
    {
      id: 'dharan',
      index: '02',
      city: 'Dharan',
      address: 'Gita Mandir Line, Dharan 56701',
      coords: 'Sunsari, Eastern Nepal',
      note: 'Foothills studio serving Dharan & Itahari.',
      mapUrl: 'https://maps.google.com/?q=Gita+Mandir+Line,+Dharan+56701,+Nepal',
      embedUrl: 'https://maps.google.com/maps?q=Gita+Mandir+Line,+Dharan+56701,+Nepal&z=16&output=embed',
    },
  ],
  hours: 'Sun – Fri, 11 AM – 5 PM (Saturday closed)',
  phoneDisplay: '+977 981-2353149',
  whatsappNumber: '9779812353149',
  ratingScore: '5.0',
  reviewCount: 27,
  bioLink: 'https://msha.ke/rubiconius',
  url: 'https://rubiconius.com.np',
  description:
    'Rubiconius is an interior architecture and turnkey studio in Biratnagar and Dharan led by Riya Agrawal — composing residential and executive spaces with regional craftspeople.',
  nav: [
    { label: 'Works', href: '/works/' },
    { label: 'About', href: '/practice/' },
    { label: 'Material Study (3D)', href: '/showroom/' },
  ],
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/rubiconius_' },
    { label: 'Facebook', href: 'https://m.facebook.com/rubiconius' },
    { label: 'Houzz', href: 'https://www.houzz.com/pro/riya-agrawal20/rubiconius-bringing-creative-interiors-to-life' },
    { label: 'YouTube', href: 'https://youtube.com/channel/UCFh7ainldTaP_DPomtA7OjA' },
  ],
  services: [
    {
      index: '01',
      name: 'Turnkey Residential & Commercial',
      detail: 'End-to-end execution across homes, 3BHK residences, and office renovations — including civil and electrical coordination.',
    },
    {
      index: '02',
      name: 'Fine Carpentry & Modular Furniture',
      detail: 'Fluted panelling, custom beds, TV units, wardrobes, and modular joinery built with regional craftspeople.',
    },
    {
      index: '03',
      name: 'False Ceilings, Lighting & Glazing',
      detail: 'Gypsum and POP ceiling geometry, recessed cove lighting, decorative chandeliers, sconces, glass, and mirrors.',
    },
    {
      index: '04',
      name: 'Custom Iron & Metal Work',
      detail: 'Bespoke metal partitions, architectural gates, grills, and stair railings detailed to match interior finishes.',
    },
    {
      index: '05',
      name: 'Soft Furnishings & Handpicked Decor',
      detail: 'Custom sofas, textiles, outdoor seating, artwork framing, and handpicked finishing accessories.',
    },
  ],
};

// Verified completed Eastern Nepal room studies from Rubiconius portfolio.
export const commissions: Commission[] = [
  {
    slug: 'fluted-master-suite',
    title: 'Fluted Master Suite',
    scope: 'Master Bedroom & Custom Millwork',
    focus: 'Fluted Panelling',
    typology: 'Private Residence',
    location: 'Biratnagar',
    year: '2024',
    summary: 'Deep vertical timber fluting continuing into the ceiling plane, paired with a tailored linen headboard and brushed brass bedside sconces.',
    image: realMasterBedroom,
    primaryObjectPosition: 'center 68%',
    // detailImage: flutedSuiteDetail, // High-resolution 3:4 / 4:5 close-up photography slot
    detailObjectPosition: '24% 14%',
    detailScale: 1.44,
    alt: 'Completed Rubiconius master bedroom suite with deep vertical fluted wall panelling, tall tufted headboard, brass multi-globe sconces, and custom nightstands',
    materials: [
      { label: 'Vertical fluted solid Sal timber wall & ceiling panelling', swatchHex: '#4A3321' },
      { label: 'Tailored woven linen upholstered headboard', swatchHex: '#D8D3C9' },
      { label: 'Brushed brass multi-globe bedside sconces', swatchHex: '#C9A97E' },
      { label: 'Concealed perimeter warm architectural cove lighting', swatchHex: '#EFECE6' },
    ],
    narrative: [
      {
        heading: 'Fluted Geometry & Proportion',
        text: 'Full-height vertical fluting continues uninterrupted from the feature wall into the ceiling plane, creating a warm timber canopy behind the headboard while concealing indirect cove lighting.',
      },
      {
        heading: 'Warm Metallic Luminaires',
        text: 'Multi-globe brushed brass wall sconces establish low-glare bedside lighting balanced against tailored bedding and custom nightstands.',
      },
    ],
  },
  {
    slug: 'formal-drawing-room',
    title: 'Formal Drawing Room',
    scope: 'Living Hall, Seating & Glazing',
    focus: 'Seating & Lighting',
    typology: 'Formal Reception',
    location: 'Dharan',
    year: '2023',
    summary: 'Formal reception salon anchored by deep indigo seating, cognac leather armchairs, a multi-tier brass chandelier, and wide garden glazing.',
    image: realLivingRoom,
    // detailImage: formalDrawingDetail, // High-resolution 3:4 / 4:5 close-up photography slot
    detailObjectPosition: '50% 42%',
    alt: 'Completed Rubiconius living hall featuring a royal-blue sofa, cognac tufted leather armchairs, modern chandelier, marble flooring, and panoramic garden windows',
    materials: [
      { label: 'Honed veined marble slab flooring', swatchHex: '#EFECE6' },
      { label: 'Multi-tier brushed brass chandelier', swatchHex: '#C9A97E' },
      { label: 'Deep indigo upholstery & cognac leather armchairs', swatchHex: '#253652' },
      { label: 'Matte black-profile panoramic garden glazing', swatchHex: '#1D2A22' },
    ],
    narrative: [
      {
        heading: 'Balance of Color & Material Weight',
        text: 'Rich indigo and cognac upholstery tones sit lightly over cool honed veined marble flooring, keeping a formal hosting room composed for everyday family life.',
      },
      {
        heading: 'Daylight to Evening Glow',
        text: 'Broad black-framed garden windows pull in generous natural light by day, while the sculpted multi-tier chandelier anchors evening gatherings.',
      },
    ],
  },
  {
    slug: 'heritage-panelled-gallery',
    title: 'Heritage Panelled Gallery',
    scope: 'Feature Wall & Floating Millwork',
    focus: 'Panelled Gallery',
    typology: 'Private Gallery',
    location: 'Biratnagar',
    year: '2024',
    summary: 'Horizontal tongue-and-groove lime-washed wall panelling fitted with staggered timber shelves, wrought-iron brackets, and framed Mithila works.',
    image: realReadingCorner,
    // detailImage: heritageGalleryDetail, // High-resolution 3:4 / 4:5 close-up photography slot
    detailObjectPosition: '38% 45%',
    alt: 'Completed Rubiconius interior featuring warm grey-beige horizontal panelled wall, staggered timber floating shelves, framed heritage art, and dark metal brackets',
    materials: [
      { label: 'Horizontal tongue-and-groove lime-washed wall panelling', swatchHex: '#D8D3C9' },
      { label: 'Staggered solid Sal timber floating display shelves', swatchHex: '#5C412A' },
      { label: 'Blackened wrought-iron brackets & brass frame trim', swatchHex: '#2B2623' },
      { label: 'Low-glare matte mineral wall finish', swatchHex: '#EFECE6' },
    ],
    narrative: [
      {
        heading: 'Lived-In Wall Architecture',
        text: 'Clean horizontal tongue-and-groove reveals add quiet texture across the gallery wall without crowding the room, giving small keepsakes and plants deliberate resting ledges.',
      },
      {
        heading: 'Regional Heritage Framing',
        text: 'Local Mithila linework and miniature paintings sit in crisp black and gilt brass frames, honoring cultural craft inside a calm modern room.',
      },
    ],
    showcase: [
      {
        id: 'full-wall-elevation',
        index: '01',
        title: 'Full Wall Elevation',
        annotation: 'ELEVATION 01 · 1:20 REVEAL CADENCE',
        caption: 'Horizontal tongue-and-groove millwork establishes quiet texture across the gallery feature plane.',
        image: realReadingCorner,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#2B2623',
        materialSpec: 'Blackened wrought-iron structural brackets anchor staggered Sal timber shelves against lime-washed tongue-and-groove panelling.',
      },
      {
        id: 'staggered-timber-joinery',
        index: '02',
        title: 'Staggered Timber Joinery',
        annotation: 'JOINERY 02 · SAL TIMBER LEDGES',
        caption: 'Seasoned Sal timber floating shelves provide deliberate resting surfaces for curated artifacts.',
        image: realReadingCorner,
        cropRect: [0.1, 0.15, 0.8, 0.8],
        surfaceTheme: 'walnut',
        swatchHex: '#5C412A',
        materialSpec: 'Solid seasoned Sal timber floating shelves, oil-rubbed with shadow reveals.',
      },
      {
        id: 'limewash-reveal-cadence',
        index: '03',
        title: 'Limewash Reveal Cadence',
        annotation: 'SURFACE 03 · TONGUE & GROOVE TEXTURE',
        caption: 'Matte mineral limewash washes softly across horizontal wood reveals under ambient side-light.',
        image: realReadingCorner,
        cropRect: [0.15, 0.05, 0.75, 0.75],
        surfaceTheme: 'ivory',
        swatchHex: '#D8D3C9',
        materialSpec: 'Horizontal tongue-and-groove panel reveals finished in low-sheen natural mineral limewash.',
      },
      {
        id: 'regional-heritage-framing',
        index: '04',
        title: 'Regional Heritage Framing',
        annotation: 'DETAILS 04 · MITHILA CRAFT FRAMING',
        caption: 'Crisp blackened and gilt brass framing balances regional folk linework within modern architectural quietude.',
        image: realReadingCorner,
        cropRect: [0.05, 0.1, 0.78, 0.78],
        surfaceTheme: 'charcoal',
        swatchHex: '#EFECE6',
        materialSpec: 'Hand-detailed Mithila works set in slim matte black profiles with subtle gilt trim.',
      },
    ],
  },
];

// Standalone Concept Notes for /showroom/ 3D Material Study (never linked to specific completed homes)
export const materialStudies: MaterialStudyNote[] = [
  {
    key: 'fluted-suite',
    title: 'Honed Kota Limestone',
    category: 'Concept Study 02 · Flooring & Thermal Mass',
    summary: 'Matte honed limestone paired with vertical dark timber fluting — a concept study for cool, low-glare surfaces through warm Eastern Nepal summers.',
    image: rubiconiusPracticeStudio,
    alt: 'Limestone worktable arranged with fluted timber block, matte stone tiles, brass pull, and linen textile swatch',
    materials: [
      'Honed matte Kota limestone slabs',
      'Vertical fluted dark hardwood panelling',
      'Recessed warm perimeter grazing',
    ],
  },
  {
    key: 'timber-hearth',
    title: 'Verde Alpi Stone & Sal Timber',
    category: 'Concept Study 03 · Joinery & Accent Stone',
    summary: 'Deep veined green stone set beside seasoned dark timber joinery — studying tonal contrast, cabinet reveals, and tactile hardware in side-light.',
    image: rubiconiusPracticeStudio,
    alt: 'Studio palette study combining dark timber block, matte mineral stone slabs, and brushed brass handle',
    materials: [
      'Deep veined Verde Alpi accent stone',
      'Seasoned hardwood cabinetry & shadow gaps',
      'Hand-brushed unlacquered brass hardware',
    ],
  },
  {
    key: 'courtyard-hall',
    title: 'Courtyard Hall Daylight',
    category: 'Concept Study 04 · Threshold & Illumination',
    summary: 'Open threshold proportions studying how morning and afternoon sunlight washes across quiet matte plaster and framed glazing.',
    image: rubiconiusPracticeStudio,
    alt: 'Daylight studio view across stone table, linen sample, and rolled architectural floor plans',
    materials: [
      'Matte mineral wall finishes',
      'Slender black-framed glazed thresholds',
      'Layered ambient evening illumination',
    ],
  },
];

export const heroPlate = {
  image: rubiconiusHeroAi,
  alt: 'Architectural residence salon featuring full-height vertical fluted solid Sal timber panelling, honed Kota limestone flooring, brushed brass luminaire, warm cove illumination, and black-framed dusk glazing',
  title: 'Sal Timber & Limestone Salon',
  meta: 'Architectural Spatial Concept · Rubiconius',
};

export const diningPlateFallback = {
  image: realDiningHall,
  alt: 'Completed Rubiconius dining and living gallery featuring patterned accent wall, custom timber sideboard, marble flooring, cove ceiling lighting, and tailored dining seating',
};

export const craftPlate = {
  image: realLoungeVignette,
  alt: 'Handpicked cane-back lounge chairs, brass candle hurricane, woven reed mat, knit cushion, and cream cabinetry styled by Rubiconius',
  title: 'Handpicked Styling & Furnishings',
  meta: 'Custom Details & Local Craft · Rubiconius',
};

export const parquetPlate = {
  image: rubiconiusPracticeStudio,
  alt: 'Stone studio table arranged with fluted timber sample, matte stone tiles, brushed brass hardware, woven linen swatch, and architectural plans',
};

export type ShowroomWaypoint = {
  id: string;
  index: string;
  label: string;
  u: number;
  cam: [number, number, number];
  target: [number, number, number];
  pin?: {
    anchor: [number, number, number];
    studySlug: GlbPinKey;
  };
};

export type ShowroomAsset =
  | {
      type: 'glb';
      src: string;
      mobileSrc?: string;
      cameraPathsSrc?: string;
      toneMapping: 'aces' | 'none';
      railFrom?: 'config' | 'empties';
    }
  | {
      type: 'splat';
      src: string;
      format: 'spz' | 'ply';
      toneMapping: 'none' | 'aces';
      transform?: {
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: number;
      };
    };

export type ShowroomConfig = {
  label?: string;
  trackViewports: number;
  baseFov: number;
  asset: ShowroomAsset;
  fog: {
    color: string;
    near: number;
    far: number;
  };
  waypoints: ShowroomWaypoint[];
};

export const showroom: ShowroomConfig = {
  label: undefined,
  trackViewports: 7,
  baseFov: 54,
  asset: {
    type: 'glb',
    src: '/models/rubiconius_pov.glb',
    mobileSrc: '/models/rubiconius_pov_mobile.glb',
    cameraPathsSrc: '/models/camera_paths.glb',
    // Current rubiconius_pov.glb textures are AgX-baked; keep 'none' to prevent double tone mapping.
    toneMapping: 'none',
    railFrom: 'empties',
  },
  fog: {
    color: '#D8CDBD',
    near: 12,
    far: 34,
  },
  waypoints: [
    {
      id: 'entry',
      index: '01',
      label: 'Entry Hall',
      u: 0.0,
      cam: [-0.45, 1.56, 7.2],
      target: [0.25, 1.44, 1.5],
    },
    {
      id: 'limestone',
      index: '02',
      label: 'Honed Kota Limestone',
      u: 0.25,
      cam: [-0.85, 1.48, 3.95],
      target: [2.25, 1.02, 2.35],
      pin: {
        anchor: [2.28, 1.28, 2.02],
        studySlug: 'fluted-suite',
      },
    },
    {
      id: 'sal',
      index: '03',
      label: 'Verde Alpi Stone & Sal Timber',
      u: 0.5,
      cam: [0.85, 1.52, -0.1],
      target: [-2.15, 1.12, -1.75],
      pin: {
        anchor: [-2.05, 1.18, -1.7],
        studySlug: 'timber-hearth',
      },
    },
    {
      id: 'courtyard',
      index: '04',
      label: 'Courtyard Hall',
      u: 0.75,
      cam: [-0.25, 1.56, -2.85],
      target: [0, 1.18, -5.85],
      pin: {
        anchor: [0, 1.46, -5.7],
        studySlug: 'courtyard-hall',
      },
    },
    {
      id: 'sunlit',
      index: '05',
      label: 'Sunlit Courtyard',
      u: 1.0,
      cam: [0.15, 1.58, -6.75],
      target: [0.1, 1.42, -11.4],
    },
  ],
};
