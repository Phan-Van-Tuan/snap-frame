import { Template, StampSettings } from '../types';

export const DEFAULT_PRESET_TEMPLATES: Template[] = [
  {
    id: 'preset-camera-stamp',
    name: 'Cổ điển',
    category: 'preset',
    presetId: 'camera-stamp',
    opacity: 1,
    description: 'Giờ lớn, ngày tháng và địa chỉ nhỏ gọn ở góc ảnh',
  },
  {
    id: 'preset-none',
    name: 'Không khung',
    category: 'preset',
    presetId: 'none',
    opacity: 1,
    description: 'Giống Cổ điển, không có bóng đổ',
  },
  {
    id: 'preset-timestamp-work',
    name: 'Hiện trường',
    category: 'preset',
    presetId: 'timestamp-work',
    opacity: 1,
    description: 'Ngày giờ, tọa độ, địa điểm và ghi chú dự án',
  },
  {
    id: 'preset-clean-border',
    name: 'Viền mảnh',
    category: 'preset',
    presetId: 'clean-border',
    opacity: 0.85,
    description: 'Khung viền bo góc tối giản',
  },
  {
    id: 'preset-polaroid',
    name: 'Polaroid',
    category: 'preset',
    presetId: 'polaroid',
    opacity: 1,
    description: 'Viền trắng kiểu ảnh lấy liền, kèm ngày tháng',
  },
  {
    id: 'preset-branding',
    name: 'Bản quyền',
    category: 'preset',
    presetId: 'branding',
    opacity: 0.95,
    description: 'Logo và thông tin liên hệ',
  },
  {
    id: 'preset-inspection',
    name: 'Nghiệm thu',
    category: 'preset',
    presetId: 'inspection',
    opacity: 0.95,
    description: 'Con dấu đã duyệt kèm mã số và thời gian',
  },
];

export const DEFAULT_STAMP_SETTINGS: StampSettings = {
  showDateTime: true,
  dateTimeFormat: 'full',
  timeOverride: null,
  showLocation: true,
  locationText: '138 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  showCoordinates: true,
  coordinatesText: '10.7769° N, 106.7009° E',
  showCustomNote: false,
  noteTitle: 'DỰ ÁN / ĐỊA ĐIỂM',
  noteContent: 'Hiện trường kiểm tra chất lượng',
  showLogo: false,
  logoPosition: 'top-left',
  logoScale: 0.18,
  logoOpacity: 0.9,
  position: 'bottom-left',
  textColor: '#FFD000',
  bgStyle: 'dark-badge',
};

// Default sample brand logos for preview if user hasn't uploaded one
export const SAMPLE_LOGOS = [
  {
    id: 'studio-mark',
    name: 'Studio Mark',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#f59e0b" stroke-width="6"/>
      <path d="M35 50L45 60L65 40" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'camera-shutter',
    name: 'Camera Shutter',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" stroke="#ffffff" stroke-width="5"/>
      <polygon points="50,20 62,38 42,38" fill="#f59e0b"/>
      <polygon points="76,35 68,54 54,42" fill="#f59e0b"/>
      <polygon points="70,68 50,68 60,50" fill="#f59e0b"/>
      <polygon points="38,72 32,52 48,60" fill="#f59e0b"/>
      <polygon points="24,42 42,38 32,56" fill="#f59e0b"/>
    </svg>`,
  },
];
