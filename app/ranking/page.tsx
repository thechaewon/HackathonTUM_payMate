"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

type Row = Record<string, any>;

type Metric =
  | "baseSalary"
  | "shortBonus"
  | "longComp"
  | "pension"
  | "totalComp";

type CompanyData = {
  company: string;
  year: number;
  baseSalary: number;
  shortBonus: number;
  longComp: number;
  pension: number;
  totalComp: number;
  count: number;
  baseSalaryAvg: number;
  shortBonusAvg: number;
  longCompAvg: number;
  pensionAvg: number;
  totalCompAvg: number;
};

const metricLabels: Record<Metric, string> = {
  baseSalary: "Base Salary",
  shortBonus: "Short-Term Bonus",
  longComp: "Long-Term Compensation",
  pension: "Pension",
  totalComp: "Total Compensation",
};

const chartColors = [
  "#facc15",
  "#38bdf8",
  "#fb7185",
  "#34d399",
  "#a78bfa",
  "#f97316",
];

function cleanNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  return Number(
    String(value)
      .replaceAll(",", "")
      .replaceAll("€", "")
      .replaceAll("%", "")
      .trim()
  );
}

export default function RankingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [metric, setMetric] = useState<Metric>("baseSalary");

  useEffect(() => {
    async function loadExcel() {
      const response = await fetch("/data/compens_final.xlsx");
      const arrayBuffer = await response.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const data = XLSX.utils.sheet_to_json<Row>(worksheet);
      setRows(data);
    }

    loadExcel();
  }, []);

  const companyData = useMemo<CompanyData[]>(() => {
    const map = new Map<
      string,
      Omit<
        CompanyData,
        | "baseSalaryAvg"
        | "shortBonusAvg"
        | "longCompAvg"
        | "pensionAvg"
        | "totalCompAvg"
      >
    >();

    rows.forEach((row) => {
      const company = row.cnameshort;
      const year = Number(row.year ?? row.Year);

      if (!company || !year) return;

      const key = `${company}-${year}`;

      const baseSalary = cleanNumber(row.fix);
      const shortBonus = cleanNumber(row.sti);

      const longComp =
        cleanNumber(row.lti) +
        cleanNumber(row.ltishares) +
        cleanNumber(row.ltioption);

      const pension = cleanNumber(row.pension);

      // Total Compensation 직접 계산
      const totalComp =
        baseSalary + shortBonus + longComp + pension;

      if (!map.has(key)) {
        map.set(key, {
          company,
          year,
          baseSalary: 0,
          shortBonus: 0,
          longComp: 0,
          pension: 0,
          totalComp: 0,
          count: 0,
        });
      }

      const item = map.get(key)!;

      item.baseSalary += baseSalary;
      item.shortBonus += shortBonus;
      item.longComp += longComp;
      item.pension += pension;
      item.totalComp += totalComp;
      item.count += 1;
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      baseSalaryAvg: item.count ? item.baseSalary / item.count : 0,
      shortBonusAvg: item.count ? item.shortBonus / item.count : 0,
      longCompAvg: item.count ? item.longComp / item.count : 0,
      pensionAvg: item.count ? item.pension / item.count : 0,
      totalCompAvg: item.count ? item.totalComp / item.count : 0,
    }));
  }, [rows]);

  const years = [...new Set(companyData.map((d) => d.year))].sort(
    (a, b) => a - b
  );

  const latestYear = years[years.length - 1];

  const metricAvgKey = `${metric}Avg` as keyof CompanyData;

  const ranking = companyData
    .filter((d) => d.year === latestYear)
    .sort((a, b) => Number(b[metricAvgKey]) - Number(a[metricAvgKey]));

  const topCompanies = ranking.slice(0, 6).map((d) => d.company);

  const chartData = years.map((year) => {
    const item: Row = { year };

    topCompanies.forEach((company) => {
      const found = companyData.find(
        (d) => d.company === company && d.year === year
      );

      item[company] = found ? Number(found[metricAvgKey]) : 0;
    });

    return item;
  });

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-bold text-yellow-400">
          ← Back to Home
        </a>

        <h1 className="mt-8 text-5xl font-black">
          Which Company Pays Better?
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Compare companies by base salary, short-term bonus, long-term
          compensation, pension, and calculated total compensation.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {(Object.keys(metricLabels) as Metric[]).map((key) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`rounded-2xl px-5 py-3 font-bold ${
                metric === key
                  ? "bg-yellow-400 text-black"
                  : "border border-yellow-400 text-yellow-400"
              }`}
            >
              {metricLabels[key]}
            </button>
          ))}
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">
              {metricLabels[metric]} Ranking
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Ranking is based on average compensation per person in{" "}
              {latestYear ?? "loading..."}.
            </p>

            <table className="mt-6 w-full text-left">
              <thead className="text-zinc-400">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Average Value</th>
                </tr>
              </thead>

              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.company} className="border-t border-zinc-800">
                    <td className="p-3 font-bold text-yellow-400">
                      #{index + 1}
                    </td>
                    <td className="p-3 font-bold">{row.company}</td>
                    <td className="p-3 font-bold text-yellow-400">
                      €{Number(row[metricAvgKey]).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      k
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-3xl bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">
              3-Year {metricLabels[metric]} Trend
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Shows the top 6 companies based on the selected metric.
            </p>

            <div className="mt-6 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis dataKey="year" stroke="#ffffff" />
                  <YAxis stroke="#ffffff" />
                  <Tooltip
                    formatter={(value) => [`€${value}k`, ""]}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #facc15",
                      color: "white",
                    }}
                  />
                  <Legend />

                  {topCompanies.map((company, index) => (
                    <Line
                      key={company}
                      type="monotone"
                      dataKey={company}
                      stroke={chartColors[index]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}