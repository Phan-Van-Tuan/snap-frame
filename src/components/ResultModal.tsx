import React, { useState } from 'react';
import { CapturedPhoto } from '../types';
import { 
  Download, 
  Share2, 
  Copy, 
  RotateCcw, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';

interface ResultModalProps {
  photo: CapturedPhoto | null;
  onClose: () => void;
  onRetake: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  photo,
  onClose,
  onRetake,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!photo) return null;

  // Download high-res photo
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  // Mobile Web Share API
  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        // Convert dataUrl to Blob
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], photo.filename, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Ảnh từ SnapFrame',
            text: 'Ảnh chụp đã lồng khung & đóng dấu ngày giờ SnapFrame',
          });
        } else {
          await navigator.share({
            title: 'Ảnh từ SnapFrame',
            url: window.location.href,
          });
        }
      } else {
        // Fallback to download if Web Share is not supported
        handleDownload();
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-stone-100 p-4 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ảnh Đã Hoàn Tất</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-mono">
              <span>{photo.width} × {photo.height}px</span>
              <span>·</span>
              <span>JPEG High-Res</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-semibold text-stone-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Chụp tiếp</span>
        </button>
      </div>

      {/* Main Image Viewport */}
      <div className="flex-1 my-3 flex items-center justify-center min-h-[300px] max-h-[calc(100vh-210px)]">
        <div className="relative max-h-full max-w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-900 flex items-center justify-center">
          <img
            src={photo.dataUrl}
            alt="SnapFrame Output"
            className="max-h-[calc(100vh-220px)] max-w-full object-contain rounded-xl"
          />
        </div>
      </div>

      {/* Bottom Action Grid */}
      <div className="w-full max-w-md mx-auto space-y-2 pb-safe">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Direct Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'Đã lưu vào máy' : 'Tải về máy'}</span>
          </button>

          {/* Share Button (Zalo, Messenger, AirDrop) */}
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{sharing ? 'Đang mở...' : 'Chia sẻ ngay'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2 px-3 rounded-lg bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép ảnh' : 'Sao chép ảnh'}</span>
          </button>

          <button
            type="button"
            onClick={onRetake}
            className="flex-1 py-2 px-3 rounded-lg bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Chụp lại</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-500 text-center flex items-center justify-center gap-1">
          <Info className="w-3 h-3" />
          <span>Ảnh được xử lý 100% trên thiết bị, bảo mật và chất lượng gốc</span>
        </p>
      </div>
    </div>
  );
};
