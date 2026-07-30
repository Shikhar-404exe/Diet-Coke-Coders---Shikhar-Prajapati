import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema } from './index.js';

const CAMPUS_DOCS = [
  {
    id: 'it-wifi',
    category: 'IT Support',
    title: 'Connecting to Campus Wi-Fi (VITB-Secure)',
    content: "To connect to the campus secure Wi-Fi network 'VITB-Secure', users must register their device's MAC address via the IT Portal (itportal.vitbhopal.ac.in). Once registered, select 'VITB-Secure' from your Wi-Fi networks. Enter your student registration number as the identity/username and your student portal password. For security reasons, sharing portal passwords or running unauthorized routing software (routers, hotspots) is strictly prohibited and will result in temporary suspension of network privileges.",
    tags: 'wifi,internet,network,mac address,password',
    lastUpdated: 'June 15, 2026',
    source: 'IT Services Handbook §4.2',
  },
  {
    id: 'it-password',
    category: 'IT Support',
    title: 'Student Portal Password Resets',
    content: "If you have forgotten your student portal password, you can click on the 'Forgot Password' link on the login page. An OTP will be sent to your registered mobile number and personal email. If you do not receive the OTP within 5 minutes, visit the IT Helpdesk on the 2nd Floor of the Academic Block (Room A-204) between 9:00 AM and 5:00 PM with your physical student ID card. Password resets cannot be processed over the phone or email without ID verification.",
    tags: 'password,login,reset,otp,it helpdesk',
    lastUpdated: 'May 10, 2026',
    source: 'IT Security Guide §1.5',
  },
  {
    id: 'it-printer',
    category: 'IT Support',
    title: 'Campus Printer Setup and Quotas',
    content: 'Students receive a complimentary printing quota of 150 pages per semester. To print, send your document from a registered email to print@vitbhopal.ac.in, or log into any terminal in the central library. Scanning is free. Additional page prints can be purchased at the finance office (Academic Block, Ground Floor) at the rate of ₹2 per page. Unused quotas do not carry over to the next semester.',
    tags: 'print,printer,quota,library,scan',
    lastUpdated: 'January 20, 2026',
    source: 'Library and Media Services §2.3',
  },
  {
    id: 'hostel-curfew',
    category: 'Hostel',
    title: 'Hostel Curfew and In-Out Timing Policies',
    content: 'The main gates of all hostels are closed at 9:00 PM daily. All students must be inside their respective hostel blocks and mark biometric attendance by 9:15 PM. Late entry is permitted only with a pre-approved digital gate pass submitted by parents via the Student App at least 6 hours in advance, or in cases of medical emergency verified by the campus warden. Unauthorized late entries incur a fine of ₹500 for the first offense, and subsequent offenses will be reported to parents and the Disciplinary Committee.',
    tags: 'curfew,timing,gate pass,late,warden,attendance',
    lastUpdated: 'June 20, 2026',
    source: 'Hostel Code of Conduct §3.1',
  },
  {
    id: 'hostel-visitors',
    category: 'Hostel',
    title: 'Hostel Visitor and Guest Policies',
    content: 'Day-visitors (including classmates) are permitted in hostel common lounges only between 10:00 AM and 6:00 PM. No visitors, including parents, are allowed inside student rooms under any circumstances. Overnight stays for parents are not allowed in hostel rooms; however, parents may book guest house rooms located near the main gate (subject to availability) by emailing guesthouse@vitbhopal.ac.in at least 3 days prior.',
    tags: 'visitor,guest,parent,stay,guest house,lounge',
    lastUpdated: 'April 18, 2026',
    source: 'Hostel Code of Conduct §5.4',
  },
  {
    id: 'hostel-maintenance',
    category: 'Hostel',
    title: 'Reporting Room and Facility Maintenance Issues',
    content: 'For broken lights, fans, plumbing issues, or furniture repairs in hostel rooms, students must log a maintenance request on the Hostel Portal (hostel.vitbhopal.ac.in). Maintenance teams operate from 9:00 AM to 6:00 PM. For emergency repairs (e.g., major water leak, electrical short circuit) after hours, contact the block supervisor directly or report to the Warden\'s office at the ground floor of each block. Routine repairs are addressed within 24-48 hours.',
    tags: 'maintenance,repair,leak,plumbing,electrical,warden',
    lastUpdated: 'March 12, 2026',
    source: 'Facilities Management Guide §2.1',
  },
  {
    id: 'academic-grading',
    category: 'Academics',
    title: 'CGPA Grading Scale and Calculation',
    content: 'Academic grading uses a 10-point scale: S (Outstanding, 10 points), A (Excellent, 9 points), B (Very Good, 8 points), C (Good, 7 points), D (Satisfactory, 6 points), E (Pass, 5 points), and F (Fail, 0 points). CGPA is calculated as the sum of (Course Credits × Grade Points) divided by Total Registered Credits. To qualify for a degree, a student must maintain a minimum CGPA of 5.0 and clear all core course requirements.',
    tags: 'grading,cgpa,credits,gpa,failed,s-grade',
    lastUpdated: 'February 15, 2026',
    source: 'Academic Regulations Regulation 12',
  },
  {
    id: 'academic-withdrawal',
    category: 'Academics',
    title: 'Course Withdrawal Rules and Deadlines',
    content: 'Students can withdraw from a course without academic penalty before the end of the 8th week of the semester. A course withdrawal is marked as \'W\' on the transcript and does not affect the CGPA, but the student will not receive credits for the course and must retake it in subsequent semesters if it is a core requirement. Withdrawals are not permitted if the student has less than 12 active credits remaining. Submit the Withdrawal Form (Form AC-04) approved by the faculty advisor to the registrar\'s office.',
    tags: 'withdrawal,withdraw,course,credits,drop course',
    lastUpdated: 'March 05, 2026',
    source: 'Academic Regulations Regulation 8.4',
  },
  {
    id: 'academic-exams',
    category: 'Academics',
    title: 'Mid-Term and Final Exam Attendance Requirements',
    content: 'To be eligible to sit for both Mid-Term and Semester-End Examinations, students must maintain a minimum of 75% attendance in each registered course. A relaxation of up to 10% (down to 65%) is permitted only for medical grounds (accompanied by a medical certificate approved by the medical officer) or official college representation in events. Students with attendance below 75% without valid excuses will be debarred and receive an \'E-D\' (Attendance Debarred) grade, which functions as an F grade.',
    tags: 'exam,attendance,debarred,medical,attendance percent',
    lastUpdated: 'June 10, 2026',
    source: 'Academic Examinations Guide §2.2',
  },
  {
    id: 'finance-deadlines',
    category: 'Finance',
    title: 'Tuition and Hostel Fee Payment Deadlines',
    content: 'Semester tuition and hostel fees must be paid in full by July 15th for the Odd Semester and December 15th for the Even Semester. Payments can be made via net banking, UPI, or demand draft through the online Finance Portal. Late payments are subject to a fine of ₹100 per day up to 15 days, after which the student\'s portal access is suspended and they will be debarred from attending classes. Installment plans are available only with prior approval from the Chief Finance Officer for documented financial hardship.',
    tags: 'fee,payment,deadline,late fee,fine,installments',
    lastUpdated: 'June 25, 2026',
    source: 'Student Fee Rules §1.2',
  },
  {
    id: 'finance-refunds',
    category: 'Finance',
    title: 'Tuition Fee Refund and Withdrawal Policy',
    content: 'If a student withdraws from the program, refunds are calculated based on the date of official written notification to the Registrar. 100% refund (less ₹5,000 processing fee) is given if withdrawal is before the commencement of classes. 80% refund up to 15 days after classes start; 50% between 16 and 30 days after classes start; and 0% after 30 days of class commencement. Hostel rent is refunded on a pro-rata basis based on months occupied, but hostel mess fees are fully non-refundable after class start.',
    tags: 'refund,money,cancellation,withdrawal fee,return',
    lastUpdated: 'April 05, 2026',
    source: 'Student Fee Rules §5.1',
  },
  {
    id: 'finance-scholarships',
    category: 'Finance',
    title: 'Merit-cum-Means Scholarship Schemes',
    content: 'The university offers Merit-cum-Means scholarships covering up to 50% of tuition fees. To qualify, students must maintain a CGPA of 8.0 or above (no active backlogs) and have a family annual income below ₹4.5 Lakhs (verified by official Income Certificate). Applications open in August every year. Students must submit an income certificate, mark sheets, and a declaration form to the Scholarship Committee (office in Academic Block, Room F-102) by August 31st.',
    tags: 'scholarship,merit,means,income,tuition waiver,financial aid',
    lastUpdated: 'May 22, 2026',
    source: 'Scholarship Committee Guidelines v3',
  },
  {
    id: 'admissions-verification',
    category: 'Admissions',
    title: 'Admissions Document Verification Checklist',
    content: 'New students must submit original documents for verification within 15 days of class commencement. Required documents: Class 10 & 12 mark sheets, Migration Certificate, Transfer Certificate, Entrance Exam scorecard, Income/Caste Certificate (if applicable), and 4 passport-size photographs. Failure to submit these documents within the deadline will result in provisional admission cancellation. Verification is conducted in the Central Seminar Hall (CSH-1) from 10:00 AM to 4:00 PM.',
    tags: 'admission,verification,documents,cancellation,certificates',
    lastUpdated: 'June 01, 2026',
    source: 'Admissions Office Guidelines §2.4',
  },
];

const STUDENTS = [
  { regNo: '22BCE1001', name: 'Arjun Sharma', program: 'BTech CSE', year: 3, hostel: 'Block A', room: '101', email: 'arjun.sharma@vitbhopal.ac.in', cgpa: 8.7 },
  { regNo: '22BCE1002', name: 'Priya Patel', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '205', email: 'priya.patel@vitbhopal.ac.in', cgpa: 9.2 },
  { regNo: '22BME2001', name: 'Rahul Verma', program: 'BTech Mech', year: 3, hostel: 'Block A', room: '310', email: 'rahul.verma@vitbhopal.ac.in', cgpa: 7.5 },
  { regNo: '22BIT1023', name: 'Sneha Reddy', program: 'BTech IT', year: 3, hostel: 'Block C', room: '405', email: 'sneha.reddy@vitbhopal.ac.in', cgpa: 8.1 },
  { regNo: '22BCE2005', name: 'Vikram Singh', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '502', email: 'vikram.singh@vitbhopal.ac.in', cgpa: 6.8 },
];

const STAFF = [
  { id: 'ops.admin', password: 'campusops', name: 'Meera Iyer', title: 'Academic Operations Lead', department: 'Central Helpdesk', email: 'ops.admin@vitbhopal.ac.in' },
  { id: 'it.desk', password: 'ithelp', name: 'Rahul Verma', title: 'IT Support Lead', department: 'IT Support Services', email: 'it.desk@vitbhopal.ac.in' },
];

export function indexDocumentFts(doc, chunks) {
  for (const chunk of chunks) {
    db.prepare(`
      INSERT INTO document_fts(chunk_id, document_id, title, category, content, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(chunk.id, doc.id, doc.title, doc.category, chunk.content, doc.tags || '');
  }
}

export function chunkText(text, size = 500) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks.length ? chunks : [String(text || '')];
}

export function seedIfEmpty() {
  initSchema();
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return { seeded: false };

  const pinHash = bcrypt.hashSync('vitb2026', 10);
  for (const s of STUDENTS) {
    db.prepare(`
      INSERT INTO users (id, role, login_id, password_hash, name, email, program, year, hostel, room, cgpa)
      VALUES (?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), s.regNo, pinHash, s.name, s.email, s.program, s.year, s.hostel, s.room, s.cgpa);
  }

  for (const a of STAFF) {
    db.prepare(`
      INSERT INTO users (id, role, login_id, password_hash, name, email, title, department)
      VALUES (?, 'admin', ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), a.id, bcrypt.hashSync(a.password, 10), a.name, a.email, a.title, a.department);
  }

  for (const doc of CAMPUS_DOCS) {
    db.prepare(`
      INSERT INTO documents (id, title, category, source, content, tags, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(doc.id, doc.title, doc.category, doc.source, doc.content, doc.tags, doc.lastUpdated);

    const parts = chunkText(doc.content, 80);
    const chunks = parts.map((content, i) => ({
      id: `${doc.id}#${i}`,
      document_id: doc.id,
      chunk_index: i,
      content,
    }));
    for (const c of chunks) {
      db.prepare(`
        INSERT INTO document_chunks (id, document_id, chunk_index, content)
        VALUES (?, ?, ?, ?)
      `).run(c.id, c.document_id, c.chunk_index, c.content);
    }
    indexDocumentFts(doc, chunks);
  }

  // Seed demo tickets for Priya and others
  const now = Date.now();
  const demoTickets = [
    {
      id: 'TKT-918274',
      owner_reg_no: '22BCE1002',
      owner_email: 'priya.patel@vitbhopal.ac.in',
      owner_name: 'Priya Patel',
      student_query: 'My grade for BTEC-102 Chemistry is showing as F but I attended all exams.',
      intent: 'GENERAL_ACADEMIC',
      department: 'General Academic Support',
      priority: 'High',
      sentiment: 'Frustrated',
      slots_json: JSON.stringify({ studentID: '22BCE1002' }),
      sla_duration_ms: 1800000,
      escalated_at: new Date(now - 22 * 60000).toISOString(),
    },
    {
      id: 'TKT-551820',
      owner_reg_no: '22BCE1002',
      owner_email: 'priya.patel@vitbhopal.ac.in',
      owner_name: 'Priya Patel',
      student_query: 'Hostel room fan not working in Block B room 205.',
      intent: 'Hostel Maintenance Request',
      department: 'Hostel Warden & Facilities',
      priority: 'Medium',
      sentiment: 'Neutral',
      slots_json: JSON.stringify({ roomNumber: '205', blockName: 'Block B' }),
      sla_duration_ms: 7200000,
      escalated_at: new Date(now - 30 * 60000).toISOString(),
    },
    {
      id: 'TKT-492103',
      owner_reg_no: '22BIT1023',
      owner_email: 'sneha.reddy@vitbhopal.ac.in',
      owner_name: 'Sneha Reddy',
      student_query: 'Lost room key, need duplicate for Block B 405.',
      intent: 'Hostel Maintenance Request',
      department: 'Hostel Warden & Facilities',
      priority: 'Medium',
      sentiment: 'Neutral',
      slots_json: JSON.stringify({ roomNumber: '405', blockName: 'Block B' }),
      sla_duration_ms: 7200000,
      escalated_at: new Date(now - 1.2 * 3600000).toISOString(),
    },
  ];

  for (const t of demoTickets) {
    db.prepare(`
      INSERT INTO tickets (
        id, owner_reg_no, owner_email, owner_name, student_query, intent, department,
        priority, sentiment, slots_json, status, sla_duration_ms, escalated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      t.id, t.owner_reg_no, t.owner_email, t.owner_name, t.student_query, t.intent, t.department,
      t.priority, t.sentiment, t.slots_json, t.sla_duration_ms, t.escalated_at
    );
  }

  db.prepare(`
    INSERT INTO tickets (
      id, owner_reg_no, owner_email, owner_name, student_query, intent, department,
      priority, sentiment, slots_json, status, sla_duration_ms, escalated_at, resolved_at, sla_met, resolution_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resolved', ?, ?, ?, 1, 18)
  `).run(
    'TKT-108274', '22BCE1002', 'priya.patel@vitbhopal.ac.in', 'Priya Patel',
    'Portal password reset for 22BCE1002', 'Student Portal Password Reset', 'IT Support Services',
    'High', 'Frustrated', JSON.stringify({ studentID: '22BCE1002' }), 1800000,
    new Date(now - 3.8 * 3600000).toISOString(), new Date(now - 3.5 * 3600000).toISOString()
  );

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`).run(
    'SYSTEM',
    'Database seeded with campus policy docs, demo users, and sample tickets.'
  );

  ensureDemoExtras();
  return { seeded: true };
}

/** Safe extras for existing DBs (outages, schema already migrated in initSchema). */
export function ensureDemoExtras() {
  initSchema();
  const outageCount = db.prepare('SELECT COUNT(*) AS c FROM campus_outages').get().c;
  if (outageCount === 0) {
    db.prepare(`
      INSERT INTO campus_outages (id, title, body, active)
      VALUES (?, ?, ?, 1)
    `).run(
      'outage-wifi-demo',
      'Known issue: VITB-Secure intermittent in Block B',
      'IT is investigating intermittent Wi‑Fi drops in Block B this afternoon. Prefer reporting only if your device is registered and the issue persists >30 min.'
    );
  }

  const od = db.prepare('SELECT id FROM documents WHERE id = ?').get('acad-od-leave');
  if (!od) {
    const doc = {
      id: 'acad-od-leave',
      category: 'Academics',
      title: 'On-Duty (OD) Leave for Exams and Events',
      content:
        'Students needing On-Duty (OD) leave for overlapping exams and approved campus events must apply through the Registrar / Academic Support desk before the event start time. '
        + 'Carry student ID, exam hall ticket, and event invitation or circular. OD is not automatic — a faculty/Registrar approver decides. '
        + 'Same-day OD for morning exams and mid-day events is treated as High priority (target response ≈ 30 minutes). '
        + 'Contact: Dr. Neha Kapoor, Assistant Registrar (Academics), +91-755-430-4010, registrar.office@vitbhopal.ac.in. '
        + 'Hindi: परीक्षा और इवेंट का टाइम ओवरलैप हो तो रजिस्ट्रार ऑफिस में OD फॉर्म जमा करें; अप्रूवल के बिना OD मान्य नहीं।',
      tags: 'od,on-duty,duty leave,exam,event,registrar,ओडी',
      lastUpdated: 'July 2026',
      source: 'Academic Regulations §OD',
    };
    db.prepare(`
      INSERT INTO documents (id, title, category, source, content, tags, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(doc.id, doc.title, doc.category, doc.source, doc.content, doc.tags, doc.lastUpdated);
    const parts = chunkText(doc.content, 120);
    const chunks = parts.map((text, i) => ({
      id: `${doc.id}#${i}`,
      document_id: doc.id,
      chunk_index: i,
      content: text,
    }));
    for (const c of chunks) {
      db.prepare(`INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)`)
        .run(c.id, c.document_id, c.chunk_index, c.content);
    }
    indexDocumentFts(doc, chunks);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const result = seedIfEmpty();
  ensureDemoExtras();
  console.log(result.seeded ? 'Database seeded.' : 'Database already has users — skipped seed.');
}
