import { DEMO_STUDENTS } from './auth';

export class StudentPortal {
  constructor() {
    this.currentStudent = null;
    this.ticketHistory = [];
  }

  /** Bind the authenticated student into the portal (auth.js is source of truth). */
  setStudent(student, loggedInAt = Date.now()) {
    if (!student) {
      this.currentStudent = null;
      return null;
    }
    this.currentStudent = { ...student, loggedInAt };
    return this.currentStudent;
  }

  login(regNo, _pin) {
    const student = DEMO_STUDENTS.find(s => s.regNo.toUpperCase() === String(regNo || '').toUpperCase());
    if (student) {
      return { success: true, student: this.setStudent(student) };
    }
    return { success: false, error: 'Invalid registration number' };
  }

  logout() {
    this.currentStudent = null;
    this.ticketHistory = [];
  }

  isLoggedIn() {
    return this.currentStudent !== null;
  }

  /**
   * Prefill slots from profile once intent is known.
   * Pass activeIntent explicitly (string) or via slotState.activeIntent.
   */
  injectContext(slotState, intentOverride = null) {
    if (!this.currentStudent) return slotState;
    const s = this.currentStudent;
    const intent = intentOverride || slotState.activeIntent;
    const injected = {
      ...slotState,
      activeIntent: intent || slotState.activeIntent,
      slots: { ...(slotState.slots || {}) },
    };
    if (!intent) return injected;

    if (intent === 'MAINTENANCE_REQUEST') {
      if (!injected.slots.blockName) injected.slots.blockName = s.hostel;
      if (!injected.slots.roomNumber) injected.slots.roomNumber = s.room;
    }
    if (intent === 'PASSWORD_RESET') {
      if (!injected.slots.studentID) injected.slots.studentID = s.regNo;
      if (!injected.slots.registeredEmail) injected.slots.registeredEmail = s.email;
    }
    if (intent === 'SCHOLARSHIP_INQUIRY') {
      if (injected.slots.cgpa === undefined) injected.slots.cgpa = s.cgpa;
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
