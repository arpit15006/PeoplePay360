import nodemailer from 'nodemailer';
import prisma from '../config/db';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PayrunStatus, PayslipStatus } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';
import { generatePayslipPdf } from './payslipPdf.service';

// The promise is cached, not just the resolved transporter: parallel sends all
// ask for it at once, and each caller must get the same pooled transport.
let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) transporterPromise = createTransporter();
  return transporterPromise;
}

async function createTransporter(): Promise<nodemailer.Transporter> {
  let transporter: nodemailer.Transporter;

  // Pooling is what makes a bulk send fast: without it nodemailer opens a fresh
  // TCP + TLS + AUTH handshake for every single message, which against Gmail
  // costs about a second per payslip before any mail is even transferred.
  const pool = {
    pool: true,
    maxConnections: MAX_PARALLEL_SENDS,
    maxMessages: 100,
  } as const;

  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      ...pool,
    });
  } else {
    // Generate ethereal test account if no credentials supplied
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      ...pool,
    });
    console.log(`[Email Service] Using Ethereal Test Account: ${testAccount.user}`);
  }

  return transporter;
}

/**
 * How many payslips are built and sent at once. Each worker holds one pooled
 * SMTP connection, so this is also the pool size.
 */
const MAX_PARALLEL_SENDS = 5;

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ------------------------------------------------------------------ */
/*  Professional HTML email template — content NOT duplicated in PDF   */
/* ------------------------------------------------------------------ */
function buildPayslipEmailHtml(
  employeeName: string,
  period: string,
  netSalary: number,
  grossSalary: number,
  totalDeductions: number,
  workedDays: number,
  employeeCode: string
): string {
  const formattedNet = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(netSalary);
  const formattedGross = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(grossSalary);
  const formattedDed = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalDeductions);
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- ═══ HEADER ═══ -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f2942 0%,#144f84 100%);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">PEOPLEPAY360</h1>
            <p style="color:#94a3b8;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">HR &amp; Payroll Management</p>
          </td>
        </tr>

        <!-- ═══ GREETING ═══ -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="color:#0f172a;font-size:15px;margin:0 0 6px;">Dear <strong>${employeeName}</strong>,</p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
              We are pleased to inform you that your salary for the period of
              <strong style="color:#0f172a;">${period}</strong> has been successfully processed.
              Your detailed payslip has been attached to this email as a PDF for your records.
            </p>
          </td>
        </tr>

        <!-- ═══ QUICK SUMMARY CARD ═══ -->
        <tr>
          <td style="padding:0 40px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px 8px;">
                  <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Quick Summary</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="33%" style="padding:10px 0;text-align:center;border-right:1px solid #e2e8f0;">
                        <p style="color:#64748b;font-size:10px;margin:0 0 4px;text-transform:uppercase;">Gross</p>
                        <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0;">₹${formattedGross}</p>
                      </td>
                      <td width="33%" style="padding:10px 0;text-align:center;border-right:1px solid #e2e8f0;">
                        <p style="color:#64748b;font-size:10px;margin:0 0 4px;text-transform:uppercase;">Deductions</p>
                        <p style="color:#dc2626;font-size:16px;font-weight:700;margin:0;">-₹${formattedDed}</p>
                      </td>
                      <td width="33%" style="padding:10px 0;text-align:center;">
                        <p style="color:#64748b;font-size:10px;margin:0 0 4px;text-transform:uppercase;">Net Pay</p>
                        <p style="color:#16a34a;font-size:16px;font-weight:700;margin:0;">₹${formattedNet}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px 14px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="color:#64748b;font-size:11px;">Employee Code: <strong style="color:#0f172a;">${employeeCode}</strong></td>
                      <td style="color:#64748b;font-size:11px;text-align:right;">Worked Days: <strong style="color:#0f172a;">${workedDays}</strong></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ PDF ATTACHMENT NOTE ═══ -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="color:#1e40af;font-size:13px;margin:0;line-height:1.5;">
                    📎 <strong>Your detailed payslip is attached</strong> to this email as a PDF document.
                    It includes a complete breakdown of all earnings, deductions, and your net take-home salary.
                    Please save it for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ IMPORTANT NOTES ═══ -->
        <tr>
          <td style="padding:24px 40px 0;">
            <p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 10px;">Important Information:</p>
            <ul style="color:#475569;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
              <li>Your salary has been credited to your registered bank account.</li>
              <li>For any discrepancies, please raise a query with the HR department within <strong>7 working days</strong>.</li>
              <li>This payslip is a system-generated document and does not require a physical signature.</li>
              <li>Please retain this email and the attached PDF for your income tax filing records.</li>
            </ul>
          </td>
        </tr>

        <!-- ═══ WARM REGARDS ═══ -->
        <tr>
          <td style="padding:28px 40px 0;">
            <p style="color:#475569;font-size:13px;line-height:1.6;margin:0;">
              Warm regards,<br>
              <strong style="color:#0f172a;">PeoplePay360 HR Team</strong><br>
              <span style="font-size:12px;color:#94a3b8;">Human Resources & Payroll Department</span>
            </p>
          </td>
        </tr>

        <!-- ═══ DIVIDER ═══ -->
        <tr>
          <td style="padding:24px 40px 0;">
            <hr style="border:0;border-top:1px solid #e2e8f0;margin:0;">
          </td>
        </tr>

        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td style="padding:20px 40px 28px;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0 0 4px;">
              © ${new Date().getFullYear()} PeoplePay360 · Automated Payroll System
            </p>
            <p style="color:#cbd5e1;font-size:10px;margin:0;">
              This is an automated email. Please do not reply directly. | Generated on ${currentDate}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export class EmailService {
  /**
   * Send a single payslip email with PDF attachment to an employee.
   */
  static async sendPayslipEmail(
    toEmail: string,
    employeeName: string,
    period: string,
    netSalary: number,
    grossSalary: number,
    totalDeductions: number,
    workedDays: number,
    employeeCode: string,
    designation: string,
    department: string,
    salaryStructure: string,
    status: string,
    lines: { name: string; amount: number; category: string; sequence: number }[]
  ) {
    const transport = await getTransporter();

    // Generate the payslip PDF buffer
    const pdfBuffer = await generatePayslipPdf({
      employeeName,
      employeeCode,
      designation,
      department,
      salaryStructure,
      period,
      workedDays,
      status,
      grossSalary,
      totalDeductions,
      netSalary,
      lines,
    });

    const htmlContent = buildPayslipEmailHtml(
      employeeName,
      period,
      netSalary,
      grossSalary,
      totalDeductions,
      workedDays,
      employeeCode
    );

    const safeCode = employeeCode.replace(/\s+/g, '-');
    const safePeriod = period.replace(/\s+/g, '-');

    const info = await transport.sendMail({
      from: `"PeoplePay360 HR" <${env.SMTP_FROM}>`,
      to: toEmail,
      subject: `Payslip for ${period} — PeoplePay360`,
      html: htmlContent,
      attachments: [
        {
          filename: `Payslip-${safeCode}-${safePeriod}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Service] Preview URL for ${toEmail}: ${previewUrl}`);
    }

    return { messageId: info.messageId, previewUrl };
  }

  /**
   * Bulk send payslips for an entire payrun.
   */
  static async sendBulkPayrunEmails(payrunId: string) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        payslips: {
          include: {
            employee: { include: { department: true } },
            salaryStructure: true,
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw new NotFoundError('Payrun');

    if (payrun.status !== PayrunStatus.PAID && payrun.status !== PayrunStatus.VALIDATED) {
      throw new ValidationError(`Cannot send payslips for a payrun with status '${payrun.status}'. Payrun must be VALIDATED or PAID.`);
    }

    const startedAt = Date.now();

    // Emitted as each send settles. The sends run in parallel, so this counts
    // completions rather than reporting a position in the list — which is what
    // the screen needs to draw an honest bar.
    let settled = 0;
    const total = payrun.payslips.length;

    // Sends run in parallel over the pooled connections rather than one after
    // another, so a payrun costs roughly (employees / MAX_PARALLEL_SENDS)
    // round trips instead of one per employee.
    const results = await mapWithConcurrency(
      payrun.payslips,
      MAX_PARALLEL_SENDS,
      async (payslip) => {
        const base = {
          id: payslip.id,
          employee: payslip.employee.name,
          email: payslip.employee.email,
        };

        try {
          const sendResult = await this.sendPayslipEmail(
            payslip.employee.email,
            payslip.employee.name,
            payslip.period,
            payslip.netSalary,
            payslip.grossSalary,
            payslip.totalDeductions,
            payslip.workedDays,
            payslip.employee.employeeCode,
            payslip.employee.jobPosition ?? '-',
            payslip.employee.department?.name ?? '-',
            payslip.salaryStructure?.name ?? '-',
            payslip.status,
            payslip.lines
          );

          settled += 1;
          emitEvent(SocketEvents.PAYSLIP_SEND_PROGRESS, {
            payrunId,
            done: settled,
            total,
            employee: payslip.employee.name,
            ok: true,
          });

          return { ...base, success: true, previewUrl: sendResult.previewUrl || null };
        } catch (err) {
          settled += 1;
          emitEvent(SocketEvents.PAYSLIP_SEND_PROGRESS, {
            payrunId,
            done: settled,
            total,
            employee: payslip.employee.name,
            ok: false,
          });

          return { ...base, success: false, error: (err as Error).message };
        }
      }
    );

    const sentIds = results.filter((r) => r.success).map((r) => r.id);

    // One round trip for every payslip that went out, instead of one per send.
    if (sentIds.length > 0) {
      await prisma.payslip.updateMany({
        where: { id: { in: sentIds } },
        data: {
          status: PayslipStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Only a payrun that actually reached someone counts as SENT.
      await prisma.payrun.update({
        where: { id: payrunId },
        data: { status: PayrunStatus.SENT },
      });

      emitEvent(SocketEvents.PAYRUN_STATUS_CHANGED, { id: payrunId, status: PayrunStatus.SENT });
    }

    console.log(
      `[Email Service] Payrun ${payrunId}: ${sentIds.length}/${results.length} payslips sent in ${
        Date.now() - startedAt
      }ms`
    );

    return {
      payrunId,
      totalSent: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      details: results.map(({ id, ...detail }) => detail),
    };
  }
}
