import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        error: "GEMINI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
      });
    }

    const { text, style, voiceName } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Myanmar text cannot be empty." });
    }

    const ai = new GoogleGenAI({ apiKey });

    let promptText = text;
    if (style === "excited") {
      promptText = `Say enthusiastically and with high energy: ${text}`;
    } else if (style === "whispers") {
      promptText = `Say in a quiet, intimate whisper: ${text}`;
    } else if (style === "news anchor style") {
      promptText = `Say in a formal, authoritative, and professional news anchor style: ${text}`;
    } else if (style === "calm") {
      promptText = `Say softly, calmly, and gently: ${text}`;
    } else if (style === "cheerful") {
      promptText = `Say in a highly cheerful, positive, and bright voice: ${text}`;
    } else if (style === "sad") {
      promptText = `Say with a somber, deeply sad, and emotional tone: ${text}`;
    } else {
      promptText = `Say naturally and clearly: ${text}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({
        error: "The Gemini TTS API did not return audio data.",
        details: response.text || "No reply text content found.",
      });
    }

    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const wavBuffer = addWavHeader(pcmBuffer, 24000);
    const wavBase64 = wavBuffer.toString("base64");

    return res.json({ audioData: `data:audio/wav;base64,${wavBase64}` });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during TTS generation.",
    });
  }
}
