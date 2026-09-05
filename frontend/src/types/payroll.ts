export type RuleCategory = 'BASIC' | 'ALLOWANCE' | 'GROSS' | 'DEDUCTION' | 'NET';
export type RuleCalcType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';

export interface SalaryRule {
  id: string;
  structureId: string;
  name: string;
  code: string;
  category: RuleCategory;
  sequence: number;
  calculationType: RuleCalcType;
  value: string;
  condition: string | null;
  status: string;
  structure?: { id: string; name: string } | null;
}

export interface SalaryStructure {
  id: string;
  name: string;
  status: string;
  rules?: SalaryRule[];
  _count?: { contracts: number; payruns: number };
}

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  BASIC: 'Basic',
  ALLOWANCE: 'Allowance',
  GROSS: 'Gross',
  DEDUCTION: 'Deduction',
  NET: 'Net',
};

export const RULE_CALC_LABELS: Record<RuleCalcType, string> = {
  FIXED: 'Fixed',
  PERCENTAGE: 'Percentage',
  FORMULA: 'Formula',
};

export const CATEGORY_CLASSES: Record<RuleCategory, string> = {
  BASIC: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
  ALLOWANCE: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  GROSS: 'border-none bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400',
  DEDUCTION: 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400',
  NET: 'border-none bg-violet-600/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400',
};
