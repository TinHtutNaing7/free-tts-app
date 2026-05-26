"use client";

import { useState, useRef } from "react";
import AudioPlayer from "@/components/AudioPlayer";

// ── Constants ────────────────────────────────────────────────────────────────

const STYLES = [
  { value: "normal",      label: "Normal",       desc: "Clear, natural delivery" },
  { value: "excited",     label: "Excited",      desc: "High energy, enthusiastic" },
  { value: "whispers",    label: "Whisper",      desc: "Quiet, intimate tone" },
  { value: "news-anchor", label: "News Anchor",  desc: "Formal, authoritative" },
  { value: "calm",        label: "Calm",         desc: "Soft, peaceful, gentle" },
  { value: "cheerful",    label: "Cheerful",     desc: "Warm, bright, positive" },
  { value: "sad",         label: "Somber",       desc: "Melancholic, emotional" },
] as const;

const VOICES = [
  { value: "Kore",   label: "Kore",   note: "Female · Warm" },
  { value: "Aoede",  label: "Aoede",  note: "Female · Bright" },
  { value: "Leda",   label: "Leda",   note: "Female · Smooth" },
  { value: "Charon", label: "Charon", note: "Male · Deep" },
  { value: "Fenrir", label: "Fenrir", note: "Male · Grounded" },
  { value: "Orus",   label: "Orus",   note: "Male · Rich" },
  { value: "Puck",   label: "Puck",   note: "Male · Expressive" },
] as const;

const SAMPLE_TEXTS = [
  "မင်္ဂလာပါ၊ ဒီနေ့ ရာသီဥတုကောင်းနေပါတယ်။",
  "မြန်မာနိုင်ငံသည် အရှေ့တောင်အာရှတွင် တည်ရှိသောနိုင်ငံတစ်ခုဖြစ်သည်။",
  "သင်တို့ကို ကြိုဆိုပါသည်။ ဤနေရာသည် မြန်မာဘာသာ လေ့လာရန် ကောင်းသောနေရာဖြစ်သည်။",
];

// ── Spinner SVG ───────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg
    className="animate-spin-slow"
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ── Decorative Myanmar motif (SVG) ────────────────────────────────────────────
const MyanmarMotif = () => (
  <svg
    width="120" height="120"
    viewBox="0 0 120 120"
    fill="none"
    className="opacity-[0.07] absolute -top-6 -right-6 pointer-events-none select-none"
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="58" stroke="#d4960f" strokeWidth="1" />
    <circle cx="60" cy="60" r="44" stroke="#d4960f" strokeWidth="0.5" />
    <circle cx="60" cy="60" r="28" stroke="#d4960f" strokeWidth="1" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line
        key={deg}
        x1="60" y1="60"
        x2={60 + 58 * Math.cos((deg * Math.PI) / 180)}
        y2={60 + 58 * Math.sin((deg * Math.PI) / 180)}
        stroke="#d4960f"
        strokeWidth="0.5"
      />
    ))}
  </svg>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [text,     setText]     = useState("");
  const [style,    setStyle]    = useState("normal");
  const [voice,    setVoice]    = useState("Kore");
  const [loading,  setLoading]  = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const audioUrlRef = useRef<string | null>(null);

  const MAX_CHARS = 4000;

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    if (v.length <= MAX_CHARS) {
      setText(v);
      setCharCount(v.length);
    }
  }

  function useSample() {
    const sample = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setText(sample);
    setCharCount(sample.length);
  }

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    // Revoke previous blob URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioSrc(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, style, voice }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error." }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioSrc(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = text.trim().length > 0 && !loading;

  return (
    <main
      className="relative z-10 min-h-screen flex flex-col items-center px-4 py-16"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <header className="text-center mb-12 animate-fade-up">
        {/* Overline */}
        <p
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{ color: "var(--gold)", fontFamily: "var(--font-body)" }}
        >
          Powered by Google Gemini TTS
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            color: "var(--parchment)",
          }}
        >
          Myanmar{" "}
          <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Voice</em>
        </h1>

        {/* Subtitle in Myanmar script */}
        <p
          className="mt-3 text-lg"
          style={{
            fontFamily: "Noto Sans Myanmar, serif",
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          မြန်မာစာကို သဘာဝကျသော အသံဖြင့် ပြောင်းလဲပေးသည်
        </p>

        {/* Gold rule */}
        <div className="gold-rule w-24 mx-auto mt-6" />
      </header>

      {/* ── Card ──────────────────────────────────────────── */}
      <div
        className="w-full max-w-2xl rounded-xl relative overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <MyanmarMotif />

        {/* Card inner */}
        <div className="relative z-10 p-6 sm:p-8 space-y-6">

          {/* ── Textarea ──────────────────────────────────── */}
          <section className="animate-fade-up stagger-1">
            <div className="flex items-baseline justify-between mb-2">
              <label
                htmlFor="myanmar-text"
                className="text-xs uppercase tracking-widest"
                style={{ color: "var(--gold)" }}
              >
                Myanmar Text
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={useSample}
                  className="text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.color = "var(--gold)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                  type="button"
                >
                  ↗ sample text
                </button>
                <span
                  className="text-xs tabular-nums"
                  style={{
                    color:
                      charCount > MAX_CHARS * 0.9
                        ? "#ef4444"
                        : "var(--text-faint)",
                  }}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            <textarea
              id="myanmar-text"
              className="myanmar-input"
              placeholder="မြန်မာဘာသာ စာသားရိုက်ထည့်ပါ…"
              value={text}
              onChange={handleTextChange}
              rows={6}
              spellCheck={false}
              aria-label="Myanmar text input"
            />
          </section>

          {/* ── Style + Voice dropdowns ────────────────────── */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up stagger-2"
          >
            {/* Audio Style */}
            <div>
              <label
                htmlFor="audio-style"
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: "var(--gold)" }}
              >
                Audio Style
              </label>
              <div className="relative">
                <select
                  id="audio-style"
                  className="lacquer-select w-full"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} — {s.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Voice */}
            <div>
              <label
                htmlFor="voice-select"
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: "var(--gold)" }}
              >
                Voice
              </label>
              <select
                id="voice-select"
                className="lacquer-select w-full"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                {VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label} · {v.note}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ── Divider ───────────────────────────────────── */}
          <div className="gold-rule animate-fade-up stagger-3" />

          {/* ── Generate Button ────────────────────────────── */}
          <section className="animate-fade-up stagger-4">
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="btn-generate"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Synthesising Voice…</span>
                </>
              ) : (
                <>
                  {/* Sound wave icon */}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                  <span>Generate Voiceover</span>
                </>
              )}
            </button>
          </section>

          {/* ── Error ─────────────────────────────────────── */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm animate-fade-in"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
                fontFamily: "var(--font-body)",
              }}
              role="alert"
            >
              <strong style={{ display: "block", marginBottom: "0.2rem" }}>Error</strong>
              {error}
            </div>
          )}

          {/* ── Audio Player ───────────────────────────────── */}
          {audioSrc && <AudioPlayer src={audioSrc} />}
        </div>
      </div>

      {/* ── Style guide pills ─────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-2 justify-center animate-fade-up stagger-5">
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStyle(s.value)}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{
              border: `1px solid ${style === s.value ? "var(--border-accent)" : "var(--border-dim)"}`,
              background:
                style === s.value
                  ? "rgba(212,150,15,0.12)"
                  : "transparent",
              color:
                style === s.value ? "var(--gold)" : "var(--text-faint)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.04em",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        className="mt-16 text-center text-xs"
        style={{ color: "var(--text-faint)", fontFamily: "var(--font-body)" }}
      >
        <p>Myanmar Voice · Gemini 2.5 Flash TTS · Deployed on Vercel</p>
        <p className="mt-1" style={{ fontFamily: "Noto Sans Myanmar, serif", fontSize: "0.75rem" }}>
          မြန်မာဘာသာ အသံပြောင်းလဲမှုဝန်ဆောင်မှု
        </p>
      </footer>
    </main>
  );
}
