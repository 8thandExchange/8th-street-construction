"use client";

import { useState } from "react";
import {
  HUD_HOME_REQUIREMENTS,
  parseFundingType,
  type ProjectFundingType,
} from "@/lib/project/funding";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";

const FUNDING_OPTIONS: {
  value: ProjectFundingType;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    value: "private",
    title: "Private / Custom",
    description: "Market-rate or custom homeowner. Standard billing & draws.",
    accent: "funding-card-private",
  },
  {
    value: "habitat",
    title: "Habitat Partner",
    description: "Habitat-sponsored build without HUD subsidy tracking.",
    accent: "funding-card-habitat",
  },
  {
    value: "hud_home",
    title: "HUD HOME Fund",
    description: "ARC HOME or DCA CHIP — federal compliance, income limits, EER.",
    accent: "funding-card-hud",
  },
];

type FundingProgramFieldsProps = {
  initialFunding: ProjectFundingType;
  hudGrantYear: number | null;
  hudProgramNotes: string | null;
};

export function FundingProgramFields({
  initialFunding,
  hudGrantYear,
  hudProgramNotes,
}: FundingProgramFieldsProps) {
  const [funding, setFunding] = useState<ProjectFundingType>(initialFunding);

  return (
    <>
      <fieldset>
        <legend className="field-label text-bone/70 mb-4">Funding program</legend>
        <div className="grid md:grid-cols-3 gap-3">
          {FUNDING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`funding-type-card ${opt.accent} ${
                funding === opt.value ? "funding-type-card-active" : ""
              }`}
            >
              <input
                type="radio"
                name="funding_type"
                value={opt.value}
                checked={funding === opt.value}
                onChange={() => setFunding(opt.value)}
                className="sr-only"
              />
              <span className="funding-type-card-title">{opt.title}</span>
              <span className="funding-type-card-desc">{opt.description}</span>
              {opt.value === "hud_home" && (
                <span className="funding-type-card-tag">Federal compliance</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {funding === "hud_home" && (
        <div className="hud-requirements-panel">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl text-bone">HUD HOME requirements</h3>
              <p className="text-xs text-bone/50 mt-1 max-w-lg">
                {HUD_HOME_REQUIREMENTS.jurisdiction} · 24 CFR Parts 91 & 92
              </p>
            </div>
            <ProjectFundingBadge fundingType="hud_home" hudGrantYear={hudGrantYear} size="md" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 mb-3">
                Homebuyer criteria
              </p>
              <ul className="space-y-2 text-sm text-bone/75">
                {HUD_HOME_REQUIREMENTS.homebuyerCriteria.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-teal-400 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 mb-3">
                Construction & grant compliance
              </p>
              <ul className="space-y-2 text-sm text-bone/75">
                {HUD_HOME_REQUIREMENTS.constructionCompliance.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-teal-400 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="field-label text-bone/60">Grant / program year</label>
              <input
                type="number"
                name="hud_grant_year"
                min={2020}
                max={2035}
                defaultValue={hudGrantYear ?? new Date().getFullYear()}
                className="field-input mt-2 bg-ink/30 border-bone/15 text-bone"
              />
            </div>
            <div>
              <label className="field-label text-bone/60">Program notes</label>
              <input
                name="hud_program_notes"
                defaultValue={hudProgramNotes ?? ""}
                placeholder="Funding program details"
                className="field-input mt-2 bg-ink/30 border-bone/15 text-bone"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function parseFundingFromForm(value: string): ProjectFundingType {
  return parseFundingType(value);
}
