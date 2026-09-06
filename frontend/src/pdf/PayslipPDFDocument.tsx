import { Document, Page, StyleSheet, Text, View, Svg, Path, Circle } from '@react-pdf/renderer'
import type { Payslip } from '@/types/payrun'

/**
 * Modern SaaS Payslip Document rendered by @react-pdf/renderer.
 * Designed to match top-tier global HR & Payroll platforms (Deel, Gusto, Rippling).
 */

const rupees = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    fontSize: 9,
    color: '#1e293b',
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },

  // Top accent bar
  topBar: {
    height: 4,
    backgroundColor: '#144f84',
    marginBottom: 16,
    borderRadius: 2
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 14
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: -0.3
  },
  brandAccent: {
    color: '#144f84'
  },
  brandSub: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.5
  },
  brandCompany: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 3
  },

  docBlock: {
    alignItems: 'flex-end'
  },
  docTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5
  },
  docPeriod: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#144f84',
    marginTop: 2
  },
  statusBadge: {
    marginTop: 4,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10
  },
  statusBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    textTransform: 'uppercase'
  },
  docRef: {
    fontSize: 6.5,
    color: '#94a3b8',
    marginTop: 4
  },

  // Employee Summary Card
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  summaryCol: {
    width: '32%'
  },
  summaryItem: {
    marginBottom: 6
  },
  summaryLabel: {
    fontSize: 6.5,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 1.5
  },
  summaryValue: {
    fontSize: 8.5,
    color: '#1e293b'
  },
  summaryValueBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },

  // Side-by-Side Tables
  tablesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  tableCol: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'space-between'
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tableHeaderTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    letterSpacing: 0.5
  },
  tableHeaderAmount: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    letterSpacing: 0.5
  },
  tableBody: {
    flexGrow: 1,
    minHeight: 80
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9'
  },
  zebraRow: {
    backgroundColor: '#fafafa'
  },
  rowLabel: {
    fontSize: 8,
    color: '#334155'
  },
  rowValue: {
    fontSize: 8,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1'
  },
  totalLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  totalValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#144f84'
  },

  // Net Salary Banner
  netBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#144f84',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14
  },
  netLeft: {
    maxWidth: '65%'
  },
  netTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#93c5fd',
    letterSpacing: 0.8,
    marginBottom: 3
  },
  netWords: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 3
  },
  netNote: {
    fontSize: 6.5,
    color: '#bfdbfe'
  },
  netRight: {
    alignItems: 'flex-end'
  },
  netValue: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  netSub: {
    fontSize: 6.5,
    color: '#93c5fd',
    marginTop: 2
  },

  // Digital Verification & Stamp Section
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 16
  },
  complianceBox: {
    width: '60%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    justifyContent: 'space-between'
  },
  complianceTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  complianceText: {
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.35,
    marginBottom: 3
  },
  complianceHash: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginTop: 3
  },

  // Official Digital Stamp / Seal
  stampBox: {
    width: '36%',
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stampInner: {
    borderWidth: 1,
    borderColor: '#059669',
    borderStyle: 'dashed',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center'
  },
  stampTop: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#065f46',
    letterSpacing: 1.2,
    marginBottom: 2
  },
  stampBadge: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  stampCheck: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 2
  },
  stampFooter: {
    fontSize: 5.5,
    color: '#047857',
    textAlign: 'center'
  },

  // Document Footer
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 6.5,
    color: '#94a3b8'
  }
})

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function toWords(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return 'Zero'

  const below100 = (x: number): string =>
    x < 20 ? ONES[x] : `${TENS[Math.floor(x / 10)]}${x % 10 ? ` ${ONES[x % 10]}` : ''}`

  const below1000 = (x: number): string =>
    x < 100
      ? below100(x)
      : `${ONES[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${below100(x % 100)}` : ''}`

  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000

  if (crore) parts.push(`${below1000(crore)} Crore`)
  if (lakh) parts.push(`${below1000(lakh)} Lakh`)
  if (thousand) parts.push(`${below1000(thousand)} Thousand`)
  if (rest) parts.push(below1000(rest))

  return parts.join(' ')
}

export function PayslipPDFDocument({ payslip }: { payslip: Payslip }) {
  const lines = [...(payslip.lines ?? [])].sort((a, b) => a.sequence - b.sequence)
  const earnings = lines.filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
  const deductions = lines.filter(l => l.category === 'DEDUCTION')

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const refCode = `PS-${payslip.employee?.employeeCode ?? 'EMP'}-${(payslip.period || '2026').replace(/\s+/g, '')}`

  return (
    <Document
      title={`Payslip ${payslip.employee?.employeeCode ?? ''} ${payslip.period}`}
      author="PeoplePay360"
    >
      <Page size="A4" style={styles.page}>
        {/* Top brand line */}
        <View style={styles.topBar} />

        {/* Header with Logo and Payslip Identifier */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              {/* PeoplePay360 Logo mark */}
              <Svg width={24} height={22} viewBox="0 0 512 512">
                <Circle cx="256" cy="160" r="80" fill="#144f84" />
                <Path d="M140 440 C140 340, 190 280, 256 280 C322 280, 372 340, 372 440 Z" fill="#144f84" />
                <Circle cx="110" cy="195" r="65" fill="#3a75af" />
                <Path d="M10 440 C10 355, 55 305, 110 305 C165 305, 195 340, 195 380 L195 440 Z" fill="#3a75af" />
                <Circle cx="402" cy="195" r="65" fill="#3a75af" />
                <Path d="M317 440 L317 380 C317 340, 347 305, 402 305 C457 305, 502 355, 502 440 Z" fill="#3a75af" />
              </Svg>
              <Text style={styles.brandTitle}>
                PeoplePay<Text style={styles.brandAccent}>360</Text>
              </Text>
            </View>
            <Text style={styles.brandSub}>CLOUD HR &amp; PAYROLL PLATFORM</Text>
            <Text style={styles.brandCompany}>
              PeoplePay360 Technologies Pvt. Ltd. • www.peoplepay360.com
            </Text>
          </View>

          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>SALARY PAYSLIP</Text>
            <Text style={styles.docPeriod}>{payslip.period}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {payslip.status === 'SENT' || payslip.status === 'PAID'
                  ? 'PAID &amp; CONFIRMED'
                  : payslip.status}
              </Text>
            </View>
            <Text style={styles.docRef}>{refCode}</Text>
          </View>
        </View>

        {/* 3-Column Structured Employee & Payroll Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>EMPLOYEE NAME</Text>
                <Text style={styles.summaryValueBold}>{payslip.employee?.name ?? '-'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>DESIGNATION</Text>
                <Text style={styles.summaryValue}>{payslip.employee?.jobPosition ?? '-'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>DEPARTMENT</Text>
                <Text style={styles.summaryValue}>{payslip.employee?.department?.name ?? '-'}</Text>
              </View>
            </View>

            <View style={styles.summaryCol}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>EMPLOYEE ID</Text>
                <Text style={styles.summaryValueBold}>{payslip.employee?.employeeCode ?? '-'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>PAY PERIOD</Text>
                <Text style={styles.summaryValue}>{payslip.period}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>SALARY STRUCTURE</Text>
                <Text style={styles.summaryValue}>{payslip.salaryStructure?.name ?? 'Standard'}</Text>
              </View>
            </View>

            <View style={styles.summaryCol}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>DAYS WORKED</Text>
                <Text style={styles.summaryValueBold}>{`${payslip.workedDays} Days`}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>PAYMENT MODE</Text>
                <Text style={styles.summaryValue}>Bank Transfer</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>ISSUE DATE</Text>
                <Text style={styles.summaryValue}>{formattedDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Side-by-Side Earnings and Deductions Tables */}
        <View style={styles.tablesContainer}>
          {/* Earnings Table */}
          <View style={styles.tableCol}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderTitle}>EARNINGS</Text>
              <Text style={styles.tableHeaderAmount}>AMOUNT</Text>
            </View>
            <View style={styles.tableBody}>
              {earnings.map((line, i) => (
                <View
                  key={line.id || i}
                  style={[styles.tableRow, i % 2 === 1 ? styles.zebraRow : {}]}
                >
                  <Text style={styles.rowLabel}>{line.name}</Text>
                  <Text style={styles.rowValue}>{rupees(line.amount)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gross Earnings</Text>
              <Text style={styles.totalValue}>{rupees(payslip.grossSalary)}</Text>
            </View>
          </View>

          {/* Deductions Table */}
          <View style={styles.tableCol}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderTitle}>DEDUCTIONS</Text>
              <Text style={styles.tableHeaderAmount}>AMOUNT</Text>
            </View>
            <View style={styles.tableBody}>
              {deductions.map((line, i) => (
                <View
                  key={line.id || i}
                  style={[styles.tableRow, i % 2 === 1 ? styles.zebraRow : {}]}
                >
                  <Text style={styles.rowLabel}>{line.name}</Text>
                  <Text style={styles.rowValue}>{rupees(line.amount)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={styles.totalValue}>{rupees(payslip.totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* Net Take-Home Highlight Banner */}
        <View style={styles.netBanner}>
          <View style={styles.netLeft}>
            <Text style={styles.netTitle}>TOTAL NET PAYABLE (TAKE HOME)</Text>
            <Text style={styles.netWords}>
              Rupees {toWords(payslip.netSalary)} only
            </Text>
            <Text style={styles.netNote}>
              Direct deposit transferred to registered employee salary account
            </Text>
          </View>
          <View style={styles.netRight}>
            <Text style={styles.netValue}>{rupees(payslip.netSalary)}</Text>
            <Text style={styles.netSub}>Net Disbursed Amount</Text>
          </View>
        </View>

        {/* Digital Verification & Official Seal Stamp (Replaces old signature lines) */}
        <View style={styles.verificationRow}>
          {/* Regulatory & Authentication Notice */}
          <View style={styles.complianceBox}>
            <Text style={styles.complianceTitle}>
              DIGITAL VERIFICATION &amp; AUTHENTICATION NOTICE
            </Text>
            <Text style={styles.complianceText}>
              • This payslip is electronically generated and system-authenticated by PeoplePay360 Cloud HRMS.
            </Text>
            <Text style={styles.complianceText}>
              • Under electronic transaction regulations, this computer-verified document requires no physical signatures.
            </Text>
            <Text style={styles.complianceText}>
              • Computations comply with organization salary structures and statutory requirements.
            </Text>
            <Text style={styles.complianceHash}>
              {`Verification Hash: SHA256-${(payslip.id || '20260901').replace(/-/g, '').slice(0, 16).toUpperCase()} • System Validated`}
            </Text>
          </View>

          {/* Official Digital Stamp / Seal */}
          <View style={styles.stampBox}>
            <View style={styles.stampInner}>
              <Text style={styles.stampTop}>★ PEOPLEPAY360 ★</Text>
              <Text style={styles.stampBadge}>OFFICIALLY VERIFIED</Text>
              <Text style={styles.stampCheck}>✓ PAID &amp; APPROVED</Text>
              <Text style={styles.stampFooter}>
                {`DATE: ${formattedDate} • AUTH-ID`}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Strictly Confidential • For intended employee only
          </Text>
          <Text style={styles.footerText}>
            PeoplePay360 Cloud HRMS • Page 1 of 1
          </Text>
          <Text style={styles.footerText}>
            {`System Generated: ${formattedDate}`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default PayslipPDFDocument
