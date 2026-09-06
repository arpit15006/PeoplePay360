import { ContractStatus, EmployeeStatus, EmployeeType, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Adds a workforce to whatever is already there.
 *
 * Unlike prisma/seed.ts this never deletes anything — it appends, continuing
 * the employee codes from the highest already in use, so the demo records keep
 * their place and can be run more than once.
 *
 * Everyone gets a login, a department, a schedule, an active contract, bank
 * details, a reporting line and leave balances — an employee missing any of
 * those is not merely thinner, they break something: no contract means they
 * cannot be paid, no bank details means the payrun refuses to finalise, and no
 * allocation means they cannot request leave.
 *
 * Re-running it fills in anything a previous run left blank.
 *
 *   npm run seed:bulk           200 employees
 *   npm run seed:bulk -- 500    a different number
 *   npm run seed:bulk -- --undo removes everyone this script created
 */

const prisma = new PrismaClient();

/** The domain marks these as generated, so --undo can find them again. */
const DOMAIN = 'staff.peoplepay360.com';

const FIRST = [
  'Aditi', 'Rohit', 'Kavya', 'Vikram', 'Neha', 'Arjun', 'Sneha', 'Karthik', 'Pooja', 'Manish',
  'Divya', 'Siddharth', 'Ritu', 'Ananth', 'Meghna', 'Rahul', 'Shreya', 'Nikhil', 'Anjali', 'Varun',
  'Ishita', 'Gaurav', 'Tanvi', 'Sandeep', 'Nandini', 'Akash', 'Preeti', 'Yash', 'Swati', 'Rakesh',
  'Lakshmi', 'Deepak', 'Aarti', 'Naveen', 'Payal', 'Suresh', 'Bhavana', 'Vivek', 'Rashmi', 'Ajay',
];

const LAST = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Kulkarni', 'Menon', 'Chatterjee', 'Bose',
  'Desai', 'Joshi', 'Malhotra', 'Rao', 'Pillai', 'Banerjee', 'Kapoor', 'Mishra', 'Sinha', 'Ghosh',
];

/** Job titles by department, so a Finance record does not read like Engineering. */
const ROLES_BY_DEPT: Record<string, string[]> = {
  Engineering: [
    'Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer',
    'Frontend Engineer', 'Backend Engineer', 'Engineering Manager',
  ],
  Sales: ['Sales Executive', 'Account Manager', 'Regional Sales Lead', 'Sales Development Rep'],
  'Human Resources': ['HR Executive', 'Recruiter', 'HR Business Partner', 'Talent Coordinator'],
  'Finance & Payroll': ['Accountant', 'Payroll Analyst', 'Finance Executive', 'Financial Controller'],
  Marketing: ['Marketing Executive', 'Content Strategist', 'Brand Manager', 'SEO Specialist'],
};

const DEFAULT_ROLES = ['Associate', 'Executive', 'Specialist'];

/** Real Indian bank codes, so the IFSC values look like the real thing. */
const BANKS: { name: string; code: string }[] = [
  { name: 'HDFC Bank', code: 'HDFC' },
  { name: 'ICICI Bank', code: 'ICIC' },
  { name: 'State Bank of India', code: 'SBIN' },
  { name: 'Axis Bank', code: 'UTIB' },
  { name: 'Kotak Mahindra Bank', code: 'KKBK' },
  { name: 'Punjab National Bank', code: 'PUNB' },
  { name: 'Bank of Baroda', code: 'BARB' },
  { name: 'Canara Bank', code: 'CNRB' },
];

/**
 * Bank details in the shape payroll expects.
 *
 * Not decoration: a payrun refuses to finalise while any of the three is
 * blank, so a workforce seeded without them produces a warning per employee
 * and nothing can be paid.
 *
 * IFSC is four letters for the bank, a zero, then six characters for the
 * branch — the real format, with invented branches.
 */
function bankDetailsFor(rng: () => number): {
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
} {
  const bank = pick(rng, BANKS);
  const branch = String(Math.floor(rng() * 900000) + 100000);
  const account = Array.from({ length: 12 }, () => Math.floor(rng() * 10)).join('');
  return {
    bankName: bank.name,
    bankAccountNumber: account,
    ifscCode: `${bank.code}0${branch}`,
  };
}

/**
 * A small deterministic generator.
 *
 * Seeded so two runs produce the same people: a demo that looks different every
 * time it is reset is harder to talk about, and a bug that only appears for one
 * particular row should be reproducible.
 */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = <T>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length)];

/** A wage that varies by title rather than being uniform noise. */
function wageFor(rng: () => number, title: string): number {
  const senior = /Senior|Manager|Lead|Controller|Partner/.test(title);
  const base = senior ? 85_000 : 38_000;
  const spread = senior ? 55_000 : 32_000;
  // Rounded to the nearest five hundred, the way real salaries are set.
  return Math.round((base + rng() * spread) / 500) * 500;
}

async function undo(): Promise<void> {
  const generated = await prisma.employee.findMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
    select: { id: true },
  });
  const ids = generated.map((e) => e.id);
  if (ids.length === 0) {
    console.log('Nothing to remove — no generated employees found.');
    return;
  }

  // Payslips are pay history and are never deleted by a seeding script, so a
  // generated employee who somehow has one is left alone rather than silently
  // taking their payslip with them.
  const paid = await prisma.payslip.findMany({
    where: { employeeId: { in: ids } },
    select: { employeeId: true },
  });
  const protectedIds = new Set(paid.map((p) => p.employeeId));
  const removable = ids.filter((id) => !protectedIds.has(id));

  await prisma.$transaction([
    prisma.attendanceSession.deleteMany({ where: { attendance: { employeeId: { in: removable } } } }),
    prisma.attendance.deleteMany({ where: { employeeId: { in: removable } } }),
    prisma.timeOffRequest.deleteMany({ where: { employeeId: { in: removable } } }),
    prisma.timeOffAllocation.deleteMany({ where: { employeeId: { in: removable } } }),
    prisma.contract.deleteMany({ where: { employeeId: { in: removable } } }),
    prisma.user.deleteMany({ where: { employeeId: { in: removable } } }),
    prisma.employee.deleteMany({ where: { id: { in: removable } } }),
  ]);

  console.log(`Removed ${removable.length} generated employee(s).`);
  if (protectedIds.size > 0) {
    console.log(`Kept ${protectedIds.size} that already have payslips.`);
  }
}

/**
 * Fills in the parts of a record that are not created with the employee.
 *
 * Runs over everyone this script has ever made, not just the batch that was
 * added this time, so an earlier run that predates these fields is brought up
 * to date rather than needing a wipe and re-seed.
 */
async function enrich(rng: () => number): Promise<void> {
  const generated = await prisma.employee.findMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
    select: {
      id: true,
      departmentId: true,
      jobPosition: true,
      managerId: true,
      bankName: true,
    },
  });
  if (generated.length === 0) return;

  // ── bank details for anyone still missing them ──────────────────────────
  const unbanked = generated.filter((e) => !e.bankName);
  if (unbanked.length > 0) {
    await prisma.$transaction(
      unbanked.map((e) =>
        prisma.employee.update({ where: { id: e.id }, data: bankDetailsFor(rng) })
      )
    );
    console.log(`   bank details filled for ${unbanked.length}`);
  }

  // ── a reporting line, so the hierarchy is not flat ──────────────────────
  //
  // The most senior title in each department leads it; everyone else there
  // reports to them. Nobody reports to themselves.
  const byDept = new Map<string, typeof generated>();
  for (const e of generated) {
    const list = byDept.get(e.departmentId) ?? [];
    list.push(e);
    byDept.set(e.departmentId, list);
  }

  const reporting: { id: string; managerId: string }[] = [];
  for (const [, staff] of byDept) {
    const lead =
      staff.find((e) => /Manager|Lead|Controller|Partner/.test(e.jobPosition)) ?? staff[0];
    for (const e of staff) {
      if (e.id !== lead.id && !e.managerId) reporting.push({ id: e.id, managerId: lead.id });
    }
  }
  if (reporting.length > 0) {
    await prisma.$transaction(
      reporting.map((r) =>
        prisma.employee.update({ where: { id: r.id }, data: { managerId: r.managerId } })
      )
    );
    console.log(`   reporting lines set for ${reporting.length}`);
  }

  // ── leave balances, or nobody can request time off ──────────────────────
  const types = await prisma.timeOffType.findMany({
    where: { allocationRequired: true, status: 'Active' },
    select: { id: true, name: true },
  });
  const year = new Date().getUTCFullYear();
  const grants: { employeeId: string; timeOffTypeId: string; allocated: number }[] = [];
  for (const e of generated) {
    for (const t of types) {
      // Maternity is not granted to everyone by default; the other types are.
      if (/matern/i.test(t.name)) continue;
      grants.push({
        employeeId: e.id,
        timeOffTypeId: t.id,
        allocated: /annual/i.test(t.name) ? 24 : 12,
      });
    }
  }

  const created = await prisma.timeOffAllocation.createMany({
    data: grants.map((g) => ({
      ...g,
      taken: 0,
      remaining: g.allocated,
      validityYear: year,
      status: 'Approved',
    })),
    // An employee/type/year is unique, so a second run adds nothing.
    skipDuplicates: true,
  });
  if (created.count > 0) console.log(`   leave balances granted: ${created.count}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--undo')) return undo();

  const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
  const rng = makeRandom(20260906);

  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const schedules = await prisma.workingSchedule.findMany({ select: { id: true, name: true } });
  const structure = await prisma.salaryStructure.findFirst({
    where: { name: 'Regular Salary', status: 'Active' },
    select: { id: true },
  });

  if (departments.length === 0 || schedules.length === 0 || !structure) {
    throw new Error('Run the base seed first — departments, a schedule and Regular Salary must exist.');
  }

  const standard = schedules.find((s) => s.name.includes('Standard')) ?? schedules[0];
  const partTime = schedules.find((s) => s.name.includes('Part')) ?? standard;

  // Continue the numbering rather than colliding with it.
  const highest = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: 'EMP-' } },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  });
  const startAt = highest ? Number(highest.employeeCode.replace('EMP-', '')) + 1 : 1;

  const passwordHash = await bcrypt.hash('password123', 10);
  const usedEmails = new Set<string>();

  const people = Array.from({ length: count }, (_, i) => {
    const department = pick(rng, departments);
    const title = pick(rng, ROLES_BY_DEPT[department.name] ?? DEFAULT_ROLES);
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const code = `EMP-${String(startAt + i).padStart(3, '0')}`;

    // Names repeat across two hundred people, so the code keeps the address unique.
    let email = `${first}.${last}`.toLowerCase() + `@${DOMAIN}`;
    if (usedEmails.has(email)) email = `${first}.${last}.${startAt + i}`.toLowerCase() + `@${DOMAIN}`;
    usedEmails.add(email);

    // A tenth of the workforce part time, which is what makes the schedule
    // filter and the payroll proration worth looking at.
    const isPartTime = rng() < 0.1;

    return {
      employeeCode: code,
      name: `${first} ${last}`,
      email,
      phone: `9${String(Math.floor(rng() * 900000000) + 100000000)}`,
      departmentId: department.id,
      jobPosition: title,
      employeeType: isPartTime ? EmployeeType.PART_TIME : EmployeeType.FULL_TIME,
      scheduleId: isPartTime ? partTime.id : standard.id,
      status: EmployeeStatus.ACTIVE,
      ...bankDetailsFor(rng),
      wage: wageFor(rng, title),
    };
  });

  // Zero is a legitimate ask: it means "add nobody, just finish the records
  // that are already there".
  if (count > 0) {
    console.log(
      `Adding ${count} employees from ${people[0].employeeCode} to ${people[count - 1].employeeCode}…`
    );
  } else {
    console.log('Adding nobody — filling in existing records only.');
  }

  // Batched rather than looped: two hundred people created one at a time is six
  // hundred round trips to a hosted database.
  await prisma.employee.createMany({
    data: people.map(({ wage, ...employee }) => employee),
    skipDuplicates: true,
  });

  const created = await prisma.employee.findMany({
    where: { email: { in: people.map((p) => p.email) } },
    select: { id: true, email: true, name: true, departmentId: true, jobPosition: true },
  });
  const byEmail = new Map(created.map((e) => [e.email, e]));

  await prisma.user.createMany({
    data: created.map((e) => ({
      email: e.email,
      password: passwordHash,
      name: e.name,
      role: Role.EMPLOYEE,
      employeeId: e.id,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  // Everyone starts on the first of the current year, open ended.
  const startDate = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

  await prisma.contract.createMany({
    data: people
      .map((p) => {
        const employee = byEmail.get(p.email);
        if (!employee) return null;
        return {
          employeeId: employee.id,
          startDate,
          endDate: null,
          wage: p.wage,
          departmentId: employee.departmentId,
          position: employee.jobPosition,
          salaryStructureId: structure.id,
          status: ContractStatus.ACTIVE,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null),
    skipDuplicates: true,
  });

  console.log('Filling in the rest of each record…');
  await enrich(rng);

  const totals = {
    employees: await prisma.employee.count(),
    users: await prisma.user.count(),
    contracts: await prisma.contract.count(),
  };

  console.log(`Done. ${created.length} added.`);
  console.log(`   employees ${totals.employees} | users ${totals.users} | contracts ${totals.contracts}`);
  console.log(`   they sign in with their own address and the shared demo password.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
