import { ContractService } from '../services/contract.service';

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
