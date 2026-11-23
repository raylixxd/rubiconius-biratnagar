import os
import re
import json

base_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\16_lusion"
js_file = os.path.join(base_dir, "hoisted.CUO_IjfL.js")
css_file = os.path.join(base_dir, "about.CNa9RfUh.css")
html_file = os.path.join(base_dir, "index.html")

print("--- ANALYZING JS BUNDLE ---")
with open(js_file, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

print(f"JS Length: {len(js)} chars")

# Check libraries
libs = [
    "three", "THREE", "three/addons", "WebGLRenderer", "PerspectiveCamera",
    "gsap", "TweenMax", "TimelineMax", "ScrollTrigger",
    "lenis", "ScrollSmoother", "locomotive-scroll",
    "rapier", "cannon", "matter-js", "ammo",
    "howler", "Howl", "AudioContext",
    "barba", "swup", "astro", "vue", "react", "preact", "svelte",
    "ogl", "twgl", "regl", "webgl2"
]
found_counts = {}
for lib in libs:
    cnt = len(re.findall(r"\b" + re.escape(lib) + r"\b", js))
    if cnt > 0:
        found_counts[lib] = cnt
print("Identified Libraries/Keywords:", json.dumps(found_counts, indent=2))

# Find all URL/asset references in JS
asset_patterns = [
    r'["\'](/assets/[^"\']+)["\']',
    r'["\'](/_astro/[^"\']+)["\']',
    r'["\']([^"\']+\.(?:glb|gltf|bin|wasm|hdr|exr|png|jpg|jpeg|webp|avif|svg|mp3|ogg|wav|mp4|webm))["\']'
]
discovered_assets = set()
for pat in asset_patterns:
    for match in re.findall(pat, js):
        discovered_assets.add(match)

print(f"Discovered {len(discovered_assets)} asset references in JS:")
for a in sorted(discovered_assets)[:30]:
    print("  ", a)

# Dynamic imports
dynamic_imports = re.findall(r'import\s*\(\s*["\']([^"\']+)["\']\s*\)', js)
print("Dynamic Imports:", dynamic_imports)

# Shaders check
glsl_keywords = ["precision mediump", "precision highp", "gl_FragColor", "gl_Position", "varying vec", "attribute vec", "uniform vec", "uniform mat", "void main()"]
shader_matches = {}
for kw in glsl_keywords:
    cnt = js.count(kw)
    if cnt > 0:
        shader_matches[kw] = cnt
print("GLSL Shader matches:", shader_matches)
