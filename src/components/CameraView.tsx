import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ASPECT_VALUE, AspectRatio, FilterType, StampSettings, Template, CapturedPhoto, PlacedAsset } from '../types';
import { calculateCrop, drawOverlay, drawPlacedAssets, applyFilterToContext } from '../utils/canvas';
import { soundEngine } from '../utils/audio';
import { AssetLayer } from './AssetLayer';
import { RefreshCw, AlertCircle, Zap, ZapOff, SwitchCamera, Image as ImageIcon, Pencil, LayoutTemplate, Sticker } from 'lucide-react';

const RATIO_LABEL: Record<AspectRatio, string> = {
  '9:16': '9:16',
  '4:3': '3:4',
  '1:1': '1:1',
  '16:9': '16:9',
};

interface CameraViewProps {
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  template: Template;
  stampSettings: StampSettings;
  activeFilter: FilterType;
  isFacingUser: boolean;
  torchOn: boolean;
  torchSupported: boolean;
  onTorchSupported: (supported: boolean) => void;
  onMultipleCamerasDetected: (hasMultiple: boolean) => void;
  onCapture: (photo: CapturedPhoto) => void;
  onSwitchToPhoto: () => void;
  onFlipCamera: () => void;
  onToggleTorch: () => void;
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

export const CameraView: React.FC<CameraViewProps> = ({
  aspectRatio,
  onChangeAspectRatio,
  template,
  stampSettings,
  activeFilter,
  isFacingUser,
  torchOn,
  torchSupported,
  onTorchSupported,
  onMultipleCamerasDetected,
  onCapture,
  onSwitchToPhoto,
  onFlipCamera,
  onToggleTorch,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  // Stop camera helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt chặn camera. Hãy mở trang bằng https:// hoặc localhost.');
      return;
    }

    try {
      // Check multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        onMultipleCamerasDetected(videoDevices.length > 1);
      } catch {
        // ignore
      }

      // Constraints with high resolution preference
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: isFacingUser ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        const name = (firstErr as Error).name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'NotFoundError') throw firstErr;
        // Constraints too strict for this device: retry with the simplest request
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as { torch?: boolean };
        onTorchSupported(Boolean(capabilities.torch));
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Camera access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Bạn đã từ chối cấp quyền camera. Vui lòng cho phép quyền trong cài đặt trình duyệt hoặc chọn tải ảnh lên.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('Không tìm thấy thiết bị camera trên máy.');
      } else {
        setCameraError('Không thể mở camera. Bạn có thể sử dụng tính năng tải ảnh từ thư viện.');
      }
    }
  }, [isFacingUser, onMultipleCamerasDetected, onTorchSupported, stopStream]);

  // Torch control
  useEffect(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyTrack = track as any;
        if (anyTrack.applyConstraints) {
          anyTrack.applyConstraints({
            advanced: [{ torch: torchOn }],
          }).catch(() => {});
        }
      }
    }
  }, [torchOn]);

  // Start camera on mount & change of facingMode
  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [startCamera, stopStream]);

  // Live overlay render loop
  useEffect(() => {
    let active = true;

    const renderLoop = async () => {
      if (!active) return;

      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;

      if (canvas && video && cameraReady && video.videoWidth > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Adjust canvas internal size to display size for sharp rendering
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          const displayWidth = Math.round(rect.width * dpr);
          const displayHeight = Math.round(rect.height * dpr);

          if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          await drawOverlay(ctx, canvas.width, canvas.height, template, stampSettings, new Date());
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      active = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cameraReady, template, stampSettings]);

  // Take photo & composite at full resolution
  const handleShutter = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || isCapturing) return;

    setIsCapturing(true);
    setFlashActive(true);
    soundEngine.playShutterSound();
    soundEngine.triggerHaptic();

    setTimeout(() => setFlashActive(false), 250);

    try {
      const vWidth = video.videoWidth || 1920;
      const vHeight = video.videoHeight || 1080;

      // Crop video to aspect ratio
      const crop = calculateCrop(vWidth, vHeight, aspectRatio);

      // Target high resolution canvas
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = Math.round(crop.sWidth);
      outputCanvas.height = Math.round(crop.sHeight);

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      // Filter
      applyFilterToContext(ctx, activeFilter);

      // Draw cropped video frame
      if (isFacingUser) {
        // Mirror selfie camera horizontally
        ctx.translate(outputCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          video,
          crop.sx,
          crop.sy,
          crop.sWidth,
          crop.sHeight,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height
        );
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      } else {
        ctx.drawImage(
          video,
          crop.sx,
          crop.sy,
          crop.sWidth,
          crop.sHeight,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height
        );
      }

      // Reset filter before drawing overlay so overlay colors remain crisp
      ctx.filter = 'none';

      // Draw overlay template & stamps on full resolution
      await drawOverlay(ctx, outputCanvas.width, outputCanvas.height, template, stampSettings, new Date());
      await drawPlacedAssets(ctx, outputCanvas.width, outputCanvas.height, placedAssets);

      const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.95);
      const timestamp = Date.now();
      const filename = `SnapFrame_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}.jpg`;

      onCapture({
        dataUrl,
        width: outputCanvas.width,
        height: outputCanvas.height,
        timestamp,
        filename,
      });
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const ratios: AspectRatio[] = ['9:16', '4:3', '1:1', '16:9'];
  const timeEdited = Boolean(stampSettings.timeOverride);

  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col bg-black select-none">
      {/* Viewfinder — edge to edge, cropped to the chosen ratio */}
      <div className="fit-stage relative flex-1 min-h-0 w-full flex items-center justify-center bg-black">
      <div
        style={{ '--r': ASPECT_VALUE[aspectRatio] } as React.CSSProperties}
        className="fit-frame relative overflow-hidden bg-black"
      >
        {/* Shutter flash screen */}
        {flashActive && (
          <div className="absolute inset-0 z-50 bg-white shutter-flash pointer-events-none" />
        )}

        {/* Video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-all ${
            isFacingUser ? 'scale-x-[-1]' : ''
          }`}
          style={{
            filter:
              activeFilter === 'vivid'
                ? 'contrast(1.15) saturate(1.25)'
                : activeFilter === 'warm'
                ? 'sepia(0.2) saturate(1.15) hue-rotate(-10deg)'
                : activeFilter === 'cool'
                ? 'saturate(0.9) hue-rotate(15deg)'
                : activeFilter === 'vintage'
                ? 'sepia(0.35) contrast(1.1) saturate(0.85)'
                : activeFilter === 'bw'
                ? 'grayscale(1) contrast(1.2)'
                : activeFilter === 'cyber'
                ? 'contrast(1.2) saturate(1.3) hue-rotate(30deg)'
                : 'none',
          }}
        />

        {/* Live Canvas Overlay (Template & Stamps) */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        <AssetLayer
          assets={placedAssets}
          selectedId={selectedAssetId}
          onSelect={onSelectAsset}
          onMove={onMoveAsset}
          onScale={onScaleAsset}
          onRemove={onRemoveAsset}
        />

        {/* Top tools, sitting on the photo */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 pt-3 text-white">
          <button
            type="button"
            onClick={onToggleTorch}
            disabled={!torchSupported}
            title={torchOn ? 'Tắt đèn' : 'Đèn flash'}
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              torchOn ? 'bg-[#FFD000] text-black' : 'bg-black/35 text-white'
            } disabled:opacity-40`}
          >
            {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = ratios[(ratios.indexOf(aspectRatio) + 1) % ratios.length];
              onChangeAspectRatio(next);
            }}
            className="h-8 min-w-12 px-2.5 rounded-full bg-black/35 text-[13px] font-semibold tabular-nums"
          >
            {RATIO_LABEL[aspectRatio]}
          </button>
          <button
            type="button"
            onClick={onOpenAssets}
            title="Icon"
            aria-label="Asset"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/35 text-white"
          >
            <Sticker className="w-5 h-5" />
          </button>
        </div>

        {/* Mẫu + Sửa, bottom of the photo */}
        <div className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 h-8 max-w-[46%] pl-2.5 pr-3 rounded-full bg-black/45 text-white text-[13px] font-medium backdrop-blur-md"
          >
            <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{template.name}</span>
          </button>
          <button
            type="button"
            onClick={onOpenStampSettings}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium backdrop-blur-md ${
              timeEdited ? 'bg-[#FFD000] text-black' : 'bg-black/45 text-white'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            {timeEdited ? 'Đã sửa giờ' : 'Sửa'}
          </button>
        </div>

        {/* Camera Error / Permission Fallback */}
        {cameraError && (
          <div className="absolute inset-0 z-10 p-6 flex flex-col items-center justify-center text-center bg-stone-950/90 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Chưa kết nối được Camera</h3>
            <p className="text-xs text-stone-300 mb-5 leading-relaxed max-w-xs">{cameraError}</p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại Camera
              </button>
              <button
                type="button"
                onClick={onSwitchToPhoto}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-800 text-stone-200 text-xs font-semibold hover:bg-stone-700 transition-colors"
              >
                Tải ảnh từ máy
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Shutter bar */}
      <div className="relative z-30 shrink-0 w-full flex items-center justify-between px-8 pt-3 pb-safe bg-black">
        <button
          type="button"
          onClick={onSwitchToPhoto}
          className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/80 text-white"
          aria-label="Ảnh từ máy"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleShutter}
          disabled={!cameraReady || isCapturing || Boolean(cameraError)}
          className={`flex items-center justify-center w-[74px] h-[74px] rounded-full border-[3px] border-white transition-transform active:scale-90 ${
            cameraReady && !cameraError ? '' : 'opacity-40 cursor-not-allowed'
          }`}
          aria-label="Chụp ảnh"
        >
          <div className={`w-[60px] h-[60px] rounded-full bg-white ${isCapturing ? 'scale-90' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onFlipCamera}
          className="flex items-center justify-center w-12 h-12 rounded-full text-white active:scale-95"
          aria-label="Đổi camera"
        >
          <SwitchCamera className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
