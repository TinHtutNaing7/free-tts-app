"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// SVG icons (inline to avoid any icon-lib dependency)
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef    = useRef<HTMLAudioElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);   // 0–100
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);

  // Reset when src changes (new audio generated)
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrent(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [playing]);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrent(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setCurrent(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !audio.duration) return;
    const rect  = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }, []);

  return (
    <div className="audio-panel animate-fade-in" style={{ animationDelay: "0.1s" }}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Animated wave bars — visible while playing */}
          <div className={`wave-bars flex items-end gap-[3px] h-5 ${playing ? "" : "opacity-0"}`} aria-hidden="true">
            <span style={{ animationDelay: "0s"    }} />
            <span style={{ animationDelay: "0.15s" }} />
            <span style={{ animationDelay: "0.3s"  }} />
            <span style={{ animationDelay: "0.45s" }} />
            <span style={{ animationDelay: "0.6s"  }} />
          </div>
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--gold)", fontFamily: "var(--font-body)" }}
          >
            Generated Audio
          </span>
        </div>

        {/* Download */}
        <a
          href={src}
          download="myanmar-voice.wav"
          className="download-btn"
        >
          <DownloadIcon />
          <span style={{ letterSpacing: "0.06em", fontSize: "0.75rem" }}>WAV</span>
        </a>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="play-btn"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Seek + time */}
        <div className="flex-1 flex flex-col gap-2">
          <div
            ref={trackRef}
            className="progress-track"
            onClick={seek}
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div
            className="flex justify-between text-xs tabular-nums"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Hidden <audio> element */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
    </div>
  );
}
