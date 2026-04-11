const SECTION_80C_LIMIT_INR = 150000;
const STANDARD_DEDUCTION_OLD_INR = 50000;
const STANDARD_DEDUCTION_NEW_INR = 75000;
const HOME_LOAN_INTEREST_OLD_LIMIT_INR = 200000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type TaxRegime = "old" | "new";
type UrgencyLevel = "low" | "medium" | "high";

type TaxSlab = {
  upTo: number | null;
  rate: number;
};

export type TaxOptimizationInput = {
  taxRegime?: string | null;
  annualTaxableIncomeInr?: number | null;
  section80cUsedInr?: number | null;
  section80dUsedInr?: number | null;
  homeLoanInterestInr?: number | null;
  monthlyInvestableSurplusInr?: number | null;
  capitalGainsShortTermInr?: number | null;
  capitalGainsLongTermInr?: number | null;
  financialYear?: string | null;
  now?: Date;
};

export type TaxRegimeHint = {
  currentRegime: TaxRegime | null;
  suggestedRegime: TaxRegime;
  estimatedTaxOldInr: number;
  estimatedTaxNewInr: number;
  estimatedTaxDeltaInr: number;
  estimatedPotentialSavingsInr: number;
  message: string;
  confidence: "low" | "medium" | "high";
};

export type TaxChecklistItem = {
  id: string;
  title: string;
  detail: string;
  urgency: UrgencyLevel;
};

export type TaxOptimizationSummary = {
  financialYear: string;
  annualTaxableIncomeInr: number;
  daysToFinancialYearEnd: number;
  monthsToFinancialYearEnd: number;
  financialYearEndDate: string;
  section80cLimitInr: number;
  section80cUsedInr: number;
  section80cRemainingInr: number;
  suggestedMonthly80cInr: number;
  regimeHint: TaxRegimeHint;
  checklist: TaxChecklistItem[];
  disclaimer: string;
};

const OLD_REGIME_SLABS: TaxSlab[] = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
  { upTo: 1000000, rate: 0.2 },
  { upTo: null, rate: 0.3 },
];

const NEW_REGIME_SLABS: TaxSlab[] = [
  { upTo: 300000, rate: 0 },
  { upTo: 700000, rate: 0.05 },
  { upTo: 1000000, rate: 0.1 },
  { upTo: 1200000, rate: 0.15 },
  { upTo: 1500000, rate: 0.2 },
  { upTo: null, rate: 0.3 },
];

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseAmount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, round(value, 2));
}

function normalizeTaxRegime(value: string | null | undefined): TaxRegime | null {
  if (value === "old" || value === "new") {
    return value;
  }

  return null;
}

function getDatePartsInTimezone(now: Date, timezone: string) {
  const year = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: timezone }).format(now));
  const month = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: timezone }).format(now));
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: timezone }).format(now));

  return { year, month, day };
}

function getFinancialYearWindow(now: Date, timezone = "Asia/Kolkata") {
  const parts = getDatePartsInTimezone(now, timezone);
  const startYear = parts.month >= 4 ? parts.year : parts.year - 1;
  const endYear = startYear + 1;

  const financialYear = `${startYear}-${String(endYear).slice(-2)}`;
  const financialYearEndDate = `${endYear}-03-31`;

  const todayUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const fyEndUtc = new Date(Date.UTC(endYear, 2, 31));
  const daysToFinancialYearEnd = Math.max(0, Math.ceil((fyEndUtc.getTime() - todayUtc.getTime()) / MS_PER_DAY));

  return {
    financialYear,
    financialYearEndDate,
    daysToFinancialYearEnd,
    monthsToFinancialYearEnd: Math.max(1, Math.ceil(daysToFinancialYearEnd / 30)),
  };
}

function computeTaxFromSlabs(taxableIncomeInr: number, slabs: TaxSlab[]): number {
  let tax = 0;
  let lowerLimit = 0;

  for (const slab of slabs) {
    if (taxableIncomeInr <= lowerLimit) {
      break;
    }

    const upperLimit = slab.upTo ?? taxableIncomeInr;
    const taxablePortion = Math.max(0, Math.min(taxableIncomeInr, upperLimit) - lowerLimit);

    tax += taxablePortion * slab.rate;
    lowerLimit = upperLimit;
  }

  return round(tax, 2);
}

function estimateOldRegimeTax(taxableIncomeInr: number): number {
  if (taxableIncomeInr <= 500000) {
    return 0;
  }

  return computeTaxFromSlabs(taxableIncomeInr, OLD_REGIME_SLABS);
}

function estimateNewRegimeTax(taxableIncomeInr: number): number {
  if (taxableIncomeInr <= 700000) {
    return 0;
  }

  return computeTaxFromSlabs(taxableIncomeInr, NEW_REGIME_SLABS);
}

function formatRegimeLabel(regime: TaxRegime): string {
  return regime === "old" ? "old regime" : "new regime";
}

function buildRegimeHint(input: {
  annualTaxableIncomeInr: number;
  currentRegime: TaxRegime | null;
  section80cUsedInr: number;
  section80dUsedInr: number;
  homeLoanInterestInr: number;
}): TaxRegimeHint {
  const oldDeductions =
    STANDARD_DEDUCTION_OLD_INR +
    Math.min(input.section80cUsedInr, SECTION_80C_LIMIT_INR) +
    input.section80dUsedInr +
    Math.min(input.homeLoanInterestInr, HOME_LOAN_INTEREST_OLD_LIMIT_INR);

  const newDeductions = STANDARD_DEDUCTION_NEW_INR;

  const oldTaxableIncome = Math.max(0, input.annualTaxableIncomeInr - oldDeductions);
  const newTaxableIncome = Math.max(0, input.annualTaxableIncomeInr - newDeductions);

  const estimatedTaxOldInr = estimateOldRegimeTax(oldTaxableIncome);
  const estimatedTaxNewInr = estimateNewRegimeTax(newTaxableIncome);

  const suggestedRegime: TaxRegime = estimatedTaxOldInr <= estimatedTaxNewInr ? "old" : "new";
  const estimatedTaxDeltaInr = round(estimatedTaxOldInr - estimatedTaxNewInr, 2);
  const estimatedPotentialSavingsInr = round(Math.abs(estimatedTaxDeltaInr), 2);

  const hasClearWinner = estimatedPotentialSavingsInr > 5000;
  const confidence: TaxRegimeHint["confidence"] =
    estimatedPotentialSavingsInr >= 30000 ? "high" : estimatedPotentialSavingsInr >= 10000 ? "medium" : "low";

  let message =
    "Your old-vs-new regime estimate is close. Run an exact computation with payroll and full deductions before locking the regime.";

  if (hasClearWinner) {
    message =
      suggestedRegime === "old"
        ? `Based on current deductions, old regime appears better by about INR ${estimatedPotentialSavingsInr.toLocaleString("en-IN")}.`
        : `Based on current deductions, new regime appears better by about INR ${estimatedPotentialSavingsInr.toLocaleString("en-IN")}.`;
  }

  if (input.currentRegime && input.currentRegime === suggestedRegime && hasClearWinner) {
    message = `Your selected ${formatRegimeLabel(input.currentRegime)} currently looks optimal by about INR ${estimatedPotentialSavingsInr.toLocaleString("en-IN")}.`;
  }

  return {
    currentRegime: input.currentRegime,
    suggestedRegime,
    estimatedTaxOldInr,
    estimatedTaxNewInr,
    estimatedTaxDeltaInr,
    estimatedPotentialSavingsInr,
    message,
    confidence,
  };
}

function buildChecklist(input: {
  section80cRemainingInr: number;
  suggestedMonthly80cInr: number;
  monthsToFinancialYearEnd: number;
  daysToFinancialYearEnd: number;
  annualTaxableIncomeInr: number;
  monthlyInvestableSurplusInr: number;
  currentRegime: TaxRegime | null;
  regimeHint: TaxRegimeHint;
  capitalGainsShortTermInr: number;
  capitalGainsLongTermInr: number;
}): TaxChecklistItem[] {
  const checklist: TaxChecklistItem[] = [];

  if (input.section80cRemainingInr > 0) {
    const urgency: UrgencyLevel =
      input.daysToFinancialYearEnd <= 60 ? "high" : input.daysToFinancialYearEnd <= 120 ? "medium" : "low";

    checklist.push({
      id: "use-80c-room",
      title: "Use remaining 80C room",
      detail:
        `You still have INR ${input.section80cRemainingInr.toLocaleString("en-IN")} under Section 80C. ` +
        `Target about INR ${input.suggestedMonthly80cInr.toLocaleString("en-IN")} this month ` +
        `and continue for ${input.monthsToFinancialYearEnd} month(s) via eligible instruments (ELSS/PPF/EPF).`,
      urgency,
    });
  } else {
    checklist.push({
      id: "80c-complete",
      title: "80C already maximized",
      detail: "Section 80C looks fully utilized. This month, organize proof documents and verify payroll declarations.",
      urgency: "low",
    });
  }

  if (
    input.currentRegime &&
    input.currentRegime !== input.regimeHint.suggestedRegime &&
    input.regimeHint.estimatedPotentialSavingsInr > 5000
  ) {
    checklist.push({
      id: "review-regime-choice",
      title: "Re-check regime declaration",
      detail:
        `Estimate indicates ${formatRegimeLabel(input.regimeHint.suggestedRegime)} may save around ` +
        `INR ${input.regimeHint.estimatedPotentialSavingsInr.toLocaleString("en-IN")}. ` +
        "Run an exact comparison and update your employer declaration this month.",
      urgency: input.daysToFinancialYearEnd <= 120 ? "high" : "medium",
    });
  } else {
    checklist.push({
      id: "regime-validation",
      title: "Validate current regime with latest numbers",
      detail:
        "Keep this month for a quick old-vs-new recomputation with updated salary, deductions, and capital gains before payroll lock.",
      urgency: "medium",
    });
  }

  if (input.capitalGainsLongTermInr > 0 || input.capitalGainsShortTermInr > 0) {
    checklist.push({
      id: "capital-gains-check",
      title: "Review capital gains and loss harvesting",
      detail:
        "You have recorded capital gains. This month, reconcile broker statements and evaluate loss-harvesting opportunities before the FY close.",
      urgency: input.daysToFinancialYearEnd <= 90 ? "high" : "medium",
    });
  } else if (input.annualTaxableIncomeInr >= 1200000) {
    const monthlyReserve = round(input.regimeHint.suggestedRegime === "old" ? input.regimeHint.estimatedTaxOldInr / 12 : input.regimeHint.estimatedTaxNewInr / 12, 0);

    checklist.push({
      id: "advance-tax-reserve",
      title: "Create a monthly tax reserve",
      detail:
        `Set aside roughly INR ${monthlyReserve.toLocaleString("en-IN")} monthly toward tax outflow to avoid year-end cash stress. ` +
        "Track this alongside your SIP schedule.",
      urgency: "medium",
    });
  }

  if (input.monthlyInvestableSurplusInr > 0 && input.section80cRemainingInr > 0) {
    checklist.push({
      id: "align-sip-with-tax",
      title: "Align one SIP to tax goal",
      detail:
        `Your monthly investable surplus is INR ${input.monthlyInvestableSurplusInr.toLocaleString("en-IN")}. ` +
        "Route a fixed part of this month’s SIP into 80C-eligible investments so tax optimization happens automatically.",
      urgency: "medium",
    });
  }

  return checklist.slice(0, 4);
}

export function buildTaxOptimizationSummary(input: TaxOptimizationInput): TaxOptimizationSummary {
  const annualTaxableIncomeInr = parseAmount(input.annualTaxableIncomeInr);
  const section80cUsedInr = parseAmount(input.section80cUsedInr);
  const section80dUsedInr = parseAmount(input.section80dUsedInr);
  const homeLoanInterestInr = parseAmount(input.homeLoanInterestInr);
  const monthlyInvestableSurplusInr = parseAmount(input.monthlyInvestableSurplusInr);
  const capitalGainsShortTermInr = parseAmount(input.capitalGainsShortTermInr);
  const capitalGainsLongTermInr = parseAmount(input.capitalGainsLongTermInr);
  const currentRegime = normalizeTaxRegime(input.taxRegime);

  const now = input.now ?? new Date();
  const window = getFinancialYearWindow(now);

  const section80cRemainingInr = Math.max(0, round(SECTION_80C_LIMIT_INR - section80cUsedInr, 2));
  const suggestedMonthly80cInr =
    section80cRemainingInr > 0 ? round(section80cRemainingInr / window.monthsToFinancialYearEnd, 0) : 0;

  const regimeHint = buildRegimeHint({
    annualTaxableIncomeInr,
    currentRegime,
    section80cUsedInr,
    section80dUsedInr,
    homeLoanInterestInr,
  });

  const checklist = buildChecklist({
    section80cRemainingInr,
    suggestedMonthly80cInr,
    monthsToFinancialYearEnd: window.monthsToFinancialYearEnd,
    daysToFinancialYearEnd: window.daysToFinancialYearEnd,
    annualTaxableIncomeInr,
    monthlyInvestableSurplusInr,
    currentRegime,
    regimeHint,
    capitalGainsShortTermInr,
    capitalGainsLongTermInr,
  });

  return {
    financialYear: input.financialYear && input.financialYear.trim().length > 0 ? input.financialYear : window.financialYear,
    annualTaxableIncomeInr,
    daysToFinancialYearEnd: window.daysToFinancialYearEnd,
    monthsToFinancialYearEnd: window.monthsToFinancialYearEnd,
    financialYearEndDate: window.financialYearEndDate,
    section80cLimitInr: SECTION_80C_LIMIT_INR,
    section80cUsedInr,
    section80cRemainingInr,
    suggestedMonthly80cInr,
    regimeHint,
    checklist,
    disclaimer:
      "Estimates are educational and simplified. They do not include every surcharge/cess/rebate nuance. Confirm with a qualified tax professional.",
  };
}
