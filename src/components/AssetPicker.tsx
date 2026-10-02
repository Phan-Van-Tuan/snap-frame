import React from 'react';
import { STICKER_ASSETS, StickerAsset } from '../utils/assets';

interface AssetPickerProps {
  onPick: (asset: StickerAsset) => void;
  onClear: () => void;
  hasPlaced: boolean;
}

export const AssetPicker: React.FC<AssetPickerProps> = ({ onPick, onClear, hasPlaced }) => {
  return (
    <div className="px-3 pb-2">
      <p className="px-1 pb-2 text-[11px] text-white/50">
        Chạm một icon để đặt lên ảnh, kéo để đổi chỗ, kéo chấm trắng để phóng to. Thêm file PNG hoặc SVG vào thư mục src/assets/stickers.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {STICKER_ASSETS.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onPick(asset)}
            className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-2 py-2 active:bg-white/15"
          >
            <img src={asset.src} alt="" className="h-12 w-12 object-contain" />
            <span className="w-full truncate text-center text-[11px] text-white/80">{asset.name}</span>
          </button>
        ))}
      </div>
      {hasPlaced && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-white/70"
        >
          Gỡ hết icon
        </button>
      )}
    </div>
  );
};
