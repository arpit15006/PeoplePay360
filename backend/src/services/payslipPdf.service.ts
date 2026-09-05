import PDFDocument from 'pdfkit';

/* ------------------------------------------------------------------ */
/*  Payslip PDF Generator — matches the @react-pdf/renderer layout    */
/*  used on the frontend (PRD Screen 15).                             */
/* ------------------------------------------------------------------ */

interface PayslipLine {
  name: string;
  amount: number;
  category: string;
  sequence: number;
}

interface PayslipData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  salaryStructure: string;
  period: string;
  workedDays: number;
  status: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  lines: PayslipLine[];
}

/* Indian numbering — lakh / crore */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'Zero';

  const below100 = (x: number): string =>
    x < 20 ? ONES[x] : `${TENS[Math.floor(x / 10)]}${x % 10 ? ` ${ONES[x % 10]}` : ''}`;

  const below1000 = (x: number): string =>
    x < 100
      ? below100(x)
      : `${ONES[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${below100(x % 100)}` : ''}`;

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));

  return parts.join(' ');
}

const rupees = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;

/* Colours — matching the frontend PDF */
const BRAND   = '#144f84';
const DARK    = '#0f172a';
const MUTED   = '#64748b';
const SECTION = '#f1f5f9';
const BORDER  = '#e2e8f0';
const WHITE   = '#ffffff';

export function generatePayslipPdf(data: PayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = 595.28 - 72; // A4 width minus margins
    const leftCol = 0;
    const rightCol = pageW / 2;
    let y = doc.y;

    /* ── HEADER ────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND).text('PEOPLEPAY360', 36, y);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('HR & Payroll', 36, doc.y);

    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK)
      .text('PAYSLIP', 36, y, { align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(data.period, 36, doc.y, { align: 'right' });

    y = doc.y + 6;
    doc.moveTo(36, y).lineTo(36 + pageW, y).strokeColor(BRAND).lineWidth(2).stroke();
    y += 14;

    /* ── META GRID ─────────────────────────────────── */
    const metaItems: [string, string][] = [
      ['Employee', data.employeeName],
      ['Employee Code', data.employeeCode],
      ['Designation', data.designation],
      ['Department', data.department],
      ['Salary Structure', data.salaryStructure],
      ['Pay Period', data.period],
      ['Worked Days', String(data.workedDays)],
      ['Status', data.status],
    ];

    metaItems.forEach(([label, value], i) => {
      const x = 36 + (i % 2 === 0 ? leftCol : rightCol);
      if (i % 2 === 0 && i > 0) y += 24;
      doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(label, x, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(value, x, y + 9);
    });

    y = doc.y + 20;

    /* ── TABLE HELPERS ─────────────────────────────── */
    const drawSectionHeader = (title: string) => {
      doc.rect(36, y, pageW, 20).fill(SECTION);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(title, 42, y + 5);
      y += 24;
    };

    const drawRow = (label: string, amount: string, bold = false) => {
      const font = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(10).fillColor(DARK).text(label, 42, y + 3);
      doc.font(font).fontSize(10).fillColor(DARK).text(amount, 36, y + 3, { align: 'right' });
      if (!bold) {
        doc.moveTo(42, y + 17).lineTo(36 + pageW - 6, y + 17)
          .strokeColor(BORDER).lineWidth(0.5).stroke();
      }
      y += 20;
    };

    const drawTotalRow = (label: string, amount: string) => {
      doc.moveTo(42, y).lineTo(36 + pageW - 6, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
      y += 4;
      drawRow(label, amount, true);
    };

    /* ── EARNINGS ──────────────────────────────────── */
    const earnings = data.lines
      .filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
      .sort((a, b) => a.sequence - b.sequence);
    const deductions = data.lines
      .filter(l => l.category === 'DEDUCTION')
      .sort((a, b) => a.sequence - b.sequence);

    drawSectionHeader('Earnings');
    earnings.forEach(l => drawRow(l.name, rupees(l.amount)));
    drawTotalRow('Gross Salary', rupees(data.grossSalary));

    y += 6;

    /* ── DEDUCTIONS ────────────────────────────────── */
    drawSectionHeader('Deductions');
    deductions.forEach(l => drawRow(l.name, rupees(l.amount)));
    drawTotalRow('Total Deductions', rupees(data.totalDeductions));

    y += 10;

    /* ── NET SALARY BOX ────────────────────────────── */
    doc.rect(36, y, pageW, 32).fill(BRAND);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
      .text('NET SALARY', 54, y + 9);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE)
      .text(rupees(data.netSalary), 36, y + 8, { width: pageW - 18, align: 'right' });
    y += 38;

    /* ── AMOUNT IN WORDS ───────────────────────────── */
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#475569')
      .text(`Rupees ${toWords(data.netSalary)} only`, 36, y);
    y += 20;

    /* ── SIGNATURES ────────────────────────────────── */
    y = Math.max(y + 30, 680);
    const sigWidth = pageW * 0.4;
    // Left
    doc.moveTo(36, y).lineTo(36 + sigWidth, y).strokeColor('#94a3b8').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Employee Signature', 36, y + 4, { width: sigWidth, align: 'center' });
    // Right
    const rSigX = 36 + pageW - sigWidth;
    doc.moveTo(rSigX, y).lineTo(rSigX + sigWidth, y).strokeColor('#94a3b8').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Authorised Signatory', rSigX, y + 4, { width: sigWidth, align: 'center' });

    /* ── FOOTER ────────────────────────────────────── */
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
      .text(
        `Computer generated payslip from PeoplePay360. Generated on ${new Date().toLocaleDateString('en-GB')}.`,
        36, 780, { width: pageW, align: 'center' }
      );

    doc.end();
  });
}
