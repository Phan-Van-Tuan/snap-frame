export interface StickerAsset {
  id: string;
  name: string;
  src: string;
}

const LABELS: Record<string, string> = {
  'che-tron': 'Che tròn',
  'thanh-den': 'Thanh đen',
  'mo-pixel': 'Mờ pixel',
  'mat-cuoi': 'Mặt cười',
  kinh: 'Kính',
  tim: 'Tim',
  sao: 'Sao',
};

// Drop SVG or PNG files in src/assets/stickers and they show up here.
const files = import.meta.glob('../assets/stickers/*.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const STICKER_ASSETS: StickerAsset[] = Object.entries(files)
  .map(([path, src]) => {
    const file = path.split('/').pop() || path;
    const id = file.replace(/\.[^.]+$/, '');
    return { id, name: LABELS[id] || id.replace(/[-_]/g, ' '), src };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
