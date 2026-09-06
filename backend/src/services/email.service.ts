import nodemailer from 'nodemailer';
import prisma from '../config/db';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PayrunStatus, PayslipStatus } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';
import { generatePayslipPdf, toWords } from './payslipPdf.service';

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
  employeeCode: string,
  designation: string = 'Staff',
  department: string = 'General'
): string {
  const formattedNet = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(netSalary);
  const formattedGross = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(grossSalary);
  const formattedDed = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalDeductions);
  const wordsText = toWords(netSalary);
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentYear = new Date().getFullYear();
  const safeCode = (employeeCode || 'EMP').replace(/\s+/g, '-');
  const safePeriod = (period || 'Period').replace(/\s+/g, '-');
  const auditHash = ((employeeCode || '2026') + (period || '')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payslip for ${period} — PeoplePay360</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { color: #144f84; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- ═══ MAIN EMAIL CARD CONTAINER (600px max) ═══ -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);">
          
          <!-- ── BRAND GRADIENT TOP ACCENT ── -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #144f84 0%, #2563eb 55%, #0ea5e9 100%); line-height: 5px; font-size: 5px;">&nbsp;</td>
          </tr>

          <!-- ── HEADER: LOGO & STATUS BADGE ── -->
          <tr>
            <td style="padding: 26px 36px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Brand Identity -->
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="padding-right: 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 36px; height: 36px; background-color: #144f84; border-radius: 9px; text-align: center; color: #ffffff; font-weight: 900; font-size: 17px; line-height: 36px;">
                                P
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle">
                          <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1;">
                            PeoplePay<span style="color: #144f84;">360</span>
                          </span>
                          <div style="font-size: 11px; font-weight: 500; color: #64748b; letter-spacing: 0.3px; margin-top: 2px;">
                            Cloud HR &amp; Payroll Operations
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Status Pill -->
                  <td align="right" valign="middle">
                    <span style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 5px 12px; font-size: 11px; font-weight: 700; color: #047857; letter-spacing: 0.4px; display: inline-block; white-space: nowrap;">
                      <span style="color: #10b981; font-size: 11px; vertical-align: middle; margin-right: 4px;">●</span> PAID &amp; CONFIRMED
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f1f5f9; width: 100%;"></div>
            </td>
          </tr>

          <!-- ── SALUTATION & NOTICE ── -->
          <tr>
            <td style="padding: 24px 36px 14px;">
              <p style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 8px;">
                Dear ${employeeName},
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0;">
                Your salary statement for the period of <strong style="color: #0f172a;">${period}</strong> has been successfully processed and disbursed. Your net earnings have been credited to your registered bank account.
              </p>
            </td>
          </tr>

          <!-- ── HERO NET SALARY BANNER ── -->
          <tr>
            <td style="padding: 8px 36px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0b2d4c 0%, #144f84 100%); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(20, 79, 132, 0.2);">
                <tr>
                  <td style="padding: 24px 26px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="color: #93c5fd; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
                            TOTAL NET PAYABLE (TAKE HOME)
                          </div>
                          <div style="color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">
                            ₹${formattedNet}
                          </div>
                          <div style="color: #bfdbfe; font-size: 12px; font-weight: 500; margin-top: 6px; font-style: italic;">
                            Rupees ${wordsText} only
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 14px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="background-color: rgba(255, 255, 255, 0.12); border-radius: 6px; padding: 5px 12px; color: #e0f2fe; font-size: 11px; font-weight: 500;">
                                <span style="color: #4ade80; font-weight: 800; margin-right: 4px;">✓</span> Direct Deposit Transferred • Verified
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── 3-COLUMN METRICS BREAKDOWN ── -->
          <tr>
            <td style="padding: 0 36px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td width="33.33%" style="padding: 14px 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Gross Salary</div>
                    <div style="color: #0f172a; font-size: 16px; font-weight: 800;">₹${formattedGross}</div>
                  </td>
                  <td width="33.33%" style="padding: 14px 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Deductions</div>
                    <div style="color: #dc2626; font-size: 16px; font-weight: 800;">-₹${formattedDed}</div>
                  </td>
                  <td width="33.33%" style="padding: 14px 16px; text-align: center;">
                    <div style="color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Net Disbursed</div>
                    <div style="color: #059669; font-size: 16px; font-weight: 800;">₹${formattedNet}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── EMPLOYMENT & PAYROLL META ── -->
          <tr>
            <td style="padding: 0 36px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 18px;">
                    <span style="color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                      Employee &amp; Payroll Summary
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Left Column -->
                        <td width="50%" valign="top" style="padding-right: 12px;">
                          <div style="margin-bottom: 12px;">
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Employee Name</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 700;">${employeeName}</div>
                          </div>
                          <div style="margin-bottom: 12px;">
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Employee Code</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 700; font-family: monospace;">${employeeCode}</div>
                          </div>
                          <div>
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Designation</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 600;">${designation}</div>
                          </div>
                        </td>
                        <!-- Right Column -->
                        <td width="50%" valign="top" style="padding-left: 12px; border-left: 1px solid #f1f5f9;">
                          <div style="margin-bottom: 12px;">
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Department</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 600;">${department}</div>
                          </div>
                          <div style="margin-bottom: 12px;">
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Pay Period</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 700;">${period}</div>
                          </div>
                          <div>
                            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Worked Days</div>
                            <div style="color: #0f172a; font-size: 13px; font-weight: 700;">${workedDays} Days</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── PDF ATTACHMENT CARD ── -->
          <tr>
            <td style="padding: 0 36px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- PDF icon -->
                        <td width="48" valign="middle" style="padding-right: 14px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; width: 42px; height: 42px; text-align: center; line-height: 42px; color: #dc2626; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;">
                                PDF
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Text -->
                        <td valign="middle">
                          <div style="color: #0369a1; font-size: 13px; font-weight: 700; margin-bottom: 2px;">
                            Payslip-${safeCode}-${safePeriod}.pdf
                          </div>
                          <div style="color: #0284c7; font-size: 11.5px; line-height: 1.4;">
                            Official payslip document attached with itemized breakdown &amp; digital verification seal.
                          </div>
                        </td>
                        <!-- Attached Pill -->
                        <td align="right" valign="middle" style="padding-left: 10px;">
                          <span style="background-color: #0284c7; color: #ffffff; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; display: inline-block;">
                            Attached 📎
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIGITAL VERIFICATION NOTICE ── -->
          <tr>
            <td style="padding: 0 36px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="color: #047857; font-size: 11.5px; font-weight: 700; margin-bottom: 4px;">
                      🔒 Official Digital Verification &amp; Compliance
                    </div>
                    <div style="color: #64748b; font-size: 11px; line-height: 1.5;">
                      This payroll statement is electronically authenticated by PeoplePay360 Cloud HRMS. In accordance with electronic record regulations, this digitally stamped statement does not require physical signatures.
                    </div>
                    <div style="color: #059669; font-size: 10.5px; font-family: monospace; font-weight: 600; margin-top: 6px;">
                      Audit Ref: SHA256-${auditHash} • System Validated
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── NEED ASSISTANCE ── -->
          <tr>
            <td style="padding: 0 36px 22px;">
              <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
                <strong style="color: #334155;">Questions or discrepancies?</strong> If you have any inquiries regarding your earnings or deductions, please contact the HR department at <a href="mailto:workpurpose2007@gmail.com" style="color: #144f84; text-decoration: underline; font-weight: 600;">workpurpose2007@gmail.com</a> within 7 business days.
              </p>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f1f5f9; width: 100%;"></div>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding: 22px 36px 28px; text-align: center; background-color: #f8fafc;">
              <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 0 0 4px;">
                PeoplePay360 Cloud HRMS
              </p>
              <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 0 0 8px;">
                Automated HR, Attendance &amp; Payroll Management System<br>
                Generated on ${currentDate} • Strictly Confidential
              </p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 0;">
                © ${currentYear} PeoplePay360. All rights reserved. This email and its attachment are intended solely for ${employeeName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
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
      employeeCode,
      designation,
      department
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
