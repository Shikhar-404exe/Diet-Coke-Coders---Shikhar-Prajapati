import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { seedIfEmpty, ensureDemoExtras } from './db/seed.js';
import { uploadDir } from './db/index.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import documentRoutes from './routes/documents.js';
import agentRoutes from './routes/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
seedIfEmpty();
ensureDemoExtras();

const app = express();
const port = Number(process.env.PORT || 8787);
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'campus-triage-api',
    model: process.env.OPENROUTER_MODEL || null,
    freeOnly: String(process.env.OPENROUTER_MODEL || '').includes(':free'),
  });
});

app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/documents', documentRoutes);
app.use('/agent', agentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(port, () => {
  console.log(`Campus Triage API on http://localhost:${port}`);
});
