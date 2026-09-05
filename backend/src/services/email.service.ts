import nodemailer from 'nodemailer';
import prisma from '../config/db';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PayrunStatus, PayslipStatus } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
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
    });
    console.log(`[Email Service] Using Ethereal Test Account: ${testAccount.user}`);
  }

  return transporter;
}

export class EmailService {
  /**
   * Send a single payslip email to an employee.
   */
  static async sendPayslipEmail(
    toEmail: string,
    employeeName: string,
    period: string,
    netSalary: number,
    lines: { name: string; amount: number; category: string }[]
  ) {
    const transport = await getTransporter();

    const earnings = lines.filter((l) => l.category === 'BASIC' || l.category === 'ALLOWANCE');
    const deductions = lines.filter((l) => l.category === 'DEDUCTION');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; margin-bottom: 4px;">PeoplePay360 Payslip</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 0;">Period: <strong>${period}</strong></p>
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>Your payslip for <strong>${period}</strong> is now available.</p>

        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">Earnings</h3>
          ${earnings.map((e) => `<div style="display: flex; justify-content: space-between; padding: 4px 0;"><span>${e.name}:</span><strong>₹${e.amount.toLocaleString('en-IN')}</strong></div>`).join('')}

          <h3 style="color: #0f172a; margin-top: 16px;">Deductions</h3>
          ${deductions.map((d) => `<div style="display: flex; justify-content: space-between; padding: 4px 0; color: #dc2626;"><span>${d.name}:</span><strong>-₹${d.amount.toLocaleString('en-IN')}</strong></div>`).join('')}

          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 12px 0;" />
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #16a34a;">
            <span>Net Take-Home Salary:</span>
            <span>₹${netSalary.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p style="color: #64748b; font-size: 12px;">This is an automated communication from PeoplePay360. Please do not reply directly to this email.</p>
      </div>
    `;

    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: `Your Payslip for ${period} — PeoplePay360`,
      html: htmlContent,
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
            employee: true,
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw new NotFoundError('Payrun');

    if (payrun.status !== PayrunStatus.PAID && payrun.status !== PayrunStatus.VALIDATED) {
      throw new ValidationError(`Cannot send payslips for a payrun with status '${payrun.status}'. Payrun must be VALIDATED or PAID.`);
    }

    const results = [];

    for (const payslip of payrun.payslips) {
      try {
        const sendResult = await this.sendPayslipEmail(
          payslip.employee.email,
          payslip.employee.name,
          payslip.period,
          payslip.netSalary,
          payslip.lines
        );

        // Update sent status
        await prisma.payslip.update({
          where: { id: payslip.id },
          data: {
            status: PayslipStatus.SENT,
            sentAt: new Date(),
          },
        });

        results.push({
          employee: payslip.employee.name,
          email: payslip.employee.email,
          success: true,
          previewUrl: sendResult.previewUrl || null,
        });
      } catch (err) {
        results.push({
          employee: payslip.employee.name,
          email: payslip.employee.email,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    // Update payrun status to SENT
    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: PayrunStatus.SENT },
    });

    emitEvent(SocketEvents.PAYRUN_STATUS_CHANGED, { id: payrunId, status: PayrunStatus.SENT });

    return {
      payrunId,
      totalSent: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      details: results,
    };
  }
}
