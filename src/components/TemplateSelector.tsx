import React, { useRef } from 'react';
import { Template } from '../types';
import { Plus, Trash2, Sliders, Layers } from 'lucide-react';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (template: Template) => void;
  onAddCustomTemplate: (template: Template) => void;
  onDeleteCustomTemplate: (id: string) => void;
  onUpdateTemplateOpacity: (id: string, opacity: number) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onAddCustomTemplate,
  onDeleteCustomTemplate,
  onUpdateTemplateOpacity,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newTemplate: Template = {
            id: `custom-${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, '').slice(0, 16) || 'Khung của bạn',
            category: 'custom',
            imageUrl: event.target.result as string,
            opacity: 1,
            createdAt: Date.now(),
          };
          onAddCustomTemplate(newTemplate);
          onSelectTemplate(newTemplate);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return (
    <div className="relative z-20 shrink-0 w-full flex flex-col gap-1 pb-safe px-2 pt-1 bg-stone-950">
      {/* Optional Opacity adjustment bar for custom frame */}
      {selectedTemplate.category === 'custom' && (
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-stone-900/90 rounded-xl border border-stone-800 text-xs">
          <div className="flex items-center gap-1.5 text-stone-300">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Độ mờ khung: {Math.round(selectedTemplate.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={selectedTemplate.opacity}
            onChange={(e) => onUpdateTemplateOpacity(selectedTemplate.id, parseFloat(e.target.value))}
            className="w-28 accent-amber-500 cursor-pointer"
          />
        </div>
      )}

      {/* Templates Scroll Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Hidden upload input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp"
          onChange={handleCustomUpload}
          className="hidden"
        />

        {/* Upload Custom Frame Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 flex flex-col items-center justify-center w-[72px] h-[72px] rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all active:scale-95 group"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-center leading-tight">Thêm khung</span>
        </button>

        {/* Template List */}
        {templates.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          const isCustom = tpl.category === 'custom';

          return (
            <div
              key={tpl.id}
              className="relative flex-shrink-0 group"
            >
              <button
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className={`relative flex flex-col items-center justify-between w-[72px] h-[72px] p-2 rounded-xl border text-left transition-all overflow-hidden ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/10'
                    : 'border-stone-800 bg-stone-900/80 hover:bg-stone-800/80 text-stone-400'
                }`}
              >
                {/* Visual Icon / Thumbnail */}
                <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                  {isCustom && tpl.imageUrl ? (
                    <img
                      src={tpl.imageUrl}
                      alt={tpl.name}
                      className="max-h-10 max-w-full object-contain drop-shadow"
                    />
                  ) : (
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Template Name */}
                <span
                  className={`text-[10px] font-semibold text-center truncate w-full mt-1 ${
                    isSelected ? 'text-amber-400' : 'text-stone-300'
                  }`}
                >
                  {tpl.name}
                </span>

                {/* Active indicator dot */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Delete custom template button */}
              {isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomTemplate(tpl.id);
                  }}
                  title="Xoá khung này"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-900 text-stone-400 hover:text-red-400 border border-stone-700 flex items-center justify-center shadow-md transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
