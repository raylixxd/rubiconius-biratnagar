import realDiningHall from '../assets/real-dining-hall.jpg';
import realLivingRoom from '../assets/real-living-room.jpg';
import realMasterBedroom from '../assets/real-master-bedroom.jpg';
import realReadingCorner from '../assets/real-reading-corner.jpg';
import realLoungeVignette from '../assets/real-lounge-vignette.jpg';
import realWoodStudy from '../assets/real-wood-study.jpg';
import rubiconiusPracticeStudio from '../assets/studio-practice-workspace.jpg';
import rubiconiusHeroAi from '../assets/studio-hero-ai.jpg';
import rubiconiusJoinery from '../assets/studio-joinery.jpg';
import rubiconiusMarble from '../assets/studio-marble.webp';
import rubiconiusThreshold from '../assets/studio-threshold.jpg';
import rubiconiusWorkDharan from '../assets/studio-work-terrace.jpg';
import rubiconiusWorkMunal from '../assets/studio-work-suite.jpg';

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
  commitmentKicker: 'Crossing the Rubicon',
  founder: 'Riya Agrawal',
  founderTitle: 'Founder & Principal Designer',
  founderBio: [
    'Each commission is composed around daylight, spatial proportion, and disciplined millwork — shaped around our clients’ daily rituals rather than passing ornamental trends.',
    'Founded by Riya Agrawal after honing an eye for furnishings, textiles, and spatial detail in Kolkata, the practice brings architectural restraint and close collaboration with regional craftspeople to residences and offices across Biratnagar and Dharan.',
  ],
  city: 'Munal Path, Biratnagar & Gita Mandir Line, Dharan, Nepal',
  primaryCity: 'Biratnagar',
  primaryRegion: 'Eastern Nepal',
  logo: {
    viewBox: '0 0 120 140',
    paths: [
      { d: 'M36 16H84L104 92C89 83 75 78 60 78C45 78 31 83 16 92L36 16ZM60 40L44 74C50 72 55 71 60 71C65 71 70 72 76 74L60 40Z', fill: 'currentColor' },
      { d: 'M35 97C46 105 74 105 85 97C86 112 75 119 66 123C62 125 60 130 61 135C52 130 48 122 50 116C52 112 46 109 42 114C37 110 34 103 35 97Z', fill: 'currentColor' },
    ],
  },
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
    detailImage: rubiconiusWorkDharan,
    detailObjectPosition: '50% 50%',
    detailScale: 1.0,
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
    showcase: [
      {
        id: 'full-suite-elevation',
        index: '01',
        title: 'Full Suite Elevation',
        annotation: 'ELEVATION 01 · CANOPY PROPORTION',
        caption: 'Vertical solid Sal timber fluting wraps wall and ceiling planes into one serene sleeping alcoved datum.',
        image: realMasterBedroom,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#4A3321',
        materialSpec: 'Continuous vertical fluted solid Sal timber panelling paired with perimeter concealed 2700K linear coves.',
      },
      {
        id: 'timber-rafter-terrace',
        index: '02',
        title: 'Timber Platform & Rafters Study',
        annotation: 'JOINERY 02 · PLASTER & TIMBER MASS',
        caption: 'Low-slung Sal timber platform joinery beneath exposed ceiling rafters opening toward misty eastern foothills.',
        image: rubiconiusWorkDharan,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'walnut',
        swatchHex: '#4A3321',
        materialSpec: 'Solid seasoned Sal timber platform bedstead paired with hand-troweled lime plaster niches.',
      },
      {
        id: 'continuous-fluted-canopy',
        index: '03',
        title: 'Fluted Millwork & Cove Joinery',
        annotation: 'MILLWORK 03 · RECESSED GRAZING',
        caption: 'Precision-milled vertical battens meet deep veined Verde stone accents and warm linear grazing.',
        image: rubiconiusJoinery,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'ivory',
        swatchHex: '#C9A97E',
        materialSpec: 'Precision-milled vertical Sal timber battens finished in warm low-sheen natural oil beside honed limestone.',
      },
      {
        id: 'suite-material-board',
        index: '04',
        title: 'Studio Material Board · Sal & Brass',
        annotation: 'SPECIMEN 04 · TACTILE PALETTE',
        caption: 'Physical fluted timber block, honed limestone tiles, cast brass pull, and raw woven linen beside elevation drawings.',
        image: rubiconiusPracticeStudio,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#D8D3C9',
        materialSpec: 'Hand-finished Sal timber sample, matte mineral stone slabs, raw woven Belgian linen, and brushed brass hardware.',
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
    detailImage: realDiningHall,
    detailObjectPosition: '50% 50%',
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
    showcase: [
      {
        id: 'reception-hall-elevation',
        index: '01',
        title: 'Reception Hall Elevation',
        annotation: 'ELEVATION 01 · FORMAL SALON AXIS',
        caption: 'Balanced reception proportions uniting garden fenestration, marble mass, and indigo and cognac seating.',
        image: realLivingRoom,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#1D2A22',
        materialSpec: 'Large-format honed veined marble floor plane grounding formal hosting seating and sculpted brass chandelier.',
      },
      {
        id: 'adjoining-dining-gallery',
        index: '02',
        title: 'Adjoining Dining & Sideboard Gallery',
        annotation: 'CONTINUITY 02 · HOSTING SEQUENCE',
        caption: 'Continuous marble flooring flows from the salon into the dining room, anchored by custom timber sideboard joinery.',
        image: realDiningHall,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'walnut',
        swatchHex: '#253652',
        materialSpec: 'Custom fluted timber credenza, channel-stitched dining upholstery, and recessed perimeter ceiling coves.',
      },
      {
        id: 'garden-colonnade-threshold',
        index: '03',
        title: 'Garden Threshold & Fluted Pavilion',
        annotation: 'DAYLIGHT 03 · VERANDA EXTENSION',
        caption: 'Slender black-framed pivoting doors open the formal dining datum onto lush eastern Nepal courtyard greenery.',
        image: rubiconiusWorkMunal,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'ivory',
        swatchHex: '#EFECE6',
        materialSpec: 'Slender anodized bronze glazing frames, solid dark oak table joinery, and continuous limestone paving.',
      },
      {
        id: 'honed-veined-marble-macro',
        index: '04',
        title: 'Honed Veined Marble Slab Macro',
        annotation: 'STONE 04 · MINERAL FLOORPLANE',
        caption: 'Natural iron-oxide and quartz veining across book-matched slabs softens glare while anchoring heavy timber volumes.',
        image: rubiconiusMarble,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#C9A97E',
        materialSpec: 'Honed natural veined marble slabs detailed with flush brass expansion inlays along room thresholds.',
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
    detailImage: realLoungeVignette,
    detailObjectPosition: '50% 50%',
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
        id: 'sunlit-plinth-threshold',
        index: '02',
        title: 'Sunlit Plinth & Fluted Threshold',
        annotation: 'SURFACE 02 · MINERAL PLASTER LIGHT',
        caption: 'Raking afternoon sunlight traces across dual vertical fluted portals and a monolithic travertine gallery plinth.',
        image: rubiconiusThreshold,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'walnut',
        swatchHex: '#D8D3C9',
        materialSpec: 'Hand-troweled matte lime plaster walls paired with twin vertical fluted hardwood portals and travertine display plinth.',
      },
      {
        id: 'handpicked-cane-brass',
        index: '03',
        title: 'Handpicked Cane, Brass & Reed Styling',
        annotation: 'OBJECTS 03 · CURATED STYLING',
        caption: 'Woven cane seating, turned brass hurricane lamp, and natural reed mats layer warmth beside clean cabinetry.',
        image: realLoungeVignette,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'ivory',
        swatchHex: '#C9A97E',
        materialSpec: 'Hand-woven rattan cane armchairs, unlacquered spun brass luminaire, braided reed mat, and textured knit cushion.',
      },
      {
        id: 'turned-timber-study',
        index: '04',
        title: 'Turned Timber & Molded Shell Study',
        annotation: 'FURNISHINGS 04 · PRIVATE READING ALCOVE',
        caption: 'Turned dark hardwood bedposts and a bentwood lounge chair complete the intimate residential reading wing.',
        image: realWoodStudy,
        cropRect: [0.0, 0.0, 1.0, 1.0],
        surfaceTheme: 'charcoal',
        swatchHex: '#5C412A',
        materialSpec: 'Hand-turned dark Sal timber joinery paired with sculpted bent-plywood leather seating and honed stone floor tiles.',
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
    image: rubiconiusJoinery,
    alt: 'Fluted Sal timber cabinetry paired with veined Verde Alpi stone island and courtyard glazing',
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
    image: rubiconiusThreshold,
    alt: 'Daylight studio view across monolithic travertine plinth and twin fluted timber portals',
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
    src: '/models/studio_pov.glb',
    mobileSrc: '/models/studio_pov_mobile.glb',
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
