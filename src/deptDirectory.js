/** Client mirror of server department owners (ETA shown from ticket.etaLabel / SLA). */
export const DEPARTMENT_DIRECTORY = {
  'IT Support Services': {
    name: 'Ravi Kumar',
    title: 'IT Helpdesk Lead',
    phone: '+91-755-430-1001',
    email: 'it.helpdesk@vitbhopal.ac.in',
  },
  'Hostel Warden & Facilities': {
    name: 'Sunita Mehra',
    title: 'Hostel Facilities Coordinator',
    phone: '+91-755-430-2205',
    email: 'hostel.facilities@vitbhopal.ac.in',
  },
  'Finance & Accounts': {
    name: 'Amit Joshi',
    title: 'Student Accounts Officer',
    phone: '+91-755-430-3102',
    email: 'accounts.student@vitbhopal.ac.in',
  },
  'Admissions & Registrar': {
    name: 'Dr. Neha Kapoor',
    title: 'Assistant Registrar (Academics)',
    phone: '+91-755-430-4010',
    email: 'registrar.office@vitbhopal.ac.in',
  },
  'General Academic Support': {
    name: 'Prof. K. Srinivas',
    title: 'Academic Support Desk',
    phone: '+91-755-430-4500',
    email: 'academic.support@vitbhopal.ac.in',
  },
};

export function ownerForDepartment(department) {
  return DEPARTMENT_DIRECTORY[department] || DEPARTMENT_DIRECTORY['General Academic Support'];
}

export function etaForPriority(priority) {
  if (priority === 'High') return '≈ 30 minutes';
  if (priority === 'Low') return '≈ 4 hours';
  return '≈ 2 hours';
}
