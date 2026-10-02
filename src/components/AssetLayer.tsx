import React, { useRef } from 'react';
import { PlacedAsset } from '../types';

interface AssetLayerProps {
  assets: PlacedAsset[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, scale: number) => void;
  onRemove: (id: string) => void;
}

export const AssetLayer: React.FC<AssetLayerProps> = ({
  assets,
  selectedId,
  onSelect,
  onMove,
  onScale,
  onRemove,
}) => {
  const frameRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 z-[24] pointer-events-none"
      style={{ containerType: 'size' }}
    >
      {assets.map((asset) => {
        const selected = asset.id === selectedId;
        return (
          <div
            key={asset.id}
            role="button"
            aria-label={asset.name}
            className="absolute pointer-events-auto touch-none"
            style={{
              left: `${asset.x * 100}%`,
              top: `${asset.y * 100}%`,
              width: `calc(${asset.scale} * min(100cqw, 100cqh))`,
              transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).dataset.handle) return;
              event.preventDefault();
              event.stopPropagation();
              onSelect(asset.id);
              const frame = frameRef.current?.getBoundingClientRect();
              if (!frame) return;
              const startX = event.clientX;
              const startY = event.clientY;
              const originX = asset.x;
              const originY = asset.y;
              const move = (ev: PointerEvent) => {
                const x = Math.min(0.96, Math.max(0.04, originX + (ev.clientX - startX) / frame.width));
                const y = Math.min(0.96, Math.max(0.04, originY + (ev.clientY - startY) / frame.height));
                onMove(asset.id, x, y);
              };
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          >
            <img src={asset.src} alt={asset.name} draggable={false} className="w-full h-auto block select-none" />
            {selected && (
              <>
                <button
                  type="button"
                  data-handle="remove"
                  aria-label="Gỡ icon"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(asset.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white text-sm leading-none border border-white"
                >
                  ×
                </button>
                <div
                  data-handle="scale"
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-black"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const frame = frameRef.current?.getBoundingClientRect();
                    if (!frame) return;
                    const originX = frame.left + asset.x * frame.width;
                    const originY = frame.top + asset.y * frame.height;
                    const startDist = Math.hypot(event.clientX - originX, event.clientY - originY) || 1;
                    const startScale = asset.scale;
                    const move = (ev: PointerEvent) => {
                      const dist = Math.hypot(ev.clientX - originX, ev.clientY - originY);
                      onScale(asset.id, Math.min(0.95, Math.max(0.08, startScale * (dist / startDist))));
                    };
                    const up = () => {
                      window.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', up);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', up);
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
