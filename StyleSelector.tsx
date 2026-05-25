import { useState, useRef, useEffect } from "react";
import { StyleOption } from "../types";
import { STYLE_OPTIONS } from "../data";
import { ChevronDown, Sparkles } from "lucide-react";

interface StyleSelectorProps {
  selectedStyle: string;
  onChange: (style: any) => void;
}

export default function StyleSelector({ selectedStyle, onChange }: StyleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = STYLE_OPTIONS.find(o => o.value === selectedStyle) || STYLE_OPTIONS[0];

  return (
    <div id="style-selector-container" className="flex flex-col gap-2.5 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Vocal Delivery Emotion Style</span>
        </label>
        <span className="text-xs text-slate-400 font-mono">Appends TTS instructions</span>
      </div>

      <button
        id="style-dropdown-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-250 rounded-xl hover:border-slate-350 text-left transition-all focus:border-indigo-600 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentOption.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-slate-800">{currentOption.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{currentOption.description}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
      </button>

      {isOpen && (
        <div id="style-dropdown-options" className="absolute top-[calc(100%+6px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden max-h-80 overflow-y-auto">
          {STYLE_OPTIONS.map((style: StyleOption) => {
            const isSelected = selectedStyle === style.value;
            return (
              <button
                key={style.value}
                type="button"
                id={`style-opt-${style.value.replace(/\s+/g, '-')}`}
                onClick={() => {
                  onChange(style.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 text-left transition-colors cursor-pointer ${
                  isSelected ? "bg-indigo-50/50 text-indigo-700 font-medium" : "text-slate-600"
                }`}
              >
                <span className="text-2xl">{style.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold-custom ${isSelected ? "text-indigo-700 font-semibold" : "text-slate-800"}`}>
                      {style.label}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 font-mono font-semibold px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{style.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
