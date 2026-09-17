import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiVision = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export { genAI };
