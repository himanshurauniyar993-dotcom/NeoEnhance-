
import { EnhancementStyle, WebSettings } from './types';

export const ENHANCEMENT_STYLES: EnhancementStyle[] = [
  {
    id: 'masterpiece',
    name: 'Masterpiece 8K',
    description: 'Cinematic lighting and hyper-detailed textures.',
    prompt: '8k resolution, extreme close-up, hyper-detailed textures, cinematic lighting, sharp focus, professional color grading, vivid tones, noise reduction, masterpiece quality, unreal engine 5 render style, crystal clear.',
    icon: '✨',
    color: 'from-blue-500 to-cyan-400'
  },
  {
    id: 'youtube_viral',
    name: 'YouTube Viral',
    description: 'High contrast with vibrant, glowing colors.',
    prompt: 'High-contrast YouTube thumbnail style, vibrant saturated colors, bold lighting, volumetric fog, sharp edges, HDR (High Dynamic Range), 3D pop-out effect, glowing outlines, professional digital art finish, catchy visual clarity.',
    icon: '🔥',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'portrait_enhancer',
    name: 'Portrait Perfect',
    description: 'Skin texture correction and natural lighting.',
    prompt: 'Photorealistic portrait, flawless skin texture, sharp eyes, natural lighting, bokeh background, 85mm lens effect, soft shadows, high definition, professional photography, color corrected, subsurface scattering, ray tracing.',
    icon: '👤',
    color: 'from-purple-500 to-indigo-500'
  }
];

export const DEFAULT_SETTINGS: WebSettings = {
  siteName: 'NeoEnhance',
  logoText: 'N',
  logoUrl: null,
  themePrimary: '#3b82f6',
  themeSecondary: '#a855f7',
  creditPrice: 0.99,
  currency: 'USD'
};
