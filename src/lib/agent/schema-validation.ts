/**
 * SCHEMA VALIDATION
 * 
 * Validates that DB profiles contain required fields for financial engine.
 * If missing, applies safe defaults and logs warnings.
 * 
 * This layer protects against schema mismatches (e.g., new fields missing in legacy rows).
 */

import type { AgentProfileSnapshot } from "./types";

export interface SchemaValidationResult {
  isValid: boolean;
  missingFields: string[];
  defaultedFields: string[];
  fallbackCount: number;
  appliedDefaults: Record<string, unknown>;
  warnings: string[];
}

/**
 * Required fields that MUST exist (or be resolved from bands) for financial engine
 */
const REQUIRED_FIELDS_FOR_ENGINE: (keyof AgentProfileSnapshot)[] = [
  "income_input_type",
  "income_range_min_inr",
  "income_range_max_inr",
];

/**
 * Safe defaults applied when fields are missing
 */
const SAFE_DEFAULTS: Partial<AgentProfileSnapshot> = {
  income_input_type: "exact",
  income_range_min_inr: null,
  income_range_max_inr: null,
};

/**
 * Validate profile schema and report missing fields
 */
export function validateProfileSchema(profile: AgentProfileSnapshot | null): SchemaValidationResult {
  if (!profile) {
    return {
      isValid: true,
      missingFields: [],
      defaultedFields: [],
      fallbackCount: 0,
      appliedDefaults: {},
      warnings: ["Profile is null; context will be null"],
    };
  }

  const missingFields: string[] = [];
  const appliedDefaults: Record<string, unknown> = {};
  const warnings: string[] = [];

  // Check each required field
  for (const field of REQUIRED_FIELDS_FOR_ENGINE) {
    const value = profile[field];

    // Check if field is missing or invalid
    if (value === null || value === undefined) {
      missingFields.push(field);
      const defaultValue = SAFE_DEFAULTS[field];
      appliedDefaults[field] = defaultValue;
      warnings.push(`Missing field "${field}", applying default: ${JSON.stringify(defaultValue)}`);
    } else if (field === "income_input_type" && value !== "exact" && value !== "range") {
      // Validate enum-like field
      missingFields.push(field);
      appliedDefaults[field] = "exact";
      warnings.push(`Invalid value for "${field}": ${value}, applying default: "exact"`);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    defaultedFields: missingFields,
    fallbackCount: missingFields.length,
    appliedDefaults,
    warnings,
  };
}

/**
 * Ensure all required fields exist with valid types (no undefined)
 * Returns normalized profile with guaranteed non-undefined required fields
 */
export function ensureProfileValid(profile: AgentProfileSnapshot | null): AgentProfileSnapshot | null {
  if (!profile) {
    return null;
  }

  // Use explicit nullish coalescing to ensure fields are defined
  return {
    ...profile,
    income_input_type: (profile.income_input_type === "exact" || profile.income_input_type === "range")
      ? profile.income_input_type
      : "exact",
    income_range_min_inr: profile.income_range_min_inr ?? null,
    income_range_max_inr: profile.income_range_max_inr ?? null,
  };
}
