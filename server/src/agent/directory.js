/** Department owners + SLA / ETA labels for campus handoffs */

export const DEPARTMENT_DIRECTORY = {
  'IT Support Services': {
    name: 'Ravi Kumar',
    title: 'IT Helpdesk Lead',
    phone: '+91-755-430-1001',
    email: 'it.helpdesk@vitbhopal.ac.in',
    desk: 'AB-1 · Ground floor IT counter',
  },
  'Hostel Warden & Facilities': {
    name: 'Sunita Mehra',
    title: 'Hostel Facilities Coordinator',
    phone: '+91-755-430-2205',
    email: 'hostel.facilities@vitbhopal.ac.in',
    desk: 'Hostel Block B · Warden office',
  },
  'Finance & Accounts': {
    name: 'Amit Joshi',
    title: 'Student Accounts Officer',
    phone: '+91-755-430-3102',
    email: 'accounts.student@vitbhopal.ac.in',
    desk: 'Admin Block · Accounts window 2',
  },
  'Admissions & Registrar': {
    name: 'Dr. Neha Kapoor',
    title: 'Assistant Registrar (Academics)',
    phone: '+91-755-430-4010',
    email: 'registrar.office@vitbhopal.ac.in',
    desk: 'Admin Block · Registrar office',
  },
  'General Academic Support': {
    name: 'Prof. K. Srinivas',
    title: 'Academic Support Desk',
    phone: '+91-755-430-4500',
    email: 'academic.support@vitbhopal.ac.in',
    desk: 'AB-2 · Academic help counter',
  },
};

export function ownerForDepartment(department) {
  return DEPARTMENT_DIRECTORY[department] || DEPARTMENT_DIRECTORY['General Academic Support'];
}

/** Map priority → SLA ms + human ETA (always defined). */
export function slaMeta(priority) {
  if (priority === 'High') {
    return { slaMs: 30 * 60 * 1000, etaLabel: '≈ 30 minutes', grade: 'High' };
  }
  if (priority === 'Low') {
    return { slaMs: 4 * 60 * 60 * 1000, etaLabel: '≈ 4 hours', grade: 'Low' };
  }
  return { slaMs: 2 * 60 * 60 * 1000, etaLabel: '≈ 2 hours', grade: 'Medium' };
}

/**
 * Low = info / how-to; High = urgent action / exams / safety / lost access;
 * Medium = facilities / scholarships needing staff.
 */
export function inferPriority(query, intent) {
  const q = String(query || '');
  if (
    /(urgent|emergency|immediately|asap|harass|threat|medical|ambulance|fire|security)/i.test(q)
    || /(exam|mid.?sem|end.?sem|\bod\b|on[\s-]?duty|duty leave)/i.test(q)
    || /(lost.*(id|card|key)|lock.?out|cannot login|can't login|portal down)/i.test(q)
    || intent === 'FEE_REFUND'
    || intent === 'PROFANITY_ABUSE'
  ) {
    return 'High';
  }
  if (
    /(how (do|to)|where (do|can)|what is|timing|curfew|criteria|policy|steps|setup|connect)/i.test(q)
    || intent === 'CURFEW_INQUIRY'
    || intent === 'WIFI_ISSUE'
    || intent === 'OFF_TOPIC'
  ) {
    return 'Low';
  }
  if (intent === 'MAINTENANCE_REQUEST' || intent === 'PASSWORD_RESET' || intent === 'SCHOLARSHIP_INQUIRY') {
    return 'Medium';
  }
  return 'Medium';
}

export function formatOwnerBlock(owner, etaLabel, priority) {
  if (!owner) return '';
  return [
    `Priority: ${priority} · ETA ${etaLabel}`,
    `Owner: ${owner.name} (${owner.title})`,
    `Contact: ${owner.phone} · ${owner.email}`,
    owner.desk ? `Desk: ${owner.desk}` : '',
  ].filter(Boolean).join('\n');
}
