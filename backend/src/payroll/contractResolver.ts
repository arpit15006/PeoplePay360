import { ContractService } from '../services/contract.service';

/** Enough of a contract row to choose between them. */
interface ContractLike {
  status: string;
  startDate: Date;
}

/**
 * Picks the contract that applies, from those already known to overlap the
 * period. An ACTIVE one always wins; otherwise the most recently started.
 *
 * Extracted so a payrun can choose from contracts fetched for everyone in one
 * query while a single lookup still goes through the function below — the rule
 * itself lives in one place.
 */
export function pickApplicableContract<T extends ContractLike>(overlapping: T[]): T | null {
  if (overlapping.length === 0) return null;
  const ordered = [...overlapping].sort(
    (a, b) =>
      a.status.localeCompare(b.status) || b.startDate.getTime() - a.startDate.getTime()
  );
  return ordered.find(c => c.status === 'ACTIVE') ?? ordered[0];
}

/**
 * Resolves the active contract for an employee in the given payrun period.
 * PRD requirement: Contract must be valid during the payrun period.
 */
export async function resolveEmployeeContract(
  employeeId: string,
  periodStartDate: Date,
  periodEndDate: Date
) {
  const contract = await ContractService.findApplicableContract(
    employeeId,
    periodStartDate,
    periodEndDate
  );

  if (!contract) {
    return null;
  }

  return contract;
}
