export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

let cachedTier: 'high' | 'medium' | 'low' | null = null;

export function getQualityTier(): 'high' | 'medium' | 'low' {
  if (cachedTier) return cachedTier;
  if (typeof window === 'undefined') return 'high';

  try {
    const memory = (navigator as any).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 4;
    const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;

    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    let isSoftwareOrLowEnd = false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)?.toLowerCase() || '';
        if (
          renderer.includes('swiftshader') ||
          renderer.includes('llvmpipe') ||
          renderer.includes('software') ||
          renderer.includes('mali-4') ||
          renderer.includes('adreno 3')
        ) {
          isSoftwareOrLowEnd = true;
        }
      }
    }

    if (isSoftwareOrLowEnd || memory <= 2 || cores <= 2) {
      cachedTier = 'low';
    } else if (coarse || memory <= 4 || cores <= 4) {
      cachedTier = 'medium';
    } else {
      cachedTier = 'high';
    }
  } catch {
    cachedTier = 'medium';
  }
  return cachedTier;
}

export const ease = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  spring: 'back.out(1.6)',
} as const;
