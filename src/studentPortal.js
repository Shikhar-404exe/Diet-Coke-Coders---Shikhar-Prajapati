const STORAGE_KEY = 'studentPortal';

const MOCK_STUDENTS = [
  { regNo: '22BCE1001', name: 'Arjun Sharma', program: 'BTech CSE', year: 3, hostel: 'Block A', room: '101', email: 'arjun.sharma@vitbhopal.ac.in', cgpa: 8.7 },
  { regNo: '22BCE1002', name: 'Priya Patel', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '205', email: 'priya.patel@vitbhopal.ac.in', cgpa: 9.2 },
  { regNo: '22BME2001', name: 'Rahul Verma', program: 'BTech Mech', year: 3, hostel: 'Block A', room: '310', email: 'rahul.verma@vitbhopal.ac.in', cgpa: 7.5 },
  { regNo: '22BIT1023', name: 'Sneha Reddy', program: 'BTech IT', year: 3, hostel: 'Block C', room: '405', email: 'sneha.reddy@vitbhopal.ac.in', cgpa: 8.1 },
  { regNo: '22BCE2005', name: 'Vikram Singh', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '502', email: 'vikram.singh@vitbhopal.ac.in', cgpa: 6.8 },
];

export class StudentPortal {
  constructor() {
    this.currentStudent = null;
    this.ticketHistory = [];
  }

  login(regNo, dob) {
    const student = MOCK_STUDENTS.find(s => s.regNo.toUpperCase() === regNo.toUpperCase());
    if (student) {
      this.currentStudent = { ...student, loggedInAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentStudent));
      return { success: true, student: this.currentStudent };
    }
    return { success: false, error: 'Invalid registration number' };
  }

  logout() {
    this.currentStudent = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  restoreSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { this.currentStudent = JSON.parse(saved); return true; }
    } catch (e) {}
    return false;
  }

  isLoggedIn() {
    return this.currentStudent !== null;
  }

  injectContext(slotState) {
    if (!this.currentStudent) return slotState;
    const s = this.currentStudent;
    const injected = { ...slotState };
    if (injected.activeIntent === 'MAINTENANCE_REQUEST') {
      if (!injected.slots?.blockName) injected.slots = { ...injected.slots, blockName: s.hostel };
      if (!injected.slots?.roomNumber) injected.slots = { ...injected.slots, roomNumber: s.room };
    }
    if (injected.activeIntent === 'PASSWORD_RESET') {
      if (!injected.slots?.studentID) injected.slots = { ...injected.slots, studentID: s.regNo };
      if (!injected.slots?.registeredEmail) injected.slots = { ...injected.slots, registeredEmail: s.email };
    }
    if (injected.activeIntent === 'SCHOLARSHIP_INQUIRY') {
      if (!injected.slots?.cgpa) injected.slots = { ...injected.slots, cgpa: s.cgpa };
    }
    return injected;
  }

  addTicketToHistory(ticket) {
    this.ticketHistory.unshift({ ...ticket, viewedAt: Date.now() });
  }

  getContextProfile() {
    if (!this.currentStudent) return null;
    return { ...this.currentStudent };
  }
}

export const studentPortal = new StudentPortal();
