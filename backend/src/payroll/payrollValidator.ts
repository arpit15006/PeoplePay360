import { PayrunStatus } from '@prisma/client';
import { ValidationError } from '../utils/errors';

/**
 * State machine validator for Payrun statuses.
 * Allowed flow: DRAFT -> COMPUTED -> VALIDATED -> PAID -> SENT
 */
export function validatePayrunTransition(currentStatus: PayrunStatus, targetStatus: PayrunStatus): void {
  const allowedTransitions: Record<PayrunStatus, PayrunStatus[]> = {
    DRAFT: [PayrunStatus.COMPUTED],
    COMPUTED: [PayrunStatus.VALIDATED, PayrunStatus.DRAFT],
    VALIDATED: [PayrunStatus.PAID, PayrunStatus.COMPUTED],
    PAID: [PayrunStatus.SENT],
    SENT: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ValidationError(
      `Cannot transition payrun from status '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }
}
