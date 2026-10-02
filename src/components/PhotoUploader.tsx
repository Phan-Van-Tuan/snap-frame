import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ASPECT_VALUE, AspectRatio, FilterType, StampSettings, Template, CapturedPhoto, PlacedAsset } from '../types';
import { calculateCrop, drawOverlay, drawPlacedAssets, applyFilterToContext, loadImage } from '../utils/canvas';
import { AssetLayer } from './AssetLayer';
import { Upload, ImagePlus, CheckCircle2, ChevronLeft, Pencil, LayoutTemplate, Sticker } from 'lucide-react';

interface PhotoUploaderProps {
  aspectRatio: AspectRatio;
  template: Template;
  stampSettings: StampSettings;
  activeFilter: FilterType;
  onCapture: (photo: CapturedPhoto) => void;
  onBack: () => void;
  onOpenTemplates: () => void;
  onOpenStampSettings: () => void;
  onOpenAssets: () => void;
  placedAssets: PlacedAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
  onMoveAsset: (id: string, x: number, y: number) => void;
  onScaleAsset: (id: string, scale: number) => void;
  onRemoveAsset: (id: string) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  aspectRatio,
  template,
  stampSettings,
  activeFilter,
  onCapture,
  onBack,
  onOpenTemplates,
  onOpenStampSettings,
  onOpenAssets,
  placedAssets,
  selectedAssetId,
  onSelectAsset,
  onMoveAsset,
  onScaleAsset,
  onRemoveAsset,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Render composite image onto preview canvas
  const renderPreview = useCallback(async () => {
    if (!selectedImageUrl || !canvasRef.current) return;

    try {
      const img = await loadImage(selectedImageUrl);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const crop = calculateCrop(img.naturalWidth, img.naturalHeight, aspectRatio);

      // Set canvas size matching display aspect ratio
      const baseWidth = 900;
      let ratioVal = 9 / 16;
      if (aspectRatio === '4:3') ratioVal = 4 / 3;
      else if (aspectRatio === '1:1') ratioVal = 1;
      else if (aspectRatio === '16:9') ratioVal = 16 / 9;

      canvas.width = baseWidth;
      canvas.height = Math.round(baseWidth / ratioVal);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter
      applyFilterToContext(ctx, activeFilter);

      // Draw base image cropped
      ctx.drawImage(
        img,
        crop.sx,
        crop.sy,
        crop.sWidth,
        crop.sHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.filter = 'none';

      // Draw overlay template & stamps
      await drawOverlay(ctx, canvas.width, canvas.height, template, stampSettings, new Date());
    } catch (err) {
      console.error('Preview render error:', err);
    }
  }, [selectedImageUrl, aspectRatio, activeFilter, template, stampSettings]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    if (stampSettings.timeOverride) return;
    const id = window.setInterval(() => {
      renderPreview();
    }, 1000);
    return () => window.clearInterval(id);
  }, [stampSettings.timeOverride, renderPreview]);

  // Export composite photo at maximum resolution
  const handleExport = async () => {
    if (!selectedImageUrl || isProcessing) return;
    setIsProcessing(true);

    try {
      const img = await loadImage(selectedImageUrl);
      const crop = calculateCrop(img.naturalWidth, img.naturalHeight, aspectRatio);

      const highResCanvas = document.createElement('canvas');
      highResCanvas.width = Math.round(crop.sWidth);
      highResCanvas.height = Math.round(crop.sHeight);

      const ctx = highResCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      // Apply filter
      applyFilterToContext(ctx, activeFilter);

      // Draw base image
      ctx.drawImage(
        img,
        crop.sx,
        crop.sy,
        crop.sWidth,
        crop.sHeight,
        0,
        0,
        highResCanvas.width,
        highResCanvas.height
      );

      ctx.filter = 'none';

      // Draw overlay
      await drawOverlay(ctx, highResCanvas.width, highResCanvas.height, template, stampSettings, new Date());
      await drawPlacedAssets(ctx, highResCanvas.width, highResCanvas.height, placedAssets);

      const dataUrl = highResCanvas.toDataURL('image/jpeg', 0.95);
      const timestamp = Date.now();
      const filename = `SnapFrame_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}.jpg`;

      onCapture({
        dataUrl,
        width: highResCanvas.width,
        height: highResCanvas.height,
        timestamp,
        filename,
      });
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const timeEdited = Boolean(stampSettings.timeOverride);

  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col bg-black">
      <div className="shrink-0 flex items-center justify-between px-2 pt-safe pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-0.5 h-9 px-2 text-sm font-medium text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          Camera
        </button>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 text-[13px] font-medium"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          {template.name}
        </button>
        <button
          type="button"
          onClick={onOpenStampSettings}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium ${
            timeEdited ? 'bg-[#FFD000] text-black' : 'bg-white/10 text-white'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          {timeEdited ? 'Đã sửa giờ' : 'Sửa'}
        </button>
        <button
          type="button"
          onClick={onOpenAssets}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10"
          aria-label="Icon"
        >
          <Sticker className="w-4 h-4" />
        </button>
      </div>
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Canvas Preview Container */}
      <div className="fit-stage flex-1 min-h-0 w-full flex items-center justify-center">
      <div
        style={{ '--r': ASPECT_VALUE[aspectRatio] } as React.CSSProperties}
        className="fit-frame relative overflow-hidden rounded-2xl bg-stone-900 shadow-2xl flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        <AssetLayer
          assets={placedAssets}
          selectedId={selectedAssetId}
          onSelect={onSelectAsset}
          onMove={onMoveAsset}
          onScale={onScaleAsset}
          onRemove={onRemoveAsset}
        />

        {!selectedImageUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-300 text-sm font-semibold"
          >
            <ImagePlus className="w-8 h-8 text-amber-400" />
            Chọn ảnh từ máy
          </button>
        )}

        {/* Change image overlay button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-950/75 hover:bg-stone-900 text-stone-200 text-xs font-semibold backdrop-blur-md border border-stone-800 transition-colors shadow-sm"
        >
          <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
          <span>Đổi ảnh</span>
        </button>
      </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="w-full max-w-md mx-auto shrink-0 flex flex-col gap-2 py-2">
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold whitespace-nowrap transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Chọn ảnh khác</span>
          </button>

        </div>

        {/* Export / Save Button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={!selectedImageUrl || isProcessing}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Đang xử lý xuất ảnh...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Xuất ảnh</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
