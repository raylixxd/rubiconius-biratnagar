# DESIGN.md: Rubiconius (Biratnagar & Dharan Interior Design)

## Phase 0: Brief & Ground Truth
- **Subject:** Rubiconius — Interior Design & Decor, founded by **Riya Agrawal**.
- **Geography:** Munal Path, Biratnagar & Dharan, Nepal.
- **Verified Channels:** Direct Phone/WhatsApp `+977 981-2353149`, public rating **5.0 ★ (27 reviews)**.
- **Verified Philosophy:** Polished, functional, livable spaces blending timeless proportion with modern freshness, grounded in fine craftsmanship, handpicked objects, and collaboration with local artisans.
- **Site Job:** Hook prospective Biratnagar/Dharan homeowners and commercial owners in the first 3 seconds with an unmistakably bespoke architectural web instrument, demonstrate space-and-light mastery before they read a paragraph, and convert directly via a pre-filled WhatsApp Space Consultation brief.
- **Honesty & Assumption Ledger:** Architectural study visuals on `/`, `/practice/`, and `/studies/[slug]/` are curated open-licensed architectural photographs clearly noted as staging placeholders for Rubiconius's own photographed rooms (see footer colophon & `src/data/site.ts`). Zero fabricated awards, client counts, registration IDs, or fake testimonials.

## Phase 1: Three Concepts Considered (Scored 1–5)
1. **A. Drafted in Daylight (Place + Material):** The browser acts as a sunlit architectural room in Biratnagar. Visitors drag a live Solar Azimuth dial (`06:30 -> 20:30`) that sweeps raking clerestory window-slat sunbeams and botanical leaf shadows across the lime-plaster canvas, shifts projected typographic shadows, and wipes a `1:50` drafting overlay across room imagery. *(Originality 5, Fit 5, Feasibility 5, Portability 1 -> **Picked**)*
2. **B. Joiner's Mortar Index (Process):** Stacked elevation blocks that slide like sliding shoji/Sal panels. Strong, though less expressive of full-room light atmosphere. *(O 4, F 4, Fe 5, P 2)*
3. **C. Inventory Ledger (Formal):** A tabular material BOM. Fits a supplier better than a boutique residential & commercial interior studio. *(O 3, F 3, Fe 5, P 3)*

### Concept Card
- **Idea:** Every room begins as raw structure carved by Eastern Nepal daylight; visitors shift the hour of day, wipe architectural elevation lines over raw/finished space, and test four real materials right on the stage.
- **Metaphor:** An architect's sunlit studio table in Munal Path where light angles, material samples, and tracing vellum decide every room.
- **Signature:** Live **Solar Azimuth Dial + Blueprint-to-Sanctuary Split Scrubber + 4-Finish Materiality Ledger** tied to a single fullscreen OGL daylight/botanical-shadow shader (`uSun`, `uWarmth`, `uGrain`) plus DOM-synced `<figure data-gl>` optical ripple plates.
- **Emotion:** Quiet authority, sunlit warmth, tactile calm.
- **Motion verb:** **Raking & settling** (`expo.out` 1.1–1.3s entrances, `cubic-bezier(0.16, 1, 0.3, 1)` sweeps, zero bounce clutter).
- **Screenshot:** Monumental `Boska` serif wordmark with live solar-skewed architectural shadow echo above a sunlit plate split cleanly by a `1:50` drafting curtain.

## Phase 2: Art Direction System
- **Palette Roles:**
  - `ground`: `#ECEAE4` (Limestone Plaster)
  - `ink`: `#111211` (Charcoal Drafting Ink)
  - `muted`: `#4E504B` (Basalt Slate, AA >= 6.5:1 on `#ECEAE4`)
  - `line`: `rgb(17 18 17 / 0.14)` (Elevation Hairline)
  - `accent`: `#1F4A3C` (Malachite Bronze-Green)
  - `curtain`: `#111211`
- **Typography:**
  - Display: `'Boska'` (Fontshare self-hosted `400, 500, 700` + italic) — sharp optical serif with dramatic editorial contrast.
  - Body / UI: `'Switzer'` (Fontshare self-hosted `400, 500, 600`) — clean Swiss grotesk, tabular figures enabled on hours/dimensions.
- **Shape & Grid:** Sharp `0px` architectural corners on editorial frames; `4px` subtle chamfer on tactile form inputs/buttons; 12-column grid anchored along Col 1, Col 5, Col 9.
- **Genericness Test Passed:** Warm terracotta/Inter defaults rejected; no SaaS card grid; every pointer target responds via letter-roll, pointer-origin malachite fill flood, underline draw, or WebGL optical ripple; reduced motion unpins cleanly and renders static sunlit gradient fallback.
