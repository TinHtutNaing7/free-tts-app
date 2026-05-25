import { StyleOption, VoiceOption } from "./types";

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    value: "Kore",
    label: "Kore",
    gender: "female",
    description: "Clear, warm, and natural female voice. Excellent for general narration."
  },
  {
    value: "Zephyr",
    label: "Zephyr",
    gender: "male",
    description: "Deep, smooth, and steady male voice. Great for news, books, and reports."
  },
  {
    value: "Puck",
    label: "Puck",
    gender: "male",
    description: "Energetic, clear, and bright male voice. Recommended for excited styles."
  },
  {
    value: "Charon",
    label: "Charon",
    gender: "male",
    description: "Calm, gentle, and slow-paced male voice. Excellent for soft or whispered tones."
  },
  {
    value: "Fenrir",
    label: "Fenrir",
    gender: "female",
    description: "Professional, crisp, and high-frequency female voice. Spot-on for announcements."
  }
];

export const STYLE_OPTIONS: StyleOption[] = [
  {
    value: "normal",
    label: "Normal / Natural",
    emoji: "🗣️",
    description: "Standard natural narration cadence and accentuation."
  },
  {
    value: "excited",
    label: "Excited / Energetic",
    emoji: "🔥",
    description: "High energy, faster-paced, and enthusiastic delivery."
  },
  {
    value: "whispers",
    label: "Whispers / Intimate",
    emoji: "🤫",
    description: "Quiet, soft, low-volume, and deeply close vocal styling."
  },
  {
    value: "news anchor style",
    label: "News Anchor",
    emoji: "🎙️",
    description: "Formal, public broadcasting delivery with authoritative pronunciation."
  },
  {
    value: "calm",
    label: "Calm / Slow",
    emoji: "🧘",
    description: "Serene, patient, and relaxing sound, ideal for meditation guides."
  },
  {
    value: "cheerful",
    label: "Cheerful / Friendly",
    emoji: "😊",
    description: "Happy, smiling, and warm tone suitable for greetings and commercials."
  },
  {
    value: "sad",
    label: "Somber / Sad",
    emoji: "😢",
    description: "Downturned, emotional, and serious cadence full of feeling."
  }
];

export const CATEGORY_SAMPLE_LABELS = {
  welcome: "👋 Friendly Greeting",
  news: "🎙️ News Announcement",
  story: "📖 Story / Narrative",
  casual: "💬 Everyday Phrase"
};
