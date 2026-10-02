import { useState, useEffect } from 'react';
import { AspectRatio, FilterType, StampSettings, Template, CapturedPhoto, PlacedAsset } from './types';
import { DEFAULT_PRESET_TEMPLATES, DEFAULT_STAMP_SETTINGS } from './utils/presets';
import { StickerAsset } from './utils/assets';
import { CameraView } from './components/CameraView';
import { PhotoUploader } from './components/PhotoUploader';
import { TemplateSelector } from './components/TemplateSelector';
import { StampSettingsModal } from './components/StampSettingsModal';
import { ResultModal } from './components/ResultModal';
import { AssetPicker } from './components/AssetPicker';
import { soundEngine } from './utils/audio';
import { X } from 'lucide-react';

const STORAGE_KEY_TEMPLATES = 'snapframe_custom_templates';
const STORAGE_KEY_SETTINGS = 'snapframe_stamp_settings';

export default function App() {
  const [mode, setMode] = useState<'camera' | 'photo'>('camera');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_PRESET_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_PRESET_TEMPLATES[0].id);
  const [stampSettings, setStampSettings] = useState<StampSettings>(DEFAULT_STAMP_SETTINGS);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);

  // Camera hardware controls
  const [isFacingUser, setIsFacingUser] = useState<boolean>(false);
  const [, setHasMultipleCameras] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [isStampSettingsOpen, setIsStampSettingsOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState<boolean>(false);
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Load saved custom templates and settings from localStorage on mount
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (savedTemplates) {
        const parsed: Template[] = JSON.parse(savedTemplates);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates([...DEFAULT_PRESET_TEMPLATES, ...parsed]);
        }
      }

      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsedSettings: StampSettings = JSON.parse(savedSettings);
        setStampSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
    } catch (err) {
      console.warn('Failed to load local storage state:', err);
    }
  }, []);

  // Save custom templates to localStorage
  const handleAddCustomTemplate = (newTemplate: Template) => {
    setTemplates((prev) => {
      const updated = [newTemplate, ...prev];
      const customOnly = updated.filter((t) => t.category === 'custom');
      try {
        localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customOnly));
      } catch (e) {
        console.warn('Storage quota exceeded:', e);
      }
      return updated;
    });
    setSelectedTemplateId(newTemplate.id);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      const customOnly = updated.filter((t) => t.category === 'custom');
      try {
        localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customOnly));
      } catch (e) {
        console.warn('Storage save error:', e);
      }
      return updated;
    });
    if (selectedTemplateId === id) {
      setSelectedTemplateId(DEFAULT_PRESET_TEMPLATES[0].id);
    }
  };

  const handleUpdateTemplateOpacity = (id: string, opacity: number) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, opacity } : t))
    );
  };

  // Save stamp settings
  const handleSaveStampSettings = (newSettings: StampSettings) => {
    setStampSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save stamp settings:', e);
    }
  };

  // Camera toggle helpers
  const handleFlipCamera = () => {
    setIsFacingUser((prev) => !prev);
    setTorchOn(false);
  };

  const handleToggleTorch = () => {
    setTorchOn((prev) => !prev);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setSoundEnabled(next);
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const addAsset = (sticker: StickerAsset) => {
    const id = `${sticker.id}-${Date.now()}`;
    const n = placedAssets.length;
    setPlacedAssets((prev) => [
      ...prev,
      {
        id,
        src: sticker.src,
        name: sticker.name,
        x: Math.min(0.8, Math.max(0.2, 0.5 + ((n % 3) - 1) * 0.12)),
        y: Math.min(0.75, 0.4 + Math.floor(n / 3) * 0.1),
        scale: 0.28,
      },
    ]);
    setSelectedAssetId(id);
    setIsAssetsOpen(false);
  };

  const assetLayerProps = {
    placedAssets,
    selectedAssetId,
    onSelectAsset: setSelectedAssetId,
    onMoveAsset: (id: string, x: number, y: number) =>
      setPlacedAssets((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item))),
    onScaleAsset: (id: string, scale: number) =>
      setPlacedAssets((prev) => prev.map((item) => (item.id === id ? { ...item, scale } : item))),
    onRemoveAsset: (id: string) => {
      setPlacedAssets((prev) => prev.filter((item) => item.id !== id));
      setSelectedAssetId((current) => (current === id ? null : current));
    },
    onOpenAssets: () => setIsAssetsOpen(true),
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-black font-sans text-white select-none">
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {mode === 'camera' ? (
          <CameraView
            aspectRatio={aspectRatio}
            onChangeAspectRatio={setAspectRatio}
            template={activeTemplate}
            stampSettings={stampSettings}
            activeFilter={activeFilter}
            isFacingUser={isFacingUser}
            torchOn={torchOn}
            torchSupported={torchSupported}
            onTorchSupported={setTorchSupported}
            onMultipleCamerasDetected={setHasMultipleCameras}
            onCapture={setCapturedPhoto}
            onSwitchToPhoto={() => setMode('photo')}
            onFlipCamera={handleFlipCamera}
            onToggleTorch={handleToggleTorch}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onOpenStampSettings={() => setIsStampSettingsOpen(true)}
            {...assetLayerProps}
          />
        ) : (
          <PhotoUploader
            aspectRatio={aspectRatio}
            template={activeTemplate}
            stampSettings={stampSettings}
            activeFilter={activeFilter}
            onCapture={setCapturedPhoto}
            onBack={() => setMode('camera')}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onOpenStampSettings={() => setIsStampSettingsOpen(true)}
            {...assetLayerProps}
          />
        )}
      </main>

      {isTemplatesOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/55"
          onClick={() => setIsTemplatesOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-black border-t border-white/10 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-sm font-semibold">Mẫu</span>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(false)}
                className="p-1.5 text-white/70"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TemplateSelector
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(tpl) => {
                setSelectedTemplateId(tpl.id);
                setIsTemplatesOpen(false);
              }}
              onAddCustomTemplate={handleAddCustomTemplate}
              onDeleteCustomTemplate={handleDeleteCustomTemplate}
              onUpdateTemplateOpacity={handleUpdateTemplateOpacity}
            />
          </div>
        </div>
      )}

      {isAssetsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/55"
          onClick={() => setIsAssetsOpen(false)}
        >
          <div
            className="w-full max-h-[70vh] overflow-y-auto rounded-t-2xl bg-black border-t border-white/10 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-sm font-semibold">Asset</span>
              <button
                type="button"
                onClick={() => setIsAssetsOpen(false)}
                className="p-1.5 text-white/70"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AssetPicker
              hasPlaced={placedAssets.length > 0}
              onPick={addAsset}
              onClear={() => {
                setPlacedAssets([]);
                setSelectedAssetId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Stamp & Logo Settings Modal */}
      <StampSettingsModal
        isOpen={isStampSettingsOpen}
        onClose={() => setIsStampSettingsOpen(false)}
        settings={stampSettings}
        onSave={handleSaveStampSettings}
      />

      {/* Result Export & Sharing Modal */}
      <ResultModal
        photo={capturedPhoto}
        onClose={() => setCapturedPhoto(null)}
        onRetake={() => setCapturedPhoto(null)}
      />
    </div>
  );
}
