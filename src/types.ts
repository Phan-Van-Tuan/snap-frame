export type AspectRatio = '9:16' | '4:3' | '1:1' | '16:9';

// Portrait-oriented width/height per ratio (phone held upright)
export const ASPECT_VALUE: Record<AspectRatio, number> = {
  '9:16': 9 / 16,
  '4:3': 3 / 4,
  '1:1': 1,
  '16:9': 16 / 9,
};

export type FilterType = 'none' | 'vivid' | 'warm' | 'cool' | 'vintage' | 'bw' | 'cyber';

export interface Template {
  id: string;
  name: string;
  category: 'preset' | 'custom';
  presetId?: 'none' | 'camera-stamp' | 'timestamp-work' | 'polaroid' | 'viewfinder' | 'branding' | 'editorial' | 'inspection' | 'clean-border';
  imageUrl?: string; // base64 or blob URL for custom uploaded frame PNG
  opacity: number;
  description?: string;
  createdAt?: number;
}

export type DateTimeFormat = 'full' | 'date-time' | 'time-date' | 'date-only' | 'time-only';
export type StampPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-bar';
export type StampBgStyle = 'dark-badge' | 'glass' | 'neon' | 'none';

export interface StampSettings {
  showDateTime: boolean;
  dateTimeFormat: DateTimeFormat;
  /** Local `YYYY-MM-DDTHH:mm`. Empty means the live clock. */
  timeOverride?: string | null;
  customDateTimeText?: string;
  showLocation: boolean;
  locationText: string;
  showCoordinates: boolean;
  coordinatesText: string;
  showCustomNote: boolean;
  noteTitle: string;
  noteContent: string;
  // Brand Logo
  showLogo: boolean;
  logoUrl?: string; // base64 or image url
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoScale: number; // 0.1 to 0.4
  logoOpacity: number; // 0.2 to 1
  // Visuals
  position: StampPosition;
  textColor: string;
  bgStyle: StampBgStyle;
}

/** An icon placed on the photo. x and y are the center, from 0 to 1. scale is a fraction of the shorter side. */
export interface PlacedAsset {
  id: string;
  src: string;
  name: string;
  x: number;
  y: number;
  scale: number;
}

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
  filename: string;
}
