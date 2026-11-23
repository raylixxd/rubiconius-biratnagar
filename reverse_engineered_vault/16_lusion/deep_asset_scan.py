import os
import re
import json

base_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\16_lusion"
js_file = os.path.join(base_dir, "hoisted.CUO_IjfL.js")
with open(js_file, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# 1. Find all audio files mentioned
audios = re.findall(r'["\']([^"\']+\.(?:mp3|ogg|wav))["\']', js)
print("Audios:", set(audios))

# 2. Find all 3D models mentioned
models = re.findall(r'["\']([^"\']+\.(?:glb|gltf|bin|obj|fbx))["\']', js)
print("Models:", set(models))

# 3. Find all images/textures mentioned
textures = re.findall(r'["\']([^"\']+\.(?:png|jpg|jpeg|webp|avif|hdr|exr))["\']', js)
print("Textures/Images count:", len(set(textures)))
for t in sorted(set(textures))[:40]:
    print("  Texture:", t)

# 4. Find all video files mentioned
videos = re.findall(r'["\']([^"\']+\.(?:mp4|webm))["\']', js)
print("Videos:", set(videos))

# 5. Look for asset base path or helper
asset_bases = re.findall(r'["\'](/assets/[^"\']*)["\']', js)
print("Asset paths count:", len(set(asset_bases)))
for ab in sorted(set(asset_bases))[:30]:
    print("  Asset path:", ab)

# 6. Look for data structures or page routing / scenes
scenes = re.findall(r'(?:scene|experience|tunnel|hero|about|projects|project|contact)[A-Za-z0-9_]*', js, re.IGNORECASE)
print("Scene related keywords sample:", set(scenes[:40]))
