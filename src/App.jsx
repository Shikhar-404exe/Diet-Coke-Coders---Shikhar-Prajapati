import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare, LayoutDashboard, Database, Terminal, ShieldAlert,
  CheckCircle2, AlertTriangle, ArrowRight, Clock,
  Sun, Moon, Plus, Search, Trash2, X, Sparkles, Inbox, Info,
  Filter, Send, Check, Settings, ShieldCheck,
  Shield, Activity, RefreshCw, Award, Play, History, RotateCcw,
  Mic, MicOff, Volume2, LogOut, Network, GitBranch, ImagePlus, Camera
} from 'lucide-react';
import { campusDocuments } from './knowledgeBase';
import { processQuery, retrieveDocuments, processQueryAsync, classifyIntent } from './agentEngine';
import { semanticSearch } from './semanticSearch';
import { knowledgeGraph } from './agentGraph';
import { voiceInterface } from './voiceInterface';
import { proactiveDetector } from './proactiveDetector';
import { studentPortal } from './studentPortal';
import {
  runMultiAgentDebate,
  predictSLABreach,
  generateEmotionAdaptiveResponse,
  detectAnomalies,
  smartStaffAssignment,
  findSimilarTickets,
  parseNaturalLanguageQuery
} from './advancedEngine';
import { fireConfetti } from './confetti';
import LoginGate from './LoginGate';
import { restoreSession, clearSession, validateSession, reconnectSession } from './auth';
import {
  agentChat, fetchTickets, patchTicket, fetchAuditLogs, fetchDocuments, uploadPdf,
  healthCheck, getToken, fetchNotifications, markNotificationsRead, fetchOutages,
  fetchTicket, uploadTicketPhoto, fetchRagCandidates, promoteRagCandidate, rejectRagCandidate,
} from './api';
import { normalizeTrace, traceFromApiPlan } from './traceSafe';
import { ownerForDepartment, etaForPriority } from './deptDirectory';
import {
  INITIAL_TICKETS, INITIAL_RESOLVED_TICKETS, INITIAL_AUDIT_LOGS, BENCHMARK_TESTS,
} from './data/demoSeed';
import { scrollChildIntoParent } from './lib/scrollPane';
import { SlaTimer } from './components/ui/TicketBits';
import PlaygroundPage from './pages/PlaygroundPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminOpsPage from './pages/AdminOpsPage';
import AdminKbPage from './pages/AdminKbPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // Theme — students default calm light (eye comfort)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    const s = restoreSession();
    if (s?.role === 'admin') return true;
    return false;
  });

  // Auth session — role only from login gate, never toggled in-app
  const [session, setSession] = useState(() => restoreSession());
  const userRole = session?.role || null;
  const [apiOnline, setApiOnline] = useState(Boolean(getToken()));
  const [pdfUploading, setPdfUploading] = useState(false);
  const [agentPlan, setAgentPlan] = useState(null);
  const [pendingEscalate, setPendingEscalate] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [outages, setOutages] = useState([]);
  const [opsNote, setOpsNote] = useState('');
  const [trackTicketId, setTrackTicketId] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Main UI Tabs: 'playground' | 'dashboard' | 'kb'
  const [activeTab, setActiveTab] = useState(() => 'dashboard');
  const [playgroundSubTab, setPlaygroundSubTab] = useState('trace');

  // Agent Policy Configurations
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('agentSettings');
    return saved ? JSON.parse(saved) : {
      ragThreshold: 0.40,
      sentimentBoost: true,
      profanityFilter: true
    };
  });

  // Semantic Search State
  const [semanticReady, setSemanticReady] = useState(false);
  const [semanticStatus, setSemanticStatus] = useState('initializing');
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);

  // Student profile from authenticated student session
  const [studentProfile, setStudentProfile] = useState(() => {
    const s = restoreSession();
    return s?.role === 'student' ? s.student : null;
  });

  // Voice Interface State
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Proactive Alerts State
  const [proactiveAlerts, setProactiveAlerts] = useState([]);

  // Multi-Agent Trace: store raw agent steps
  const [agentTraceSteps, setAgentTraceSteps] = useState([]);

  // GraphRAG context state
  const [graphEntities, setGraphEntities] = useState(null);

  // Typing / processing indicator
  const [isProcessing, setIsProcessing] = useState(false);

  // Demo mode
  const [demoRunning, setDemoRunning] = useState(false);
  const demoTimeoutRef = useRef(null);
  const judgeAutoConfirmRef = useRef(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

    const [debateData, setDebateData] = useState(null);

    const [slaPredictions, setSlaPredictions] = useState([]);

    const [anomalies, setAnomalies] = useState([]);

    const [nlQuery, setNlQuery] = useState('');
  const [nlFilter, setNlFilter] = useState(null);
  const [nlInterpretation, setNlInterpretation] = useState('');

    const [similarTickets, setSimilarTickets] = useState([]);

    const [staffAssignment, setStaffAssignment] = useState(null);

    const [emotionResponse, setEmotionResponse] = useState(null);

    const confettiRef = useRef(null);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const runDemo = async () => {
    if (demoRunning || isProcessing) return;
    setDemoRunning(true);
    setActiveTab('playground');
    setPlaygroundSubTab('trace');
    setPendingEscalate(null);
    setAgentPlan(null);
    setChatMessages([{
      sender: 'agent',
      text: 'Judge demo starting: grounded Wi‑Fi → safe refusal → controllable handoff.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    const delay = (ms) => new Promise((r) => { demoTimeoutRef.current = setTimeout(r, ms); });

    try {
      addToast('1/3 Grounded Wi‑Fi answer');
      await handleSendMessage('How do I connect to campus WiFi VITB-Secure?');
      await delay(2500);

      addToast('2/3 Safe refusal (no code)');
      await handleSendMessage('Write my Python homework sorting code');
      await delay(2500);

      addToast('3/3 Propose handoff — auto-confirm ticket');
      judgeAutoConfirmRef.current = true;
      const roomLine = studentProfile
        ? `My hostel fan is broken in ${studentProfile.hostel} room ${studentProfile.room}.`
        : 'My hostel fan is broken in Block B room 205.';
      await handleSendMessage(roomLine);
      await delay(4000);

      setDemoRunning(false);
      addToast('Judge demo done — open My Requests to attach a photo, then Ops to claim/resolve', 'success');
      setChatMessages((prev) => [...prev, {
        sender: 'system',
        text: 'Track 2 path complete: Grounded cite → Safe refusal → Confirmed handoff. Next: photo on ticket + Ops claim/resolve.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      judgeAutoConfirmRef.current = false;
      addToast(err.message || 'Demo interrupted', 'error');
      setDemoRunning(false);
    }
  };

  // Time state for ticking countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Student Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { 
      sender: 'agent', 
      text: "Hello! I am the Campus Triage Agent. I can answer questions about academic policies, IT support, hostel rules, or fees. If I can't resolve your issue, I'll collect details and route it to the human team.", 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [slotState, setSlotState] = useState({});
  const [latestTrace, setLatestTrace] = useState(null);

  // System Audit & Safety Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('auditLogs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Automated Test Runner State
  const [testRunnerState, setTestRunnerState] = useState('idle'); 
  const [testResults, setTestResults] = useState([]);
  const [overallTestScore, setOverallTestScore] = useState(0);

  // Dashboard Stats & Tickets — v4 forces owned demo seeds (fixes empty My Requests)
  const [tickets, setTickets] = useState(() => {
    try {
      const ver = localStorage.getItem('ticketsVersion');
      if (ver !== '6') {
        localStorage.setItem('ticketsVersion', '6');
        localStorage.setItem('tickets', JSON.stringify(INITIAL_TICKETS));
        localStorage.setItem('resolvedTickets', JSON.stringify(INITIAL_RESOLVED_TICKETS));
        return INITIAL_TICKETS;
      }
      const saved = JSON.parse(localStorage.getItem('tickets') || 'null');
      if (!Array.isArray(saved) || saved.length === 0 || !saved.some((t) => t.ownerRegNo)) {
        localStorage.setItem('tickets', JSON.stringify(INITIAL_TICKETS));
        return INITIAL_TICKETS;
      }
      return saved;
    } catch {
      return INITIAL_TICKETS;
    }
  });
  const [resolvedTickets, setResolvedTickets] = useState(() => {
    try {
      const ver = localStorage.getItem('ticketsVersion');
      if (ver !== '6') {
        return INITIAL_RESOLVED_TICKETS;
      }
      const saved = JSON.parse(localStorage.getItem('resolvedTickets') || 'null');
      if (!Array.isArray(saved) || saved.length === 0 || !saved.some((t) => t.ownerRegNo)) {
        localStorage.setItem('resolvedTickets', JSON.stringify(INITIAL_RESOLVED_TICKETS));
        return INITIAL_RESOLVED_TICKETS;
      }
      return saved;
    } catch {
      return INITIAL_RESOLVED_TICKETS;
    }
  });
  const [groundedCount, setGroundedCount] = useState(() => Number(localStorage.getItem('groundedCount')) || 12);
  const [refusalCount, setRefusalCount] = useState(() => Number(localStorage.getItem('refusalCount')) || 3);
  const [escalatedCount, setEscalatedCount] = useState(tickets.length);

  // RAG Knowledge Base State (in-memory copy so users can add custom documents)
  const [knowledgeBase, setKnowledgeBase] = useState(() => {
    const saved = localStorage.getItem('knowledgeBase');
    return saved ? JSON.parse(saved) : campusDocuments;
  });

  // Citation Details modal state
  const [activeCitationDoc, setActiveCitationDoc] = useState(null);

  // Webhook Handoff simulator state per ticket: 'idle', 'sending', 'success'
  const [webhookSimState, setWebhookSimState] = useState('idle');
  const [webhookLoggedResponse, setWebhookLoggedResponse] = useState(null);

  // RAG Similarity Test Query
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragSandboxQuery, setRagSandboxQuery] = useState('');
  
  const [newDoc, setNewDoc] = useState({
    category: 'Academic',
    title: '',
    content: '',
    tags: '',
    source: ''
  });

    const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('All');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ragCandidates, setRagCandidates] = useState([]);
  const [ragBusyId, setRagBusyId] = useState(null);

    const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const auditLogsEndRef = useRef(null);
  const auditScrollRef = useRef(null);
  const lastDetailScrollId = useRef(null);
  const forceChatScrollRef = useRef(false);

  const scrollChildIntoParent = (endRef, parentRef, force = false) => {
    const end = endRef.current;
    const parent = parentRef.current;
    if (!end || !parent) return;
    const distanceFromBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight;
    if (!force && distanceFromBottom > 120) return; // user scrolled up — leave them alone
    parent.scrollTop = parent.scrollHeight;
  };

    useEffect(() => {
    if (!selectedTicket || typeof window === 'undefined') return undefined;
    if (window.matchMedia('(min-width: 1024px)').matches) return undefined;
    if (lastDetailScrollId.current === selectedTicket.id) return undefined;
    lastDetailScrollId.current = selectedTicket.id;
    const id = window.requestAnimationFrame(() => {
      document.querySelector('.dash-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedTicket) lastDetailScrollId.current = null;
  }, [selectedTicket]);

    useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

    useEffect(() => {
    const init = async () => {
      setSemanticStatus('loading model...');
      try {
        await semanticSearch.init();
        if (semanticSearch.ready && semanticSearch.index.length === 0) {
          await semanticSearch.indexDocuments(campusDocuments);
        }
        setSemanticReady(semanticSearch.ready);
        setSemanticStatus(semanticSearch.ready ? 'ready' : 'fallback');
      } catch (e) {
        setSemanticStatus('fallback');
      }
      knowledgeGraph.buildFromDocuments(campusDocuments);
      const existing = restoreSession();
      if (existing?.role === 'student' && existing.student) {
        studentPortal.setStudent(existing.student, existing.loggedInAt);
        setStudentProfile(existing.student);
      } else {
        studentPortal.logout();
      }
      setVoiceSupported(voiceInterface.supported);
    };
    init();
  }, []);

  // Run semantic search re-index when KB changes
  useEffect(() => {
    if (semanticReady && useSemanticSearch) {
      semanticSearch.indexDocuments(knowledgeBase).catch(() => {});
    }
  }, [knowledgeBase]);

  // Apply dark class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (userRole !== 'admin' || activeTab !== 'kb' || !getToken()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchRagCandidates('pending');
        if (!cancelled) setRagCandidates(data.candidates || []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [userRole, activeTab]);

    useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
    setEscalatedCount(tickets.length);
  }, [tickets]);

  const refreshTicketsFromApi = useCallback(async () => {
    if (!getToken()) return false;
    try {
      const staffOpts = userRole === 'admin'
        ? { sort: 'sla', department: deptFilter === 'all' ? undefined : deptFilter }
        : {};
      const [openRes, resolvedRes] = await Promise.all([
        fetchTickets('open', staffOpts),
        fetchTickets('resolved', staffOpts),
      ]);
      let open = openRes.tickets || [];
      let resolved = resolvedRes.tickets || [];
      if (userRole === 'student') {
        const reg = (studentProfile?.regNo || session?.student?.regNo || '').toUpperCase();
        if (open.length === 0 && reg) {
          open = INITIAL_TICKETS
            .filter((t) => t.ownerRegNo?.toUpperCase() === reg)
            .map((t) => ({ ...t, status: t.status || 'open', workflow: t.workflow || 'queued' }));
        }
        if (resolved.length === 0 && reg) {
          resolved = INITIAL_RESOLVED_TICKETS
            .filter((t) => t.ownerRegNo?.toUpperCase() === reg)
            .map((t) => ({ ...t, status: 'resolved' }));
        }
      }
      setTickets(open);
      setResolvedTickets(resolved);
      setApiOnline(true);
      if (userRole === 'student') {
        try {
          const n = await fetchNotifications();
          setNotifications(n.notifications || []);
          const unread = (n.notifications || []).filter((x) => !x.read);
          if (unread[0]) {
            addToast(unread[0].title, 'success');
            await markNotificationsRead();
          }
        } catch { /* ignore */ }
        try {
          const o = await fetchOutages();
          setOutages(o.outages || []);
        } catch { /* ignore */ }
      }
      if (userRole === 'admin') {
        try {
          const logs = await fetchAuditLogs();
          if (logs?.logs?.length) setAuditLogs(logs.logs);
        } catch { /* ignore */ }
        try {
          const docs = await fetchDocuments();
          if (docs?.documents?.length) {
            setKnowledgeBase(docs.documents.map((d) => ({
              id: d.id,
              title: d.title,
              category: d.category,
              source: d.source,
              tags: String(d.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
              content: d.content || '',
              lastUpdated: d.last_updated || '',
              filePath: d.file_path,
            })));
          }
        } catch { /* ignore */ }
      }
      return true;
    } catch {
      setApiOnline(false);
      return false;
    }
  }, [userRole, deptFilter, studentProfile?.regNo, session?.student?.regNo]);

    useEffect(() => {
    if (!session || !getToken()) return undefined;
    const id = setInterval(() => {
      refreshTicketsFromApi().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [session, refreshTicketsFromApi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const healthy = await healthCheck();
      if (cancelled) return;
      if (healthy && !getToken() && restoreSession()) {
        const next = await reconnectSession();
        if (cancelled) return;
        if (next && getToken()) {
          setSession(next);
          if (next.role === 'student') setStudentProfile(next.student);
          setApiOnline(true);
          await refreshTicketsFromApi();
          return;
        }
      }
      setApiOnline(Boolean(healthy) && Boolean(getToken()));
      const next = await validateSession();
      if (cancelled) return;
      if (!next && session) {
        setSession(null);
        setStudentProfile(null);
        return;
      }
      if (next) {
        setSession(next);
        if (next.role === 'student') setStudentProfile(next.student);
        if (getToken()) await refreshTicketsFromApi();
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep Live/Offline in sync; auto-reconnect offline demo sessions when API is up
  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    let reconnecting = false;
    const tick = async () => {
      const healthy = await healthCheck();
      if (cancelled) return;
      if (healthy && getToken()) {
        setApiOnline(true);
        return;
      }
      if (!healthy) {
        setApiOnline(false);
        return;
      }
      // API up, no token → silent demo re-login
      if (healthy && !getToken() && !reconnecting) {
        reconnecting = true;
        try {
          const next = await reconnectSession();
          if (cancelled) return;
          if (next && getToken()) {
            setSession(next);
            if (next.role === 'student') setStudentProfile(next.student);
            setApiOnline(true);
            await refreshTicketsFromApi();
            addToast('Reconnected to Campus Triage API', 'success');
          } else {
            setApiOnline(false);
          }
        } finally {
          reconnecting = false;
        }
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, refreshTicketsFromApi]);

    useEffect(() => {
    localStorage.setItem('resolvedTickets', JSON.stringify(resolvedTickets));
  }, [resolvedTickets]);

    useEffect(() => {
    localStorage.setItem('agentSettings', JSON.stringify(settings));
  }, [settings]);

    useEffect(() => {
    localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
    scrollChildIntoParent(auditLogsEndRef, auditScrollRef, false);
  }, [auditLogs]);

    useEffect(() => {
    localStorage.setItem('groundedCount', groundedCount.toString());
  }, [groundedCount]);

  useEffect(() => {
    localStorage.setItem('refusalCount', refusalCount.toString());
  }, [refusalCount]);

    useEffect(() => {
    localStorage.setItem('knowledgeBase', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

    useEffect(() => {
    const force = forceChatScrollRef.current;
    forceChatScrollRef.current = false;
    scrollChildIntoParent(chatEndRef, chatScrollRef, force);
  }, [chatMessages]);

    const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setWebhookSimState('idle');
    setWebhookLoggedResponse(null);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentMessage = { sender: 'student', text, timestamp };
    forceChatScrollRef.current = true;
    setChatMessages(prev => [...prev, studentMessage]);
    setChatInput('');

    const previewIntent = slotState.activeIntent || classifyIntent(text, settings);
    let activeSlotState = {
      ...slotState,
      activeIntent: previewIntent,
      slots: { ...(slotState.slots || {}) },
    };
    if (studentPortal.isLoggedIn()) {
      activeSlotState = studentPortal.injectContext(activeSlotState, previewIntent);
      setSlotState(activeSlotState);
    }

    if (tickets.length > 0) {
      const alerts = proactiveDetector.ingestTicket({ department: 'Pending', intent: slotState.activeIntent || 'GENERAL_ACADEMIC', slots: slotState.slots || {} });
      if (alerts.length > 0) setProactiveAlerts(alerts);
    }

    setAgentTraceSteps([]);

    const finishWithResult = (result, meta = {}) => {
      setSlotState(result.newSlots || {});
      setLatestTrace(normalizeTrace(result.trace, {
        intent: result.intent || meta.intent,
        action: result.action,
        priority: result.priority,
        plan: meta.plan,
        etaLabel: meta.etaLabel,
        owner: meta.owner,
        slots: result.newSlots?.slots,
      }));
      if (meta.plan) setAgentPlan(meta.plan);
      if (meta.needsConfirmation) {
        setPendingEscalate(meta.pendingEscalate || null);
      } else if (result.action === 'ESCALATE') {
        setPendingEscalate(null);
      }

      const agentReply = {
        sender: 'agent',
        text: (result.reply && String(result.reply).trim())
          || (result.action === 'REFUSAL'
            ? 'I only handle campus help (Wi-Fi, portal, hostel, fees, scholarships). Ask a campus question.'
            : 'I could not build a reply. Please try again or rephrase your campus question.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: result.action || 'REFUSAL',
        citations: result.citations || meta.citations,
        fallback: meta.fallback,
        needsConfirmation: meta.needsConfirmation,
        plan: meta.plan,
      };
      forceChatScrollRef.current = true;
      setChatMessages(prev => [...prev, agentReply]);

      const logTime = new Date().toLocaleTimeString();
      let logEntry = null;

      if (result.action === 'ANSWER') {
        setGroundedCount(prev => prev + 1);
        logEntry = { time: logTime, type: 'SYSTEM', message: meta.fallback
          ? 'Offline rules answered (API unavailable).'
          : 'Grounded campus answer dispatched with citations.' };
      } else if (result.action === 'REFUSAL') {
        setRefusalCount(prev => prev + 1);
        logEntry = { time: logTime, type: 'SAFETY', message: `Campus-only shield refused: "${text.substring(0, 35)}..."` };
      } else if (result.action === 'CLARIFY') {
        logEntry = { time: logTime, type: 'SLOT', message: `Clarifying slots for intent '${result.trace?.intent || result.intent}'.` };
      } else if (result.action === 'ESCALATE_PROPOSE') {
        logEntry = { time: logTime, type: 'HANDOFF', message: `Agent proposed handoff — awaiting student confirmation.` };
      } else if (result.action === 'ESCALATE' && result.ticket) {
        const priority = result.ticket.priority || 'Medium';
        const slaDuration = result.ticket.slaDuration || (priority === 'High' ? 1800000 : priority === 'Medium' ? 7200000 : 14400000);
        const enhancedTicket = {
          ...result.ticket,
          escalatedAt: result.ticket.escalatedAt || Date.now(),
          slaDuration,
          ownerRegNo: studentProfile?.regNo || result.ticket.slots?.studentID || result.ticket.ownerRegNo || null,
          ownerEmail: studentProfile?.email || result.ticket.slots?.registeredEmail || result.ticket.ownerEmail || null,
          ownerName: studentProfile?.name || result.ticket.ownerName || null,
        };
        if (studentPortal.isLoggedIn()) studentPortal.addTicketToHistory(enhancedTicket);
        const alerts = proactiveDetector.ingestTicket(enhancedTicket);
        if (alerts.length > 0) setProactiveAlerts(alerts);
        setTickets(prev => {
          if (prev.some((t) => t.id === enhancedTicket.id)) return prev;
          return [enhancedTicket, ...prev];
        });
        logEntry = { time: logTime, type: 'SYSTEM', message: `Ticket ${enhancedTicket.id} → ${enhancedTicket.department}.` };
        setChatMessages(prev => [...prev, {
          sender: 'system',
          text: `Ticket ${enhancedTicket.id} filed with ${enhancedTicket.department}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }

      if (logEntry) setAuditLogs(prev => [...prev, logEntry]);

      const debate = runMultiAgentDebate(text, result.trace?.intent || result.intent || 'GENERAL_ACADEMIC', result.trace?.sentiment || { label: 'Neutral', score: 0 }, slotState.slots || {}, settings);
      setDebateData(debate);
      const emotion = generateEmotionAdaptiveResponse(result.reply, result.trace?.sentiment || { label: 'Neutral', score: 0 }, result.trace?.intent || result.intent || 'GENERAL');
      setEmotionResponse(emotion);
      const similar = findSimilarTickets({ studentQuery: text, intent: result.trace?.intent || result.intent || 'GENERAL_ACADEMIC' }, [...tickets, ...resolvedTickets]);
      setSimilarTickets(similar);
      if (result.action === 'ESCALATE' && result.ticket) {
        setStaffAssignment(smartStaffAssignment(result.ticket.intent, result.ticket.sentiment || 'Neutral', result.ticket.priority, result.ticket.department));
      }
      const detectedAnomalies = detectAnomalies(tickets);
      if (detectedAnomalies.length > 0) setAnomalies(detectedAnomalies);
      setSlaPredictions(predictSLABreach(tickets));
      setIsProcessing(false);
    };

    try {
      if (getToken()) {
        const apiResult = await agentChat(text);
        setApiOnline(true);
        finishWithResult({
          reply: apiResult.reply,
          action: apiResult.action,
          intent: apiResult.intent,
          priority: apiResult.priority,
          ticket: apiResult.ticket,
          citations: apiResult.citations,
          newSlots: { activeIntent: apiResult.intent, slots: apiResult.slots || {} },
          trace: traceFromApiPlan(apiResult, text),
        }, {
          fallback: Boolean(apiResult.fallback),
          citations: apiResult.citations,
          plan: apiResult.plan,
          needsConfirmation: Boolean(apiResult.needsConfirmation),
          pendingEscalate: apiResult.pendingEscalate,
          etaLabel: apiResult.etaLabel,
          owner: apiResult.owner,
        });
        return;
      }
    } catch (err) {
      if (err?.status === 429) {
        setIsProcessing(false);
        addToast(err.message || 'Rate limit — slow down', 'error');
        setChatMessages((prev) => [...prev, {
          sender: 'system',
          text: err.message || 'Too many requests. Wait a moment, then try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        return;
      }
      // Don't sticky-offline on a single chat failure if /health is still up
      const healthy = await healthCheck();
      if (healthy && getToken()) {
        setApiOnline(true);
        addToast(err.message || 'Agent busy — using local rules for this reply', 'error');
      } else {
        setApiOnline(false);
        setChatMessages(prev => [...prev, {
          sender: 'system',
          text: healthy && !getToken()
            ? 'API is back, but this session is offline. Sign out and sign in again to reconnect.'
            : 'API offline — using local campus rules fallback.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    }

    setTimeout(async () => {
      let result;
      if (semanticReady && useSemanticSearch) {
        try {
          result = await processQueryAsync(text, chatMessages, activeSlotState, settings, knowledgeBase, semanticSearch, knowledgeGraph);
          if (result.agentTrace) setAgentTraceSteps(result.agentTrace);
        } catch {
          result = processQuery(text, chatMessages, activeSlotState, settings, knowledgeBase);
        }
      } else {
        result = processQuery(text, chatMessages, activeSlotState, settings, knowledgeBase);
      }
      if (knowledgeGraph) {
        const graphInfo = knowledgeGraph.searchByQuery(text);
        if (graphInfo.entitiesFound.length > 0 || graphInfo.relationships.length > 0) {
          setGraphEntities(graphInfo);
        }
      }
      finishWithResult(result, { fallback: true });
    }, 200);
  };

  // Preset Buttons Trigger
  const handleConfirmEscalate = async () => {
    if (!pendingEscalate || isProcessing) return;
    setIsProcessing(true);
    try {
      const apiResult = await agentChat('Confirm filing ticket', {
        confirmEscalate: true,
        pendingEscalate,
      });
      setPendingEscalate(null);
      setAgentPlan(apiResult.plan || null);
      if (apiResult.ticket) {
        setTickets(prev => {
          if (prev.some((t) => t.id === apiResult.ticket.id)) return prev;
          return [apiResult.ticket, ...prev];
        });
        setSelectedTicket(apiResult.ticket);
        setActiveTab('dashboard');
        addToast(`Ticket ${apiResult.ticket.id} filed — attach a photo below`, 'success');
      }
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text: apiResult.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'ESCALATE',
        plan: apiResult.plan,
      }, {
        sender: 'system',
        text: apiResult.ticket
          ? `Handoff complete: ${apiResult.ticket.id} → ${apiResult.ticket.department}. Open My Requests to attach a photo.`
          : 'Ticket filed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      addToast(err.message || 'Could not confirm handoff', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEscalate = () => {
    setPendingEscalate(null);
    setChatMessages(prev => [...prev, {
      sender: 'system',
      text: 'Handoff cancelled. Ask another campus question anytime.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  useEffect(() => {
    if (!judgeAutoConfirmRef.current || !pendingEscalate || isProcessing) return;
    judgeAutoConfirmRef.current = false;
    handleConfirmEscalate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEscalate, isProcessing]);

  const handleTrackTicket = async () => {
    const id = trackTicketId.trim().toUpperCase();
    if (!id) return;
    try {
      if (getToken()) {
        const { ticket } = await fetchTicket(id);
        setSelectedTicket(ticket);
        setActiveTab('dashboard');
        addToast(`${ticket.id} · ${ticket.workflow || ticket.status}`, 'success');
        return;
      }
    } catch {
      /* fall through */
    }
    const found = [...tickets, ...resolvedTickets].find((t) => t.id.toUpperCase() === id);
    if (found) {
      setSelectedTicket(found);
      setActiveTab('dashboard');
    } else {
      addToast('Ticket not found', 'error');
    }
  };

  const handlePresetTrigger = (presetQuery) => {
    handleSendMessage(presetQuery);
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      const { ticket } = await patchTicket(ticketId, 'claim');
      setTickets(prev => prev.map((t) => (t.id === ticketId ? ticket : t)));
      setSelectedTicket(ticket);
      addToast(`Claimed ${ticketId}`, 'success');
    } catch (err) {
      addToast(err.message || 'Claim failed', 'error');
    }
  };

  const handleOpsNote = async (ticketId) => {
    if (!opsNote.trim()) return;
    try {
      const { ticket } = await patchTicket(ticketId, 'note', { note: opsNote.trim() });
      setTickets(prev => prev.map((t) => (t.id === ticketId ? ticket : t)));
      setSelectedTicket(ticket);
      setOpsNote('');
      addToast('Internal note saved', 'success');
    } catch (err) {
      addToast(err.message || 'Note failed', 'error');
    }
  };

  const handleTicketPhoto = async (ticketId, file) => {
    if (!file || !getToken()) {
      addToast('Sign in via API to attach photos', 'error');
      return;
    }
    try {
      const { ticket } = await uploadTicketPhoto(ticketId, file);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? ticket : t)));
      setResolvedTickets((prev) => prev.map((t) => (t.id === ticketId ? ticket : t)));
      setSelectedTicket(ticket);
      addToast('Photo attached to ticket', 'success');
    } catch (err) {
      addToast(err.message || 'Photo upload failed', 'error');
    }
  };

  const handleAskAboutTicket = (ticket) => {
    setSelectedTicket(ticket);
    setActiveTab('playground');
    const msg = `Update on my ticket ${ticket.id}: ${ticket.studentQuery}. Current status? Staff said: ${ticket.studentReply || 'no update yet'}.`;
    setTimeout(() => handleSendMessage(msg), 80);
  };

  /** Dashboard one-tap: open Ask help and auto-send (no typing). */
  const startCampusAsk = (query) => {
    if (!query?.trim()) return;
    setActiveTab('playground');
    setTimeout(() => handleSendMessage(query.trim()), 80);
  };

  // Run Automated Evaluation Tests
  const handleRunEvaluation = () => {
    setTestRunnerState('running');
    setTestResults([]);

    let completedTests = [];
    let score = 0;

    BENCHMARK_TESTS.forEach((test, idx) => {
      setTimeout(() => {
        const result = processQuery(test.query, [], {}, settings, knowledgeBase);
        const isPass = result.action === test.expectedAction;
        if (isPass) score++;

        completedTests.push({
          ...test,
          actualAction: result.action,
          status: isPass ? 'pass' : 'fail'
        });

        setTestResults([...completedTests]);

        if (idx === BENCHMARK_TESTS.length - 1) {
          setTestRunnerState('done');
          setOverallTestScore(score);
          setAuditLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            type: 'SAFETY',
            message: `Evaluator Check: Automated benchmark run complete. Score: ${score}/6 tests passed.`
          }]);
        }
      }, (idx + 1) * 350);
    });
  };

  // Close ticket / resolve and move to Resolved Archive
  const handleResolveTicket = async (ticketId) => {
    const ticketToResolve = tickets.find(t => t.id === ticketId);
    if (!ticketToResolve) return;

    if (getToken()) {
      try {
        const { ticket } = await patchTicket(ticketId, 'resolve', {
          note: opsNote.trim() || undefined,
          studentMessage: opsNote.trim()
            ? `Resolved: ${opsNote.trim()}`
            : undefined,
        });
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setResolvedTickets(prev => [ticket, ...prev]);
        setOpsNote('');
        if (confettiRef.current) fireConfetti(confettiRef.current);
        addToast(`Ticket ${ticketId} resolved — student notified`);
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(null);
          setWebhookSimState('idle');
          setWebhookLoggedResponse(null);
        }
        setAuditLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          type: 'SYSTEM',
          message: `Ticket ${ticketId} resolved via API (${ticket.slaMet ? 'SLA Met' : 'SLA Breached'}).`
        }]);
        setApiOnline(true);
        return;
      } catch {
        setApiOnline(false);
      }
    }

    const resolvedTime = Date.now();
    const isSlaMet = resolvedTime <= (ticketToResolve.escalatedAt + ticketToResolve.slaDuration);
    const resolutionMinutes = Math.round((resolvedTime - ticketToResolve.escalatedAt) / 60000);
    const archivedItem = {
      ...ticketToResolve,
      resolvedAt: resolvedTime,
      slaMet: isSlaMet,
      resolutionTimeMinutes: Math.max(1, resolutionMinutes)
    };
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setResolvedTickets(prev => [archivedItem, ...prev]);
    if (confettiRef.current) fireConfetti(confettiRef.current);
    addToast(`Ticket ${ticketId} resolved in ${archivedItem.resolutionTimeMinutes}m!`);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(null);
      setWebhookSimState('idle');
      setWebhookLoggedResponse(null);
    }
    setAuditLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      message: `Triage Ticket ${ticketId} resolved in ${archivedItem.resolutionTimeMinutes}m (${isSlaMet ? 'SLA Met' : 'SLA Breached'}).`
    }]);
  };

  // Re-open archived ticket
  const handleReopenTicket = async (ticketId) => {
    const ticketToReopen = resolvedTickets.find(t => t.id === ticketId);
    if (!ticketToReopen) return;

    if (getToken()) {
      try {
        const { ticket } = await patchTicket(ticketId, 'reopen');
        setResolvedTickets(prev => prev.filter(t => t.id !== ticketId));
        setTickets(prev => [ticket, ...prev]);
        setAuditLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          type: 'SYSTEM',
          message: `Ticket ${ticketId} reopened via API.`
        }]);
        setApiOnline(true);
        return;
      } catch {
        setApiOnline(false);
      }
    }

    const { resolvedAt, slaMet, resolutionTimeMinutes, ...rest } = ticketToReopen;
    const restoredTicket = {
      ...rest,
      escalatedAt: Date.now(),
      timestamp: new Date().toLocaleString()
    };
    setResolvedTickets(prev => prev.filter(t => t.id !== ticketId));
    setTickets(prev => [restoredTicket, ...prev]);
    setAuditLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      message: `Ticket Reopened: Ticket ${ticketId} restored to active triage queue.`
    }]);
  };

  // Add document to RAG KB (text) or PDF upload to API
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) return;

    const formattedDoc = {
      id: `custom-${Date.now()}`,
      category: newDoc.category,
      title: newDoc.title,
      content: newDoc.content,
      tags: newDoc.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      source: newDoc.source || 'Admin Upload',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    setKnowledgeBase(prev => [formattedDoc, ...prev]);
    setNewDoc({
      category: 'Academic',
      title: '',
      content: '',
      tags: '',
      source: ''
    });

    setAuditLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      message: `RAG document index updated: "${formattedDoc.title}" indexed into database.`
    }]);

    addToast('Document indexed in knowledge base', 'success');
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!getToken()) {
      addToast('API login required for PDF upload', 'error');
      return;
    }
    setPdfUploading(true);
    try {
      const title = newDoc.title || file.name.replace(/\.pdf$/i, '');
      await uploadPdf({
        file,
        title,
        category: newDoc.category || 'Admissions',
        tags: newDoc.tags || 'admissions,pdf',
      });
      await refreshTicketsFromApi();
      addToast(`PDF indexed: ${title}`, 'success');
      setAuditLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'SYSTEM',
        message: `PDF uploaded and chunked into RAG: ${title}`,
      }]);
    } catch (err) {
      addToast(err.message || 'PDF upload failed', 'error');
    } finally {
      setPdfUploading(false);
    }
  };

  // Delete custom document
  const handleDeleteDocument = (docId) => {
    const docToDelete = knowledgeBase.find(d => d.id === docId);
    setKnowledgeBase(prev => prev.filter(d => d.id !== docId));
    if (docToDelete) {
      setAuditLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'SYSTEM',
        message: `RAG document index updated: Deleted chunk "${docToDelete.title}".`
      }]);
    }
  };

  // Reset demo state
  const resetDemo = () => {
    if (window.confirm("Reset all custom tickets, documents, settings, logs and metrics?")) {
      localStorage.removeItem('tickets');
      localStorage.removeItem('resolvedTickets');
      localStorage.removeItem('knowledgeBase');
      localStorage.removeItem('groundedCount');
      localStorage.removeItem('refusalCount');
      localStorage.removeItem('agentSettings');
      localStorage.removeItem('auditLogs');
      localStorage.setItem('ticketsVersion', '4');
      
      setTickets(INITIAL_TICKETS);
      setResolvedTickets(INITIAL_RESOLVED_TICKETS);
      setKnowledgeBase(campusDocuments);
      setGroundedCount(12);
      setRefusalCount(3);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setSettings({
        ragThreshold: 0.40,
        sentimentBoost: true,
        profanityFilter: true
      });
      setSlotState({});
      setLatestTrace(null);
      setSelectedTicket(null);
      setWebhookSimState('idle');
      setWebhookLoggedResponse(null);
      setTestRunnerState('idle');
      setTestResults([]);
      setChatMessages([
        { 
          sender: 'agent', 
          text: "System Reset Completed. Hello! I am the Campus Triage Agent. How can I help you today?", 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
    }
  };

  const handleAuthenticated = async (nextSession, via = 'api') => {
    setSession(nextSession);
    setSelectedTicket(null);
    setApiOnline(via === 'api' && Boolean(getToken()));

    if (via === 'api' && getToken()) {
      const ok = await refreshTicketsFromApi();
      if (!ok) {
        setTickets(INITIAL_TICKETS);
        setResolvedTickets(INITIAL_RESOLVED_TICKETS);
      }
    } else {
      setTickets(INITIAL_TICKETS);
      setResolvedTickets(INITIAL_RESOLVED_TICKETS);
      localStorage.setItem('ticketsVersion', '5');
      localStorage.setItem('tickets', JSON.stringify(INITIAL_TICKETS));
      localStorage.setItem('resolvedTickets', JSON.stringify(INITIAL_RESOLVED_TICKETS));
    }

    if (nextSession.role === 'student') {
      studentPortal.setStudent(nextSession.student, nextSession.loggedInAt);
      setStudentProfile(nextSession.student);
      setActiveTab('dashboard');
      if (!localStorage.getItem('theme')) setDarkMode(false);
      setChatMessages([{
        sender: 'agent',
        text: `Hi ${nextSession.student.name.split(' ')[0]} — I am Campus Help. Ask about Wi-Fi, portal login, hostel, fees, or scholarships. I will answer from campus policy or file a request for your room (${nextSession.student.hostel} ${nextSession.student.room}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setAuditLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'SYSTEM',
        message: `Student ${nextSession.student.name} (${nextSession.student.regNo}) signed into Student Help (${via}).`
      }]);
    } else {
      studentPortal.logout();
      setStudentProfile(null);
      setActiveTab('dashboard');
      if (!localStorage.getItem('theme')) setDarkMode(true);
      setAuditLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'SYSTEM',
        message: `Staff ${nextSession.admin.name} signed into Academic Ops (${via}).`
      }]);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    studentPortal.logout();
    setSession(null);
    setStudentProfile(null);
    setSlotState({});
    setSelectedTicket(null);
    setApiOnline(false);
    setActiveTab('dashboard');
  };

  // Voice handler
  const handleVoiceToggle = () => {
    if (voiceListening) {
      voiceInterface.stopListening();
      setVoiceListening(false);
    } else {
      setVoiceListening(true);
      voiceInterface.startListening(
        (transcript) => {
          setVoiceListening(false);
          handleSendMessage(transcript);
        },
        (error) => {
          setVoiceListening(false);
          setAuditLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'SYSTEM', message: `Voice input error: ${error}` }]);
        }
      );
    }
  };

  const handleSpeakResponse = (text) => {
    voiceInterface.speak(text);
  };

  // Dismiss proactive alert
  const handleDismissAlert = (alertId) => {
    proactiveDetector.resolveAlert(alertId);
    setProactiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // NL Dashboard Filter
  const handleNlFilter = () => {
    if (!nlQuery.trim()) { setNlFilter(null); setNlInterpretation(''); return; }
    const parsed = parseNaturalLanguageQuery(nlQuery);
    setNlFilter(parsed.filters);
    setNlInterpretation(parsed.interpretedAs);
    addToast(parsed.interpretedAs, 'info');
  };

  // Filter tickets with NL
  const nlFilteredTickets = nlFilter ? tickets.filter(t => {
    if (nlFilter.department && !t.department.toLowerCase().includes(nlFilter.department.toLowerCase())) return false;
    if (nlFilter.priority && t.priority !== nlFilter.priority) return false;
    if (nlFilter.sentiment && t.sentiment !== nlFilter.sentiment) return false;
    return true;
  }) : null;

  // Auto-dismiss proactive alerts after 30s
  useEffect(() => {
    if (proactiveAlerts.length === 0) return;
    const timers = proactiveAlerts.map(alert =>
      setTimeout(() => handleDismissAlert(alert.id), 30000)
    );
    return () => timers.forEach(clearTimeout);
  }, [proactiveAlerts]);

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesFilter = ticketFilter === 'All' || t.department.includes(ticketFilter) || t.priority === ticketFilter;
    const matchesSearch = t.id.toLowerCase().includes(ticketSearch.toLowerCase()) || 
                          t.studentQuery.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                          t.intent.toLowerCase().includes(ticketSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Student dashboard: tickets owned by the logged-in student
  const matchesStudentTicket = (t) => {
    if (!studentProfile) return false;
    const s = t.slots || {};
    const reg = studentProfile.regNo.toUpperCase();
    const email = studentProfile.email.toLowerCase();
    return t.ownerRegNo?.toUpperCase() === reg
      || t.ownerEmail?.toLowerCase() === email
      || s.studentID?.toUpperCase() === reg
      || s.registeredEmail?.toLowerCase() === email
      || (s.roomNumber === studentProfile.room && s.blockName === studentProfile.hostel);
  };
  const myOpenTickets = studentProfile ? tickets.filter(matchesStudentTicket) : [];
  const myResolvedTickets = studentProfile ? resolvedTickets.filter(matchesStudentTicket) : [];

  // Keep a request open in the detail pane so the dashboard never feels blank
  useEffect(() => {
    if (userRole !== 'student' || activeTab !== 'dashboard' || !studentProfile) return;
    setSelectedTicket((prev) => {
      if (prev) {
        const stillThere = [...tickets, ...resolvedTickets].some((t) => t.id === prev.id);
        if (stillThere) return prev;
      }
      return myOpenTickets[0] || null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, activeTab, studentProfile?.regNo, tickets, resolvedTickets]);

  // Calculate ticket counts by department for ECharts
  const deptData = {
    'IT Support Services': 0,
    'Hostel Warden & Facilities': 0,
    'Finance & Accounts': 0,
    'General Academic Support': 0
  };
  tickets.forEach(t => {
    if (deptData[t.department] !== undefined) {
      deptData[t.department]++;
    }
  });

  // Calculate sentiment categories for ECharts
  const sentimentCounts = { 'Neutral': 0, 'Frustrated': 0, 'Positive': 0 };
  tickets.forEach(t => {
    if (sentimentCounts[t.sentiment] !== undefined) {
      sentimentCounts[t.sentiment]++;
    }
  });

  // Theme-aware styles for ECharts
  const labelColor = darkMode ? '#fafafa' : '#09090b';
  const axisColor = darkMode ? '#52525b' : '#a1a1aa';
  const gridBorder = darkMode ? '#27272a' : '#e4e4e7';
  const chartColors = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

  // Chart Option 1: Tickets by Department
  const getDeptChartOption = () => ({
    color: chartColors,
    tooltip: { trigger: 'item', backgroundColor: darkMode ? '#0c0c0f' : '#ffffff', borderColor: gridBorder, textStyle: { color: labelColor } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['IT Support', 'Hostel Warden', 'Finance', 'Academics'],
      axisLabel: { color: labelColor, fontSize: 10, interval: 0 },
      axisLine: { lineStyle: { color: axisColor } }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: labelColor, fontSize: 10 },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { lineStyle: { color: gridBorder } }
    },
    series: [{
      data: [
        deptData['IT Support Services'],
        deptData['Hostel Warden & Facilities'],
        deptData['Finance & Accounts'],
        deptData['General Academic Support']
      ],
      type: 'bar',
      barWidth: '45%',
      itemStyle: { borderRadius: [4, 4, 0, 0] }
    }]
  });

  // Chart Option 2: Sentiment Distribution
  const getSentimentChartOption = () => ({
    color: ["#cbd5e1", "#ef4444", "#10b981"],
    tooltip: { trigger: 'item', backgroundColor: darkMode ? '#0c0c0f' : '#ffffff', borderColor: gridBorder, textStyle: { color: labelColor } },
    series: [{
      name: 'Sentiment',
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: darkMode ? '#0c0c0f' : '#fff', borderWidth: 2 },
      label: { show: true, color: labelColor, fontSize: 10, formatter: '{b}: {c}' },
      data: [
        { value: sentimentCounts['Neutral'], name: 'Neutral' },
        { value: sentimentCounts['Frustrated'], name: 'Frustrated' },
        { value: sentimentCounts['Positive'], name: 'Positive' }
      ]
    }]
  });

  // Chart Option 3: Grounded / Refusal / Escalated Summary
  const getSummaryChartOption = () => ({
    color: ["#10b981", "#ef4444", "#3b82f6"],
    tooltip: { trigger: 'axis', backgroundColor: darkMode ? '#0c0c0f' : '#ffffff', borderColor: gridBorder, textStyle: { color: labelColor } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: labelColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridBorder } }
    },
    yAxis: {
      type: 'category',
      data: ['Refusals', 'Grounded', 'Escalated'],
      axisLabel: { color: labelColor, fontSize: 10 },
      axisLine: { lineStyle: { color: axisColor } }
    },
    series: [{
      type: 'bar',
      data: [refusalCount, groundedCount, tickets.length],
      label: { show: true, position: 'right', color: labelColor }
    }]
  });

  // Chart Option 4: Precision-Recall Trade-off Curve
  const getTradeoffChartOption = () => {
    const points = [
      [20, 35, "Threshold 0.10"],
      [35, 60, "Threshold 0.20"],
      [48, 80, "Threshold 0.30"],
      [60, 92, "Threshold 0.40"],
      [75, 96, "Threshold 0.50"],
      [88, 99, "Threshold 0.60"],
      [95, 100, "Threshold 0.70"],
      [99, 100, "Threshold 0.80"]
    ];

    const closestIdx = Math.max(0, Math.min(7, Math.round((settings.ragThreshold - 0.10) / 0.10)));
    const activePoint = points[closestIdx];

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const pt = points[params[0].dataIndex];
          return `<b>${pt[2]}</b><br/>Direct Answer Accuracy: ${pt[1]}%<br/>Escalation Recall: ${pt[0]}%`;
        },
        backgroundColor: darkMode ? '#0c0c0f' : '#ffffff',
        borderColor: gridBorder,
        textStyle: { color: labelColor }
      },
      grid: { left: '8%', right: '8%', bottom: '12%', top: '8%' },
      xAxis: {
        type: 'value',
        name: 'Recall (Escalation Handoff %)',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: labelColor, fontSize: 8 },
        axisLabel: { color: labelColor, fontSize: 9 },
        splitLine: { lineStyle: { color: gridBorder } },
        min: 10,
        max: 100
      },
      yAxis: {
        type: 'value',
        name: 'Precision (RAG Direct Accuracy %)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: labelColor, fontSize: 8 },
        axisLabel: { color: labelColor, fontSize: 9 },
        splitLine: { lineStyle: { color: gridBorder } },
        min: 20,
        max: 100
      },
      series: [
        {
          type: 'line',
          data: points.map(pt => [pt[0], pt[1]]),
          smooth: true,
          lineStyle: { width: 3, color: '#3b82f6' },
          symbolSize: 6,
          symbol: 'circle'
        },
        {
          type: 'effectScatter',
          data: [[activePoint[0], activePoint[1]]],
          symbolSize: 12,
          color: '#ef4444',
          rippleEffect: { scale: 3, brushType: 'stroke' }
        }
      ]
    };
  };

    const handleOpenCitation = (sourceCitation) => {
    const matchedDoc = knowledgeBase.find(doc => doc.source.toLowerCase().includes(sourceCitation.toLowerCase()) || sourceCitation.toLowerCase().includes(doc.source.toLowerCase()));
    if (matchedDoc) {
      setActiveCitationDoc(matchedDoc);
    } else {
      setActiveCitationDoc({
        title: "Citation Reference details",
        category: "General Policy Documentation",
        content: `Could not load full document text, but referenced section is: ${sourceCitation}. Please review the RAG manager for complete indices.`,
        source: sourceCitation,
        lastUpdated: "N/A",
        tags: []
      });
    }
  };

    const handleTriggerWebhook = () => {
    if (!selectedTicket) return;
    setWebhookSimState('sending');
    setWebhookLoggedResponse(null);

    setTimeout(() => {
      setWebhookSimState('success');
      setWebhookLoggedResponse({
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "application/json",
          "Server": "Vitb-Helpdesk-Gateway",
          "X-Handoff-Recipient": selectedTicket.department
        },
        data: {
          success: true,
          externalSystem: "JIRA_SERVICE_DESK",
          externalTicketKey: `JSD-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "QUEUED",
          message: "Triage handoff payload validated and routed to department queue.",
          dispatchedAt: new Date().toISOString()
        }
      });
      setAuditLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'SYSTEM',
        message: `API Dispatch: Webhook handoff successfully received by external system for ticket ${selectedTicket.id}.`
      }]);
    }, 1500);
  };

  const renderSlaTimer = (ticket) => <SlaTimer ticket={ticket} now={currentTime} />;

    const ragSandboxResults = ragSandboxQuery ? retrieveDocuments(ragSandboxQuery, knowledgeBase) : [];

  const app = {
    userRole, activeTab, setActiveTab, playgroundSubTab, setPlaygroundSubTab,
    studentProfile, session, apiOnline, darkMode, setDarkMode,
    chatInput, setChatInput, chatMessages, isProcessing, slotState,
    pendingEscalate, agentPlan, latestTrace, agentTraceSteps,
    chatScrollRef, chatEndRef, auditScrollRef, auditLogsEndRef,
    handleSendMessage, handleConfirmEscalate, handleCancelEscalate,
    handlePresetTrigger, handleVoiceToggle, handleSpeakResponse,
    voiceListening, voiceSupported, outages, proactiveAlerts, handleDismissAlert,
    startCampusAsk, handleAskAboutTicket, handleTicketPhoto,
    myOpenTickets, myResolvedTickets, selectedTicket, setSelectedTicket,
    notifications, tickets, resolvedTickets, filteredTickets, nlFilteredTickets,
    nlQuery, setNlQuery, nlFilter, setNlFilter, nlInterpretation, setNlInterpretation,
    handleNlFilter, ticketSearch, setTicketSearch, ticketFilter, setTicketFilter,
    deptFilter, setDeptFilter, refreshTicketsFromApi, renderSlaTimer, currentTime,
    groundedCount, refusalCount, knowledgeGraph, knowledgeBase, setKnowledgeBase,
    ragCandidates, setRagCandidates, ragBusyId, setRagBusyId, addToast,
    ragSearchQuery, setRagSearchQuery, ragSandboxQuery, setRagSandboxQuery, ragSandboxResults,
    newDoc, setNewDoc, handleAddDocument, handlePdfUpload, handleDeleteDocument, pdfUploading,
    settings, setSettings, auditLogs, webhookSimState, webhookLoggedResponse, handleTriggerWebhook,
    opsNote, setOpsNote, handleClaimTicket, handleOpsNote, handleResolveTicket, handleReopenTicket,
    testRunnerState, testResults, overallTestScore, handleRunEvaluation,
    getTradeoffChartOption, getDeptChartOption, getSentimentChartOption, getSummaryChartOption,
    debateData, slaPredictions, anomalies, similarTickets,
    staffAssignment, emotionResponse, graphEntities, semanticReady, semanticStatus,
    useSemanticSearch, setUseSemanticSearch, demoRunning, runDemo,
    trackTicketId, setTrackTicketId, handleTrackTicket,
    activeCitationDoc, setActiveCitationDoc, handleOpenCitation,
    toasts, confettiRef, handleLogout, BENCHMARK_TESTS,
  };

  const navTabs = userRole === 'admin'
    ? [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Ops queue' },
        { id: 'kb', icon: Database, label: 'RAG desk' },
        { id: 'playground', icon: GitBranch, label: 'Pipeline' },
      ]
    : [
        { id: 'dashboard', icon: Inbox, label: 'My requests' },
        { id: 'playground', icon: MessageSquare, label: 'Ask help' },
      ];

  if (!session) {
    return <LoginGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`scene-3d flex relative ${userRole === 'student' ? 'shell-student' : 'shell-admin'} ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      
      {/* Confetti Canvas */}
      <canvas ref={confettiRef} className="fixed inset-0 z-[100] pointer-events-none" />
      
      {/* Desktop Sidebar */}
      <aside className="shell-rail hidden lg:flex w-14 flex-shrink-0 flex-col z-30 min-h-screen">
        <div className="h-12 flex items-center justify-center border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="rail-mark" title={userRole === 'student' ? 'Student Help' : 'Academic Ops'}>
            {userRole === 'student' ? 'SH' : 'AO'}
          </div>
        </div>
        <nav className="flex flex-col items-center gap-1 p-2 flex-1">
          {navTabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
              className={`rail-btn ${activeTab === tab.id ? 'active' : ''}`} title={tab.label}>
              <tab.icon size={18} />
            </button>
          ))}
        </nav>
        <div className="p-2 border-t" style={{ borderColor: 'var(--line)' }}>
          <button onClick={handleLogout}
            className="rail-btn w-full" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      
      {/* Main Column */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        
        {/* Header */}
        <header className="header-glass sticky top-0 z-20">
          <div className="px-4 h-12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="lg:hidden rail-mark">
                {userRole === 'student' ? 'SH' : 'AO'}
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--ink)' }}>
                  {userRole === 'student'
                    ? (activeTab === 'playground' ? 'Student Help' : 'My Requests')
                    : (activeTab === 'dashboard' ? 'Academic Ops'
                      : activeTab === 'kb' ? 'Knowledge Base'
                      : 'Agent Trace')}
                </span>
                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, var(--ink) 6%, var(--surface))', color: 'var(--muted)' }}>
                  {userRole === 'student'
                    ? (studentProfile ? studentProfile.regNo : 'Student')
                    : (session.admin?.title || 'Staff')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="hidden md:inline text-[10px] font-medium px-2 py-1 rounded-md"
                style={{
                  background: 'color-mix(in oklch, var(--ink) 5%, var(--surface))',
                  color: apiOnline ? 'var(--ok)' : 'var(--warn)',
                }}
                title={
                  apiOnline
                    ? 'Connected to Campus Triage API'
                    : getToken()
                      ? 'API unreachable — click to retry'
                      : 'Click to reconnect to Campus Triage API'
                }
                onClick={async () => {
                  if (apiOnline) return;
                  const healthy = await healthCheck();
                  if (!healthy) {
                    addToast('API still unreachable on :8787', 'error');
                    return;
                  }
                  if (getToken()) {
                    setApiOnline(true);
                    await refreshTicketsFromApi();
                    return;
                  }
                  const next = await reconnectSession();
                  if (next && getToken()) {
                    setSession(next);
                    if (next.role === 'student') setStudentProfile(next.student);
                    setApiOnline(true);
                    await refreshTicketsFromApi();
                    addToast('Reconnected to Campus Triage API', 'success');
                  } else {
                    addToast('Reconnect failed — sign out and sign in again', 'error');
                  }
                }}
              >
                {apiOnline ? 'Live' : (getToken() ? 'Offline' : 'Reconnect')}
              </button>
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
                style={{ color: 'var(--muted)' }}
                title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              {userRole === 'admin' && (
                <button onClick={runDemo} disabled={demoRunning || isProcessing}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-all disabled:opacity-50"
                  style={{ color: 'var(--muted)' }}>
                  {demoRunning ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                  {demoRunning ? 'Running' : 'Demo'}
                </button>
              )}
              {userRole === 'student' && (
                <button onClick={runDemo} disabled={demoRunning || isProcessing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md transition-all disabled:opacity-50"
                  style={{ background: 'var(--action)', color: 'oklch(0.22 0.04 55)' }}
                  title="Track 2 judge path: Wi‑Fi → refuse → handoff">
                  {demoRunning ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                  {demoRunning ? 'Demo…' : 'Judge demo'}
                </button>
              )}
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors"
                style={{ color: 'var(--muted)' }}
                title="Sign out">
                <LogOut size={12} />
                <span className="hidden sm:inline">
                  {userRole === 'student'
                    ? (studentProfile?.name?.split(' ')[0] || 'Sign out')
                    : (session.admin?.name?.split(' ')[0] || 'Sign out')}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary label={activeTab === 'playground' ? 'Ask help / Pipeline' : activeTab === 'kb' ? 'RAG desk' : 'Dashboard'}>
            {activeTab === 'playground' && <PlaygroundPage app={app} />}
            {activeTab === 'dashboard' && userRole === 'student' && <StudentDashboard app={app} />}
            {activeTab === 'dashboard' && userRole === 'admin' && <AdminOpsPage app={app} />}
            {activeTab === 'kb' && userRole === 'admin' && <AdminKbPage app={app} />}
          </ErrorBoundary>
        </main>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`toast pointer-events-auto ${
            t.type === 'success' 
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
              : t.type === 'error'
              ? 'bg-rose-950/30 border-rose-900/40 text-rose-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            {t.message}
          </div>
        ))}
      </div>

      {activeCitationDoc && (
        <div className="fixed inset-0 bg-zinc-950/80 z-[60] flex items-center justify-center p-4">
          <div className="card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="card-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-500" />
                <span className="font-bold text-sm tracking-tight text-zinc-100">GROUNDING SOURCE ENTRY</span>
              </div>
              <button
                onClick={() => setActiveCitationDoc(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs leading-relaxed">

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Title / Section</span>
                <h3 className="text-sm font-bold text-zinc-100 mt-0.5">{activeCitationDoc.title}</h3>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">RAG Category</span>
                <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider block w-fit mt-1">
                  {activeCitationDoc.category}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verbatim Indexed Text Chunk</span>
                <p className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 text-zinc-300 leading-relaxed mt-1">
                  "{activeCitationDoc.content}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Metadata Citation</span>
                  <span className="text-zinc-200 font-bold">{activeCitationDoc.source}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Last Verification Date</span>
                  <span className="text-zinc-300 font-semibold">{activeCitationDoc.lastUpdated}</span>
                </div>
              </div>

              {activeCitationDoc.tags?.length > 0 && (
                <div className="border-t border-zinc-800 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Index Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCitationDoc.tags.map((tag, i) => (
                      <span key={i} className="bg-zinc-800 px-1.5 py-0.5 rounded text-[9.5px] text-zinc-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="card-header text-right">
              <button
                onClick={() => setActiveCitationDoc(null)}
                className="btn-primary px-4 py-2 text-xs"
              >
                Close Verification
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav lg:hidden">
        {navTabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
            className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`}>
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}

export default App;
