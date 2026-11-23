import os
import sys
import json
import time
import urllib.request
import re
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

VAULT_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\13_activetheory"
BUNDLES_DIR = os.path.join(VAULT_DIR, "bundles")
ASSETS_DIR = os.path.join(VAULT_DIR, "assets")
SHADERS_DIR = os.path.join(VAULT_DIR, "shaders")

os.makedirs(BUNDLES_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(SHADERS_DIR, exist_ok=True)

print("Starting reverse engineering for Active Theory (https://activetheory.net/)...")

# 1. Fetch raw index.html via urllib to get the pristine initial server response
url = "https://activetheory.net/"
req = urllib.request.Request(
    url,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
)

with urllib.request.urlopen(req) as resp:
    raw_html = resp.read().decode('utf-8', errors='ignore')

with open(os.path.join(VAULT_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(raw_html)
print(f"Raw index.html saved ({len(raw_html)} bytes).")

# 2. Intercept scripts, stylesheets, fonts from raw HTML
script_srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
link_hrefs = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)

print(f"Found {len(script_srcs)} script tags, {len(link_hrefs)} link tags in raw HTML.")

# Playwright setup to capture deep runtime metadata, WebGL, Audio, network requests, DOM
network_log = []
captured_shaders = []
captured_audio = []

init_script = """
(() => {
    window.__capturedShaders = [];
    window.__capturedAudio = [];
    window.__capturedGlobals = [];
    window.__capturedAnimationLoops = 0;

    // Hook WebGL shader compilation
    const hookContext = (gl) => {
        if (!gl || gl.__hooked) return;
        gl.__hooked = true;

        const origShaderSource = gl.shaderSource;
        gl.shaderSource = function(shader, source) {
            try {
                window.__capturedShaders.push({
                    type: gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
                    source: source,
                    length: source.length
                });
            } catch(e) {}
            return origShaderSource.apply(this, arguments);
        };
    };

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attribs) {
        const ctx = origGetContext.apply(this, arguments);
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
            try {
                hookContext(ctx);
            } catch(e) {}
        }
        return ctx;
    };

    // Hook Web Audio
    if (window.AudioContext || window.webkitAudioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const origDecode = AudioCtx.prototype.decodeAudioData;
        if (origDecode) {
            AudioCtx.prototype.decodeAudioData = function(buffer, success, error) {
                window.__capturedAudio.push({ type: 'decodeAudioData', bufferByteLength: buffer ? buffer.byteLength : 0 });
                return origDecode.apply(this, arguments);
            };
        }
    }
})();
"""

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--use-gl=angle",
            "--use-angle=default",
            "--enable-webgl",
            "--ignore-gpu-blocklist"
        ]
    )
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    context.add_init_script(init_script)

    page = context.new_page()

    def handle_response(response):
        try:
            req_url = response.url
            status = response.status
            content_type = response.headers.get("content-type", "")
            content_length = response.headers.get("content-length", 0)
            
            entry = {
                "url": req_url,
                "status": status,
                "content_type": content_type,
                "content_length": content_length
            }
            network_log.append(entry)

            # Download bundles and assets
            parsed = urlparse(req_url)
            filename = os.path.basename(parsed.path)
            if not filename or '.' not in filename:
                if "javascript" in content_type:
                    filename = "bundle_" + str(len(network_log)) + ".js"
                elif "css" in content_type:
                    filename = "style_" + str(len(network_log)) + ".css"
                elif "json" in content_type:
                    filename = "data_" + str(len(network_log)) + ".json"

            if any(ext in req_url.lower() for ext in [".js", ".css", ".json", ".glb", ".gltf", ".bin", ".mp3", ".wav", ".ogg", ".woff", ".woff2", ".ttf"]):
                try:
                    body = response.body()
                    save_path = os.path.join(BUNDLES_DIR if (".js" in req_url or ".css" in req_url) else ASSETS_DIR, filename)
                    if len(body) > 0 and not os.path.exists(save_path):
                        with open(save_path, "wb") as bf:
                            bf.write(body)
                except Exception as ex:
                    pass
        except Exception as e:
            pass

    page.on("response", handle_response)

    print("Navigating to https://activetheory.net/...")
    try:
        page.goto("https://activetheory.net/", wait_until="networkidle", timeout=30000)
    except Exception as e:
        print("Page goto timeout or partial load:", e)

    print("Waiting for WebGL initialization and assets to load...")
    time.sleep(5)

    # Screenshot desktop
    screenshot_path = os.path.join(VAULT_DIR, "preview_desktop.png")
    page.screenshot(path=screenshot_path, full_page=False)
    print(f"Captured desktop screenshot -> {screenshot_path}")

    # Inspect DOM structure & WebGL canvas elements
    runtime_info = page.evaluate("""() => {
        const canvases = Array.from(document.querySelectorAll('canvas')).map((c, i) => {
            const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
            let glInfo = null;
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                glInfo = {
                    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                    glVersion: gl.getParameter(gl.VERSION),
                    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
                    extensions: gl.getSupportedExtensions()
                };
            }
            return {
                index: i,
                width: c.width,
                height: c.height,
                clientWidth: c.clientWidth,
                clientHeight: c.clientHeight,
                style: c.getAttribute('style') || '',
                id: c.id,
                className: c.className,
                hasWebGL: !!gl,
                glInfo: glInfo
            };
        });

        // Global objects check
        const knownGlobals = [
            'Hydra', 'Medusa', 'DreamEngine', 'AT', 'ActiveTheory',
            'THREE', 'PIXI', 'gsap', 'TweenMax', 'TweenLite',
            'Lenis', 'LocomotiveScroll', 'ScrollTrigger',
            'Howler', 'Howl', 'Tone', 'WebAudio',
            'Config', 'Stage', 'App', 'Device', 'Store', 'Renderer', 'Assets'
        ];
        const detectedGlobals = {};
        for (const k of knownGlobals) {
            if (window[k] !== undefined) {
                try {
                    detectedGlobals[k] = typeof window[k] === 'object' ? Object.keys(window[k]).slice(0, 30) : typeof window[k];
                } catch(e) {
                    detectedGlobals[k] = 'present (uninspectable)';
                }
            }
        }

        // All window properties starting with capital letter or custom
        const customWindowKeys = Object.keys(window).filter(k => 
            !k.startsWith('webkit') && !k.startsWith('on') && 
            ['Hydra', 'Medusa', 'AT', 'App', 'Config', 'Stage', 'Renderer', 'Store', 'Sound', 'Audio', 'View', 'GL'].some(prefix => k.toLowerCase().includes(prefix.toLowerCase()))
        );

        // Typography and design tokens from computed styles
        const elementsToCheck = [
            document.body,
            document.querySelector('h1'),
            document.querySelector('h2'),
            document.querySelector('h3'),
            document.querySelector('p'),
            document.querySelector('a'),
            document.querySelector('header'),
            document.querySelector('nav'),
            document.querySelector('button')
        ].filter(Boolean);

        const typographyTokens = elementsToCheck.map(el => {
            const cs = window.getComputedStyle(el);
            return {
                tag: el.tagName.toLowerCase(),
                fontFamily: cs.fontFamily,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                lineHeight: cs.lineHeight,
                letterSpacing: cs.letterSpacing,
                color: cs.color,
                textTransform: cs.textTransform
            };
        });

        // Colors extracted from elements
        const colorSet = new Set();
        document.querySelectorAll('*').forEach(el => {
            const cs = window.getComputedStyle(el);
            if (cs.color) colorSet.add(cs.color);
            if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') colorSet.add(cs.backgroundColor);
        });

        // Interactive & Navigation nodes
        const navLinks = Array.from(document.querySelectorAll('a, button, [role="button"], nav li')).map(el => ({
            text: el.innerText.trim(),
            href: el.getAttribute('href') || '',
            className: el.className,
            tag: el.tagName.toLowerCase()
        })).filter(item => item.text.length > 0 || item.href.length > 0);

        // DOM Hierarchy overview
        const bodyChildren = Array.from(document.body.children).map(child => ({
            tag: child.tagName.toLowerCase(),
            id: child.id,
            className: child.className,
            childrenCount: child.children.length,
            style: child.getAttribute('style') || ''
        }));

        // Audio elements
        const audioTags = Array.from(document.querySelectorAll('audio, video')).map(el => ({
            tag: el.tagName.toLowerCase(),
            src: el.src || (el.querySelector('source') ? el.querySelector('source').src : ''),
            preload: el.preload,
            autoplay: el.autoplay,
            muted: el.muted,
            loop: el.loop
        }));

        return {
            title: document.title,
            meta: Array.from(document.querySelectorAll('meta')).map(m => ({ name: m.name, property: m.getAttribute('property'), content: m.content })),
            canvases: canvases,
            detectedGlobals: detectedGlobals,
            customWindowKeys: customWindowKeys,
            typographyTokens: typographyTokens,
            colors: Array.from(colorSet).slice(0, 50),
            navLinks: navLinks.slice(0, 50),
            bodyChildren: bodyChildren,
            audioTags: audioTags,
            capturedShaders: window.__capturedShaders || [],
            capturedAudio: window.__capturedAudio || []
        };
    """)

    # Interact: trigger mouse movement and scroll to observe physics and load deferred assets
    print("Emulating user interaction (mouse moves, wheel events, scrolling)...")
    try:
        page.mouse.move(500, 300)
        time.sleep(0.5)
        page.mouse.move(960, 540)
        time.sleep(0.5)
        page.mouse.wheel(0, 500)
        time.sleep(1.5)
        page.mouse.wheel(0, 1000)
        time.sleep(1.5)
    except Exception as e:
        print("Interaction error:", e)

    # Save rendered runtime HTML
    rendered_html = page.content()
    with open(os.path.join(VAULT_DIR, "rendered_dom.html"), "w", encoding="utf-8") as f:
        f.write(rendered_html)
    print("Saved rendered_dom.html")

    # Mobile screenshot
    page.set_viewport_size({"width": 390, "height": 844})
    time.sleep(1.5)
    page.screenshot(path=os.path.join(VAULT_DIR, "preview_mobile.png"), full_page=False)
    print("Captured mobile screenshot -> preview_mobile.png")

    browser.close()

# Save extracted shaders if any
if runtime_info.get("capturedShaders"):
    print(f"Captured {len(runtime_info['capturedShaders'])} runtime shaders!")
    for idx, sh in enumerate(runtime_info["capturedShaders"]):
        sh_filename = f"shader_{idx:02d}_{sh.get('type', 'shader')}.glsl"
        with open(os.path.join(SHADERS_DIR, sh_filename), "w", encoding="utf-8") as sf:
            sf.write(sh.get("source", ""))

# Save all inspection results
inspection_data = {
    "target": "Active Theory",
    "url": "https://activetheory.net/",
    "runtime_info": runtime_info,
    "network_log_count": len(network_log),
    "network_log": network_log
}

with open(os.path.join(VAULT_DIR, "inspection_raw.json"), "w", encoding="utf-8") as f:
    json.dump(inspection_data, f, indent=2)

print(f"Extraction complete! Saved inspection_raw.json. Total network requests captured: {len(network_log)}")
