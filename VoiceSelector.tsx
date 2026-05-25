import { VoiceOption } from "../types";
import { VOICE_OPTIONS } from "../data";

interface VoiceSelectorProps {
  selectedVoice: string;
  onChange: (voice: any) => void;
}

export default function VoiceSelector({ selectedVoice, onChange }: VoiceSelectorProps) {
  return (
    <div id="voice-selector-container" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <span>Choose Speaker Voice</span>
        </label>
        <span className="text-xs text-slate-400 font-mono">5 prebuilt options</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {VOICE_OPTIONS.map((voice: VoiceOption) => {
          const isSelected = selectedVoice === voice.value;
          return (
            <button
              key={voice.value}
              id={`voice-btn-${voice.value.toLowerCase()}`}
              type="button"
              onClick={() => onChange(voice.value)}
              className={`relative flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isSelected
                  ? "border-indigo-650 bg-indigo-50/55 text-indigo-700 font-medium"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <span className={`text-sm font-semibold tracking-wide ${isSelected ? "text-indigo-850" : "text-slate-700"}`}>
                  {voice.label}
                </span>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  voice.gender === 'female' 
                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {voice.gender}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed line-clamp-2 text-slate-500 group-hover:text-slate-600">
                {voice.description}
              </p>
              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-indigo-600 m-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
