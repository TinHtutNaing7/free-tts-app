import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

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

    const { category } = req.body;

    const ai = new GoogleGenAI({ apiKey });

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
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    const phrase = response.text?.trim() || "";
    return res.json({ phrase });
  } catch (error: any) {
    console.error("Suggest category error:", error);
    return res.status(500).json({
      error: error.message || "Could not generate sample phrase.",
    });
  }
}
