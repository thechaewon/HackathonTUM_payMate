"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

type CompanyScore = {
  company: string;
  year: number;
  esgCommitmentScore: number;
  transparencyScore: number;
  executiveRewardScore: number;
  executiveTotalCompensationScore: number;
  employeeFocusScore: number;
  longTermOrientationScore: number;
  leadershipDevelopmentScore: number;
  details?: any;
};

type Preference = {
  executiveReward: number;
  longTerm: number;
  esg: number;
  transparency: number;
  employeeFocus: number;
  leadershipDevelopment: number;
};

const defaultPreference: Preference = {
  executiveReward: 80,
  longTerm: 70,
  esg: 70,
  transparency: 70,
  employeeFocus: 60,
  leadershipDevelopment: 60,
};

function calculateMatch(company: CompanyScore, pref: Preference) {
  const totalWeight =
    pref.executiveReward +
    pref.longTerm +
    pref.esg +
    pref.transparency +
    pref.employeeFocus +
    pref.leadershipDevelopment;

  const score =
    company.executiveRewardScore * pref.executiveReward +
    company.longTermOrientationScore * pref.longTerm +
    company.esgCommitmentScore * pref.esg +
    company.transparencyScore * pref.transparency +
    company.employeeFocusScore * pref.employeeFocus +
    company.leadershipDevelopmentScore * pref.leadershipDevelopment;

  return Math.round(score / totalWeight);
}

export default function MatchingPage() {
  const [companies, setCompanies] = useState<CompanyScore[]>([]);
  const [pref, setPref] = useState<Preference>(defaultPreference);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const res = await fetch("/data/company_scores.json");
      const data = await res.json();
      setCompanies(data);

      const firstThree = data.slice(0, 3).map((c: CompanyScore) => c.company);
      setSelectedCompanies(firstThree);
    }

    loadData();
  }, []);

  const latestCompanies = useMemo(() => {
    const map = new Map<string, CompanyScore>();

    companies.forEach((company) => {
      const existing = map.get(company.company);
      if (!existing || company.year > existing.year) {
        map.set(company.company, company);
      }
    });

    return Array.from(map.values());
  }, [companies]);

  const matchResults = useMemo(() => {
    return latestCompanies
      .map((company) => ({
        ...company,
        matchScore: calculateMatch(company, pref),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [latestCompanies, pref]);

  const selectedData = latestCompanies.filter((company) =>
    selectedCompanies.includes(company.company)
  );

  const radarData = [
    {
      metric: "Executive Reward",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.executiveRewardScore])
      ),
    },
    {
      metric: "Long-Term",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.longTermOrientationScore])
      ),
    },
    {
      metric: "ESG",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.esgCommitmentScore])
      ),
    },
    {
      metric: "Transparency",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.transparencyScore])
      ),
    },
    {
      metric: "Employee Focus",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.employeeFocusScore])
      ),
    },
    {
      metric: "Leadership Dev.",
      ...Object.fromEntries(
        selectedData.map((c) => [c.company, c.leadershipDevelopmentScore])
      ),
    },
  ];

  function toggleCompany(company: string) {
    if (selectedCompanies.includes(company)) {
      setSelectedCompanies(selectedCompanies.filter((c) => c !== company));
    } else {
      setSelectedCompanies([...selectedCompanies, company]);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-bold text-yellow-400">
          ← Back to Home
        </a>

        <h1 className="mt-8 text-5xl font-black">Company DNA Matching</h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Find the company that best matches your executive career DNA, or
          compare multiple companies across six leadership dimensions.
        </p>

        <section className="mt-10 rounded-3xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">1. Your Executive Preference</h2>

          <div className="mt-6 grid gap-6">
            <Slider
              label="Executive Reward"
              description="I want a company with attractive CEO/executive compensation."
              value={pref.executiveReward}
              onChange={(value) =>
                setPref({ ...pref, executiveReward: value })
              }
            />

            <Slider
              label="Long-Term Orientation"
              description="I prefer long-term incentives over short-term bonuses."
              value={pref.longTerm}
              onChange={(value) => setPref({ ...pref, longTerm: value })}
            />

            <Slider
              label="ESG Commitment"
              description="I want ESG goals to be linked to executive compensation."
              value={pref.esg}
              onChange={(value) => setPref({ ...pref, esg: value })}
            />

            <Slider
              label="Transparency"
              description="I want compensation rules and incentives to be clearly disclosed."
              value={pref.transparency}
              onChange={(value) => setPref({ ...pref, transparency: value })}
            />

            <Slider
              label="Employee Focus"
              description="I prefer companies that invest more broadly in employees."
              value={pref.employeeFocus}
              onChange={(value) => setPref({ ...pref, employeeFocus: value })}
            />

            <Slider
              label="Leadership Development"
              description="I prefer companies that develop leaders internally."
              value={pref.leadershipDevelopment}
              onChange={(value) =>
                setPref({ ...pref, leadershipDevelopment: value })
              }
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-3xl font-black">Best Matches</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {matchResults.slice(0, 6).map((company, index) => (
              <div
                key={`${company.company}-${company.year}`}
                className="rounded-3xl bg-zinc-900 p-6"
              >
                <p className="font-bold text-yellow-400">#{index + 1} Match</p>

                <h3 className="mt-3 text-3xl font-black">
                  {company.company}
                </h3>

                <p className="text-zinc-400">{company.year}</p>

                <div className="mt-6 text-6xl font-black text-yellow-400">
                  {company.matchScore}%
                </div>

                <p className="mt-2 text-zinc-400">Match Score</p>

                <div className="mt-6 space-y-3 text-sm">
                  <ScoreLine label="Executive Reward" value={company.executiveRewardScore} />
                  <ScoreLine label="Long-Term" value={company.longTermOrientationScore} />
                  <ScoreLine label="ESG" value={company.esgCommitmentScore} />
                  <ScoreLine label="Transparency" value={company.transparencyScore} />
                  <ScoreLine label="Employee Focus" value={company.employeeFocusScore} />
                  <ScoreLine label="Leadership Dev." value={company.leadershipDevelopmentScore} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-zinc-900 p-8">
          <h2 className="text-3xl font-black">2. Compare Company DNA</h2>

          <p className="mt-3 max-w-3xl text-zinc-400">
            Select companies to compare their executive DNA across six
            dimensions.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {latestCompanies.map((company) => (
              <button
                key={company.company}
                onClick={() => toggleCompany(company.company)}
                className={`rounded-2xl px-4 py-2 font-bold ${
                  selectedCompanies.includes(company.company)
                    ? "bg-yellow-400 text-black"
                    : "border border-zinc-700 text-zinc-300"
                }`}
              >
                {company.company}
              </button>
            ))}
          </div>

          <div className="mt-10 h-[520px] rounded-3xl bg-zinc-950 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="metric" stroke="#ffffff" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#71717a" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #facc15",
                    color: "white",
                  }}
                />
                <Legend />

                {selectedData.map((company, index) => (
                  <Radar
                    key={company.company}
                    name={company.company}
                    dataKey={company.company}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}

const COLORS = [
  "#facc15",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#34d399",
  "#f97316",
];

function Slider({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-4">
        <div>
          <p className="font-bold">{label}</p>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
        <p className="font-bold text-yellow-400">{value}</p>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-yellow-400"
      />
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-zinc-400">{label}</span>
        <span className="font-bold text-yellow-400">{value}/100</span>
      </div>

      <div className="h-2 rounded-full bg-zinc-800">
        <div
          className="h-2 rounded-full bg-yellow-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}