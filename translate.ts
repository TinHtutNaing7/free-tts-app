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

    const { englishText } = req.body;
    if (!englishText || englishText.trim() === "") {
      return res.status(400).json({ error: "English text cannot be empty." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert Myanmar translator. Translate the following English sentence into elegant, natural, grammatically correct Myanmar (Burmese) writing. Output ONLY the Burmese translation, and do not add any English commentary, phonetic explanations, or notes.\nText: "${englishText}"`,
    });

    const myanmarText = response.text?.trim() || "";
    return res.json({ myanmarText });
  } catch (error: any) {
    console.error("Translate error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during translation.",
    });
  }
}
