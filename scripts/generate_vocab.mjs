import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Read API key from env or use provided
const liveKey = process.env.VITE_GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY;
if (!liveKey) {
  console.error("Please set GEMINI_API_KEY environment variable");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: liveKey });
const outputFile = path.join(process.cwd(), 'src', 'data', 'vocabulary.json');

const languages = ["French", "Spanish"];
const levels = ["beginner", "intermediate", "hard"];
const SETS_PER_LEVEL = 7; // 7 sets of 7 questions per difficulty (approx 20 per language total)

const generateSet = async (lang, level) => {
  console.log(`Generating set for ${lang} - ${level}...`);
  const prompt = `You are generating a ${lang} listening comprehension quiz focused on vocabulary recognition.

TASK:
Create exactly 7 questions for a listening-based exercise.

MODES:
The mode will be provided as input: ${level}

DIFFICULTY RULES:
BEGINNER: 100% multiple choice. Use simple, common vocabulary (A1 level). Answer choices should be distinct.
INTERMEDIATE: 5 questions multiple choice, 2 questions typed. Use A2–B1 vocabulary. Include somewhat similar-sounding words.
HARD: 3 questions multiple choice, 4 questions typed. Use B1–B2 vocabulary. Use very similar-sounding words to increase difficulty.

QUESTION FORMAT:
For MULTIPLE CHOICE:
- "type": "mcq"
- "audio_text": (the correct ${lang} word/phrase/sentence)
- "options": array of 4 choices (ONLY ONE correct)
- "answer": MUST be the index of the correct option (0, 1, 2, or 3) as a string.

For WRITTEN RESPONSE:
- "type": "typed"
- "audio_text": (the correct ${lang} word/phrase/sentence)
- "answer": correct spelling (accept only exact or near-exact matches)

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "questions": [
    {
      "progress": "Question 1/7",
      "type": "mcq",
      "audio_text": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    let text = response.text || '';
    const data = JSON.parse(text);
    return data;
  } catch (e) {
    console.error(`Failed to generate ${lang} ${level}:`, e.message);
    return null;
  }
};

const main = async () => {
  let existingData = {
    French: { beginner: [], intermediate: [], hard: [] },
    Spanish: { beginner: [], intermediate: [], hard: [] }
  };
  
  if (fs.existsSync(outputFile)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    } catch(e) {}
  }

  for (const lang of languages) {
    for (const level of levels) {
      if (!existingData[lang]) existingData[lang] = { beginner: [], intermediate: [], hard: [] };
      if (!existingData[lang][level]) existingData[lang][level] = [];
      
      const currentCount = existingData[lang][level].length;
      if (currentCount >= SETS_PER_LEVEL) {
        console.log(`Skipping ${lang} ${level}, already has ${currentCount} sets.`);
        continue;
      }
      
      for (let i = currentCount; i < SETS_PER_LEVEL; i++) {
        const set = await generateSet(lang, level);
        if (set && set.questions && set.questions.length === 7) {
          existingData[lang][level].push(set);
          fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2));
          console.log(`Saved set ${i+1}/${SETS_PER_LEVEL} for ${lang} ${level}`);
        } else {
          console.log("Invalid set returned, retrying...");
          i--;
        }
        // Small delay to prevent rate limits
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  console.log("Done generating all vocabulary sets!");
};

main();
