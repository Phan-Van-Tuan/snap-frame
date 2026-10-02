import React, { useRef, useState } from 'react';
import { StampSettings, StampPosition, DateTimeFormat } from '../types';
import { toDatetimeLocalValue } from '../utils/canvas';
import { SAMPLE_LOGOS } from '../utils/presets';
import { 
  X, 
  MapPin, 
  Clock, 
  Image as ImageIcon, 
  FileText, 
  Navigation, 
  Trash2, 
  Upload,
  Check
} from 'lucide-react';

interface StampSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StampSettings;
  onSave: (newSettings: StampSettings) => void;
}

export const StampSettingsModal: React.FC<StampSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [draft, setDraft] = useState<StampSettings>({ ...settings });
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Sync draft when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraft({ ...settings });
      setGpsError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Real device Geolocation fetch
  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Thiết bị không hỗ trợ định vị GPS.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latStr = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
        const lngStr = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`;
        setDraft((prev) => ({
          ...prev,
          showCoordinates: true,
          coordinatesText: `${latStr}, ${lngStr}`,
        }));
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsError('Không lấy được GPS. Hãy bật quyền vị trí hoặc nhập tay.');
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Upload logo handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDraft((prev) => ({
            ...prev,
            showLogo: true,
            logoUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleApply = () => {
    onSave(draft);
    onClose();
  };

  const colorOptions = [
    { label: 'Vàng', value: '#FFD000' },
    { label: 'Trắng', value: '#ffffff' },
    { label: 'Vàng chanh', value: '#eab308' },
    { label: 'Xanh cyan', value: '#06b6d4' },
    { label: 'Xanh lá', value: '#10b981' },
    { label: 'Đỏ tươi', value: '#ef4444' },
  ];

  const positionOptions: { id: StampPosition; label: string }[] = [
    { id: 'bottom-left', label: 'Dưới - Trái' },
    { id: 'bottom-right', label: 'Dưới - Phải' },
    { id: 'top-left', label: 'Trên - Trái' },
    { id: 'top-right', label: 'Trên - Phải' },
    { id: 'bottom-bar', label: 'Dải ngang đáy' },
  ];

  const formatOptions: { id: DateTimeFormat; label: string }[] = [
    { id: 'full', label: 'Giờ:Phút:Giây  Ngày/Tháng/Năm' },
    { id: 'date-time', label: 'Ngày/Tháng/Năm  Giờ:Phút' },
    { id: 'time-date', label: 'Giờ:Phút:Giây - Ngày/Tháng' },
    { id: 'date-only', label: 'Chỉ Ngày Tháng' },
    { id: 'time-only', label: 'Chỉ Giờ Phút Giây' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-stone-900 border border-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl text-stone-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/60">
          <div>
            <h3 className="text-base font-bold text-white">Sửa dấu</h3>
            <p className="text-xs text-stone-400 mt-0.5">Giờ trên ảnh sửa được. Địa điểm và ghi chú giữ nguyên.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Thời gian & Ngày tháng</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.showDateTime}
                  onChange={(e) => setDraft({ ...draft, showDateTime: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {draft.showDateTime && (
              <div className="space-y-2.5 pl-6 border-l-2 border-stone-800">
                <div className="rounded-xl bg-stone-950 border border-stone-800 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-white">
                      {draft.timeOverride ? 'Giờ đã sửa' : 'Đang dùng giờ thật'}
                    </span>
                    {draft.timeOverride && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, timeOverride: null })}
                        className="text-[11px] font-semibold text-amber-400"
                      >
                        Về giờ thật
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={draft.timeOverride || toDatetimeLocalValue(new Date())}
                    onChange={(e) => setDraft({ ...draft, timeOverride: e.target.value || null })}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    Đổi ngày giờ ở đây rồi bấm Áp dụng. Ảnh sẽ gắn đúng giờ đó. Về giờ thật để đồng hồ chạy lại.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Kiểu hiển thị</label>
                  <select
                    value={draft.dateTimeFormat}
                    onChange={(e) => setDraft({ ...draft, dateTimeFormat: e.target.value as DateTimeFormat })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    {formatOptions.map((fmt) => (
                      <option key={fmt.id} value={fmt.id}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Location & GPS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Địa điểm & Tọa độ GPS</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.showLocation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      showLocation: e.target.checked,
                      showCoordinates: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {draft.showLocation && (
              <div className="space-y-2.5 pl-6 border-l-2 border-stone-800">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Tên địa điểm / Tỉnh thành</label>
                  <input
                    type="text"
                    value={draft.locationText}
                    placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                    onChange={(e) => setDraft({ ...draft, locationText: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-400">Tọa độ GPS</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showCoordinates}
                        onChange={(e) => setDraft({ ...draft, showCoordinates: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                  </div>
                  {draft.showCoordinates && (
                  <>
                  <div className="flex items-center justify-end mb-1">
                    <button
                      type="button"
                      onClick={handleFetchGps}
                      disabled={gpsLoading}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                    >
                      <Navigation className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                      <span>{gpsLoading ? 'Đang lấy vị trí...' : 'Lấy GPS tự động'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={draft.coordinatesText}
                    placeholder="VD: 10.7769° N, 106.7009° E"
                    onChange={(e) => setDraft({ ...draft, coordinatesText: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 font-mono placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  {gpsError && (
                    <p className="text-[11px] text-red-400 mt-1">{gpsError}</p>
                  )}
                  </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Project / Note info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Thông tin dự án / Ghi chú</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.showCustomNote}
                  onChange={(e) => setDraft({ ...draft, showCustomNote: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {draft.showCustomNote && (
              <div className="space-y-2.5 pl-6 border-l-2 border-stone-800">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Tiêu đề nhãn</label>
                  <input
                    type="text"
                    value={draft.noteTitle}
                    placeholder="VD: DỰ ÁN, HẠNG MỤC, NGHIỆM THU"
                    onChange={(e) => setDraft({ ...draft, noteTitle: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 uppercase placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Nội dung chi tiết</label>
                  <input
                    type="text"
                    value={draft.noteContent}
                    placeholder="VD: Tòa nhà Landmark - Tầng 22"
                    onChange={(e) => setDraft({ ...draft, noteContent: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Brand Logo Watermark */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Logo Thương Hiệu / Watermark</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.showLogo}
                  onChange={(e) => setDraft({ ...draft, showLogo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {draft.showLogo && (
              <div className="space-y-3 pl-6 border-l-2 border-stone-800">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  {draft.logoUrl ? (
                    <div className="relative w-14 h-14 p-1 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center">
                      <img src={draft.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, logoUrl: undefined })}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-950 border border-dashed border-stone-700 hover:border-amber-400 text-xs text-stone-300 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tải file Logo PNG (nền trong suốt)</span>
                    </button>
                  )}

                  {/* Preset logo samples */}
                  {!draft.logoUrl && (
                    <div className="flex items-center gap-1.5">
                      {SAMPLE_LOGOS.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => {
                            const blob = new Blob([sample.svg], { type: 'image/svg+xml' });
                            const url = URL.createObjectURL(blob);
                            setDraft({ ...draft, logoUrl: url });
                          }}
                          className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 p-1 hover:border-amber-400 transition-colors"
                          title={sample.name}
                          dangerouslySetInnerHTML={{ __html: sample.svg }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Logo position */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Vị trí logo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setDraft({ ...draft, logoPosition: pos })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          draft.logoPosition === pos
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-300'
                        }`}
                      >
                        {pos === 'top-left' && 'Góc Trên - Trái'}
                        {pos === 'top-right' && 'Góc Trên - Phải'}
                        {pos === 'bottom-left' && 'Góc Dưới - Trái'}
                        {pos === 'bottom-right' && 'Góc Dưới - Phải'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo size slider */}
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>Kích thước logo</span>
                    <span>{Math.round(draft.logoScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.35"
                    step="0.02"
                    value={draft.logoScale}
                    onChange={(e) => setDraft({ ...draft, logoScale: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Position & Colors */}
          <div className="space-y-3">
            <span className="text-sm font-semibold text-white block">Vị trí & Màu sắc dấu</span>
            
            {/* Position */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Vị trí đóng dấu</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {positionOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, position: opt.id })}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      draft.position === opt.id
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                        : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background style */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Nền khối chữ</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ['dark-badge', 'Tối'],
                  ['glass', 'Kính mờ'],
                  ['neon', 'Neon'],
                  ['none', 'Không nền'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDraft({ ...draft, bgStyle: id })}
                    className={`py-2 px-1 rounded-lg text-xs font-medium border text-center transition-all ${
                      draft.bgStyle === id
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                        : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Màu chữ nổi bật</label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {colorOptions.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, textColor: col.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      draft.textColor === col.value
                        ? 'border-white bg-stone-800 shadow-sm'
                        : 'border-stone-800 bg-stone-950 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/40"
                      style={{ backgroundColor: col.value }}
                    />
                    <span>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-stone-800 bg-stone-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Áp dụng cài đặt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
