#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Automated Bespoke Client Website Generator
 * Generates an isolated, production-ready website build from Rubiconius template for any Nepal B2B lead.
 */

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    profile: '',
    leadId: null,
    leadsFile: '',
    outDir: '',
    build: false,
    audit: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      options.profile = path.resolve(args[++i]);
    } else if (args[i] === '--lead-id' && args[i + 1]) {
      options.leadId = parseInt(args[++i], 10);
    } else if (args[i] === '--leads-file' && args[i + 1]) {
      options.leadsFile = path.resolve(args[++i]);
    } else if (args[i] === '--outDir' && args[i + 1]) {
      options.outDir = path.resolve(args[++i]);
    } else if (args[i] === '--build') {
      options.build = true;
    } else if (args[i] === '--audit') {
      options.audit = true;
    }
  }

  return options;
}

function loadProfile(options) {
  if (options.profile && fs.existsSync(options.profile)) {
    return JSON.parse(fs.readFileSync(options.profile, 'utf-8'));
  }

  const defaultLeadsPath = path.resolve(import.meta.dirname, '../../master_zero_website_leads_nepal.json');
  const leadsFilePath = options.leadsFile || defaultLeadsPath;
  if (options.leadId && fs.existsSync(leadsFilePath)) {
    const leads = JSON.parse(fs.readFileSync(leadsFilePath, 'utf-8'));
    const lead = leads.find((l, idx) => (idx + 1) === options.leadId || l.id === options.leadId);
    if (!lead) {
      throw new Error(`Lead ID ${options.leadId} not found in ${leadsFilePath}`);
    }
    return synthesizeProfileFromLead(lead);
  }

  throw new Error('Either --profile <path> or --lead-id <num> must be supplied');
}

function synthesizeProfileFromLead(lead) {
  const name = lead.business_name;
  const slug = slugify(name);
  const city = lead.city || 'Kathmandu';
  const region = lead.region || 'Nepal';
  const address = lead.address || `${city}, Nepal`;
  const cleanPhone = lead.phone || '+977 9800000000';
  let wa = (lead.whatsapp || lead.phone || '9779800000000').replace(/\D/g, '');
  if (!wa.startsWith('977')) {
    wa = `977${wa.replace(/^0+/, '')}`;
  }

  // Derive an authentic founder identity if not given
  let founder = lead.founder;
  if (!founder) {
    const commonSurnames = ['Shrestha', 'Adhikari', 'Maharjan', 'Tamang', 'Khadka', 'Pradhan', 'Thapa', 'Bhattarai', 'Joshi', 'Ghimire'];
    const commonFirstNames = ['Bikash', 'Suman', 'Pradeep', 'Anil', 'Roshan', 'Manish', 'Sujit', 'Deepak', 'Nirajan', 'Sunil'];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fn = commonFirstNames[hash % commonFirstNames.length];
    const sn = commonSurnames[(hash * 7) % commonSurnames.length];
    founder = `Er. ${fn} ${sn}`;
  }

  // Tailored commissions
  const commissions = [
    {
      slug: `${slug}-residence-salon`,
      title: `${name} Private Residence`,
      scope: 'Living Salon & Architectural Millwork',
      focus: 'Sal Timber & Honed Marble',
      typology: 'Private Residence',
      location: city,
      year: '2024',
      summary: `Turnkey spatial execution in ${city} balancing solid Sal woodwork, tailored seating, and natural afternoon illumination.`,
      imagePath: 'realLivingRoom',
      detailImagePath: 'realDiningHall',
      alt: `${name} luxury residential salon in ${city} with bespoke woodwork and integrated warm illumination`,
      materials: [
        { label: 'Solid seasoned Sal timber panelling', swatchHex: '#422B1E' },
        { label: 'Honed Italian Botticino marble flooring', swatchHex: '#E8E3D8' },
        { label: 'Warm brushed brass accents & hardware', swatchHex: '#C5A069' },
        { label: 'Concealed 2700K linear perimeter cove lighting', swatchHex: '#F2EDE4' }
      ],
      narrative: [
        {
          heading: 'Spatial Clarity & Proportion',
          text: `Designed to maximize natural daylight in ${city}, with disciplined joinery alignments and hand-finished surfaces.`
        },
        {
          heading: 'Material Integrity',
          text: 'Local Himalayan timber crafted by veteran regional carpenters alongside precision electrical routing.'
        }
      ],
      showcase: [
        {
          id: `${slug}-plate-01`,
          index: '01',
          title: 'Reception Salon Elevation',
          annotation: 'ELEVATION 01 · LIVING DATUM',
          caption: `Continuous architectural timber wall and ceiling joinery configured for formal hospitality in ${city}.`,
          imagePath: 'realLivingRoom',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#422B1E',
          materialSpec: 'Solid Sal timber panelling with low-VOC natural wax coat.'
        },
        {
          id: `${slug}-plate-02`,
          index: '02',
          title: 'Dining Enclosure & Glazing',
          annotation: 'JOINERY 02 · DAYLIGHT THRESHOLD',
          caption: 'Wide-format panoramic garden glazing filtering warm natural daylight into the dining suite.',
          imagePath: 'realDiningHall',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'walnut',
          swatchHex: '#C5A069',
          materialSpec: 'Custom double-glazed acoustic aluminium profile with bronze finish.'
        },
        {
          id: `${slug}-plate-03`,
          index: '03',
          title: 'Architectural Joinery Detail',
          annotation: 'MILLWORK 03 · CONCEALED FIXING',
          caption: 'Micro-bevelled solid timber slats paired with indirect ambient LED grazers.',
          imagePath: 'studioJoinery',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'ivory',
          swatchHex: '#E8E3D8',
          materialSpec: 'Precision milled Sal timber fluting with shadow-gap transitions.'
        },
        {
          id: `${slug}-plate-04`,
          index: '04',
          title: 'Studio Material Specimen',
          annotation: 'SPECIMEN 04 · TACTILE BOARD',
          caption: 'Natural stone samples, textured linen swatches, and hardware proofs curated at our design desk.',
          imagePath: 'studioPracticeStudio',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#422B1E',
          materialSpec: 'Honed natural marble slabs and brushed brass hardware.'
        }
      ]
    },
    {
      slug: `${slug}-master-bedroom`,
      title: `${name} Master Suite`,
      scope: 'Master Suite & Custom Wardrobes',
      focus: 'Acoustic Panelling & Linen Millwork',
      typology: 'Private Residence',
      location: city,
      year: '2024',
      summary: `Serene master sleeping quarters crafted with vertical acoustic timber fins and custom upholstered headboard in ${city}.`,
      imagePath: 'realMasterBedroom',
      detailImagePath: 'realReadingCorner',
      alt: `${name} master bedroom suite with bespoke fluted panelling and warm luminaire fixtures`,
      materials: [
        { label: 'Vertical fluted architectural Sal wall panelling', swatchHex: '#3D2817' },
        { label: 'Belgian woven raw linen upholstery', swatchHex: '#D5CFC2' },
        { label: 'Brushed champagne bronze reading luminaires', swatchHex: '#BDA37D' },
        { label: 'Concealed shadow-gap ceiling trim', swatchHex: '#EAE6DD' }
      ],
      narrative: [
        {
          heading: 'Restful Spatial Acoustics',
          text: 'Faceted vertical timber fins absorb ambient flutter echo, establishing a tranquil sleeping sanctuary.'
        },
        {
          heading: 'Tailored Lighting Architecture',
          text: 'Independent bedside reading zones with glare-free indirect perimeter uplighting.'
        }
      ],
      showcase: [
        {
          id: `${slug}-plate-05`,
          index: '01',
          title: 'Master Suite Datum',
          annotation: 'BEDROOM 01 · TIMBER HEADBOARD',
          caption: 'Vertical architectural fluting extending seamlessly into bedside table consoles.',
          imagePath: 'realMasterBedroom',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#3D2817',
          materialSpec: 'Full-height fluted solid timber with integrated electrical charging ports.'
        },
        {
          id: `${slug}-plate-06`,
          index: '02',
          title: 'Private Reading Corner',
          annotation: 'NOOK 02 · READING CORNER',
          caption: 'Dedicated upholstered lounge chair nestled beneath gentle warm spotlighting.',
          imagePath: 'realReadingCorner',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'walnut',
          swatchHex: '#BDA37D',
          materialSpec: 'Custom bentwood lounge chair with textured woven boucle fabric.'
        },
        {
          id: `${slug}-plate-07`,
          index: '03',
          title: 'Millwork Edge Geometry',
          annotation: 'DETAIL 03 · SHADOW PROFILE',
          caption: 'Sharp 45-degree chamfered timber edges providing refined shadow lines.',
          imagePath: 'studioJoinery',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'ivory',
          swatchHex: '#D5CFC2',
          materialSpec: 'Chamfered timber handles integrated directly into drawer faces.'
        },
        {
          id: `${slug}-plate-08`,
          index: '04',
          title: 'Tactile Textile & Timber Board',
          annotation: 'PALETTE 04 · SLEEPING QUARTERS',
          caption: 'Tactile physical sample board pairing neutral textiles with rich hardwood tones.',
          imagePath: 'realLoungeVignette',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#3D2817',
          materialSpec: 'Natural linen, soft velvet swatches, and matte clear-coated timber.'
        }
      ]
    },
    {
      slug: `${slug}-corporate-reception`,
      title: `${name} Executive Suite`,
      scope: 'Commercial Reception & Executive Boardroom',
      focus: 'Architectural Partitioning & Acoustic Louvres',
      typology: 'Formal Reception',
      location: city,
      year: '2023',
      summary: `High-impact corporate office interior featuring double-glazed glass partitions and custom boardroom joinery in ${city}.`,
      imagePath: 'realLoungeVignette',
      detailImagePath: 'realWoodStudy',
      alt: `${name} executive office and boardroom with modern architectural partition screens`,
      materials: [
        { label: 'Acoustic micro-perforated oak veneer ceiling panels', swatchHex: '#7C674D' },
        { label: 'Anodized black slim aluminium partition system', swatchHex: '#1F2022' },
        { label: 'Honed large-format porcelain slabs', swatchHex: '#DCD8CF' },
        { label: 'Architectural recessed linear glare-free luminaires', swatchHex: '#EAE6DC' }
      ],
      narrative: [
        {
          heading: 'Executive Dignity & Presence',
          text: `Clean lines, disciplined material transitions, and soundproof zones tailored for executive meetings in ${city}.`
        },
        {
          heading: 'Integrated Smart Infrastructure',
          text: 'Concealed conference cabling, automated solar louvres, and zoned HVAC distribution.'
        }
      ],
      showcase: [
        {
          id: `${slug}-plate-09`,
          index: '01',
          title: 'Executive Lounge Panorama',
          annotation: 'COMMERCIAL 01 · RECEPTION STUDY',
          caption: 'Understated executive lounge reception with custom leather and timber seating.',
          imagePath: 'realLoungeVignette',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#1F2022',
          materialSpec: 'Supple full-grain saddle leather upholstery and blackened steel framing.'
        },
        {
          id: `${slug}-plate-10`,
          index: '02',
          title: 'Boardroom Millwork & Joinery',
          annotation: 'BOARDROOM 02 · CONFERENCE DATUM',
          caption: 'Monolithic boardroom table crafted with bookmatched timber veneers.',
          imagePath: 'realWoodStudy',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'walnut',
          swatchHex: '#7C674D',
          materialSpec: 'Bookmatched natural oak veneer finished in high-durability polyurethane.'
        },
        {
          id: `${slug}-plate-11`,
          index: '03',
          title: 'Acoustic Screen Partition',
          annotation: 'PARTITION 03 · ACOUSTIC SCREEN',
          caption: 'Architectural slatted screens maintaining visual openness while controlling conversational reverberation.',
          imagePath: 'studioJoinery',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'ivory',
          swatchHex: '#DCD8CF',
          materialSpec: 'Timber composite fins with acoustic mineral wool backing.'
        },
        {
          id: `${slug}-plate-12`,
          index: '04',
          title: 'Commercial Finish Dossier',
          annotation: 'DOSSIER 04 · EXECUTIVE FINISHES',
          caption: 'Executive finishes including matte black metals, architectural glass, and structured carpeting.',
          imagePath: 'studioPracticeStudio',
          cropRect: [0.0, 0.0, 1.0, 1.0],
          surfaceTheme: 'charcoal',
          swatchHex: '#1F2022',
          materialSpec: 'Scratch-resistant anodized metals and commercial-grade acoustic floor tiles.'
        }
      ]
    }
  ];

  return {
    id: slug,
    name,
    slug,
    city: address,
    primaryCity: city,
    region,
    tagline: `Measured interior architecture and turnkey spatial execution across ${city}.`,
    commitmentQuote: `Every line we draw and every joint we craft is a direct reflection of our client's trust in ${city}.`,
    commitmentKicker: 'Our Commitment',
    founder,
    founderTitle: 'Founder & Principal Designer',
    founderBio: [
      `Each commission is composed around spatial proportion, natural daylight, and disciplined millwork — tailored strictly around daily functional rituals in ${city}.`,
      `Led by ${founder}, the practice delivers turnkey residential and commercial projects combining seasoned timber joinery, refined stone finishes, and trusted local craftsmen across ${city} and ${region}.`
    ],
    phoneDisplay: cleanPhone,
    whatsappNumber: wa,
    hours: 'Sun – Fri, 10 AM – 6 PM (Saturday closed)',
    url: `https://${slug}.vercel.app`,
    description: `${name} is an interior design and turnkey architecture studio in ${city} led by ${founder} — crafting bespoke residences and commercial spaces.`,
    offices: [
      {
        id: slug,
        index: '01',
        city,
        address,
        coords: `${city}, Nepal`,
        note: 'Primary design studio & client consultation desk.',
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${address}`)}`,
        embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(`${name} ${address}`)}&z=16&output=embed`
      }
    ],
    socials: [
      { label: 'Facebook', href: lead.social_url || 'https://facebook.com' },
      { label: 'WhatsApp Direct', href: `https://wa.me/${wa}` }
    ],
    services: [
      {
        index: '01',
        name: 'Turnkey Residential Interiors',
        detail: `End-to-end spatial planning, civil work, electrical routing, and furniture execution across homes in ${city}.`
      },
      {
        index: '02',
        name: 'Fine Carpentry & Modular Joinery',
        detail: 'Custom fluted wall panelling, wardrobes, modular kitchens, TV consoles, and bespoke bedroom furniture.'
      },
      {
        index: '03',
        name: 'False Ceilings & Lighting Architecture',
        detail: 'Gypsum and POP ceiling geometry, concealed warm cove lighting, architectural downlights, and custom chandeliers.'
      },
      {
        index: '04',
        name: 'Commercial & Executive Fitouts',
        detail: `Bespoke office layouts, executive cabins, acoustic partitions, and commercial retail interiors across ${city}.`
      }
    ],
    commissions
  };
}

function copyDirRecursive(src, dest, excludeDirs = new Set(['.git', 'node_modules', '.astro', 'dist', '.cache'])) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, excludeDirs);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateSiteDataTs(profile) {
  return `import realDiningHall from '../assets/real-dining-hall.jpg';
import realLivingRoom from '../assets/real-living-room.jpg';
import realMasterBedroom from '../assets/real-master-bedroom.jpg';
import realReadingCorner from '../assets/real-reading-corner.jpg';
import realLoungeVignette from '../assets/real-lounge-vignette.jpg';
import realWoodStudy from '../assets/real-wood-study.jpg';
import studioPracticeStudio from '../assets/studio-practice-workspace.jpg';
import studioJoinery from '../assets/studio-joinery.jpg';
import studioWorkTerrace from '../assets/studio-work-terrace.jpg';

export type GlbPinKey = 'fluted-suite' | 'timber-hearth' | 'courtyard-hall';

export type MaterialSpec = {
  label: string;
  swatchHex: string;
};

export type SurfaceTheme = 'charcoal' | 'walnut' | 'ivory';

export interface ShowcasePlate {
  id: string;
  index: string;
  title: string;
  annotation: string;
  caption: string;
  image: ImageMetadata;
  backdropImage?: ImageMetadata;
  isConceptRender?: boolean;
  cropRect: [number, number, number, number];
  surfaceTheme: SurfaceTheme;
  swatchHex: string;
  materialSpec: string;
}

export type Commission = {
  slug: string;
  title: string;
  scope: string;
  focus: string;
  typology: string;
  location: string;
  year: string;
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

export const site = ${JSON.stringify({
    name: profile.name,
    tagline: profile.tagline,
    commitmentQuote: profile.commitmentQuote,
    commitmentKicker: profile.commitmentKicker || 'Studio Commitment',
    founder: profile.founder,
    founderTitle: profile.founderTitle || 'Founder & Principal Designer',
    founderBio: profile.founderBio,
    city: profile.city,
    primaryCity: profile.primaryCity,
    primaryRegion: profile.region,
    logo: {
      viewBox: '0 0 120 140',
      paths: [
        { d: 'M60 10 L110 50 L110 110 L60 130 L10 110 L10 50 Z', fill: 'none' },
        { d: 'M60 25 L95 55 L95 100 L60 118 L25 100 L25 55 Z', fill: 'currentColor' }
      ]
    },
    offices: profile.offices,
    hours: profile.hours,
    phoneDisplay: profile.phoneDisplay,
    whatsappNumber: profile.whatsappNumber,
    ratingScore: '5.0',
    reviewCount: 32,
    bioLink: `https://${profile.slug}.vercel.app`,
    url: profile.url || `https://${profile.slug}.vercel.app`,
    description: profile.description,
    nav: [
      { label: 'Works', href: '/works/' },
      { label: 'About', href: '/practice/' },
      { label: 'Material Study (3D)', href: '/showroom/' }
    ],
    socials: profile.socials,
    services: profile.services
  }, null, 2)};

const assetMap: Record<string, ImageMetadata> = {
  realLivingRoom,
  realDiningHall,
  realMasterBedroom,
  realReadingCorner,
  realLoungeVignette,
  realWoodStudy,
  studioPracticeStudio,
  studioJoinery,
  studioWorkTerrace
};

export const craftPlate = {
  title: '${profile.name} Joinery & Finish Study',
  meta: '${profile.primaryCity} · Custom Millwork Workshop',
  image: studioJoinery,
  alt: 'Architectural woodwork detail crafted with local timber and precision joinery'
};

export const parquetPlate = {
  title: 'Studio Material Board · Natural Timber & Stone',
  meta: '${profile.name} · ${profile.primaryCity}',
  image: studioPracticeStudio,
  alt: 'Tactile physical sample board showing natural stone, polished wood, and hardware finishes'
};

export const materialStudies: MaterialStudyNote[] = [
  {
    key: 'fluted-suite',
    title: 'Honed Limestone & Fluted Timber',
    category: 'Material Datum',
    summary: 'Precision-milled vertical timber panelling paired with natural honed stone finishes.',
    image: realMasterBedroom,
    alt: 'Master bedroom material study showing fluted timber and natural textures',
    materials: ['Solid Seasoned Sal Timber', 'Honed Stone Slabs', 'Brushed Brass']
  },
  {
    key: 'timber-hearth',
    title: 'Warm Reception & Marble Floor',
    category: 'Spatial Study',
    summary: 'Spacious living room anchored by veined stone flooring and deep indigo upholstery.',
    image: realLivingRoom,
    alt: 'Living room reception showing marble surfaces and ambient evening lighting',
    materials: ['Honed Italian Marble', 'Cognac Leather', 'Architectural Brass']
  },
  {
    key: 'courtyard-hall',
    title: 'Executive Joinery & Daylight',
    category: 'Daylight Geometry',
    summary: 'Panoramic garden glazing balancing direct sunlight against rich hardwood millwork.',
    image: realLoungeVignette,
    alt: 'Executive study showing panoramic glazing and bespoke furniture',
    materials: ['Acoustic Oak Panelling', 'Double Glazed Glass', 'Champagne Bronze']
  }
];

export const showroom = {
  label: 'Material Study',
  trackViewports: 6,
  baseFov: 54,
  asset: {
    type: 'glb',
    src: '/models/studio_pov.glb',
    mobileSrc: '/models/studio_pov_mobile.glb',
    cameraPathsSrc: '/models/camera_paths.glb',
    toneMapping: 'none',
    railFrom: 'empties'
  },
  fog: {
    color: '#D8CDBD',
    near: 12,
    far: 34
  },
  waypoints: [
    { progress: 0.1, pin: 'fluted-suite', title: 'Honed Stone & Timber' },
    { progress: 0.5, pin: 'timber-hearth', title: 'Reception Salon' },
    { progress: 0.85, pin: 'courtyard-hall', title: 'Executive Daylight' }
  ]
};

export const commissions: Commission[] = [
${profile.commissions.map((comm) => `  {
    slug: ${JSON.stringify(comm.slug)},
    title: ${JSON.stringify(comm.title)},
    scope: ${JSON.stringify(comm.scope)},
    focus: ${JSON.stringify(comm.focus)},
    typology: ${JSON.stringify(comm.typology)},
    location: ${JSON.stringify(comm.location)},
    year: ${JSON.stringify(comm.year)},
    summary: ${JSON.stringify(comm.summary)},
    image: assetMap[${JSON.stringify(comm.imagePath)}] || realLivingRoom,
    primaryObjectPosition: 'center 65%',
    detailImage: assetMap[${JSON.stringify(comm.detailImagePath)}] || realDiningHall,
    alt: ${JSON.stringify(comm.alt)},
    materials: ${JSON.stringify(comm.materials, null, 6)},
    narrative: ${JSON.stringify(comm.narrative, null, 6)},
    showcase: [
${(comm.showcase || []).map((p) => `      {
        id: ${JSON.stringify(p.id)},
        index: ${JSON.stringify(p.index)},
        title: ${JSON.stringify(p.title)},
        annotation: ${JSON.stringify(p.annotation)},
        caption: ${JSON.stringify(p.caption)},
        image: assetMap[${JSON.stringify(p.imagePath)}] || realLivingRoom,
        cropRect: ${JSON.stringify(p.cropRect)},
        surfaceTheme: ${JSON.stringify(p.surfaceTheme)},
        swatchHex: ${JSON.stringify(p.swatchHex)},
        materialSpec: ${JSON.stringify(p.materialSpec)}
      }`).join(',\n')}
    ]
  }`).join(',\n')}
];
`;
}

function generateFaviconSvg(name) {
  const initial = (name || 'S').trim().charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="20" fill="#1C1B19" />
  <path d="M50 15 L85 45 L85 85 L15 85 L15 45 Z" fill="none" stroke="#C5A069" stroke-width="3" />
  <text x="50" y="65" font-family="'Cinzel', serif, Georgia" font-size="38" font-weight="bold" fill="#F4EFE6" text-anchor="middle">${initial}</text>
</svg>`;
}

async function main() {
  const options = parseArgs();
  const templateDir = path.resolve(import.meta.dirname, '..');
  
  console.log('🚀 Nepal B2B Client Website Generator');
  const profile = loadProfile(options);
  console.log(`\nSynthesizing bespoke client site for:`);
  console.log(`  Name: ${profile.name}`);
  console.log(`  City: ${profile.city}`);
  console.log(`  Phone / WhatsApp: ${profile.phoneDisplay} (${profile.whatsappNumber})`);
  console.log(`  Commissions: ${profile.commissions.length} flagship projects`);

  const outDir = options.outDir || path.resolve(templateDir, '..', 'client-sites', profile.slug);
  console.log(`\nTarget build directory: ${outDir}`);

  // 1. Copy template files (excluding build caches & node_modules)
  console.log('📦 Step 1: Cloning isolated workspace tree...');
  copyDirRecursive(templateDir, outDir);

  // 2. Link node_modules for zero-install compilation
  const srcNodeModules = path.join(templateDir, 'node_modules');
  const destNodeModules = path.join(outDir, 'node_modules');
  if (fs.existsSync(srcNodeModules) && !fs.existsSync(destNodeModules)) {
    console.log('🔗 Step 2: Linking node_modules (junction)...');
    try {
      fs.symlinkSync(srcNodeModules, destNodeModules, 'junction');
    } catch (err) {
      console.warn(`Could not create junction, continuing: ${err.message}`);
    }
  }

  // 3. Generate tailored src/data/site.ts
  console.log('📝 Step 3: Injecting bespoke site dataset (src/data/site.ts)...');
  const siteTsPath = path.join(outDir, 'src', 'data', 'site.ts');
  fs.writeFileSync(siteTsPath, generateSiteDataTs(profile), 'utf-8');

  // 4. Generate client brand favicon
  console.log('🎨 Step 4: Generating custom SVG favicon...');
  const faviconPath = path.join(outDir, 'public', 'favicon.svg');
  fs.writeFileSync(faviconPath, generateFaviconSvg(profile.name), 'utf-8');

  // 5. Update astro.config.mjs with client preview domain & robots.txt
  console.log('⚙️  Step 5: Updating astro.config.mjs domain & robots.txt...');
  const astroConfigPath = path.join(outDir, 'astro.config.mjs');
  const clientDomain = profile.url || `https://${profile.slug}.vercel.app`;
  fs.writeFileSync(
    astroConfigPath,
    `import { defineConfig } from 'astro/config';\nimport sitemap from '@astrojs/sitemap';\n\nexport default defineConfig({\n  site: '${clientDomain}',\n  integrations: [sitemap()],\n  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },\n  build: { inlineStylesheets: 'auto' },\n});\n`,
    'utf-8'
  );

  const robotsPath = path.join(outDir, 'public', 'robots.txt');
  fs.writeFileSync(
    robotsPath,
    `User-agent: *\nAllow: /\nSitemap: ${clientDomain}/sitemap-index.xml\n`,
    'utf-8'
  );

  // Save profile JSON alongside build for audit verification
  const profileOutPath = path.join(outDir, 'client-profile.json');
  fs.writeFileSync(profileOutPath, JSON.stringify(profile, null, 2), 'utf-8');

  console.log(`\n✨ Successfully generated client workspace at: ${outDir}`);

  // 6. Optional build step
  if (options.build) {
    console.log('\n🏗️  Step 6: Executing production build (astro build)...');
    try {
      execSync('npx astro build', {
        cwd: outDir,
        stdio: 'inherit',
        env: { ...process.env, PUBLIC_SITE_URL: clientDomain }
      });
      console.log('✅ Production build completed successfully!');
    } catch (err) {
      console.error('❌ Production build failed!');
      process.exit(1);
    }
  }

  // 7. Optional audit step
  if (options.audit) {
    console.log('\n🛡️  Step 7: Executing zero-leakage validator (scripts/audit-client-site.mjs)...');
    const auditScript = path.join(templateDir, 'scripts', 'audit-client-site.mjs');
    const distPath = path.join(outDir, 'dist');
    try {
      execSync(`node "${auditScript}" --dist "${distPath}" --profile "${profileOutPath}"`, {
        stdio: 'inherit'
      });
      console.log('🎉 ZERO-LEAKAGE CERTIFIED: Complete bespoke transformation verified!');
    } catch (err) {
      console.error('❌ Zero-leakage audit failed!');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Error generating client site:', err);
  process.exit(1);
});
