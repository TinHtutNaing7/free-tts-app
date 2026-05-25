import { useState } from "react";
import { Languages, HelpCircle, Loader2, Sparkles, Check, ChevronRight } from "lucide-react";
import { CATEGORY_SAMPLE_LABELS } from "../data";

interface TranslationHelperProps {
  onSuggestPhrase: (text: string) => void;
}

export default function TranslationHelper({ onSuggestPhrase }: TranslationHelperProps) {
  const [englishInput, setEnglishInput] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [suggestLoadingCategory, setSuggestLoadingCategory] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!englishInput.trim()) return;
    setIsTranslating(true);
    setAlertMsg(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishText: englishInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to translate standard text.");
      }
      if (data.myanmarText) {
        onSuggestPhrase(data.myanmarText);
        setEnglishInput("");
        triggerFlashAlert("Translated & Applied!");
      }
    } catch (err: any) {
      setAlertMsg(err.message || "Could not reach Gemini translator.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFetchSuggestion = async (category: string) => {
    setSuggestLoadingCategory(category);
    setAlertMsg(null);
    try {
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve Burmese text suggestion.");
      }
      if (data.phrase) {
        onSuggestPhrase(data.phrase);
        triggerFlashAlert("Sample Applied!");
      }
    } catch (err: any) {
      setAlertMsg(err.message || "Failed parsing suggestion.");
    } finally {
      setSuggestLoadingCategory(null);
    }
  };

  const triggerFlashAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => {
      setAlertMsg(null);
    }, 2500);
  };

  return (
    <div id="translation-helper-container" className="flex flex-col gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Languages className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Myanmar Assistant</h3>
          <p className="text-[11px] text-slate-500">Need text? Create or translate dynamically</p>
        </div>
      </div>

      {alertMsg && (
        <div className={`p-2.5 rounded-lg text-xs font-semibold text-center ${
          alertMsg.includes("Applied") 
            ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
            : "bg-rose-50 text-rose-600 border border-rose-100"
        }`}>
          {alertMsg}
        </div>
      )}

      {/* English to Myanmar Translator */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-700">Translate English to Burmese</label>
        <div className="flex gap-2">
          <input
            id="english-translate-input"
            type="text"
            value={englishInput}
            onChange={(e) => setEnglishInput(e.target.value)}
            placeholder="Type: 'How are you doing today?'"
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 whitespace-nowrap overflow-ellipsis"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTranslate();
            }}
          />
          <button
            id="btn-translate-submit"
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || !englishInput.trim()}
            className="px-3 py-1.5 bg-indigo-55 text-indigo-600 hover:bg-indigo-100/85 border border-indigo-100 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            {isTranslating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span>Translate</span>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 my-1" />

      {/* Instantly Fetch Interactive Examples */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>One-Click Samples (Gemini-generated)</span>
        </label>
        <div className="flex flex-col gap-1.5">
          {Object.entries(CATEGORY_SAMPLE_LABELS).map(([cat, label]) => {
            const isLoading = suggestLoadingCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                id={`btn-sample-${cat}`}
                onClick={() => handleFetchSuggestion(cat)}
                disabled={suggestLoadingCategory !== null}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 hover:border-slate-300/80 rounded-lg text-left text-xs font-medium text-slate-600 transition-all cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{label}</span>
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
