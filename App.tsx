import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Volume2, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCcw, 
  Play, 
  Pause, 
  Download, 
  FileText, 
  HelpCircle,
  Clock,
  History,
  CornerDownRight
} from "lucide-react";
import VoiceSelector from "./components/VoiceSelector";
import StyleSelector from "./components/StyleSelector";
import TranslationHelper from "./components/TranslationHelper";
import HistoryPanel from "./components/HistoryPanel";
import { AudioStyle, VoiceName, TTSHistoryItem } from "./types";
import { STYLE_OPTIONS, VOICE_OPTIONS } from "./data";
import { motion, AnimatePresence } from "motion/react";

const LOCAL_STORAGE_KEY = "myanmar_tts_archive_v1";

export default function App() {
  // TTS parameters
  const [text, setText] = useState("");
  const [style, setStyle] = useState<AudioStyle>("normal");
  const [voiceName, setVoiceName] = useState<VoiceName>("Kore");
  
  // App states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  // Audio system tracking
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      } else {
        // Hydrate with some pleasant defaults if empty
        const initialGreet: TTSHistoryItem = {
          id: "welcome-sample-1",
          text: "မင်္ဂလာပါရှင်။ မြန်မာအေအိုင် အသံပြောင်းစနစ်မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။",
          style: "cheerful",
          voiceName: "Kore",
          audioData: "", // Empty audio placeholder for guide
          timestamp: new Date().toISOString()
        };
        setHistory([initialGreet]);
      }
    } catch (e) {
      console.error("Failed loading local history", e);
    }
  }, []);

  // Save history updates
  const saveHistory = (updated: TTSHistoryItem[]) => {
    setHistory(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed persisting local history", e);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please key in or suggest some Myanmar text first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), style, voiceName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed conducting TTS synthesis.");
      }

      if (data.audioData) {
        setAudioUrl(data.audioData);
        
        // Add new item to history vault
        const newItem: TTSHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          text: text.trim(),
          style,
          voiceName,
          audioData: data.audioData,
          timestamp: new Date().toISOString()
        };
        saveHistory([newItem, ...history]);

        // Autoplay generated audio
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = data.audioData;
            audioRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(err => console.log("Autoplay block:", err));
          }
        }, 150);
      } else {
        throw new Error("No playable audio track data received.");
      }
    } catch (err: any) {
      console.error("Synthesize error:", err);
      setError(err.message || "An error occurred during speech generation. Please verify your Gemini API Key in Settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayHistoryItem = (item: TTSHistoryItem) => {
    if (!item.audioData) {
      // If mock greeting with empty wave, fill preset
      setText(item.text);
      setStyle(item.style);
      setVoiceName(item.voiceName);
      return;
    }

    if (currentPlayingId === item.id) {
      // Toggle play state on active track
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.log("Playback error:", e));
        }
      }
    } else {
      // Switch to a new track
      setCurrentPlayingId(item.id);
      setAudioUrl(item.audioData);
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = item.audioData;
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.log("Playback error:", e));
        }
      }, 50);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    if (currentPlayingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
      setAudioUrl(null);
    }
    saveHistory(history.filter((h) => h.id !== id));
  };

  const handleClearAllHistory = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
    setAudioUrl(null);
    saveHistory([]);
  };

  const handleApplySuggestion = (suggestionText: string) => {
    setText(suggestionText);
    setError(null);
  };

  // Audio elements synchronization
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    };

    el.addEventListener("ended", handleEnded);
    return () => {
      el.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePrimaryPlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log(e));
    }
  };

  return (
    <div id="application-container" className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Dynamic Hidden HTML5 Audio Node */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Modern High-Contrast Sleek Header */}
      <header id="app-header" className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 sm:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <Volume2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">
                MynTTS <span className="text-indigo-600">v3.1</span>
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest hidden sm:inline">
                Gemini 3.1
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-500">
            <span className="text-indigo-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Synthesizer
            </span>
            <span>Myanmar Voiceover</span>
          </nav>
          <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Current Audio Engine:</span>
            <span className="text-xs font-mono font-bold bg-slate-50 text-slate-700 border border-slate-250 px-2.5 py-1 rounded-lg">
              Gemini 3.1 Flash Speech
            </span>
          </div>
        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Input Console (7 cols) */}
        <div id="col-text-console" className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-5">
            
            {/* Header prompt direction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Myanmar Text Input</h2>
              </div>
              <button
                id="btn-reset-editor"
                type="button"
                onClick={() => setText("")}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-200/80"
                title="Clear current Myanmar text"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Burmese Text Input Box */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <textarea
                  id="burmese-textarea"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="မြန်မာစာသားများကို ဤနေရာတွင် ရိုက်ထည့်ပါ..."
                  className="w-full min-h-[160px] bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-sans text-lg sm:text-xl leading-relaxed placeholder-slate-350 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-y"
                  dir="ltr"
                />
                
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {text.length} characters
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unicode</span>
                <span className="px-2 py-0.5 bg-indigo-50 rounded text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Auto-Language Capture</span>
              </div>
            </div>

            {/* Vocal Delivery Styles selector */}
            <StyleSelector selectedStyle={style} onChange={setStyle} />

            {/* Builtin Speaker Profiles configuration */}
            <VoiceSelector selectedVoice={voiceName} onChange={setVoiceName} />

            {/* Trigger Button & Error Output */}
            <div className="flex flex-col gap-3 pt-2">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    id="synthesize-error-panel"
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <div className="font-semibold text-rose-200">Synthesis Encountered a Snag</div>
                      <p className="mt-0.5 leading-relaxed text-rose-300/90">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                id="btn-voiceover-trigger"
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !text.trim()}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-405 disabled:cursor-not-allowed rounded-xl font-bold tracking-wide text-sm font-display flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-100 cursor-pointer transform active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini is generating high-fidelity speech...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Generate Voiceover</span>
                  </>
                )}
              </button>
            </div>

            {/* HTML5 Audio Player Card Details */}
            <AnimatePresence>
              {audioUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  id="active-player-card"
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white space-y-4 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Output audio track</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-450 px-2.5 py-0.5 rounded font-semibold font-mono tracking-wide">Ready</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={togglePrimaryPlayback}
                      className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current text-slate-900" />
                      ) : (
                        <Play className="w-6 h-6 fill-current text-slate-900 ml-1" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      {/* Audio visualizer peaks decorative mock */}
                      <div className="flex items-end h-7 gap-0.5 w-full overflow-hidden mb-1 justify-between">
                        {[6, 12, 18, 14, 8, 10, 22, 16, 24, 18, 12, 10, 14, 20, 8, 12, 16, 22, 14, 6, 10, 15, 12, 8, 14, 20, 18, 12].map((h, i) => (
                          <div 
                            key={i} 
                            style={{ height: isPlaying ? `${Math.max(4, h * Math.sin((i + Date.now()/250)))}px` : `4px` }}
                            className={`w-[4px] rounded-full transition-all duration-200 ${
                              isPlaying ? 'bg-indigo-400' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{isPlaying ? "Generating sound waves" : "Track loaded"}</span>
                        <span>24 KHz PCM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <a
                      href={audioUrl}
                      download={`myn_voiceover_${style}.wav`}
                      className="flex-1 py-2 text-center rounded-lg bg-slate-800 text-xs font-semibold hover:bg-slate-705 text-white transition-colors border border-slate-700 hover:border-slate-650 cursor-pointer"
                    >
                      Download WAV Audio
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Right Section: Sidebar Aux Helpers & History (5 cols) */}
        <div id="col-aux-sidebar" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Myanmar translation companion */}
          <TranslationHelper onSuggestPhrase={handleApplySuggestion} />

          {/* History Vault module */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <HistoryPanel
              history={history}
              onPlay={handlePlayHistoryItem}
              onDelete={handleDeleteHistoryItem}
              onClearAll={handleClearAllHistory}
              currentPlayingId={currentPlayingId}
            />
          </div>
        </div>

      </main>

      {/* Elegant Bottom Footer Status */}
      <footer id="app-footer" className="h-12 bg-white border-t border-slate-200 px-6 sm:px-8 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span>Connected: Gemini 3.1 Flash AI</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-200"></div>
          <span>Status: Live Voiceover Server</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>Vercel Deployment Compatibility</span>
          <span className="text-slate-300">|</span>
          <span>Build: Sleek Modern</span>
        </div>
      </footer>
    </div>
  );
}
