export type RegulationSection = {
  title: string;
  items: string[];
};

export type JurisdictionRegulations = {
  key: string;
  name: string;
  state: string;
  ahj: string;
  contactPhone?: string;
  contactAddress?: string;
  portalUrl?: string;
  adoptedCodes: string[];
  permitThresholds: string[];
  planReviewRequirements: string[];
  inspectionSequence: string[];
  sections: RegulationSection[];
  aliases: string[];
};
