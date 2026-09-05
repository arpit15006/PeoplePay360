import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Payslip } from '@/types/payrun'

/**
 * PRD Screen 15 — a real PDF document, rendered by @react-pdf/renderer.
 *
 * The spec is explicit that this must be an actual PDF file rather than a print
 * dialog or an HTML popup, so this builds a document tree rather than styling
 * the page for printing.
 */

// The rupee glyph is not in the default PDF font, so amounts use "Rs." instead
// of the symbol to avoid rendering as a blank box.
const rupees = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    paddingBottom: 10,
    marginBottom: 16
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  brandSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  docSub: { fontSize: 9, color: '#64748b', marginTop: 2, textAlign: 'right' },

  metaBox: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metaCell: { width: '50%', marginBottom: 6 },
  metaLabel: { fontSize: 8, color: '#64748b' },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },

  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f1f5f9',
    padding: 6,
    marginTop: 10
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1'
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  netBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    padding: 10,
    marginTop: 14
  },
  netLabel: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  netValue: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 13 },
  words: { fontSize: 8, color: '#475569', marginTop: 8, fontStyle: 'italic' },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  signBlock: { width: '40%', borderTopWidth: 0.5, borderTopColor: '#94a3b8', paddingTop: 4 },
  signLabel: { fontSize: 8, color: '#64748b', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 7, color: '#94a3b8', textAlign: 'center' }
})

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

/** Indian numbering (lakh / crore), used for the "net pay in words" line. */
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

  const meta: [string, string][] = [
    ['Employee', payslip.employee?.name ?? '-'],
    ['Employee Code', payslip.employee?.employeeCode ?? '-'],
    ['Designation', payslip.employee?.jobPosition ?? '-'],
    ['Department', payslip.employee?.department?.name ?? '-'],
    ['Salary Structure', payslip.salaryStructure?.name ?? '-'],
    ['Pay Period', payslip.period],
    ['Worked Days', String(payslip.workedDays)],
    ['Status', payslip.status]
  ]

  return (
    <Document
      title={`Payslip ${payslip.employee?.employeeCode ?? ''} ${payslip.period}`}
      author='PeoplePay360'
    >
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PEOPLEPAY360</Text>
            <Text style={styles.brandSub}>HR &amp; Payroll</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>PAYSLIP</Text>
            <Text style={styles.docSub}>{payslip.period}</Text>
          </View>
        </View>

        <View style={styles.metaBox}>
          {meta.map(([label, value]) => (
            <View key={label} style={styles.metaCell}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Earnings</Text>
        {earnings.map(line => (
          <View key={line.id} style={styles.row}>
            <Text>{line.name}</Text>
            <Text>{rupees(line.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.bold}>Gross Salary</Text>
          <Text style={styles.bold}>{rupees(payslip.grossSalary)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Deductions</Text>
        {deductions.map(line => (
          <View key={line.id} style={styles.row}>
            <Text>{line.name}</Text>
            <Text>{rupees(line.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.bold}>Total Deductions</Text>
          <Text style={styles.bold}>{rupees(payslip.totalDeductions)}</Text>
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>NET SALARY</Text>
          <Text style={styles.netValue}>{rupees(payslip.netSalary)}</Text>
        </View>
        <Text style={styles.words}>
          Rupees {toWords(payslip.netSalary)} only
        </Text>

        <View style={styles.signatures}>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>Employee Signature</Text>
          </View>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>Authorised Signatory</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Computer generated payslip from PeoplePay360. Generated on{' '}
          {new Date().toLocaleDateString('en-GB')}.
        </Text>
      </Page>
    </Document>
  )
}

export default PayslipPDFDocument
