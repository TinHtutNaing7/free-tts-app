export type AudioStyle = 'normal' | 'excited' | 'whispers' | 'news anchor style' | 'calm' | 'cheerful' | 'sad';

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface VoiceOption {
  value: VoiceName;
  label: string;
  gender: 'female' | 'male';
  description: string;
}

export interface StyleOption {
  value: AudioStyle;
  label: string;
  emoji: string;
  description: string;
}

export interface TTSHistoryItem {
  id: string;
  text: string;
  style: AudioStyle;
  voiceName: VoiceName;
  audioData: string; // Base64 WAV string or Data URL
  timestamp: string;
}
