import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const INPUT_PATH = path.join(process.cwd(), "public", "data", "ESG_data_final.xlsx");
const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "esg_scores.json");

function cleanNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  return Number(
    String(value)
      .replace(",", ".")
      .replace("%", "")
      .trim()
  );
}

function main() {
  const workbook = XLSX.readFile(INPUT_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const results = rows.map((row) => {
    const company = row.cnameshort;
    const year = Number(row.Year);

    const E = cleanNumber(row.dummy_environmental);
    const S = cleanNumber(row.dummy_social);
    const G = cleanNumber(row.dummy_governance);

    const STI = cleanNumber(row["Calculation of ESG share of STI (%)"]);
    const LTI = cleanNumber(row["Calculation of ESG share of LTI (%)"]);

    const breadthScore = E + S + G;
    const intensityScore = STI / 100 + LTI / 100;
    const rawScore = breadthScore + intensityScore;

    const esgCommitmentScore = Math.round((rawScore / 5) * 100);

    return {
      company,
      year,
      E,
      S,
      G,
      STI_ESG_share: STI,
      LTI_ESG_share: LTI,
      breadthScore,
      intensityScore,
      rawScore,
      esgCommitmentScore,
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.log(`Saved ${results.length} ESG scores to ${OUTPUT_PATH}`);
}

main();