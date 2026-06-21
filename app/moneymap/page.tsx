"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
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

function normalizeKeys(row: Row) {
  const newRow: Row = {};

  Object.keys(row).forEach((key) => {
    let cleanKey = key.trim();

    if (cleanKey.includes("Gesamtvergütung") || cleanKey.toLowerCase() === "gpv") {
      cleanKey = "gpv";
    }

    if (cleanKey === "CEO") {
      cleanKey = "ceo";
    }

    newRow[cleanKey] = row[key];
  });

  return newRow;
}

export default function MoneyMapPage() {
  const [dax, setDax] = useState<Row[]>([]);
  const [comp, setComp] = useState<Row[]>([]);
  const [company, setCompany] = useState("Adidas");
  const [year, setYear] = useState(2024);

  useEffect(() => {
    async function loadCSV() {
      const daxText = await fetch("/data/dax_2022_2023_2024.csv").then((r) =>
        r.text()
      );

      const compText = await fetch(
        "/data/compensation_2022_2023_2024.csv"
      ).then((r) => r.text());

      const daxParsed = Papa.parse<Row>(daxText, {
        header: true,
        skipEmptyLines: true,
      }).data;

      const compParsed = Papa.parse<Row>(compText, {
        header: true,
        skipEmptyLines: true,
      }).data;

      setDax(daxParsed.map((r) => normalizeKeys(r)));
      setComp(compParsed.map((r) => normalizeKeys(r)));
    }

    loadCSV();
  }, []);

  const final = useMemo(() => {
    if (!dax.length || !comp.length) return [];

    const compMap = new Map<string, Row>();

    comp.forEach((row) => {
      const key = `${row.cnameshort}-${row.year}`;
      const gpv = cleanNumber(row.gpv);
      const ceo = cleanNumber(row.ceo);

      if (!compMap.has(key)) {
        compMap.set(key, {
          cnameshort: row.cnameshort,
          year: Number(row.year),
          ceo_pay: 0,
          executive_pay: 0,
          board_pay: 0,
        });
      }

      const item = compMap.get(key)!;

      if (ceo === 1) {
        item.ceo_pay += gpv;
      } else {
        item.executive_pay += gpv;
      }

      item.board_pay += gpv;
    });

    const compSummary = Array.from(compMap.values());

    return dax
      .map((d) => {
        const match = compSummary.find(
          (c) =>
            String(c.cnameshort).toLowerCase() ===
              String(d.cnameshort).toLowerCase() &&
            Number(c.year) === Number(d.year)
        );

        if (!match) return null;

        const personnel = cleanNumber(d.cpersonnelexpenses);
        const employees = cleanNumber(d.cnremployees);

        if (!personnel) return null;

        const employeePay = personnel - match.ceo_pay - match.executive_pay;

        return {
          cnameshort: d.cnameshort,
          year: Number(d.year),
          cpersonnelexpenses: personnel,
          cnremployees: employees,
          ceo_pay: match.ceo_pay,
          executive_pay: match.executive_pay,
          board_pay: match.board_pay,
          employee_pay: employeePay,
          CEO_percent: (match.ceo_pay / personnel) * 100,
          Executive_percent: (match.executive_pay / personnel) * 100,
          Executive_total_percent:
            ((match.ceo_pay + match.executive_pay) / personnel) * 100,
          Employee_percent: (employeePay / personnel) * 100,
          real_employee_pay: employees ? employeePay / employees : 0,
        };
      })
      .filter(Boolean) as Row[];
  }, [dax, comp]);

  const companies = useMemo(() => {
    return [...new Set(final.map((r) => r.cnameshort))].sort();
  }, [final]);

  const years = useMemo(() => {
    return [...new Set(final.map((r) => r.year))].sort();
  }, [final]);

  const selected = final.find(
    (r) =>
      String(r.cnameshort).toLowerCase() === company.toLowerCase() &&
      Number(r.year) === Number(year)
  );

  const executiveBarData = selected
    ? [
        {
          name: "CEO",
          value: Number(selected.CEO_percent.toFixed(4)),
        },
        {
          name: "Other Executives",
          value: Number(selected.Executive_percent.toFixed(4)),
        },
        {
          name: "CEO + Executives",
          value: Number(selected.Executive_total_percent.toFixed(4)),
        },
      ]
    : [];

  const executiveTrendData = final
    .filter((r) => String(r.cnameshort).toLowerCase() === company.toLowerCase())
    .sort((a, b) => a.year - b.year)
    .map((r) => ({
      year: r.year,
      CEO: Number(r.CEO_percent.toFixed(4)),
      Executives: Number(r.Executive_percent.toFixed(4)),
      "CEO + Executives": Number(r.Executive_total_percent.toFixed(4)),
    }));

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-bold text-yellow-400">
          ← Back to Home
        </a>

        <p className="mt-8 font-bold text-yellow-400">Executive Compass</p>

        <h1 className="mt-4 text-5xl font-black">Money Map</h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          See how much a company invests in its CEO, executives, and employees —
          and how that structure changes over time.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <select
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-white"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-white"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </section>

        {!selected ? (
          <p className="mt-10 text-red-400">
            데이터를 불러오는 중이거나 선택한 데이터가 없습니다.
          </p>
        ) : (
          <>
            <section className="mt-8 grid gap-5 md:grid-cols-4">
              <Card
                title="CEO out of €100"
                value={`€${selected.CEO_percent.toFixed(4)}`}
              />
              <Card
                title="Executives out of €100"
                value={`€${selected.Executive_percent.toFixed(4)}`}
              />
              <Card
                title="CEO + Executives"
                value={`€${selected.Executive_total_percent.toFixed(4)}`}
              />
              <Card
                title="Avg Employee Pay"
                value={`€${selected.real_employee_pay.toFixed(2)}k`}
              />
            </section>

            <section className="mt-8 rounded-3xl border border-yellow-400/30 bg-zinc-900 p-8">
              <p className="text-sm font-bold text-yellow-400">
                Employee Share
              </p>
              <h2 className="mt-2 text-6xl font-black">
                €{selected.Employee_percent.toFixed(2)}
              </h2>
              <p className="mt-4 text-zinc-400">
                Out of every €100 in personnel expenses, employees receive
                approximately €{selected.Employee_percent.toFixed(2)}.
              </p>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-zinc-900 p-6">
                <h2 className="mb-2 text-2xl font-bold">
                  Executive Share Zoom
                </h2>
                <p className="mb-6 text-sm text-zinc-400">
                  Employees are excluded from this chart so CEO and executive
                  differences are visible.
                </p>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={executiveBarData}>
                      <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#ffffff" />
                      <YAxis stroke="#ffffff" />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Share"]}
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #facc15",
                          color: "white",
                        }}
                      />
                      <Bar dataKey="value" fill="#facc15" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl bg-zinc-900 p-6">
                <h2 className="mb-2 text-2xl font-bold">
                  Executive Compensation Trend
                </h2>
                <p className="mb-6 text-sm text-zinc-400">
                  Year-by-year change in CEO and executive compensation share.
                </p>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={executiveTrendData}>
                      <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                      <XAxis dataKey="year" stroke="#ffffff" />
                      <YAxis stroke="#ffffff" />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Share"]}
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #facc15",
                          color: "white",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="CEO"
                        stroke="#facc15"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Executives"
                        stroke="#eab308"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="CEO + Executives"
                        stroke="#fde047"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl bg-zinc-900 p-8">
              <h2 className="text-2xl font-bold">Money Map Summary</h2>
              <p className="mt-4 text-zinc-300">
                In {selected.cnameshort} {selected.year}, out of every €100 in
                personnel expenses, the CEO receives €
                {selected.CEO_percent.toFixed(4)}, other executives receive €
                {selected.Executive_percent.toFixed(4)}, and employees receive €
                {selected.Employee_percent.toFixed(2)}.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-zinc-900 p-6">
      <p className="text-zinc-400">{title}</p>
      <p className="mt-3 text-3xl font-black text-yellow-400">{value}</p>
    </div>
  );
}