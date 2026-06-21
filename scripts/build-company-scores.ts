import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

type Row = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), "public", "data");

const INPUT_PATH = path.join(DATA_DIR, "compens_final.xlsx");
const ESG_SCORES_PATH = path.join(DATA_DIR, "esg_scores.json");
const TRANSPARENCY_PATH = path.join(DATA_DIR, "transparency_results.json");
const OUTPUT_PATH = path.join(DATA_DIR, "company_scores.json");

function cleanNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  const text = String(value).replace("€", "").replace("%", "").trim();

  if (text.includes(",") && !text.includes(".")) {
    const afterComma = text.split(",")[1];

    if (afterComma?.length === 3) {
      return Number(text.replaceAll(",", ""));
    }

    return Number(text.replace(",", "."));
  }

  return Number(text.replaceAll(",", ""));
}

function makeKey(company: string, year: number) {
  return `${String(company).trim().toLowerCase()}-${year}`;
}

function buildESGMap() {
  const map = new Map<string, Row>();

  if (!fs.existsSync(ESG_SCORES_PATH)) return map;

  const rows = JSON.parse(fs.readFileSync(ESG_SCORES_PATH, "utf-8"));

  rows.forEach((row: Row) => {
    const company = String(row.company ?? row.cnameshort).trim();
    const year = Number(row.year);

    map.set(makeKey(company, year), {
      esgCommitmentScore: Number(row.esgCommitmentScore ?? 50),
      esgBreadthScore: Number(row.breadthScore ?? 0),
      esgIntensityScore: Number(row.intensityScore ?? 0),
      E: row.E,
      S: row.S,
      G: row.G,
      STI_ESG_share: row.STI_ESG_share,
      LTI_ESG_share: row.LTI_ESG_share,
    });
  });

  return map;
}

function buildTransparencyMap() {
  const map = new Map<string, Row>();

  if (!fs.existsSync(TRANSPARENCY_PATH)) return map;

  const rows = JSON.parse(fs.readFileSync(TRANSPARENCY_PATH, "utf-8"));

  rows.forEach((row: Row) => {
    const company = String(row.company ?? row.cnameshort).trim();
    const year = Number(row.year);

    map.set(makeKey(company, year), {
      transparencyScore: Number(row.transparencyScore ?? 50),
    });
  });

  return map;
}

function readCompRows() {
  const workbook = XLSX.readFile(INPUT_PATH);
  const sheetName = workbook.SheetNames[0];

  return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName]);
}

function buildCompMap(compRows: Row[]) {
  const map = new Map<string, Row>();

  compRows.forEach((row) => {
    const company = String(row.cnameshort ?? "").trim();
    const year = Number(row.year ?? row.Year);

    if (!company || !year) return;

    const key = makeKey(company, year);

    const totalPay = cleanNumber(
      row["Gesamtvergütung pro Vorstand"] ??
        row.gpv ??
        row.GPV ??
        row["Gesamtvergütung"]
    );

    const sti = cleanNumber(row.sti);
    const lti = cleanNumber(row.lti);

    const internExtern = String(row["Intern/Extern"] ?? "")
      .trim()
      .toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        company,
        year,

        totalExecutivePay: 0,
        executiveCount: 0,

        stiTotal: 0,
        ltiTotal: 0,

        internalCount: 0,
        externalCount: 0,
      });
    }

    const item = map.get(key)!;

    item.totalExecutivePay += totalPay;
    item.executiveCount += 1;

    item.stiTotal += sti;
    item.ltiTotal += lti;

    if (internExtern === "intern") item.internalCount += 1;
    if (internExtern === "extern") item.externalCount += 1;
  });

  return map;
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Missing file: ${INPUT_PATH}`);
  }

  const compRows = readCompRows();

  const compMap = buildCompMap(compRows);
  const esgMap = buildESGMap();
  const transparencyMap = buildTransparencyMap();

  const rawResults = Array.from(compMap.values()).map((comp) => {
    const key = makeKey(comp.company, comp.year);

    const avgExecutivePay =
      comp.executiveCount > 0
        ? comp.totalExecutivePay / comp.executiveCount
        : 0;

    const longTermOrientationScore =
      comp.stiTotal + comp.ltiTotal > 0
        ? Math.round((comp.ltiTotal / (comp.stiTotal + comp.ltiTotal)) * 100)
        : 0;

    const classified = comp.internalCount + comp.externalCount;

    const leadershipDevelopmentScore =
      classified > 0
        ? Math.round((comp.internalCount / classified) * 100)
        : 50;

    const esg = esgMap.get(key);
    const transparency = transparencyMap.get(key);

    return {
      company: comp.company,
      year: comp.year,

      avgExecutivePay,
      totalExecutivePay: comp.totalExecutivePay,

      esgCommitmentScore: esg?.esgCommitmentScore ?? 50,
      transparencyScore: transparency?.transparencyScore ?? 50,

      longTermOrientationScore,
      leadershipDevelopmentScore,

      internalCount: comp.internalCount,
      externalCount: comp.externalCount,
      executiveCount: comp.executiveCount,
    };
  });

  const maxAvgPay = Math.max(...rawResults.map((r) => r.avgExecutivePay), 1);
  const maxTotalPay = Math.max(...rawResults.map((r) => r.totalExecutivePay), 1);

  const finalResults = rawResults.map((row) => ({
    company: row.company,
    year: row.year,

    executiveRewardScore: Math.round((row.avgExecutivePay / maxAvgPay) * 100),
    executiveTotalCompensationScore: Math.round(
      (row.totalExecutivePay / maxTotalPay) * 100
    ),

    esgCommitmentScore: row.esgCommitmentScore,
    transparencyScore: row.transparencyScore,

    longTermOrientationScore: row.longTermOrientationScore,
    leadershipDevelopmentScore: row.leadershipDevelopmentScore,

    employeeFocusScore: 50,

    details: {
      avgExecutivePay: Math.round(row.avgExecutivePay),
      totalExecutivePay: Math.round(row.totalExecutivePay),
      executiveCount: row.executiveCount,
      internalCount: row.internalCount,
      externalCount: row.externalCount,
    },
  }));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalResults, null, 2));

  console.log(`Saved ${finalResults.length} company scores`);
  console.log(OUTPUT_PATH);
}

main();