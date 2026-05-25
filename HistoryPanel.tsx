import { TTSHistoryItem } from "../types";
import { STYLE_OPTIONS, VOICE_OPTIONS } from "../data";
import { Play, Download, Trash2, Calendar, Music } from "lucide-react";

interface HistoryPanelProps {
  history: TTSHistoryItem[];
  onPlay: (item: TTSHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  currentPlayingId: string | null;
}

export default function HistoryPanel({
  history,
  onPlay,
  onDelete,
  onClearAll,
  currentPlayingId,
}: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div id="history-empty" className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-slate-200/60 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
          <Music className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No Generations Yet</p>
        <p className="text-xs text-slate-500 mt-1.5 max-w-[260px] mx-auto">
          Convert Myanmar text above to populate your local voiceover station.
        </p>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return "Just now";
    }
  };

  return (
    <div id="history-panel-container" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">Local History & Vault</h3>
          <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-full font-mono">
            {history.length}
          </span>
        </div>
        <button
          id="btn-clear-history"
          type="button"
          onClick={onClearAll}
          className="text-xs text-rose-600 hover:text-rose-700 transition-colors bg-rose-50 hover:bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-lg cursor-pointer font-semibold"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
        {history.map((item: TTSHistoryItem) => {
          const matchedStyle = STYLE_OPTIONS.find((s) => s.value === item.style);
          const matchedVoice = VOICE_OPTIONS.find((v) => v.value === item.voiceName);
          const isPlaying = currentPlayingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
                isPlaying
                  ? "bg-indigo-50/50 border-indigo-200"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Top metadata row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {matchedStyle && (
                    <span className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <span>{matchedStyle.emoji}</span>
                      <span>{matchedStyle.label}</span>
                    </span>
                  )}
                  <span className="text-[11px] bg-slate-50 text-slate-650 border border-slate-200 px-2 py-0.5 rounded font-medium">
                    🗣️ {item.voiceName} ({matchedVoice?.gender || "voice"})
                  </span>
                </div>

                <div className="text-[10px] text-slate-405 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>

              {/* Central text view box */}
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 text-sm text-slate-800 font-sans leading-relaxed break-words max-h-24 overflow-y-auto">
                {item.text}
              </div>

              {/* Control bar */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPlay(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      isPlaying
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-150"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isPlaying ? "Playing..." : "Listen"}</span>
                  </button>

                  <a
                    href={item.audioData}
                    download={`mym_voice_${item.id.slice(0, 6)}_${item.style}.wav`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition-all"
                    title="Download WAV voiceover"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  title="Remove this record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
