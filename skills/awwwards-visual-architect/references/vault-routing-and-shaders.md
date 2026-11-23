# Reverse-Engineered Vault Routing and GLSL Shader Library

Use this map when working with the `Awwwards_Skills_ReverseEngineered_Useful_Master` vault to select the exact disassembly, recipe blueprint, and GLSL shader for any project.

## 1. Critical Vault Quality Traps (Mandatory Warnings)

- **Trap 1 - Ignore Auto-Generated Component Stubs:** Files in `creative_vault/recipes/components/*Experience.tsx` (such as `LusionV3Experience.tsx`) are placeholder Tailwind glass-card stubs (`backdrop-blur-xl` + neon badges) that violate anti-slop rules. Never copy their JSX/Tailwind markup.
- **Trap 2 - Ignore `useState` Pointer Hooks:** Files in `creative_vault/recipes/hooks/use*Physics.ts` call `useState` on `pointermove`, causing 60 React re-renders per second. Replace them with a mutable `useRef` / uniform bus inside a single RAF loop.
- **Use the Real Assets:** Always extract from `creative_vault/recipes/shaders/*.ts` (production-grade GLSL), `reverse_engineered_vault/reverse_engineered_vault/01_igloo` through `10_kriss_ai`, `samana_engine`, `bruno_pure`, `icg_pure`, and `creative_vault/recipes/blueprints/*.md`.

## 2. The 10 Deep Disassemblies + 4 Standalone Engines

1. **`01_igloo` (Igloo Inc.):** Three.js, WebGPU, Svelte, GSAP, KTX2 DataTextures, Web Audio. Best for crystalline 3D product worlds and futuristic tech.
2. **`02_bruno_simon` (Bruno Simon):** Three.js, WebGPU/WebGL 2.0, Rapier Rust WASM Physics, Draco/KTX2. Best for interactive physics sandboxes and playable 3D showcases.
3. **`03_star_atlas` (Star Atlas):** High-contrast sci-fi HUD framing and volumetric dark atmosphere.
4. **`04_sculpting_harmony` (Getty / Frank Gehry):** Three.js, WebGL 2.0, GSAP, Lenis, KTX2, Web Audio. Best for architectural scrollytelling, hospitality, luxury real estate, and editorial narratives.
5. **`05_kpr` (KPR Verse):** Three.js, GSAP, KTX2, Web Audio. Best for dark kinetic storytelling and dramatic chapter reveals.
6. **`06_unseen` (Unseen Studio):** Three.js, WebGL 2.0, GSAP, Draco/KTX2, Web Audio. Best for creative studios, interactive maps, and mouse-reveal transitions.
7. **`07_garance` (Gary & The Endless Forest):** Web Audio and organic interactive storytelling.
8. **`08_aurelienvigne` (Aurel's Grand Theater):** Three.js, GSAP, Lenis, Cannon.js/Rapier Physics. Best for theatrical stage lighting and physical object drops.
9. **`09_chartogne_taillet` (Chartogne-Taillet):** Three.js, GSAP, GLSL Terrain Displacement, Web Audio. Best for heritage brands, food/beverage, travel/trekking, and elevation maps.
10. **`10_kriss_ai` (Kriss.ai):** SvelteKit, Three.js/R3F, GSAP, 3D dollhouse clinic scene. Best for clinics, physical spaces, and interactive facility tours.

- **Standalone Engines:** `bruno_pure`, `icg_pure`, `samana_engine` (Samana Studio's 10 Invisible Details engine), `sellbird_harvey`.

## 3. Domain Routing for All 17 Custom GLSL Shader Modules

Select **one primary shader** matching the brand's physical world (never stack competing shaders):

- **Luxury, Jewelry, Skincare, Spirits:** `gemstoneCausticsAndGouacheShaders.ts`, `horologyShaders.ts`, `vinylIridescenceShaders.ts`
- **Automotive, Hardware, Tech Products:** `pbrCarPaintAndAnisotropyShaders.ts`, `tireMarksAndTerrainShaders.ts`, `lidarDroneShaders.ts`
- **Creative Studios, SaaS, AI, Agencies:** `lusionV3Shaders.ts` (GPGPU curl FBO, 4D Voronoi sheen, 120-degree RGB dispersion, 64^3 voxel irradiance), `fluidAndDispersionShaders.ts`, `nebulaVortexAndShockwaveShaders.ts`, `waveGridShaders.ts`
- **Hospitality, Travel, Real Estate, Heritage:** `topographicalAudioTerrainShaders.ts`, `pioneerCornShaders.ts`, `sheetWarpShaders.ts`
- **Editorial, Music, Events, Streetwear:** `adhesiveTapeShaders.ts`, `audioStrobeAndBloomShaders.ts`, `grailRpgShaders.ts`, `tieBreakTennisShaders.ts`

## 4. All 44 Creative Vault Recipes (`creative_vault_index.json`)

- **3D / WebGL & Studios (18):** `lusion-v3`, `unseen-studio`, `bruno-simon`, `brunos-portfolio`, `igloo-inc`, `active-theory`, `kpr-verse`, `star-atlas`, `kriss-ai`, `makemepulse`, `basement-studio`, `monopo-london`, `locomotive-ca`, `paper-tiger`, `cyera-ai-guardian`, `the-hall-of-zero-limits`, `gq-ap-the-extraordinary-lab`, `usavionix`.
- **Luxury, Product & Automotive (10):** `cartier-choeur-pierres`, `the-watch`, `spyker-cars`, `santioni-spirits`, `ascension-pegassi`, `ascension-pegassi-r`, `grail`, `why-zero`, `pioneer-corn-revolutionized`, `lidar-drone-scanning`.
- **Editorial, Typography & Motion (16):** `grids-obys`, `grids-1`, `format-obys`, `format`, `a24`, `aristide-benoist`, `guillaume-colombel`, `g-colombel-portfolio-2026`, `carter-ogunsola`, `crl-2026`, `sweet-tape`, `the-tie-break`, `overworld-audio`, `spotify-wrapped-party`, `chartogne-taillet`, `aurelien-vigne`.
