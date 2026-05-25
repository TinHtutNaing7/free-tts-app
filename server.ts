import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse json requests
  app.use(express.json({ limit: '15mb' }));

  // Helper function to create WAV header for uncompressed 16-bit linear PCM audio
  function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const header = Buffer.alloc(44);
    const dataSize = pcmBuffer.length;
    
    // ChunkID
    header.write('RIFF', 0);
    // ChunkSize (36 + dataSize)
    header.writeUInt32LE(36 + dataSize, 4);
    // Format
    header.write('WAVE', 8);
    // Subchunk1ID
    header.write('fmt ', 12);
    // Subchunk1Size (16 for PCM)
    header.writeUInt32LE(16, 16);
    // AudioFormat (1 for PCM)
    header.writeUInt16LE(1, 20);
    // NumChannels (1 for Mono)
    header.writeUInt16LE(1, 22);
    // SampleRate
    header.writeUInt32LE(sampleRate, 24);
    // ByteRate (SampleRate * BlockAlign)
    header.writeUInt32LE(sampleRate * 2, 28);
    // BlockAlign (Channels * BitsPerSample / 8)
    header.writeUInt16LE(2, 32);
    // BitsPerSample (16 bit)
    header.writeUInt16LE(16, 34);
    // Subchunk2ID
    header.write('data', 36);
    // Subchunk2Size (dataSize)
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  // API to handle TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ 
          error: "Gemini API key is not configured in Settings > Secrets." 
        });
      }

      const { text, style, voiceName } = req.body;
      if (!text || text.trim() === "") {
        return res.status(400).json({ error: "Myanmar text cannot be empty." });
      }

      // Initialize Google Gen AI lazily
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct styling cue
      let promptText = text;
      if (style === 'excited') {
        promptText = `Say enthusiastically and with high energy: ${text}`;
      } else if (style === 'whispers') {
        promptText = `Say in a quiet, intimate whisper: ${text}`;
      } else if (style === 'news anchor style') {
        promptText = `Say in a formal, authoritative, and professional news anchor style: ${text}`;
      } else if (style === 'calm') {
        promptText = `Say softly, calmly, and gently: ${text}`;
      } else if (style === 'cheerful') {
        promptText = `Say in a highly cheerful, positive, and bright voice: ${text}`;
      } else if (style === 'sad') {
        promptText = `Say with a somber, deeply sad, and emotional tone: ${text}`;
      } else {
        // 'normal'
        promptText = `Say naturally and clearly: ${text}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
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

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ 
          error: "The Gemini TTS API did not return audio data for style cues or constraints.",
          details: response.text || "No reply text content found."
        });
      }

      const pcmBuffer = Buffer.from(base64Audio, "base64");
      const wavBuffer = addWavHeader(pcmBuffer, 24000);
      const wavBase64 = wavBuffer.toString("base64");

      return res.json({ 
        audioData: `data:audio/wav;base64,${wavBase64}` 
      });

    } catch (error: any) {
      console.error("TTS API error:", error);
      return res.status(500).json({ 
        error: error.message || "An unexpected error occurred during TTS generation." 
      });
    }
  });

  // Helper API to translate English sentences into beautiful written Myanmar
  app.post("/api/translate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ 
          error: "Gemini API key is not configured in Settings > Secrets." 
        });
      }

      const { englishText } = req.body;
      if (!englishText || englishText.trim() === "") {
        return res.status(400).json({ error: "English text remains empty." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an expert Myanmar translator. Translate the following English sentence into elegant, natural, grammatically correct Myanmar (Burmese) writing. Output ONLY the Burmese translation, and do not add any English commentary, phonetic explanations, or notes.
Text: "${englishText}"`,
      });

      const myanmarText = response.text?.trim() || "";
      return res.json({ myanmarText });
    } catch (error: any) {
      console.error("Translate error:", error);
      return res.status(500).json({ 
        error: error.message || "An unexpected error occurred during translation." 
      });
    }
  });

  // Suggest default burmese sentences based on chosen category to facilitate onboarding
  app.post("/api/suggest", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ 
          error: "Gemini API key is not configured in Settings > Secrets." 
        });
      }

      const { category } = req.body;
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let promptText = "";
      if (category === "news") {
        promptText = `Generate 1 single short paragraph in Myanmar language in a formal news bulletin announcer style. Output ONLY the raw Myanmar text, no description, translate tags, or headers. Max 15 words.`;
      } else if (category === "welcome") {
        promptText = `Generate 1 positive, friendly greeting and welcome sentence in Myanmar language. Output ONLY the Myanmar text. Max 12 words.`;
      } else if (category === "story") {
        promptText = `Generate 1 poetic or artistic storytelling sentence in Myanmar language. Output ONLY the Myanmar text. Max 15 words.`;
      } else {
        promptText = `Generate 1 casual, warm conversational sentence in Myanmar language. Output ONLY the Myanmar text. Max 10 words.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
      });

      const phrase = response.text?.trim() || "";
      return res.json({ phrase });
    } catch (error: any) {
      console.error("Suggest category error:", error);
      return res.status(500).json({ 
        error: error.message || "Could not generate sample phrase." 
      });
    }
  });

  // Serve static assets in production, hook Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
