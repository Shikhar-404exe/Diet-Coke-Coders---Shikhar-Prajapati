import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const dbPath = path.join(dataDir, 'campus_triage.db');

export const db = new DatabaseSync(dbPath);
export { uploadDir, dataDir };

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('student','admin')),
      login_id TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      program TEXT,
      year INTEGER,
      hostel TEXT,
      room TEXT,
      cgpa REAL,
      title TEXT,
      department TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      file_path TEXT,
      last_updated TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(
      chunk_id UNINDEXED,
      document_id UNINDEXED,
      title,
      category,
      content,
      tags
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      owner_reg_no TEXT,
      owner_email TEXT,
      owner_name TEXT,
      student_query TEXT NOT NULL,
      intent TEXT,
      department TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      sentiment TEXT DEFAULT 'Neutral',
      slots_json TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
      sla_duration_ms INTEGER NOT NULL DEFAULT 7200000,
      escalated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      sla_met INTEGER,
      resolution_minutes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      role TEXT NOT NULL CHECK(role IN ('student','agent','system')),
      content TEXT NOT NULL,
      action TEXT,
      citations_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_login_id TEXT NOT NULL,
      ticket_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campus_outages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Track 2 / ops handoff columns (safe on existing DBs)
  addColumn('tickets', 'claimed_by', 'TEXT');
  addColumn('tickets', 'claimed_name', 'TEXT');
  addColumn('tickets', 'claimed_at', 'TEXT');
  addColumn('tickets', 'staff_notes_json', "TEXT DEFAULT '[]'");
  addColumn('tickets', 'student_reply', 'TEXT');
  addColumn('tickets', 'handoff_summary', 'TEXT');
  addColumn('tickets', 'agent_plan_json', 'TEXT');
  addColumn('tickets', 'workflow', "TEXT DEFAULT 'open'");
  addColumn('tickets', 'attachments_json', "TEXT DEFAULT '[]'");
  addColumn('messages', 'trace_json', 'TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      uploaded_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rag_candidates (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      query TEXT NOT NULL,
      answer TEXT NOT NULL,
      intent TEXT,
      category TEXT,
      ticket_id TEXT,
      confidence REAL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','promoted','rejected')),
      promoted_doc_id TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  addColumn('tickets', 'owner_contact_name', 'TEXT');
  addColumn('tickets', 'owner_contact_phone', 'TEXT');
  addColumn('tickets', 'owner_contact_email', 'TEXT');
  addColumn('tickets', 'eta_label', 'TEXT');
}
