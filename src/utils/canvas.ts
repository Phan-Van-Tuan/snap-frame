import { AspectRatio, FilterType, PlacedAsset, StampSettings, Template } from '../types';

/**
 * Calculates crop dimensions for source image/video to match destination aspect ratio
 */
export function calculateCrop(
  srcWidth: number,
  srcHeight: number,
  targetRatio: AspectRatio
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  let ratioValue = 9 / 16;
  if (targetRatio === '4:3') ratioValue = 4 / 3;
  else if (targetRatio === '1:1') ratioValue = 1;
  else if (targetRatio === '16:9') ratioValue = 16 / 9;
  else if (targetRatio === '9:16') ratioValue = 9 / 16;

  const currentRatio = srcWidth / srcHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = srcWidth;
  let sHeight = srcHeight;

  if (currentRatio > ratioValue) {
    // Source is wider than target: crop left & right
    sWidth = srcHeight * ratioValue;
    sx = (srcWidth - sWidth) / 2;
  } else {
    // Source is taller than target: crop top & bottom
    sHeight = srcWidth / ratioValue;
    sy = (srcHeight - sHeight) / 2;
  }

  return { sx, sy, sWidth, sHeight };
}

/**
 * Formats date and time according to settings
 */
export function formatTimestamp(date: Date, format: StampSettings['dateTimeFormat']): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  switch (format) {
    case 'full':
      return `${h}:${min}:${s}  ${d}/${m}/${y}`;
    case 'date-time':
      return `${d}/${m}/${y} ${h}:${min}`;
    case 'time-date':
      return `${h}:${min}:${s} - ${d}/${m}/${y}`;
    case 'date-only':
      return `${d}/${m}/${y}`;
    case 'time-only':
      return `${h}:${min}:${s}`;
    default:
      return `${h}:${min}:${s}  ${d}/${m}/${y}`;
  }
}

/**
 * Loads an image from URL/dataURL into HTMLImageElement
 */
const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete) return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Applies color filters directly to canvas context
 */
export function applyFilterToContext(ctx: CanvasRenderingContext2D, filter: FilterType) {
  switch (filter) {
    case 'vivid':
      ctx.filter = 'contrast(1.15) saturate(1.25) brightness(1.02)';
      break;
    case 'warm':
      ctx.filter = 'sepia(0.2) saturate(1.15) brightness(1.02) hue-rotate(-10deg)';
      break;
    case 'cool':
      ctx.filter = 'saturate(0.9) brightness(1.02) hue-rotate(15deg) contrast(1.05)';
      break;
    case 'vintage':
      ctx.filter = 'sepia(0.35) contrast(1.1) brightness(0.95) saturate(0.85)';
      break;
    case 'bw':
      ctx.filter = 'grayscale(1) contrast(1.25) brightness(0.98)';
      break;
    case 'cyber':
      ctx.filter = 'contrast(1.2) saturate(1.3) hue-rotate(30deg)';
      break;
    case 'none':
    default:
      ctx.filter = 'none';
      break;
  }
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type InfoStyle = 'card' | 'plain';

/** What a template reserves on the canvas so stamp text and logo never collide with it. */
interface Layout {
  /** Free area (inside any frame) where the info block and logo may sit. */
  safe: Rect;
  /** Decorative elements the logo must avoid. */
  obstacles: Rect[];
  /** 'card' honours the user's background style, 'plain' draws bare text with a shadow. */
  infoStyle: InfoStyle;
  /** Set when the template draws its own info text and the generic info block should be skipped. */
  skipInfo?: boolean;
}

const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
const STAMP = '"Roboto Condensed", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Shrinks font until text fits maxW, then ellipsizes as a last resort. Returns drawn text and its width. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontOf: (size: number) => string,
  size: number,
  minSize: number,
  maxW: number
): { text: string; size: number; width: number } {
  let s = size;
  ctx.font = fontOf(s);
  while (ctx.measureText(text).width > maxW && s > minSize) {
    s -= 0.5;
    ctx.font = fontOf(s);
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(out).width > maxW) {
    out = out.slice(0, -1);
    ctx.font = fontOf(s);
  }
  if (out !== text) out = out.slice(0, -1).trimEnd() + '…';
  return { text: out, size: s, width: ctx.measureText(out).width };
}

/** Date painted on the stamp. A time override freezes it; otherwise the live clock. */
export function stampDate(stamp: Pick<StampSettings, 'timeOverride'>, now = new Date()): Date {
  if (!stamp.timeOverride) return now;
  const parsed = new Date(stamp.timeOverride);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

/** Value for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Draws stickers on top of the photo. Positions match the on-screen drag layer. */
export async function drawPlacedAssets(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  assets: PlacedAsset[]
) {
  const base = Math.min(width, height);
  for (const asset of assets) {
    try {
      const img = await loadImage(asset.src);
      const aspect = img.naturalWidth / (img.naturalHeight || 1);
      const w = base * asset.scale;
      const h = w / aspect;
      ctx.drawImage(img, asset.x * width - w / 2, asset.y * height - h / 2, w, h);
    } catch {
      // Skip an icon that failed to load
    }
  }
}

/**
 * Draws the selected template and dynamic stamps onto target canvas.
 * Order: frame decoration -> stamp info -> logo, each placed inside the area the template leaves free.
 */
export async function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: Template,
  stamp: StampSettings,
  currentDate: Date = new Date()
) {
  ctx.save();
  currentDate = stampDate(stamp, currentDate);
  const u = Math.min(width, height) / 1000;
  const full: Rect = { x: 0, y: 0, w: width, h: height };
  let layout: Layout = { safe: full, obstacles: [], infoStyle: 'card' };

  // 1. Custom uploaded frame image
  if (template.category === 'custom' && template.imageUrl) {
    try {
      const frameImg = await loadImage(template.imageUrl);
      ctx.globalAlpha = template.opacity;
      ctx.drawImage(frameImg, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    } catch {
      // Fallback if image failed
    }
    layout = { safe: inset(full, 24 * u), obstacles: [], infoStyle: 'card' };
  }

  // 2. Preset frame
  switch (template.presetId) {
    case 'camera-stamp':
      layout = drawCameraStamp(ctx, width, height, u, stamp, currentDate);
      break;
    case 'none':
      layout = drawCameraStamp(ctx, width, height, u, stamp, currentDate, false);
      break;
    case 'clean-border':
      layout = drawCleanBorder(ctx, width, height, u);
      break;
    case 'polaroid':
      layout = drawPolaroid(ctx, width, height, u, stamp, currentDate);
      break;
    case 'branding':
      layout = drawBrandingBar(ctx, width, height, u, stamp, currentDate);
      break;
    case 'inspection':
      layout = drawInspection(ctx, width, height, u, currentDate);
      break;
    case 'editorial':
      layout = drawEditorial(ctx, width, height, u, stamp, currentDate);
      break;
    case 'viewfinder':
      layout = drawViewfinder(ctx, width, height, u);
      break;
    case 'timestamp-work':
      layout = { safe: inset(full, 24 * u), obstacles: [], infoStyle: 'card' };
      break;
    default:
      if (template.category !== 'custom') {
        layout = { safe: inset(full, 24 * u), obstacles: [], infoStyle: 'card' };
      }
  }

  // 3. Stamp info block (date, location, GPS, note)
  let infoRect: Rect | null = null;
  if (!layout.skipInfo) {
    infoRect = drawInfoBlock(ctx, u, layout, stamp, currentDate);
  }

  // 4. Brand logo, moved away from anything already drawn
  if (stamp.showLogo && stamp.logoUrl) {
    try {
      const logoImg = await loadImage(stamp.logoUrl);
      drawLogo(ctx, u, layout, infoRect, logoImg, stamp);
    } catch {
      // ignore
    }
  }

  ctx.restore();
}

function inset(r: Rect, d: number): Rect {
  return { x: r.x + d, y: r.y + d, w: r.w - d * 2, h: r.h - d * 2 };
}

/**
 * Generic info block: date/time, location, GPS and note. Sized to its content and kept inside layout.safe.
 */
function drawInfoBlock(
  ctx: CanvasRenderingContext2D,
  u: number,
  layout: Layout,
  stamp: StampSettings,
  date: Date
): Rect | null {
  const { safe } = layout;
  const timeText = stamp.customDateTimeText || formatTimestamp(date, stamp.dateTimeFormat);
  const isBar = stamp.position === 'bottom-bar';
  const padX = 20 * u;
  const padY = 16 * u;
  const maxCardW = isBar ? safe.w : Math.min(safe.w, 560 * u);
  const maxTextW = maxCardW - padX * 2;

  interface Row {
    text: string;
    size: number;
    color: string;
    font: (s: number) => string;
    gap: number;
  }
  const rows: Row[] = [];
  const accent = stamp.textColor || '#f59e0b';

  if (stamp.showDateTime) {
    rows.push({ text: timeText, size: 30 * u, color: accent, font: (s) => `700 ${s}px ${MONO}`, gap: 8 * u });
  }
  if (stamp.showLocation && stamp.locationText) {
    rows.push({ text: stamp.locationText, size: 20 * u, color: '#ffffff', font: (s) => `600 ${s}px ${SANS}`, gap: 6 * u });
  }
  if (stamp.showLocation && stamp.showCoordinates && stamp.coordinatesText) {
    rows.push({ text: stamp.coordinatesText, size: 16 * u, color: '#e7e5e4', font: (s) => `500 ${s}px ${MONO}`, gap: 6 * u });
  }
  if (stamp.showCustomNote && (stamp.noteTitle || stamp.noteContent)) {
    const note = [stamp.noteTitle, stamp.noteContent].filter(Boolean).join(': ');
    rows.push({ text: note, size: 17 * u, color: '#fef08a', font: (s) => `600 ${s}px ${SANS}`, gap: 0 });
  }
  if (rows.length === 0) return null;

  // Fit every row, then size the card to the widest one
  const fitted = rows.map((r) => ({ ...r, fit: fitText(ctx, r.text, r.font, r.size, 9 * u, maxTextW) }));
  const contentW = Math.max(...fitted.map((r) => r.fit.width));
  const cardW = isBar ? safe.w : Math.min(maxCardW, contentW + padX * 2);
  const cardH = padY * 2 + fitted.reduce((sum, r) => sum + r.fit.size + r.gap, 0) - fitted[fitted.length - 1].gap;

  let x = safe.x;
  let y = safe.y + safe.h - cardH;
  if (stamp.position.endsWith('right')) x = safe.x + safe.w - cardW;
  if (stamp.position.startsWith('top')) y = safe.y;
  const rect: Rect = { x, y, w: cardW, h: cardH };

  ctx.save();
  const plain = layout.infoStyle === 'plain' || stamp.bgStyle === 'none';
  if (!plain) {
    const radius = isBar ? 0 : 14 * u;
    if (stamp.bgStyle === 'glass') {
      ctx.fillStyle = 'rgba(20, 18, 16, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(12, 10, 9, 0.82)';
    }
    roundRect(ctx, x, y, cardW, cardH, radius);
    ctx.fill();
    ctx.lineWidth = 1.5 * u;
    if (stamp.bgStyle === 'neon') {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 14 * u;
      ctx.strokeStyle = accent;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 6 * u;
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  let cy = y + padY;
  for (const r of fitted) {
    ctx.font = r.font(r.fit.size);
    ctx.fillStyle = r.color;
    ctx.fillText(r.fit.text, x + padX, cy);
    cy += r.fit.size + r.gap;
  }
  ctx.restore();
  return rect;
}

/**
 * Brand logo: honours the chosen corner, but hops to a free corner when it would overlap
 * the info block or a template decoration.
 */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  u: number,
  layout: Layout,
  infoRect: Rect | null,
  logoImg: HTMLImageElement,
  stamp: StampSettings
) {
  const { safe } = layout;
  const gap = 12 * u;
  const aspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);

  let lw = Math.min(safe.w * (stamp.logoScale || 0.18), safe.w * 0.4);
  let lh = lw / aspect;
  const maxH = safe.h * 0.22;
  if (lh > maxH) {
    lh = maxH;
    lw = lh * aspect;
  }

  const place = (pos: StampSettings['logoPosition']): Rect => ({
    x: pos.endsWith('right') ? safe.x + safe.w - lw : safe.x,
    y: pos.startsWith('bottom') ? safe.y + safe.h - lh : safe.y,
    w: lw,
    h: lh,
  });

  const wanted = stamp.logoPosition;
  const flipV = (p: typeof wanted) => (p.startsWith('top') ? p.replace('top', 'bottom') : p.replace('bottom', 'top')) as typeof wanted;
  const flipH = (p: typeof wanted) => (p.endsWith('left') ? p.replace('left', 'right') : p.replace('right', 'left')) as typeof wanted;
  const candidates = [wanted, flipH(wanted), flipV(wanted), flipV(flipH(wanted))];

  const blockers = [...layout.obstacles, ...(infoRect ? [infoRect] : [])];
  const hit = (r: Rect) => blockers.some((b) => intersects(inset(r, -gap), b));
  const chosen = candidates.map(place).find((r) => !hit(r)) ?? place(wanted);

  ctx.save();
  ctx.globalAlpha = stamp.logoOpacity ?? 0.9;
  ctx.drawImage(logoImg, chosen.x, chosen.y, chosen.w, chosen.h);
  ctx.restore();
}

/* ---------- Template frames ---------- */

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Greedy word wrap; the last line is ellipsized when text runs past maxLines. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1] + ' ' + lines.slice(maxLines).join(' ');
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = last.trimEnd() + '…';
    return kept;
  }
  return lines;
}

/**
 * Timemark-style stamp: bold time, accent bar, date + weekday, then pin + address, GPS and note.
 * No card; white text over a soft edge gradient.
 */
function drawCameraStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  stamp: StampSettings,
  date: Date,
  shadow = true
): Layout {
  const margin = 44 * u;
  const safe: Rect = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 };
  const accent = stamp.textColor || '#f59e0b';
  const showTime = stamp.showDateTime && stamp.dateTimeFormat !== 'date-only';
  const showDate = stamp.showDateTime && stamp.dateTimeFormat !== 'time-only';
  const address = stamp.showLocation ? stamp.locationText : '';
  const coords = stamp.showLocation && stamp.showCoordinates ? stamp.coordinatesText : '';
  const note = stamp.showCustomNote ? [stamp.noteTitle, stamp.noteContent].filter(Boolean).join(': ') : '';
  if (!showTime && !showDate && !address && !coords && !note) {
    return { safe, obstacles: [], infoStyle: 'plain', skipInfo: true };
  }

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const timeText = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const dateText = `${pad2(date.getDate())} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  const dayText = WEEKDAYS[date.getDay()];

  // Condensed light, tall and narrow, with a little extra tracking.
  const timeSize = 108 * u;
  const dateSize = 42 * u;
  const gap = 16 * u;
  const barW = 4 * u;
  const SYS = SANS;
  const timeTrack = 0.035 * timeSize;
  const dateTrack = 0.025 * dateSize;

  ctx.save();
  ctx.letterSpacing = `${timeTrack}px`;
  ctx.font = `300 ${timeSize}px ${STAMP}`;
  const timeW = showTime ? ctx.measureText(timeText).width : 0;
  ctx.letterSpacing = `${dateTrack}px`;
  ctx.font = `300 ${dateSize}px ${STAMP}`;
  const dateW = showDate ? Math.max(ctx.measureText(dateText).width, ctx.measureText(dayText).width) : 0;
  ctx.letterSpacing = '0px';
  const topW = timeW + (showTime && showDate ? gap * 2 + barW : 0) + dateW;
  const k = Math.min(1, safe.w / (topW || 1));

  const lineSize = 28 * u * k;
  const subSize = 22 * u * k;
  const pinW = 34 * u * k;
  const textMaxW = safe.w - pinW;
  const topH = showTime ? timeSize * 0.74 * k : showDate ? dateSize * 2.5 * k : 0;

  // Wrap text rows first so the block height is known before anything is drawn
  ctx.font = `600 ${lineSize}px ${SYS}`;
  const addrLines = address ? wrapText(ctx, address, textMaxW, 2) : [];
  ctx.font = `500 ${subSize}px ${MONO}`;
  const coordLine = coords ? fitText(ctx, coords, (s) => `500 ${s}px ${MONO}`, subSize, 10 * u, textMaxW) : null;
  ctx.font = `500 ${subSize}px ${SYS}`;
  const noteLine = note ? fitText(ctx, note, (s) => `500 ${s}px ${SYS}`, subSize, 10 * u, textMaxW) : null;

  const lineH = lineSize * 1.3;
  const subH = subSize * 1.45;
  let textH = addrLines.length * lineH + (coordLine ? subH : 0) + (noteLine ? subH : 0);
  const topGap = topH && textH ? 22 * u * k : 0;
  const blockH = topH + topGap + textH;

  // Widest row decides block width, so right-aligned blocks line up on their right edge
  ctx.font = `600 ${lineSize}px ${SYS}`;
  const textW = Math.max(
    0,
    ...addrLines.map((l) => pinW + ctx.measureText(l).width),
    coordLine ? pinW + coordLine.width : 0,
    noteLine ? pinW + noteLine.width : 0
  );
  const blockW = Math.min(safe.w, Math.max(topW * k, textW));

  const alignRight = stamp.position.endsWith('right');
  const atTop = stamp.position.startsWith('top');
  const x0 = alignRight ? safe.x + safe.w - blockW : safe.x;
  const y0 = atTop ? safe.y : safe.y + safe.h - blockH;

  // Soft scrim so white text stays readable on bright photos. Không khung skips it.
  if (shadow) {
    const scrimH = blockH + margin * 2.4;
    const grad = ctx.createLinearGradient(0, atTop ? 0 : h, 0, atTop ? scrimH : h - scrimH);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, atTop ? 0 : h - scrimH, w, scrimH);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8 * u;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';

  // Time, then a thin bar, then date over weekday. The pair lines up with the time.
  let cx = x0;
  const timeBaseline = y0 + topH;
  if (showTime) {
    ctx.letterSpacing = `${timeTrack * k}px`;
    ctx.font = `300 ${timeSize * k}px ${STAMP}`;
    ctx.fillText(timeText, cx, timeBaseline);
    ctx.letterSpacing = '0px';
    cx += timeW * k;
  }
  if (showDate) {
    const ds = dateSize * k;
    const lineGap = ds * 1.22;
    const dayBaseline = showTime ? timeBaseline - ds * 0.02 : y0 + ds + lineGap;
    const dateBaseline = dayBaseline - lineGap;
    if (showTime) {
      cx += gap * k;
      const barTop = dateBaseline - ds * 0.78;
      const barH = dayBaseline - barTop + ds * 0.08;
      ctx.fillStyle = accent;
      roundRect(ctx, cx, barTop, barW * k, barH, (barW * k) / 2);
      ctx.fill();
      cx += (barW + gap) * k;
      ctx.fillStyle = '#ffffff';
    }
    ctx.letterSpacing = `${dateTrack * k}px`;
    ctx.font = `300 ${ds}px ${STAMP}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dateText, cx, dateBaseline);
    ctx.fillText(dayText, cx, dayBaseline);
    ctx.letterSpacing = '0px';
  }

  // Text rows, each with a small icon column on the left
  let ty = y0 + topH + topGap;
  const tx = x0 + pinW;
  if (addrLines.length) {
    // Map pin
    const r = 8 * u * k;
    const px = x0 + pinW / 2 - 2 * u * k;
    const py = ty + lineSize * 0.45;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(px, py, r, Math.PI, 0);
    ctx.quadraticCurveTo(px + r, py + r * 1.1, px, py + r * 2.2);
    ctx.quadraticCurveTo(px - r, py + r * 1.1, px - r, py);
    ctx.closePath();
    ctx.arc(px, py, r * 0.4, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${lineSize}px ${SYS}`;
    addrLines.forEach((l, i) => ctx.fillText(l, tx, ty + lineSize + i * lineH));
    ty += addrLines.length * lineH;
  }
  if (coordLine) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `500 ${coordLine.size}px ${MONO}`;
    ctx.fillText(coordLine.text, tx, ty + subSize);
    ty += subH;
  }
  if (noteLine) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `500 ${noteLine.size}px ${SYS}`;
    ctx.fillText(noteLine.text, tx, ty + subSize);
  }
  ctx.restore();

  return {
    safe,
    obstacles: [{ x: x0, y: y0, w: Math.max(blockW, 1), h: blockH }],
    infoStyle: 'plain',
    skipInfo: true,
  };
}

function drawCleanBorder(ctx: CanvasRenderingContext2D, w: number, h: number, u: number): Layout {
  const pad = 22 * u;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2 * u;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 6 * u;
  roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 14 * u);
  ctx.stroke();
  ctx.restore();
  return { safe: inset({ x: 0, y: 0, w, h }, pad + 20 * u), obstacles: [], infoStyle: 'plain' };
}

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  stamp: StampSettings,
  date: Date
): Layout {
  const side = 36 * u;
  const bottom = 150 * u;
  const photo: Rect = { x: side, y: side, w: w - side * 2, h: h - side - bottom };

  ctx.save();
  ctx.fillStyle = '#fdfcf7';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(photo.x, photo.y, photo.w, photo.h);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2 * u;
  ctx.strokeRect(photo.x, photo.y, photo.w, photo.h);

  // Caption (left) + date (right) in the bottom margin, fitted so they never overlap
  const stripY = photo.y + photo.h;
  const midY = stripY + bottom / 2;
  const dateText = stamp.showDateTime ? stamp.customDateTimeText || formatTimestamp(date, 'date-only') : '';
  const caption = (stamp.showCustomNote && stamp.noteContent) || (stamp.showLocation && stamp.locationText) || '';
  const innerW = photo.w - 32 * u;

  ctx.textBaseline = 'middle';
  const dateFit = dateText
    ? fitText(ctx, dateText, (s) => `500 ${s}px ${MONO}`, 20 * u, 10 * u, innerW * 0.4)
    : null;
  const capMax = innerW - (dateFit ? dateFit.width + 24 * u : 0);
  if (caption) {
    const f = fitText(ctx, caption, (s) => `italic 600 ${s}px ${SANS}`, 28 * u, 12 * u, capMax);
    ctx.font = `italic 600 ${f.size}px ${SANS}`;
    ctx.fillStyle = '#262626';
    ctx.textAlign = 'left';
    ctx.fillText(f.text, photo.x + 16 * u, midY);
  }
  if (dateFit) {
    ctx.font = `500 ${dateFit.size}px ${MONO}`;
    ctx.fillStyle = '#737373';
    ctx.textAlign = 'right';
    ctx.fillText(dateFit.text, photo.x + photo.w - 16 * u, midY);
  }
  ctx.restore();

  return { safe: inset(photo, 20 * u), obstacles: [], infoStyle: 'card', skipInfo: true };
}

function drawBrandingBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  stamp: StampSettings,
  date: Date
): Layout {
  const barH = 96 * u;
  const bar: Rect = { x: 0, y: h - barH, w, h: barH };
  const padX = 28 * u;

  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 9, 0.88)';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = stamp.textColor || '#f59e0b';
  ctx.fillRect(bar.x, bar.y, bar.w, 3 * u);

  const title = stamp.noteTitle || 'SNAPFRAME STUDIO';
  const sub = [stamp.noteContent, stamp.showDateTime ? formatTimestamp(date, 'date-only') : '']
    .filter(Boolean)
    .join('  ·  ');
  const maxW = w - padX * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const t = fitText(ctx, title, (s) => `800 ${s}px ${SANS}`, 28 * u, 12 * u, maxW);
  ctx.font = `800 ${t.size}px ${SANS}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t.text, padX, bar.y + 42 * u);
  if (sub) {
    const sf = fitText(ctx, sub, (s) => `500 ${s}px ${SANS}`, 18 * u, 9 * u, maxW);
    ctx.font = `500 ${sf.size}px ${SANS}`;
    ctx.fillStyle = '#a8a29e';
    ctx.fillText(sf.text, padX, bar.y + 72 * u);
  }
  ctx.restore();

  // Logo and info live above the bar
  return { safe: inset({ x: 0, y: 0, w, h: h - barH }, 24 * u), obstacles: [], infoStyle: 'card', skipInfo: true };
}

function drawInspection(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  date: Date
): Layout {
  const pad = 36 * u;
  const r = 78 * u;
  const cx = w - pad - r;
  const cy = pad + r;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = '#dc2626';
  ctx.fillStyle = '#dc2626';
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5 * u;
  ctx.beginPath();
  ctx.arc(0, 0, r - 8 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${14 * u}px ${SANS}`;
  ctx.fillText('★ ĐÃ KIỂM ĐỊNH ★', 0, -32 * u);
  ctx.font = `900 ${26 * u}px ${SANS}`;
  ctx.fillText('PASSED', 0, 0);
  ctx.font = `700 ${14 * u}px ${MONO}`;
  ctx.fillText(formatTimestamp(date, 'date-only'), 0, 30 * u);
  ctx.font = `600 ${10 * u}px ${SANS}`;
  ctx.fillText('QC APPROVED', 0, 48 * u);
  ctx.restore();

  const stampBox: Rect = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  return {
    safe: inset({ x: 0, y: 0, w, h }, 24 * u),
    obstacles: [stampBox],
    infoStyle: 'card',
  };
}

function drawEditorial(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  stamp: StampSettings,
  date: Date
): Layout {
  const pad = 24 * u;
  const headH = 56 * u;
  const footH = 56 * u;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5 * u;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6 * u;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = w - pad * 2 - 40 * u;

  const title = (stamp.noteTitle || 'SPECIAL EDITION').toUpperCase();
  const t = fitText(ctx, title, (s) => `800 ${s}px ${SANS}`, 20 * u, 10 * u, maxW);
  ctx.font = `800 ${t.size}px ${SANS}`;
  ctx.fillText(t.text, w / 2, pad + headH / 2);

  const sub = stamp.showDateTime ? formatTimestamp(date, 'date-only') : '';
  if (sub) {
    ctx.font = `500 ${15 * u}px ${MONO}`;
    ctx.fillText(sub, w / 2, h - pad - footH / 2);
  }
  ctx.restore();

  const safe: Rect = {
    x: pad + 20 * u,
    y: pad + headH,
    w: w - (pad + 20 * u) * 2,
    h: h - (pad + headH) - (pad + footH),
  };
  return { safe, obstacles: [], infoStyle: 'card' };
}

function drawViewfinder(ctx: CanvasRenderingContext2D, w: number, h: number, u: number): Layout {
  const pad = 36 * u;
  const len = 50 * u;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3 * u;
  ctx.lineCap = 'round';
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  };
  corner(pad, pad, 1, 1);
  corner(w - pad, pad, -1, 1);
  corner(pad, h - pad, 1, -1);
  corner(w - pad, h - pad, -1, -1);

  // Rule-of-thirds grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo((w * i) / 3, pad);
    ctx.lineTo((w * i) / 3, h - pad);
    ctx.moveTo(pad, (h * i) / 3);
    ctx.lineTo(w - pad, (h * i) / 3);
  }
  ctx.stroke();

  // Center focus mark
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 18 * u, cy);
  ctx.lineTo(cx + 18 * u, cy);
  ctx.moveTo(cx, cy - 18 * u);
  ctx.lineTo(cx, cy + 18 * u);
  ctx.stroke();
  ctx.restore();

  return { safe: inset({ x: 0, y: 0, w, h }, pad + 20 * u), obstacles: [], infoStyle: 'card' };
}

/**
 * Helper to draw rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
