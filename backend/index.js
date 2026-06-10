import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import pdf from "pdf-parse";

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

function extractJsonFromText(text) {
  const trimmed = text.trim();
  
  // Try direct parse
  try { return JSON.parse(trimmed); } catch {}
  
  // Try code fence
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }
  
  // Try first { to last }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {}
  }

  // Log and throw
  console.error("❌ Could not parse. Full raw response:\n", trimmed);
  throw new Error("Could not parse model response as JSON");
}

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const jobDescription = (req.body?.jobDescription || "").trim();
    if (!jobDescription) {
      return res.status(400).json({ error: "Job description is required" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Resume PDF is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
    }

    const pdfData = await pdf(req.file.buffer);
    const resumeText = (pdfData.text || "").trim();
    if (!resumeText) {
      return res.status(400).json({ 
        error: "Could not extract text from PDF" 
      });
    }

    console.log("📄 Resume extracted, length:", resumeText.length);

    // ✅ ENHANCED PROMPT - Much more detailed analysis
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and career coach. Analyze this resume against the job description and provide comprehensive feedback.

Resume:
${resumeText.slice(0, 30000)}

Job Description:
${jobDescription.slice(0, 30000)}

Return a JSON object with these fields:

{
  "matchPercentage": <number 0-100>,
  "atsScore": <number 0-100>,
  "overallFeedback": "<2-3 sentence summary>",
  
  "strengths": [
    "<what's strong in the resume>",
    "<another strength>"
  ],
  
  "weaknesses": [
    "<what's missing or weak>",
    "<another weakness>"
  ],
  
  "missingTechnicalSkills": [
    "<skill from JD not in resume>",
    "<another missing skill>"
  ],
  
  "missingSoftSkills": [
    "<soft skill from JD not in resume>"
  ],
  
  "presentSkills": [
    "<skill that matches JD>",
    "<another matching skill>"
  ],
  
  "experienceAnalysis": {
    "yearsRequired": "<X years or 'Not specified'>",
    "yearsInResume": "<Y years or 'Not clear'>",
    "relevance": "<Low/Medium/High>",
    "feedback": "<brief comment on experience match>"
  },
  
  "sectionFeedback": {
    "summary": "<feedback on resume summary/objective>",
    "experience": "<feedback on work experience section>",
    "education": "<feedback on education section>",
    "skills": "<feedback on skills section>",
    "projects": "<feedback on projects if any>"
  },
  
  "keywordMatching": {
    "matched": ["<keyword1>", "<keyword2>"],
    "missing": ["<missing keyword1>", "<missing keyword2>"]
  },
  
  "improvementSuggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>"
  ],
  
  "youtubeSearchTerms": [
    "<skill to learn>",
    "<another skill>"
  ],
  
  "careerAdvice": "<personalized career advice based on analysis>"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    console.log("🤖 Calling Gemini API...");
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
  temperature: 0.1,        // Lower = more predictable JSON
  maxOutputTokens: 8196,
  topP: 0.8,
  topK: 40,
  responseMimeType: "application/json"  // ← YEH ADD KARO
}
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API Error:", errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("❌ Invalid API response");
      throw new Error("Invalid response from Gemini API");
    }

    const raw = data.candidates[0].content.parts[0].text;
    console.log("✅ Response received, length:", raw.length);
    
    const parsed = extractJsonFromText(raw);

    console.log("✅ Analysis complete, match:", parsed.matchPercentage + "%");
    return res.json(parsed);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    const message = err.message || "Analysis failed";
    const status = err.message?.includes("Only PDF") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Skill-gap API listening on http://localhost:${PORT}`);
});