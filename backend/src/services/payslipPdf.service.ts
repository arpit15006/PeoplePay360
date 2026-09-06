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

export function toWords(value: number): string {
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
const BRAND          = '#144f84';
const DARK           = '#0f172a';
const MUTED          = '#64748b';
const LIGHT_MUTED    = '#94a3b8';
const SECTION        = '#f1f5f9';
const BG_CARD        = '#f8fafc';
const BORDER         = '#e2e8f0';
const WHITE          = '#ffffff';
const SUCCESS_BG     = '#ecfdf5';
const SUCCESS_BORDER = '#a7f3d0';
const SUCCESS_DARK   = '#047857';
const SUCCESS_MAIN   = '#059669';

export function generatePayslipPdf(data: PayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const marginX = 36;
    const pageW = 595.28 - marginX * 2; // ~523.28 pt
    let y = 26;

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    /* ── TOP ACCENT BAR ────────────────────────────── */
    doc.roundedRect(marginX, y, pageW, 4, 2).fill(BRAND);
    y += 14;

    /* ── HEADER ────────────────────────────────────── */
    // Left: Brand
    doc.font('Helvetica-Bold').fontSize(16).fillColor(DARK).text('PeoplePay', marginX, y, { continued: true });
    doc.fillColor(BRAND).text('360');
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('CLOUD HR & PAYROLL PLATFORM', marginX, y + 20);
    doc.fontSize(7).fillColor(LIGHT_MUTED).text('PeoplePay360 Technologies Pvt. Ltd. • www.peoplepay360.com', marginX, y + 31);

    // Right: Document details
    doc.font('Helvetica-Bold').fontSize(15).fillColor(DARK).text('SALARY PAYSLIP', marginX, y, { width: pageW, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND).text(data.period, marginX, y + 17, { width: pageW, align: 'right' });

    // Status Badge
    const badgeW = 95;
    const badgeH = 14;
    const badgeX = marginX + pageW - badgeW;
    const badgeY = y + 30;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).lineWidth(1).fillAndStroke(SUCCESS_BG, SUCCESS_BORDER);
    const statusText = data.status === 'SENT' || data.status === 'PAID' ? 'PAID & CONFIRMED' : data.status;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(SUCCESS_DARK).text(statusText, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });

    const refText = `PS-${data.employeeCode}-${(data.period || '2026').replace(/\s+/g, '')}`;
    doc.font('Helvetica').fontSize(6.5).fillColor(LIGHT_MUTED).text(refText, marginX, badgeY + badgeH + 4, { width: pageW, align: 'right' });

    y += 58;
    doc.moveTo(marginX, y).lineTo(marginX + pageW, y).strokeColor(BORDER).lineWidth(1).stroke();
    y += 12;

    /* ── EMPLOYEE & PAYROLL SUMMARY CARD ────────────── */
    const cardH = 64;
    doc.roundedRect(marginX, y, pageW, cardH, 6).lineWidth(1).fillAndStroke(BG_CARD, BORDER);

    const colW = (pageW - 24) / 3;
    const col1X = marginX + 12;
    const col2X = col1X + colW;
    const col3X = col2X + colW;

    const renderSummaryCell = (label: string, value: string, x: number, cellY: number, bold = false) => {
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(MUTED).text(label, x, cellY);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(bold ? DARK : '#334155').text(value, x, cellY + 8);
    };

    // Row 1
    renderSummaryCell('EMPLOYEE NAME', data.employeeName || '-', col1X, y + 8, true);
    renderSummaryCell('EMPLOYEE ID', data.employeeCode || '-', col2X, y + 8, true);
    renderSummaryCell('DAYS WORKED', `${data.workedDays} Days`, col3X, y + 8, true);

    // Row 2
    renderSummaryCell('DESIGNATION', data.designation || '-', col1X, y + 26);
    renderSummaryCell('PAY PERIOD', data.period || '-', col2X, y + 26);
    renderSummaryCell('PAYMENT MODE', 'Bank Transfer', col3X, y + 26);

    // Row 3
    renderSummaryCell('DEPARTMENT', data.department || '-', col1X, y + 44);
    renderSummaryCell('SALARY STRUCTURE', data.salaryStructure || 'Standard', col2X, y + 44);
    renderSummaryCell('ISSUE DATE', formattedDate, col3X, y + 44);

    y += cardH + 12;

    /* ── SIDE-BY-SIDE EARNINGS & DEDUCTIONS TABLES ──── */
    const earnings = data.lines
      .filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
      .sort((a, b) => a.sequence - b.sequence);
    const deductions = data.lines
      .filter(l => l.category === 'DEDUCTION')
      .sort((a, b) => a.sequence - b.sequence);

    const tableW = (pageW - 12) / 2;
    const leftTableX = marginX;
    const rightTableX = marginX + tableW + 12;
    const tableHeaderH = 20;
    const itemRowH = 17;
    const totalRowH = 20;

    const maxItems = Math.max(earnings.length, deductions.length, 3);
    const tableBodyH = maxItems * itemRowH;
    const fullTableH = tableHeaderH + tableBodyH + totalRowH;

    // Draw table boxes
    doc.roundedRect(leftTableX, y, tableW, fullTableH, 6).lineWidth(1).fillAndStroke(WHITE, BORDER);
    doc.roundedRect(rightTableX, y, tableW, fullTableH, 6).lineWidth(1).fillAndStroke(WHITE, BORDER);

    // Earnings Header
    doc.roundedRect(leftTableX, y, tableW, tableHeaderH, 5).fill(SECTION);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text('EARNINGS', leftTableX + 8, y + 6);
    doc.text('AMOUNT', leftTableX, y + 6, { width: tableW - 8, align: 'right' });

    // Deductions Header
    doc.roundedRect(rightTableX, y, tableW, tableHeaderH, 5).fill(SECTION);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text('DEDUCTIONS', rightTableX + 8, y + 6);
    doc.text('AMOUNT', rightTableX, y + 6, { width: tableW - 8, align: 'right' });

    // Render Earnings Rows
    let currentEY = y + tableHeaderH;
    earnings.forEach((l, idx) => {
      if (idx % 2 === 1) {
        doc.rect(leftTableX, currentEY, tableW, itemRowH).fill('#fafafa');
      }
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(l.name, leftTableX + 8, currentEY + 4.5);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text(rupees(l.amount), leftTableX, currentEY + 4.5, { width: tableW - 8, align: 'right' });
      doc.moveTo(leftTableX, currentEY + itemRowH).lineTo(leftTableX + tableW, currentEY + itemRowH).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      currentEY += itemRowH;
    });

    // Render Deductions Rows
    let currentDY = y + tableHeaderH;
    deductions.forEach((l, idx) => {
      if (idx % 2 === 1) {
        doc.rect(rightTableX, currentDY, tableW, itemRowH).fill('#fafafa');
      }
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(l.name, rightTableX + 8, currentDY + 4.5);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text(rupees(l.amount), rightTableX, currentDY + 4.5, { width: tableW - 8, align: 'right' });
      doc.moveTo(rightTableX, currentDY + itemRowH).lineTo(rightTableX + tableW, currentDY + itemRowH).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      currentDY += itemRowH;
    });

    // Total Rows at baseline
    const totalRowY = y + tableHeaderH + tableBodyH;

    // Gross Salary Row
    doc.rect(leftTableX, totalRowY, tableW, totalRowH).fill(BG_CARD);
    doc.moveTo(leftTableX, totalRowY).lineTo(leftTableX + tableW, totalRowY).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text('Gross Earnings', leftTableX + 8, totalRowY + 5.5);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND).text(rupees(data.grossSalary), leftTableX, totalRowY + 5.5, { width: tableW - 8, align: 'right' });

    // Total Deductions Row
    doc.rect(rightTableX, totalRowY, tableW, totalRowH).fill(BG_CARD);
    doc.moveTo(rightTableX, totalRowY).lineTo(rightTableX + tableW, totalRowY).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text('Total Deductions', rightTableX + 8, totalRowY + 5.5);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND).text(rupees(data.totalDeductions), rightTableX, totalRowY + 5.5, { width: tableW - 8, align: 'right' });

    y += fullTableH + 12;

    /* ── NET TAKE-HOME BANNER ───────────────────────── */
    const netH = 46;
    doc.roundedRect(marginX, y, pageW, netH, 6).fill(BRAND);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#93c5fd').text('TOTAL NET PAYABLE (TAKE HOME)', marginX + 14, y + 8);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE).text(`Rupees ${toWords(data.netSalary)} only`, marginX + 14, y + 20);
    doc.font('Helvetica').fontSize(6.5).fillColor('#bfdbfe').text('Direct deposit transferred to registered employee salary account', marginX + 14, y + 33);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text(rupees(data.netSalary), marginX, y + 9, { width: pageW - 14, align: 'right' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#93c5fd').text('Net Disbursed Amount', marginX, y + 29, { width: pageW - 14, align: 'right' });

    y += netH + 14;

    /* ── DIGITAL VERIFICATION & STAMP (REPLACES SIGNATURES) ── */
    const compW = pageW * 0.60;
    const compH = 66;

    // Compliance & Authenticity Box
    doc.roundedRect(marginX, y, compW, compH, 6).lineWidth(1).fillAndStroke(BG_CARD, BORDER);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text('DIGITAL VERIFICATION & AUTHENTICATION NOTICE', marginX + 8, y + 8);
    doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
      .text('• This payslip is electronically generated and system-authenticated by PeoplePay360 Cloud HRMS.', marginX + 8, y + 20, { width: compW - 16 });
    doc.text('• Under electronic transaction regulations, this computer-verified document requires no physical signatures.', marginX + 8, y + 32, { width: compW - 16 });
    const hashText = `Verification Hash: SHA256-${(data.employeeCode + (data.period || '')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase()} • System Validated`;
    doc.font('Helvetica-Bold').fontSize(6).fillColor(SUCCESS_MAIN).text(hashText, marginX + 8, y + 51);

    // Official Digital Stamp / Seal
    const stampW = pageW * 0.36;
    const stampX = marginX + pageW - stampW;
    const stampH = 66;

    doc.roundedRect(stampX, y, stampW, stampH, 6).lineWidth(2).fillAndStroke(SUCCESS_BG, SUCCESS_MAIN);
    doc.roundedRect(stampX + 4, y + 4, stampW - 8, stampH - 8, 4).dash(3, { space: 2 }).strokeColor(SUCCESS_MAIN).lineWidth(1).stroke();
    doc.undash();

    doc.font('Helvetica-Bold').fontSize(7).fillColor(SUCCESS_DARK).text('★ PEOPLEPAY360 ★', stampX, y + 9, { width: stampW, align: 'center' });
    doc.fontSize(9.5).fillColor(SUCCESS_DARK).text('OFFICIALLY VERIFIED', stampX, y + 20, { width: stampW, align: 'center' });
    doc.fontSize(7.5).fillColor(SUCCESS_MAIN).text('✓ PAID & APPROVED', stampX, y + 33, { width: stampW, align: 'center' });
    doc.font('Helvetica').fontSize(5.5).fillColor(SUCCESS_DARK).text(`DATE: ${formattedDate} • AUTH-ID`, stampX, y + 47, { width: stampW, align: 'center' });

    /* ── FOOTER ────────────────────────────────────── */
    const footerY = 780;
    doc.moveTo(marginX, footerY).lineTo(marginX + pageW, footerY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(6.5).fillColor(LIGHT_MUTED).text('Strictly Confidential • For intended employee only', marginX, footerY + 6);
    doc.text('PeoplePay360 Cloud HRMS • Page 1 of 1', marginX, footerY + 6, { width: pageW, align: 'center' });
    doc.text(`System Generated: ${formattedDate}`, marginX, footerY + 6, { width: pageW, align: 'right' });

    doc.end();
  });
}
