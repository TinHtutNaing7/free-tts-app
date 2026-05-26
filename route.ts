import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ── WAV header builder (PCM → WAV) ────────────────────────────────────────
function buildWavHeader(
  pcmByteLength: number,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmByteLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);         // PCM subchunk size
  header.writeUInt16LE(1, 20);          // AudioFormat = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmByteLength, 40);
  return header;
}

// ── Style → prompt prefix mapping ─────────────────────────────────────────
const STYLE_PROMPTS: Record<string, string> = {
  normal:      "Say naturally and clearly",
  excited:     "Say enthusiastically and with high energy and excitement",
  whispers:    "Say in a quiet, intimate, gentle whisper",
  "news-anchor": "Say in a formal, authoritative, and professional news anchor style",
  calm:        "Say softly, calmly, and peacefully",
  cheerful:    "Say in a highly cheerful, warm, and positive voice",
  sad:         "Say with a somber, melancholic, and deeply emotional tone",
};

// ── Available voices ───────────────────────────────────────────────────────
// Gemini TTS prebuilt voices (as of 2025):
// Kore, Aoede, Charon, Fenrir, Puck, Leda, Orus, Zephyr, etc.
// We expose a curated subset.

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { text, style = "normal", voice = "Kore" } = body as {
      text?: string;
      style?: string;
      voice?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text cannot be empty." }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: "Text exceeds the 4,000-character limit." }, { status: 400 });
    }

    const stylePrefix = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.normal;
    const prompt = `${stylePrefix}: ${text.trim()}`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",   // Gemini 2.5 Flash TTS (latest production TTS model)
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      return NextResponse.json(
        { error: "Gemini returned no audio. The model may not have TTS access for your API key." },
        { status: 502 }
      );
    }

    const pcmBuffer  = Buffer.from(inlineData.data, "base64");
    const wavHeader  = buildWavHeader(pcmBuffer.length, 24000, 1, 16);
    const wavBuffer  = Buffer.concat([wavHeader, pcmBuffer]);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "audio/wav",
        "Content-Length":      String(wavBuffer.length),
        "Content-Disposition": 'inline; filename="myanmar-voice.wav"',
        "Cache-Control":       "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[/api/tts]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
