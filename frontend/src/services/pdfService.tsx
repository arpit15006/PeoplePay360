import { pdf } from '@react-pdf/renderer';
import PayslipPDFDocument from '@/pdf/PayslipPDFDocument';
import type { Payslip } from '@/types/payrun';

/**
 * Renders a payslip to a real PDF and hands it to the browser as a download.
 * The blob comes from @react-pdf/renderer, not from window.print().
 */
export async function downloadPayslipPdf(payslip: Payslip): Promise<void> {
  const blob = await pdf(<PayslipPDFDocument payslip={payslip} />).toBlob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Payslip-${payslip.employee?.employeeCode ?? 'employee'}-${payslip.period.replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
