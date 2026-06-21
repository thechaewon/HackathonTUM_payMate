import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REPORTS_DIR = path.join(process.cwd(), "public", "reports");
const DATA_DIR = path.join(process.cwd(), "public", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "transparency_results.json");

const SCORE_MAP = {
  languageLevel: {
    High: 100,
    Medium: 70,
    Easy: 40,
  },
  infoDistance: {
    "Same page": 100,
    "Within 5 pages": 70,
    "More than 5 pages": 40,
  },
  dataVisualization: {
    "5+ charts": 100,
    "Below 5 charts": 70,
    "No chart": 40,
  },
} as const;

type AnalysisResult = {
  company: string;
  year: number;
  fileName: string;
  languageLevel: "High" | "Medium" | "Easy";
  infoDistance: "Same page" | "Within 5 pages" | "More than 5 pages";
  dataVisualization: "5+ charts" | "Below 5 charts" | "No chart";
  languageScore: number;
  infoDistanceScore: number;
  dataVisualizationScore: number;
  transparencyScore: number;
  reason: string;
  evidence: string[];
  updatedAt: string;
};

function parseFileName(fileName: string) {
  const nameWithoutExt = fileName.replace(/\.pdf$/i, "");
  const parts = nameWithoutExt.split("_");

  const yearText = parts[parts.length - 1];
  const year = Number(yearText);
  const company = parts.slice(0, -1).join(" ");

  if (!company || !year) {
    throw new Error(
      `Invalid file name: ${fileName}. Use format like Adidas_2024.pdf`
    );
  }

  return { company, year };
}

function safeJsonParse(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function analyzePdf(fileName: string): Promise<AnalysisResult> {
  const { company, year } = parseFileName(fileName);

  const pdfPath = path.join(REPORTS_DIR, fileName);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64 = pdfBuffer.toString("base64");

  console.log(`Analyzing ${company} ${year}...`);

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename: fileName,
            file_data: `data:application/pdf;base64,${base64}`,
          },
          {
            type: "input_text",
            text: `
Analyze this annual report or compensation report.

Measure executive compensation transparency using ONLY these three indexes.

1. Language level
Choose exactly one:
- High
- Medium
- Easy

Meaning:
- High: compensation explanation is complex, technical, and hard to understand.
- Medium: moderately understandable but still uses some technical language.
- Easy: clear, simple, and easy for non-experts to understand.

2. Info distance
Choose exactly one:
- Same page
- Within 5 pages
- More than 5 pages

Meaning:
- Same page: key CEO pay, incentives, and explanation are located together.
- Within 5 pages: information is close but spread across several pages.
- More than 5 pages: users must search widely across the report.

3. Data visualization
Choose exactly one:
- 5+ charts
- Below 5 charts
- No chart

Meaning:
- Count finance-related charts, tables, or visualizations explaining executive compensation, incentives, pay mix, bonus metrics, or financial performance.

Return ONLY valid JSON:
{
  "company": "${company}",
  "year": ${year},
  "languageLevel": "High",
  "infoDistance": "Same page",
  "dataVisualization": "5+ charts",
  "reason": "short explanation",
  "evidence": ["short evidence 1", "short evidence 2", "short evidence 3"]
}
            `,
          },
        ],
      },
    ],
  });

  const raw = safeJsonParse(response.output_text);

  const languageScore = SCORE_MAP.languageLevel[raw.languageLevel as keyof typeof SCORE_MAP.languageLevel];
  const infoDistanceScore = SCORE_MAP.infoDistance[raw.infoDistance as keyof typeof SCORE_MAP.infoDistance];
  const dataVisualizationScore = SCORE_MAP.dataVisualization[raw.dataVisualization as keyof typeof SCORE_MAP.dataVisualization];

  const transparencyScore = Math.round(
    (languageScore + infoDistanceScore + dataVisualizationScore) / 3
  );

  return {
    company,
    year,
    fileName,
    languageLevel: raw.languageLevel,
    infoDistance: raw.infoDistance,
    dataVisualization: raw.dataVisualization,
    languageScore,
    infoDistanceScore,
    dataVisualizationScore,
    transparencyScore,
    reason: raw.reason,
    evidence: raw.evidence ?? [],
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in .env.local");
  }

  if (!fs.existsSync(REPORTS_DIR)) {
    throw new Error("public/reports folder does not exist");
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const pdfFiles = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".pdf"));

  const results: AnalysisResult[] = [];

  for (const fileName of pdfFiles) {
    try {
      const result = await analyzePdf(fileName);
      results.push(result);
    } catch (error) {
      console.error(`Failed: ${fileName}`);
      console.error(error);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.log(`Done. Saved ${results.length} results to:`);
  console.log(OUTPUT_PATH);
}

main();