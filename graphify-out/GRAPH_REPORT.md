# Graph Report - src  (2026-11-22)

## Corpus Check
- Corpus is ~22,356 words - fits in a single context window. You may not need a graph.

## Summary
- 255 nodes · 633 edges · 9 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8

## God Nodes (most connected - your core abstractions)
1. `prefersReducedMotion()` - 38 edges
2. `mountShowroom()` - 36 edges
3. `StudioAudio` - 19 edges
4. `isTouch()` - 14 edges
5. `setupMotion()` - 14 edges
6. `DebugFlyController` - 13 edges
7. `ShowroomWaypoint` - 11 edges
8. `boot()` - 11 edges
9. `TactileCamera` - 11 edges
10. `site` - 9 edges

## Surprising Connections (you probably didn't know these)
- `initButtonFills()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  motion/setup.ts → engine/env.ts
- `initEditorialTextMotion()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  motion/setup.ts → engine/env.ts
- `initHeaderControls()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  motion/setup.ts → engine/env.ts
- `initHeroVideo()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  motion/setup.ts → engine/env.ts
- `initReactiveText()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  motion/textMotion.ts → engine/env.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (20): pinWaypoints, Props, studyByKey, Commission, commissions, craftPlate, diningPlateFallback, GlbPinKey (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (10): ShowroomWaypoint, getScrollLimit(), scrollToTarget(), ChapterBar, DebugFlyController, MaterialDrawer, mountShowroom(), SpatialPins (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (26): start(), isTouch(), mountGL(), unmountGL(), boot(), cleanup(), cleanups, enter() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): isMobile(), attachVideoWall(), disposeObjectTree(), extractWaypointsFromScene(), LoadedAsset, loadGlbAsset(), LoadOptions, loadShowroomAsset() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (22): ease, criticalAssets(), extraTasks, finish(), format(), registerLoaderTask(), runLoader(), setLoaderFormat() (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (22): onPage(), setLoaderExit(), resizeScroll(), setTransition(), canAutoResume(), createHeroVideoMachine(), HeroVideoContext, HeroVideoEvent (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (19): add(), clearBackground(), glSupported(), hex(), hideGL(), initGL(), Item, items (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (5): AmbientNodes, StudioAudio, studioAudio, prefersReducedMotion(), ActivePinItem

### Community 8 - "Community 8"
Cohesion: 0.52
Nodes (6): scrollState(), getWordsFromNode(), initReactiveText(), setupProximityElement(), setupRollElement(), setupWordsElement()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prefersReducedMotion()` connect `Community 7` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `mountShowroom()` (e.g. with `.update()` and `.isActive()`) actually correct?**
  _`mountShowroom()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06859903381642513 - nodes in this community are weakly interconnected._
- **Why does `mountShowroom()` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07536231884057971 - nodes in this community are weakly interconnected._
- **Why does `StudioAudio` connect `Community 7` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11330049261083744 - nodes in this community are weakly interconnected._