/**
 * Pre-built decision templates for common use cases.
 *
 * Each template contains a name, description, category, icon,
 * placeholder options, and realistic criteria with weights.
 * Scores are left at zero — users fill those in.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/10
 */

import type { CriterionType, Decision } from "./types";
import { generateId } from "./utils";

export interface DecisionTemplate {
  templateId: string;
  name: string;
  description: string;
  category: "career" | "business" | "personal" | "education" | "finance" | "product";
  icon: string; // Emoji
  options: { name: string }[];
  criteria: { name: string; weight: number; type: CriterionType }[];
}

export const TEMPLATES: DecisionTemplate[] = [
  {
    templateId: "job-offer",
    name: "Job Offer Comparison",
    description: "Compare multiple job offers across salary, growth, culture, and more.",
    category: "career",
    icon: "💼",
    options: [{ name: "Company A" }, { name: "Company B" }, { name: "Company C" }],
    criteria: [
      { name: "Salary & Compensation", weight: 30, type: "benefit" },
      { name: "Growth Potential", weight: 25, type: "benefit" },
      { name: "Work-Life Balance", weight: 20, type: "benefit" },
      { name: "Team & Culture", weight: 15, type: "benefit" },
      { name: "Location", weight: 10, type: "benefit" },
    ],
  },
  {
    templateId: "vendor-selection",
    name: "Vendor / SaaS Selection",
    description: "Evaluate software vendors on price, features, support, and scalability.",
    category: "business",
    icon: "🏢",
    options: [{ name: "Vendor A" }, { name: "Vendor B" }, { name: "Vendor C" }],
    criteria: [
      { name: "Price", weight: 25, type: "cost" },
      { name: "Feature Completeness", weight: 25, type: "benefit" },
      { name: "Integration Quality", weight: 20, type: "benefit" },
      { name: "Support & SLA", weight: 15, type: "benefit" },
      { name: "Scalability", weight: 15, type: "benefit" },
    ],
  },
  {
    templateId: "apartment-search",
    name: "Apartment / Home Search",
    description: "Compare living spaces on cost, commute, size, safety, and amenities.",
    category: "personal",
    icon: "🏠",
    options: [{ name: "Place A" }, { name: "Place B" }, { name: "Place C" }],
    criteria: [
      { name: "Monthly Cost", weight: 30, type: "cost" },
      { name: "Commute Time", weight: 20, type: "cost" },
      { name: "Size & Layout", weight: 20, type: "benefit" },
      { name: "Neighborhood Safety", weight: 15, type: "benefit" },
      { name: "Amenities", weight: 15, type: "benefit" },
    ],
  },
  {
    templateId: "investment-analysis",
    name: "Investment Analysis",
    description: "Analyze investments on returns, risk, liquidity, and tax efficiency.",
    category: "finance",
    icon: "📈",
    options: [{ name: "Investment A" }, { name: "Investment B" }, { name: "Investment C" }],
    criteria: [
      { name: "Expected Return", weight: 30, type: "benefit" },
      { name: "Risk Level", weight: 25, type: "cost" },
      { name: "Liquidity", weight: 20, type: "benefit" },
      { name: "Tax Efficiency", weight: 15, type: "benefit" },
      { name: "Minimum Investment", weight: 10, type: "cost" },
    ],
  },
  {
    templateId: "college-university",
    name: "College / University",
    description: "Choose a school based on academics, aid, campus life, and career outcomes.",
    category: "education",
    icon: "🎓",
    options: [{ name: "School A" }, { name: "School B" }, { name: "School C" }],
    criteria: [
      { name: "Academic Reputation", weight: 25, type: "benefit" },
      { name: "Financial Aid", weight: 25, type: "benefit" },
      { name: "Campus Life", weight: 20, type: "benefit" },
      { name: "Career Outcomes", weight: 20, type: "benefit" },
      { name: "Location", weight: 10, type: "benefit" },
    ],
  },
  {
    templateId: "hiring-candidate",
    name: "Hiring / Candidate Eval",
    description: "Evaluate candidates on skills, culture fit, experience, and communication.",
    category: "career",
    icon: "👤",
    options: [{ name: "Candidate A" }, { name: "Candidate B" }, { name: "Candidate C" }],
    criteria: [
      { name: "Technical Skills", weight: 30, type: "benefit" },
      { name: "Culture Fit", weight: 25, type: "benefit" },
      { name: "Experience", weight: 20, type: "benefit" },
      { name: "Communication", weight: 15, type: "benefit" },
      { name: "Salary Expectation", weight: 10, type: "cost" },
    ],
  },
  {
    templateId: "feature-prioritization",
    name: "Product Feature Prioritization",
    description: "Prioritize features by user impact, revenue, effort, and alignment.",
    category: "product",
    icon: "🚀",
    options: [{ name: "Feature A" }, { name: "Feature B" }, { name: "Feature C" }],
    criteria: [
      { name: "User Impact", weight: 30, type: "benefit" },
      { name: "Revenue Potential", weight: 25, type: "benefit" },
      { name: "Implementation Effort", weight: 25, type: "cost" },
      { name: "Strategic Alignment", weight: 20, type: "benefit" },
    ],
  },
  {
    templateId: "relocation-city",
    name: "Relocation City",
    description: "Evaluate cities based on cost, job market, quality of life, and climate.",
    category: "personal",
    icon: "🌎",
    options: [{ name: "City A" }, { name: "City B" }, { name: "City C" }],
    criteria: [
      { name: "Cost of Living", weight: 25, type: "cost" },
      { name: "Job Market", weight: 30, type: "benefit" },
      { name: "Quality of Life", weight: 20, type: "benefit" },
      { name: "Climate", weight: 10, type: "benefit" },
      { name: "Proximity to Family", weight: 15, type: "benefit" },
    ],
  },
];

/**
 * Find a template by its templateId.
 */
export function getTemplateById(templateId: string): DecisionTemplate | undefined {
  return TEMPLATES.find((t) => t.templateId === templateId);
}

/**
 * Instantiate a Decision from a template.
 * Generates fresh IDs for options, criteria, and the decision itself.
 * Scores default to null (unscored) for all combinations.
 */
export function instantiateTemplate(template: DecisionTemplate): Decision {
  const now = new Date().toISOString();
  const options = template.options.map((o) => ({ id: generateId(), name: o.name }));
  const criteria = template.criteria.map((c) => ({
    id: generateId(),
    name: c.name,
    weight: c.weight,
    type: c.type,
  }));

  // Initialize all scores to null (not yet scored)
  const scores: Record<string, Record<string, null>> = {};
  for (const opt of options) {
    scores[opt.id] = {};
    for (const crit of criteria) {
      scores[opt.id][crit.id] = null;
    }
  }

  return {
    id: generateId(),
    title: template.name,
    description: template.description,
    options,
    criteria,
    scores,
    createdAt: now,
    updatedAt: now,
  };
}
