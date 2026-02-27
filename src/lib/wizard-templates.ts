/**
 * Decision type cards for the Guided Wizard Step 1.
 *
 * Each type provides an icon, description, and auto-populated criteria
 * with weights. Selecting a type pre-fills the decision criteria so
 * users can jump straight to scoring.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/226
 */

import type { CriterionType } from "./types";

/** A single criterion suggestion within a decision type template */
export interface WizardCriterion {
  name: string;
  weight: number;
  type: CriterionType;
  description: string;
}

/** A decision type card for Step 1 */
export interface DecisionTypeCard {
  id: string;
  /** Lucide icon name (used programmatically) */
  iconName: string;
  emoji: string;
  title: string;
  description: string;
  criteria: WizardCriterion[];
}

export const DECISION_TYPES: DecisionTypeCard[] = [
  {
    id: "job-career",
    iconName: "Briefcase",
    emoji: "💼",
    title: "Job / Career",
    description: "Compare job offers, career moves, or role changes.",
    criteria: [
      {
        name: "Salary & Compensation",
        weight: 25,
        type: "benefit",
        description: "Total compensation including base, bonus, equity, and benefits.",
      },
      {
        name: "Work-Life Balance",
        weight: 20,
        type: "benefit",
        description: "Hours, flexibility, remote options, and time-off policy.",
      },
      {
        name: "Growth Opportunity",
        weight: 20,
        type: "benefit",
        description: "Career advancement, learning, mentorship, and skill development.",
      },
      {
        name: "Company Culture",
        weight: 15,
        type: "benefit",
        description: "Values alignment, team dynamics, and management style.",
      },
      {
        name: "Location & Commute",
        weight: 10,
        type: "cost",
        description: "Geographic location, commute time, and relocation requirements.",
      },
      {
        name: "Job Security",
        weight: 10,
        type: "benefit",
        description: "Company stability, industry outlook, and contract terms.",
      },
    ],
  },
  {
    id: "housing",
    iconName: "Home",
    emoji: "🏠",
    title: "Housing",
    description: "Rent vs. buy, apartment comparison, or neighborhood selection.",
    criteria: [
      {
        name: "Price",
        weight: 25,
        type: "cost",
        description: "Monthly rent, mortgage, or total cost of ownership.",
      },
      {
        name: "Location",
        weight: 20,
        type: "benefit",
        description: "Proximity to work, schools, shops, and public transit.",
      },
      {
        name: "Size & Layout",
        weight: 15,
        type: "benefit",
        description: "Square footage, number of rooms, and floor plan quality.",
      },
      {
        name: "Condition",
        weight: 15,
        type: "benefit",
        description: "Age, renovation state, and maintenance needs.",
      },
      {
        name: "Amenities",
        weight: 15,
        type: "benefit",
        description: "Parking, laundry, gym, outdoor space, and extras.",
      },
      {
        name: "Safety",
        weight: 10,
        type: "benefit",
        description: "Neighborhood crime rates, security features, and lighting.",
      },
    ],
  },
  {
    id: "purchase",
    iconName: "ShoppingCart",
    emoji: "💰",
    title: "Purchase",
    description: "Product comparison, big-ticket buys, or vendor evaluation.",
    criteria: [
      {
        name: "Price",
        weight: 25,
        type: "cost",
        description: "Purchase price, subscription cost, or total cost over time.",
      },
      {
        name: "Quality",
        weight: 20,
        type: "benefit",
        description: "Build quality, durability, and material standards.",
      },
      {
        name: "Features",
        weight: 20,
        type: "benefit",
        description: "Functionality, capabilities, and unique selling points.",
      },
      {
        name: "Brand & Reviews",
        weight: 15,
        type: "benefit",
        description: "Reputation, user ratings, and expert reviews.",
      },
      {
        name: "Warranty",
        weight: 10,
        type: "benefit",
        description: "Warranty coverage, return policy, and support availability.",
      },
      {
        name: "Availability",
        weight: 10,
        type: "benefit",
        description: "In-stock status, delivery time, and access convenience.",
      },
    ],
  },
  {
    id: "investment",
    iconName: "TrendingUp",
    emoji: "📊",
    title: "Investment",
    description: "Portfolio allocation, business ventures, or asset comparison.",
    criteria: [
      {
        name: "Expected Return",
        weight: 25,
        type: "benefit",
        description: "Projected ROI, yield, or capital appreciation.",
      },
      {
        name: "Risk Level",
        weight: 20,
        type: "cost",
        description: "Volatility, downside exposure, and probability of loss.",
      },
      {
        name: "Liquidity",
        weight: 15,
        type: "benefit",
        description: "How quickly you can convert to cash without loss.",
      },
      {
        name: "Time Horizon",
        weight: 15,
        type: "benefit",
        description: "Alignment with your investment timeline and goals.",
      },
      {
        name: "Diversification",
        weight: 15,
        type: "benefit",
        description: "How well it complements your existing portfolio.",
      },
      {
        name: "Tax Efficiency",
        weight: 10,
        type: "benefit",
        description: "Tax treatment, deductions, and after-tax returns.",
      },
    ],
  },
  {
    id: "education",
    iconName: "GraduationCap",
    emoji: "🎓",
    title: "Education",
    description: "School, program, course, or certification selection.",
    criteria: [
      {
        name: "Program Quality",
        weight: 25,
        type: "benefit",
        description: "Curriculum rigor, faculty expertise, and learning outcomes.",
      },
      {
        name: "Cost",
        weight: 20,
        type: "cost",
        description: "Tuition, fees, materials, and living expenses.",
      },
      {
        name: "Location",
        weight: 15,
        type: "benefit",
        description: "Campus location, online availability, and living environment.",
      },
      {
        name: "Career Outcomes",
        weight: 15,
        type: "benefit",
        description: "Employment rates, alumni network, and industry connections.",
      },
      {
        name: "Reputation",
        weight: 15,
        type: "benefit",
        description: "Rankings, accreditation, and brand recognition.",
      },
      {
        name: "Financial Aid",
        weight: 10,
        type: "benefit",
        description: "Scholarships, grants, assistantships, and loan options.",
      },
    ],
  },
  {
    id: "custom",
    iconName: "Sparkles",
    emoji: "✨",
    title: "Custom",
    description: "Start from a blank slate — define your own criteria.",
    criteria: [],
  },
];

/** Placeholder text and example option names per decision type */
export interface TypeExamples {
  placeholder: string;
  examples: string[];
}

export const TYPE_EXAMPLES: Record<string, TypeExamples> = {
  "job-career": {
    placeholder: 'e.g., "Google", "Startup XYZ", "Current job"',
    examples: ["Google", "Startup XYZ", "Current Job", "Freelancing"],
  },
  housing: {
    placeholder: 'e.g., "Downtown Studio", "Suburban 2BR"',
    examples: ["Downtown Studio", "Suburban 2BR", "The Lakewood", "123 Main St Apt 4B"],
  },
  purchase: {
    placeholder: 'e.g., "MacBook Pro", "ThinkPad X1"',
    examples: ["MacBook Pro", "ThinkPad X1", "Surface Laptop", "Dell XPS"],
  },
  investment: {
    placeholder: 'e.g., "Index Fund", "Real Estate"',
    examples: ["S&P 500 Index Fund", "Real Estate", "Bonds", "Crypto"],
  },
  education: {
    placeholder: 'e.g., "MIT", "Stanford", "State University"',
    examples: ["MIT", "Stanford", "State University", "Online Bootcamp"],
  },
  custom: {
    placeholder: 'e.g., "Option A"',
    examples: ["Option A", "Option B", "Option C"],
  },
};

/**
 * Look up a decision type by ID.
 */
export function getDecisionType(typeId: string): DecisionTypeCard | undefined {
  return DECISION_TYPES.find((t) => t.id === typeId);
}

/**
 * Get placeholder text and examples for a decision type.
 * Falls back to custom if the type is unknown.
 */
export function getTypeExamples(typeId: string | null): TypeExamples {
  return TYPE_EXAMPLES[typeId ?? "custom"] ?? TYPE_EXAMPLES.custom;
}
