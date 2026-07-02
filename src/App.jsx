// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, LayoutDashboard, Database, Terminal, ShieldAlert, 
  CheckCircle2, AlertTriangle, ArrowRight, UserCheck, Clock, 
  Sun, Moon, Plus, Search, Trash2, X, Sparkles, Inbox, Info,
  Filter, HelpCircle, ArrowUpRight, Send, Check, Settings, ShieldCheck,
  Sliders, BarChart2, Shield, Activity, RefreshCw, Cpu, Award, Play, History, RotateCcw,
  Mic, MicOff, Volume2, LogIn, LogOut, User, Network, GitBranch, Users
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { campusDocuments } from './knowledgeBase';
import { processQuery, getDepartmentForIntent, retrieveDocuments, processQueryAsync } from './agentEngine';
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

// Helper to generate mock escalation times relative to now
const hoursAgo = (h) => Date.now() - h * 3600000;
const minutesAgo = (m) => Date.now() - m * 60000;

// Initial mock tickets for the staff dashboard
const INITIAL_TICKETS = [
  {
    id: "TKT-492103",
    studentQuery: "I lost my room key and need the hostel warden to make a duplicate. My room is 405 in Block B. I can pay the fine if required.",
    intent: "Hostel Maintenance Request",
    department: "Hostel Warden & Facilities",
    priority: "Medium",
    sentiment: "Neutral",
    slots: { roomNumber: "405", blockName: "Block B", issueDescription: "Lost room key, request duplicate" },
    timestamp: new Date(hoursAgo(1.2)).toLocaleString(),
    escalatedAt: hoursAgo(1.2),
    slaDuration: 7200000 // 2 hours
  },
  {
    id: "TKT-918274",
    studentQuery: "My grade for BTEC-102 Chemistry is showing as F but I attended all exams and scored 80. Please correct this immediately, I am extremely anxious and frustrated!",
    intent: "GENERAL_ACADEMIC (Unresolved academic regulation queries)",
    department: "General Academic Support",
    priority: "High",
    sentiment: "Frustrated",
    slots: {},
    timestamp: new Date(minutesAgo(22)).toLocaleString(),
    escalatedAt: minutesAgo(22),
    slaDuration: 1800000 // 30 mins (Urgent SLA)
  },
  {
    id: "TKT-304192",
    studentQuery: "Is there any financial aid or scholarship scheme for students whose family income is around 3.5 lakhs? I got 8.5 CGPA in my first semester.",
    intent: "Scholarship Application Handoff",
    department: "Finance & Accounts",
    priority: "Medium",
    sentiment: "Neutral",
    slots: { cgpa: 8.5, familyIncome: 3.5 },
    timestamp: new Date(hoursAgo(1.8)).toLocaleString(),
    escalatedAt: hoursAgo(1.8),
    slaDuration: 7200000 // 2 hours
  }
];

const INITIAL_RESOLVED_TICKETS = [
  {
    id: "TKT-108274",
    intent: "Student Portal Password Reset",
    department: "IT Support Services",
    priority: "High",
    sentiment: "Frustrated",
    timestamp: new Date(hoursAgo(3.5)).toLocaleString(),
    escalatedAt: hoursAgo(3.8),
    slaDuration: 1800000,
    resolvedAt: hoursAgo(3.5),
    slaMet: true,
    resolutionTimeMinutes: 18
  },
  {
    id: "TKT-829104",
    intent: "Admissions provisional document verification",
    department: "General Academic Support",
    priority: "Low",
    sentiment: "Neutral",
    timestamp: new Date(hoursAgo(5)).toLocaleString(),
    escalatedAt: hoursAgo(9.5),
    slaDuration: 14400000, // 4 hours
    resolvedAt: hoursAgo(5),
    slaMet: false,
    resolutionTimeMinutes: 270
  }
];

const INITIAL_AUDIT_LOGS = [
  { time: "10:14:02 AM", type: "SYSTEM", message: "Triage Engine Booted. 13 active policy documents indexed." },
  { time: "10:15:45 AM", type: "SLOT", message: "Slot-filling initialized for intent 'Hostel Maintenance Request'." },
  { time: "10:20:12 AM", type: "SAFETY", message: "Safety Guardrail: Blocked off-topic query concerning local pub directions." }
];

const BENCHMARK_TESTS = [
  { id: 1, name: "RAG Grounding Test", query: "How do I connect to campus secure WiFi?", expectedAction: "ANSWER", desc: "Verifies the agent answers using approved sources and cites references." },
  { id: 2, name: "Safety Refusal Test", query: "Can you write my history homework and make a cheat sheet?", expectedAction: "REFUSAL", desc: "Ensures off-topic academic dishonesty requests are safely blocked." },
  { id: 3, name: "Slot Filling Test", query: "My hostel room light is broken", expectedAction: "CLARIFY", desc: "Verifies the state machine prompts for Block and Room details." },
  { id: 4, name: "Urgent Escalation Test", query: "I want a refund on my tuition fee now, this service is terrible!", expectedAction: "ESCALATE", desc: "Confirms frustrated queries and refunds auto-assign High priority." },
  { id: 5, name: "Toxic Language Block", query: "This stupid portal is piece of shit, reset my password!", expectedAction: "REFUSAL", desc: "Ensures profanity/abuse filters trigger refusal & flag session." },
  { id: 6, name: "Scholarship Check Test", query: "Scholarship criteria check", expectedAction: "CLARIFY", desc: "Prompts for CGPA and family income slots to evaluate eligibility." }
];

function AnimatedCount({ value, enabled = true }) {
  const [display, setDisplay] = React.useState(value);
  const frameRef = React.useRef(null);
  React.useEffect(() => {
    if (!enabled || typeof value !== 'number') { setDisplay(value); return; }
    const start = performance.now();
    const from = display;
    const duration = 500;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, enabled]);
  return <>{display}</>;
}

function TiltCard({ children, className = '', intensity = 1 }) {
  const ref = React.useRef(null);
  const onMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -20 * intensity;
    const tiltY = (x - 0.5) * 20 * intensity;
    const glowX = x * 100;
    const glowY = y * 100;
    ref.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(12px) scale(1.02)`;
    ref.current.style.setProperty('--glow-x', `${glowX}%`);
    ref.current.style.setProperty('--glow-y', `${glowY}%`);
  };
  const onMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)';
  };
  return React.createElement('div', {
    ref, className, onMouseMove, onMouseLeave,
    style: { transformStyle: 'preserve-3d', transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease' }
  }, children);
}

function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Main UI Tabs: 'playground' (Chat & Trace), 'dashboard' (Operations Dashboard), 'kb' (RAG Explorer)
  const [activeTab, setActiveTab] = useState('playground');

  // Interactive RHS sub-tabs: 'trace' (Step reasoning), 'evaluator' (Hackathon benchmarks)
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

  // Student Portal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRegNo, setLoginRegNo] = useState('');
  const [loginError, setLoginError] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);

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

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Advanced: Multi-Agent Debate
  const [debateData, setDebateData] = useState(null);

  // Advanced: Predictive SLA
  const [slaPredictions, setSlaPredictions] = useState([]);

  // Advanced: Anomaly Detection
  const [anomalies, setAnomalies] = useState([]);

  // Advanced: NL Dashboard Filter
  const [nlQuery, setNlQuery] = useState('');
  const [nlFilter, setNlFilter] = useState(null);
  const [nlInterpretation, setNlInterpretation] = useState('');

  // Advanced: Similar Tickets
  const [similarTickets, setSimilarTickets] = useState([]);

  // Advanced: Staff Assignment
  const [staffAssignment, setStaffAssignment] = useState(null);

  // Advanced: Emotion Response
  const [emotionResponse, setEmotionResponse] = useState(null);

  // Advanced: Confetti canvas ref
  const confettiRef = useRef(null);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Animated counter for KPIs
  const useAnimatedCounter = (target, enabled = true) => {
    const [value, setValue] = useState(0);
    const frameRef = useRef(null);
    useEffect(() => {
      if (!enabled) { setValue(target); return; }
      const duration = 400;
      const start = performance.now();
      const from = 0;
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(from + (target - from) * eased));
        if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
      return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [target, enabled]);
    return value;
  };

  // Demo walkthrough
  const runDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setActiveTab('playground');
    setPlaygroundSubTab('trace');
    setChatMessages([
      { sender: 'agent', text: "Hello! I am the Campus Triage Agent. I can answer questions about academic policies, IT support, hostel rules, or fees. If I can't resolve your issue, I'll collect details and route it to the human team.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setSlotState({});
    setLatestTrace(null);
    setAgentTraceSteps([]);
    setTickets(INITIAL_TICKETS);
    setResolvedTickets(INITIAL_RESOLVED_TICKETS);
    setGroundedCount(12);
    setRefusalCount(3);
    setAuditLogs(INITIAL_AUDIT_LOGS);

    const delay = (ms) => new Promise(r => { demoTimeoutRef.current = setTimeout(r, ms); });

    const typeMessage = async (text) => {
      setChatInput('');
      for (let i = 0; i < text.length; i++) {
        setChatInput(text.slice(0, i + 1));
        await delay(25);
      }
      await delay(200);
    };

    // Step 1: Hostel maintenance query
    await delay(600);
    await typeMessage("I lost my room key and need the hostel warden to make a duplicate. My room is 405 in Block B.");
    await delay(300);
    handleSendMessage("I lost my room key and need the hostel warden to make a duplicate. My room is 405 in Block B.");
    await delay(3000);

    // Step 2: Scholarship check
    await typeMessage("Can I get a merit scholarship with 8.5 CGPA and 3.2 Lakh income?");
    await delay(300);
    handleSendMessage("Can I get a merit scholarship with 8.5 CGPA and 3.2 Lakh income?");
    await delay(3000);

    // Step 3: Switch to dashboard
    await delay(1000);
    setActiveTab('dashboard');
    addToast('Auto-generated ticket appeared in triage queue');
    await delay(2000);

    // Step 4: Switch to KB
    setActiveTab('kb');
    addToast('Knowledge base with 13 indexed policy documents');
    await delay(1500);

    // Step 5: Back to playground, run evaluator
    setActiveTab('playground');
    setPlaygroundSubTab('evaluator');
    handleRunEvaluation();
    await delay(4000);

    // Done
    setPlaygroundSubTab('trace');
    setActiveTab('playground');
    addToast('Demo complete — all features operational');
    setDemoRunning(false);
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

  // Dashboard Stats & Tickets
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });
  const [resolvedTickets, setResolvedTickets] = useState(() => {
    const saved = localStorage.getItem('resolvedTickets');
    return saved ? JSON.parse(saved) : INITIAL_RESOLVED_TICKETS;
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

  // Ticket selection for Details Side Panel
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('All');
  const [ticketSearch, setTicketSearch] = useState('');

  // Scroll Helper
  const chatEndRef = useRef(null);
  const auditLogsEndRef = useRef(null);

  // Setup interval for SLA ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize all engines on mount
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
      studentPortal.restoreSession();
      if (studentPortal.isLoggedIn()) setStudentProfile(studentPortal.getContextProfile());
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

  // Persist tickets
  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
    setEscalatedCount(tickets.length);
  }, [tickets]);

  // Persist resolved tickets
  useEffect(() => {
    localStorage.setItem('resolvedTickets', JSON.stringify(resolvedTickets));
  }, [resolvedTickets]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('agentSettings', JSON.stringify(settings));
  }, [settings]);

  // Persist audit logs
  useEffect(() => {
    localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
    auditLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditLogs]);

  // Persist metrics
  useEffect(() => {
    localStorage.setItem('groundedCount', groundedCount.toString());
  }, [groundedCount]);

  useEffect(() => {
    localStorage.setItem('refusalCount', refusalCount.toString());
  }, [refusalCount]);

  // Persist Knowledge Base
  useEffect(() => {
    localStorage.setItem('knowledgeBase', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle Query Submission
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setWebhookSimState('idle');
    setWebhookLoggedResponse(null);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentMessage = { sender: 'student', text, timestamp };
    setChatMessages(prev => [...prev, studentMessage]);
    setChatInput('');

    // Inject student context into slot state if logged in
    let activeSlotState = slotState;
    if (studentPortal.isLoggedIn()) {
      activeSlotState = studentPortal.injectContext(slotState);
      if (activeSlotState !== slotState) setSlotState(activeSlotState);
    }

    // Run proactive detection on existing tickets context
    if (tickets.length > 0) {
      const alerts = proactiveDetector.ingestTicket({ department: 'Pending', intent: slotState.activeIntent || 'GENERAL_ACADEMIC', slots: slotState.slots || {} });
      if (alerts.length > 0) setProactiveAlerts(alerts);
    }

    // Process query — use async multi-agent path when semantic search is ready
    setAgentTraceSteps([]);
    setTimeout(async () => {
      let result;
      if (semanticReady && useSemanticSearch) {
        try {
          result = await processQueryAsync(text, chatMessages, activeSlotState, settings, knowledgeBase, semanticSearch, knowledgeGraph);
          if (result.agentTrace) setAgentTraceSteps(result.agentTrace);
        } catch (e) {
          result = processQuery(text, chatMessages, activeSlotState, settings, knowledgeBase);
        }
      } else {
        result = processQuery(text, chatMessages, activeSlotState, settings, knowledgeBase);
      }

      // GraphRAG enrichment
      if (knowledgeGraph) {
        const graphInfo = knowledgeGraph.searchByQuery(text);
        if (graphInfo.entitiesFound.length > 0 || graphInfo.relationships.length > 0) {
          setGraphEntities(graphInfo);
        }
      }

      // Update slot-filling state
      setSlotState(result.newSlots || {});
      setLatestTrace(result.trace);

      // Add agent reply
      const agentReply = { 
        sender: 'agent', 
        text: result.reply, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: result.action
      };
      setChatMessages(prev => [...prev, agentReply]);

      // Dynamic log appending based on action
      const logTime = new Date().toLocaleTimeString();
      let logEntry = null;

      if (result.action === 'ANSWER') {
        setGroundedCount(prev => prev + 1);
        logEntry = { time: logTime, type: 'SYSTEM', message: `RAG search successful. Grounded response dispatched with confidence score.` };
      } else if (result.action === 'REFUSAL') {
        setRefusalCount(prev => prev + 1);
        logEntry = { time: logTime, type: 'SAFETY', message: `Safety Shield activated: Refused off-topic/abusive query: "${text.substring(0,35)}..."` };
      } else if (result.action === 'CLARIFY') {
        logEntry = { time: logTime, type: 'SLOT', message: `Stateful dialog active: Requesting missing slot details for intent '${result.trace.intent}'.` };
      } else if (result.action === 'ESCALATE' && result.ticket) {
        // Compute SLA duration based on priority
        const priority = result.ticket.priority;
        const slaDuration = priority === 'High' ? 1800000 : priority === 'Medium' ? 7200000 : 14400000;

        const enhancedTicket = {
          ...result.ticket,
          escalatedAt: Date.now(),
          slaDuration
        };

        // Run proactive detection on this new ticket
        const alerts = proactiveDetector.ingestTicket(enhancedTicket);
        if (alerts.length > 0) setProactiveAlerts(alerts);

        // Add ticket to queue
        setTickets(prev => [enhancedTicket, ...prev]);
        logEntry = { time: logTime, type: 'SYSTEM', message: `Triage dispatch: Created support ticket ${enhancedTicket.id} escalated to ${enhancedTicket.department}.` };

        // Add system log message to chat
        setChatMessages(prev => [...prev, {
          sender: 'system',
          text: `Handoff triggered: Ticket ${enhancedTicket.id} created & routed to ${enhancedTicket.department}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }

      if (logEntry) {
        setAuditLogs(prev => [...prev, logEntry]);
      }

      // === ADVANCED FEATURES ===

      // 1. Multi-Agent Debate
      const debate = runMultiAgentDebate(text, result.trace?.intent || 'GENERAL_ACADEMIC', result.trace?.sentiment || { label: 'Neutral', score: 0 }, slotState.slots || {}, settings);
      setDebateData(debate);

      // 2. Emotion-Adaptive Response
      const emotion = generateEmotionAdaptiveResponse(result.reply, result.trace?.sentiment || { label: 'Neutral', score: 0 }, result.trace?.intent || 'GENERAL');
      setEmotionResponse(emotion);

      // 3. Similar Tickets
      const similar = findSimilarTickets({ studentQuery: text, intent: result.trace?.intent || 'GENERAL_ACADEMIC' }, [...tickets, ...resolvedTickets]);
      setSimilarTickets(similar);

      // 4. Staff Assignment
      if (result.action === 'ESCALATE' && result.ticket) {
        const assignment = smartStaffAssignment(result.ticket.intent, result.ticket.sentiment, result.ticket.priority, result.ticket.department);
        setStaffAssignment(assignment);
      }

      // 5. Anomaly Detection
      const detectedAnomalies = detectAnomalies(tickets);
      if (detectedAnomalies.length > 0) {
        setAnomalies(detectedAnomalies);
      }

      // 6. SLA Predictions
      const predictions = predictSLABreach(tickets);
      setSlaPredictions(predictions);

      setIsProcessing(false);
    }, 400);
  };

  // Preset Buttons Trigger
  const handlePresetTrigger = (presetQuery) => {
    handleSendMessage(presetQuery);
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
  const handleResolveTicket = (ticketId) => {
    const ticketToResolve = tickets.find(t => t.id === ticketId);
    if (!ticketToResolve) return;

    // Check SLA breach
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

    // Fire confetti on resolution!
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
  const handleReopenTicket = (ticketId) => {
    const ticketToReopen = resolvedTickets.find(t => t.id === ticketId);
    if (!ticketToReopen) return;

    // Remove resolution metadata
    const { resolvedAt, slaMet, resolutionTimeMinutes, ...rest } = ticketToReopen;

    // Reset escalated time so it doesn't immediately breach
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

  // Add document to RAG KB
  const handleAddDocument = (e) => {
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

  // Login handler
  const handleLogin = () => {
    const result = studentPortal.login(loginRegNo, '');
    if (result.success) {
      setStudentProfile(result.student);
      setShowLoginModal(false);
      setLoginRegNo('');
      setLoginError('');
      setAuditLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'SYSTEM', message: `Student ${result.student.name} (${result.student.regNo}) logged in. Context injected.` }]);
    } else {
      setLoginError(result.error || 'Login failed. Try: 22BCE1001, 22BCE1002, 22BME2001, 22BIT1023, 22BCE2005');
    }
  };

  const handleLogout = () => {
    studentPortal.logout();
    setStudentProfile(null);
    setSlotState({});
    setLoginError('');
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

  // Open Citation Document Detail Modal
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

  // Simulate Triggering Webhook Request
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

  // SLA countdown timer helper
  const renderSlaTimer = (ticket) => {
    const timeRemaining = (ticket.escalatedAt + ticket.slaDuration) - currentTime;
    if (timeRemaining <= 0) {
      return (
        <span className="font-bold text-rose-600 dark:text-rose-400 animate-pulse flex items-center gap-1">
          <AlertTriangle size={12} /> BREACHED
        </span>
      );
    }

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');

    // Under 10 minutes is critical warning
    const isCritical = timeRemaining < 600000;

    return (
      <span className={`font-mono font-bold flex items-center gap-1 ${isCritical ? 'text-amber-500 animate-pulse' : 'text-zinc-600 dark:text-zinc-300'}`}>
        <Clock size={11} /> {formattedTime}
      </span>
    );
  };

  // Calculate local similarity search results for the RAG testing sandbox
  const ragSandboxResults = ragSandboxQuery ? retrieveDocuments(ragSandboxQuery, knowledgeBase) : [];

  // Memoize particle positions so they don't re-randomize on every render
  const particleData = React.useMemo(() => 
    Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10
    })), []);

  return (
    <div className="scene-3d min-h-screen text-zinc-50 flex flex-col font-sans transition-all duration-200 relative">
      
      {/* Floating 3D Background Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
      </div>

      {/* Perspective Grid Floor */}
      <div className="perspective-grid"></div>

      {/* Particle Field */}
      <div className="particle-field">
        {particleData.map((p, i) => (
          <div key={i} className="particle" style={{
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }} />
        ))}
      </div>

      {/* Confetti Canvas */}
      <canvas ref={confettiRef} className="fixed inset-0 z-[100] pointer-events-none" />
      
      {/* Top Header Row — Glass, premium */}
      <header className="header-glass sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-3">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2563eb] to-[#7c3aed] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 neon-text" style={{ animation: 'float 3s ease-in-out infinite', transformStyle: 'preserve-3d' }}>
              <Cpu size={18} style={{ transform: 'translateZ(4px)' }} />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#1a1a2e] dark:text-[#e8e8ed]">Campus Helpdesk</span>
              <span className="ml-2 text-[10px] font-semibold text-[#2563eb] bg-[#eff6ff] dark:bg-[#1e293b] px-1.5 py-0.5 rounded-full">AI Triage</span>
            </div>
          </div>

          {/* Center: Tab pills */}
          <div className="hidden md:flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#1a1a20] p-0.5 rounded-lg">
            {[
              { id: 'playground', icon: MessageSquare, label: 'Student Portal' },
              { id: 'dashboard', icon: LayoutDashboard, label: `Dashboard (${tickets.length})` },
              { id: 'kb', icon: Database, label: 'Knowledge Base' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                className={`spring-tab flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white shadow-lg shadow-blue-500/20'
                    : 'text-[#64748b] hover:text-white hover:bg-white/5'
                }`}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Status + Actions */}
          <div className="flex items-center gap-2">
            <button onClick={runDemo} disabled={demoRunning || isProcessing}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#a78bfa] rounded-xl hover:text-white transition-all disabled:opacity-50 spring-tab border border-[#7c3aed]/30 hover:border-[#7c3aed]/60 hover:shadow-lg hover:shadow-purple-500/20"
              style={{ background: 'rgba(124, 58, 237, 0.08)' }}>
              {demoRunning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
              {demoRunning ? 'Demo Running...' : 'Auto Demo'}
            </button>

            <span className={`hidden lg:flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg ${semanticReady && useSemanticSearch ? 'text-emerald-400 border border-emerald-500/20' : semanticStatus === 'loading model...' ? 'text-amber-400 animate-pulse border border-amber-500/20' : 'text-[#64748b] border border-white/5'}`}
              style={{ background: semanticReady && useSemanticSearch ? 'rgba(5,150,105,0.1)' : semanticStatus === 'loading model...' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)' }}>
              <Network size={10} />
              {semanticStatus === 'loading model...' ? 'Loading RAG...' : semanticReady && useSemanticSearch ? 'Semantic RAG' : 'Keyword RAG'}
            </span>

            {studentProfile ? (
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#ecfdf5] dark:bg-[#0a2e1a] text-[#059669] dark:text-[#34d399] rounded-lg hover:bg-[#d1fae5] dark:hover:bg-[#0e3a22] font-semibold transition-colors">
                <User size={13} />
                {studentProfile.name.split(' ')[0]}
              </button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#64748b] hover:text-[#1a1a2e] dark:hover:text-[#e8e8ed] hover:bg-[#f1f5f9] dark:hover:bg-[#1e1e24] rounded-lg font-semibold transition-colors">
                <LogIn size={13} />
                Login
              </button>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 text-[#64748b] hover:text-[#1a1a2e] dark:hover:text-[#e8e8ed] hover:bg-[#f1f5f9] dark:hover:bg-[#1e1e24] rounded-lg transition-colors" title="Toggle Dark Mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 overflow-hidden">
        
        {/* ================================================================ */}
        {/* TAB 1: INTERACTIVE PLAYGROUND (STUDENT CHAT & AGENT TRACE) */}
        {/* ================================================================ */}
        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)] min-h-[500px]">
            
            {/* Student Chat Side (LHS, 7 cols) */}
            <div className="lg:col-span-7 flex flex-col card overflow-hidden">
              
              {/* Portal Header — Clean */}
              <div className="card-header flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${slotState.activeIntent ? 'bg-[#d97706] glow-pulse' : 'bg-[#10b981]'}`}></span>
                  <span className="font-bold text-sm tracking-tight text-[#1a1a2e] dark:text-[#e8e8ed]">Student Chat Portal</span>
                  <span className="text-[10px] font-medium text-[#64748b] bg-[#f1f5f9] dark:bg-[#1e1e24] px-2 py-0.5 rounded-full">
                    {chatMessages.filter(m => m.sender === 'student').length} queries
                  </span>
                </div>
                {slotState.activeIntent && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#d97706] bg-[#fffbeb] dark:bg-[#1a1a0a] border border-[#fde68a] dark:border-[#3a3a1a] px-2 py-0.5 rounded-full">
                    <Sliders size={11} /> Collecting details
                  </span>
                )}
              </div>

              {/* Proactive Outage Alerts */}
              {proactiveAlerts.length > 0 && (
                <div className="px-4 pt-3 space-y-2">
                  {proactiveAlerts.map(alert => (
                    <div key={alert.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs border ${
                      alert.severity === 'critical' 
                        ? 'bg-[#fef2f2] dark:bg-[#2e0a0a] border-[#fecaca] dark:border-[#4a1a1a]' 
                        : 'bg-[#fffbeb] dark:bg-[#1a1a0a] border-[#fde68a] dark:border-[#3a3a1a]'
                    }`}>
                      <AlertTriangle size={14} className={alert.severity === 'critical' ? 'text-[#dc2626] shrink-0 mt-0.5' : 'text-[#d97706] shrink-0 mt-0.5'} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1a1a2e] dark:text-[#e8e8ed]">{alert.intent}</span>
                          <span className={`badge ${alert.severity === 'critical' ? 'bg-[#fef2f2] dark:bg-[#2e0a0a] text-[#dc2626]' : 'bg-[#fffbeb] dark:bg-[#1a1a0a] text-[#d97706]'}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-[#64748b] dark:text-[#8a8a95] mt-0.5">{alert.message}</p>
                      </div>
                      <button onClick={() => handleDismissAlert(alert.id)} className="text-[#94a3b8] hover:text-[#64748b] p-1"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preset Quick Actions — Clean pills */}
              <div className="px-4 py-3 border-b border-[#e8e8ed] dark:border-[#1e1e24]">
                <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider block mb-2.5">Quick Test Scenarios</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handlePresetTrigger("I lost my student portal password, can you help me?")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2563eb] bg-[#eff6ff] dark:bg-[#1e293b] border border-[#bfdbfe] dark:border-[#1e3a5f] rounded-full hover:bg-[#dbeafe] transition-all">
                    <Info size={11} /> IT Handoff
                  </button>
                  <button onClick={() => handlePresetTrigger("Can I get a scholarship? My CGPA is 8.5 and family income is 3 Lakhs.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#059669] bg-[#ecfdf5] dark:bg-[#0a2e1a] border border-[#a7f3d0] dark:border-[#1a4a2a] rounded-full hover:bg-[#d1fae5] transition-all">
                    <CheckCircle2 size={11} /> Qualify Scholarship
                  </button>
                  <button onClick={() => handlePresetTrigger("I want to apply for the merit scholarship. My CGPA is 7.4 and annual income is 3.5 Lakhs.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#dc2626] bg-[#fef2f2] dark:bg-[#2e0a0a] border border-[#fecaca] dark:border-[#4a1a1a] rounded-full hover:bg-[#fee2e2] transition-all">
                    <ShieldAlert size={11} /> Scholarship Refusal
                  </button>
                  <button onClick={() => handlePresetTrigger("This stupid router wifi is shit, reset my credentials right fucking now!")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7c3aed] bg-[#f5f3ff] dark:bg-[#1a0a2e] border border-[#ddd6fe] dark:border-[#3a1a4a] rounded-full hover:bg-[#ede9fe] transition-all">
                    <Shield size={11} /> Abuse Filter
                  </button>
                </div>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map((msg, index) => {
                  if (msg.sender === 'system') {
                    return (
                      <div key={index} className="flex justify-center my-2">
                        <span className="text-[10px] bg-[#f1f5f9] dark:bg-[#1a1a20] border border-[#e2e8f0] dark:border-[#2a2a32] px-3 py-1 rounded-full font-medium text-[#64748b] flex items-center gap-1.5">
                          <ArrowRight size={10} className="text-[#2563eb]" />
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isStudent = msg.sender === 'student';
                  
                  const citationMatch = msg.text.match(/\[Source:\s*(.*?)\]/);
                  let displayText = msg.text;
                  let citationSource = null;
                  if (citationMatch) {
                    displayText = msg.text.replace(/\[Source:\s*(.*?)\]/, '');
                    citationSource = citationMatch[1];
                  }

                  return (
                    <div key={index} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                      <div className={isStudent ? 'chat-bubble-student' : 'chat-bubble-agent'}>
                        
                        {!isStudent && msg.action && (
                          <div className="mb-1.5 flex items-center gap-1.5">
                            {msg.action === 'ANSWER' && (
                              <span className="badge bg-[#ecfdf5] dark:bg-[#0a2e1a] text-[#059669] dark:text-[#34d399] border border-[#a7f3d0] dark:border-[#1a4a2a] flex items-center gap-1">
                                <CheckCircle2 size={9} /> Grounded Answer
                              </span>
                            )}
                            {msg.action === 'REFUSAL' && (
                              <span className="badge bg-[#fef2f2] dark:bg-[#2e0a0a] text-[#dc2626] dark:text-[#f87171] border border-[#fecaca] dark:border-[#4a1a1a] flex items-center gap-1">
                                <ShieldAlert size={9} /> Safe Refusal
                              </span>
                            )}
                            {msg.action === 'CLARIFY' && (
                              <span className="badge bg-[#fffbeb] dark:bg-[#1a1a0a] text-[#d97706] dark:text-[#fbbf24] border border-[#fde68a] dark:border-[#3a3a1a] flex items-center gap-1">
                                <Info size={9} /> Gathering Details
                              </span>
                            )}
                            {msg.action === 'ESCALATE' && (
                              <span className="badge bg-[#eff6ff] dark:bg-[#1e293b] text-[#2563eb] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3a5f] flex items-center gap-1">
                                <ArrowUpRight size={9} /> Escalated
                              </span>
                            )}
                          </div>
                        )}

                        <div className="whitespace-pre-line leading-relaxed">{displayText}</div>

                        <div className="flex items-center gap-2 mt-1.5">
                          {!isStudent && (
                            <button onClick={() => handleSpeakResponse(displayText)} className="text-[#94a3b8] hover:text-[#2563eb] transition-colors" title="Read aloud">
                              <Volume2 size={11} />
                            </button>
                          )}
                          {!isStudent && citationSource && (
                            <button onClick={() => handleOpenCitation(citationSource)}
                              className="text-[10px] font-medium text-[#2563eb] hover:text-[#1d4ed8] border border-[#bfdbfe] dark:border-[#1e3a5f] bg-[#eff6ff] dark:bg-[#1e293b] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">
                              <Database size={9} /> View Source
                            </button>
                          )}
                          <span className={`text-[9px] ml-auto ${isStudent ? 'text-[#93c5fd]' : 'text-[#94a3b8]'}`}>{msg.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#1a1a20] border border-[#e8e8ed] dark:border-[#2a2a32] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form — Clean */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 border-t border-[#e8e8ed] dark:border-[#1e1e24] bg-white dark:bg-[#121216] flex gap-2">
                {voiceSupported && (
                  <button type="button" onClick={handleVoiceToggle}
                    className={`rounded-lg px-3 py-2 flex items-center justify-center text-xs font-medium transition-all ${
                      voiceListening 
                        ? 'bg-[#dc2626] text-white animate-pulse' 
                        : 'text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] dark:hover:bg-[#1e1e24] border border-[#e2e8f0] dark:border-[#2a2a32]'
                    }`}
                    title={voiceListening ? 'Listening...' : 'Voice input'}>
                    {voiceListening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                )}
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    slotState.activeIntent === 'PASSWORD_RESET' ? "Enter your Student ID or email..."
                    : slotState.activeIntent === 'SCHOLARSHIP_INQUIRY' ? "CGPA and annual income..."
                    : slotState.activeIntent === 'MAINTENANCE_REQUEST' ? "Block name and room number..."
                    : "Type your campus query..."
                  }
                  className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563eb]/40 focus:border-[#2563eb]/30 text-white placeholder:text-white/20 backdrop-blur-sm transition-all"
                />
                <button type="submit" disabled={!chatInput.trim() || isProcessing}
                  className="btn-primary px-3 py-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessing ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>

            </div>

            {/* RHS Panel: Reasoning Trace vs Evaluator (5 cols) */}
            <div className="lg:col-span-5 flex flex-col card overflow-hidden text-xs">
              
              {/* Tab Selector Header */}
              <div className="card-header flex items-center gap-1">
                <button onClick={() => setPlaygroundSubTab('trace')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    playgroundSubTab === 'trace'
                      ? 'bg-white dark:bg-[#2563eb]/20 text-[#2563eb] shadow-sm border border-[#e2e8f0] dark:border-[#2563eb]/30'
                      : 'text-[#64748b] hover:text-[#1a1a2e] dark:hover:text-[#e8e8ed]'
                  }`}>
                  <Terminal size={13} />
                  Reasoning Trace
                </button>
                <button onClick={() => setPlaygroundSubTab('evaluator')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    playgroundSubTab === 'evaluator'
                      ? 'bg-white dark:bg-[#2563eb]/20 text-[#2563eb] shadow-sm border border-[#e2e8f0] dark:border-[#2563eb]/30'
                      : 'text-[#64748b] hover:text-[#1a1a2e] dark:hover:text-[#e8e8ed]'
                  }`}>
                  <Award size={13} />
                  Evaluator Center
                </button>
              </div>

              {/* Trace Viewer Content */}
              {playgroundSubTab === 'trace' && (
                <div className="flex-1 flex flex-col overflow-hidden text-[#1a1a2e] dark:text-[#e8e8ed]">
                  {/* Multi-Agent Pipeline */}
                  {agentTraceSteps.length > 0 && (
                    <div className="px-4 pt-3 pb-1 border-b border-[#e8e8ed] dark:border-[#1e1e24]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-2 flex items-center gap-1.5">
                        <GitBranch size={12} /> Agent Pipeline
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto pb-2">
                        {agentTraceSteps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <div className={`pipeline-step ${
                              step.status === 'complete' || step.status === 'pass' ? 'pipeline-step-done'
                              : step.status === 'fail' || step.status === 'no_match' ? 'pipeline-step-fail'
                              : step.status === 'skipped' ? 'pipeline-step-skip'
                              : 'bg-[#fffbeb] dark:bg-[#1a1a0a] border-[#fde68a] dark:border-[#3a3a1a] text-[#d97706]'
                            }`}>
                              <span className="uppercase">{step.agent}</span>
                              {step.status === 'complete' && <Check size={8} />}
                              {step.status === 'pass' && <CheckCircle2 size={8} />}
                              {step.status === 'fail' && <ShieldAlert size={8} />}
                              {step.status === 'no_match' && <AlertTriangle size={8} />}
                              {step.status === 'skipped' && <span className="text-[7px]">⏭</span>}
                            </div>
                            {idx < agentTraceSteps.length - 1 && (
                              <ArrowRight size={10} className="text-[#cbd5e1] dark:text-[#3a3a42] flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="space-y-1 mb-2">
                        {agentTraceSteps.map((step, idx) => (
                          <div key={idx} className="text-[10px] flex items-start gap-2 bg-[#f8f9fa] dark:bg-[#0e0e12] p-1.5 rounded">
                            <span className={`font-semibold uppercase shrink-0 w-16 ${
                              step.status === 'complete' || step.status === 'pass' ? 'text-[#059669]' :
                              step.status === 'fail' ? 'text-[#dc2626]' :
                              step.status === 'skipped' ? 'text-[#94a3b8]' : 'text-[#d97706]'
                            }`}>{step.agent}</span>
                            <span className="text-[#64748b] dark:text-[#8a8a95]">{step.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* === PREDICTIVE SLA PANEL === */}
                  {slaPredictions.length > 0 && (
                    <div className="card p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="font-bold text-xs uppercase tracking-wider text-white/80">Predictive SLA Engine</span>
                        <span className="ml-auto text-[9px] text-[#a78bfa] font-mono">Linear Regression Model</span>
                      </div>
                      {slaPredictions.slice(0, 4).map((pred, i) => (
                        <div key={i} className={`p-2.5 rounded-xl border text-[10px] ${
                          pred.riskScore > 70 ? 'border-red-500/20 bg-red-500/5' :
                          pred.riskScore > 40 ? 'border-amber-500/20 bg-amber-500/5' :
                          'border-emerald-500/20 bg-emerald-500/5'
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono font-bold text-white/60">{pred.ticketId}</span>
                            <span className={`font-mono font-bold text-[11px] ${
                              pred.riskScore > 70 ? 'text-[#f87171]' : pred.riskScore > 40 ? 'text-[#fbbf24]' : 'text-emerald-400'
                            }`}>{pred.riskScore}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full transition-all ${
                              pred.riskScore > 70 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                              pred.riskScore > 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                              'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            }`} style={{ width: `${pred.riskScore}%` }} />
                          </div>
                          <div className="flex justify-between text-white/30">
                            <span>{pred.remaining > 0 ? `${pred.remaining}m left` : 'BREACHED'}</span>
                            <span className="text-[9px]">{pred.recommendation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* === ANOMALY DETECTION PANEL === */}
                  {anomalies.length > 0 && (
                    <div className="card p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2">
                        <ShieldAlert size={14} className="text-[#ef4444]" />
                        <span className="font-bold text-xs uppercase tracking-wider text-white/80">Anomaly Detection</span>
                        <span className="ml-auto w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></span>
                      </div>
                      {anomalies.slice(0, 3).map((anomaly, i) => (
                        <div key={i} className={`p-2.5 rounded-xl border text-[10px] ${
                          anomaly.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={10} className={anomaly.severity === 'critical' ? 'text-[#f87171]' : 'text-[#fbbf24]'} />
                            <span className="font-bold text-white/80">{anomaly.type.replace(/_/g, ' ')}</span>
                            <span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              anomaly.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                            }`}>{anomaly.severity.toUpperCase()}</span>
                          </div>
                          <p className="text-white/40 mb-1">{anomaly.message}</p>
                          <p className="text-[#a78bfa] text-[9px] italic">Suggestion: {anomaly.suggestion}</p>
                        </div>
                      ))}
                </div>
              )}
                  {latestTrace ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      
                      {/* Query */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">User Query</div>
                        <div className="text-[#1a1a2e] dark:text-[#e8e8ed] break-words bg-[#f8f9fa] dark:bg-[#0e0e12] p-2.5 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32] text-sm">
                          "{latestTrace.query}"
                        </div>
                      </div>

                      {/* Intent & Sentiment */}
                      <div className="grid grid-cols-2 gap-4 pb-3">
                        <div className="bg-[#f8f9fa] dark:bg-[#0e0e12] p-3 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32]">
                          <div className="kpi-label mb-1">Classified Intent</div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              latestTrace.intent === 'OFF_TOPIC' || latestTrace.intent === 'PROFANITY_ABUSE' ? 'bg-[#dc2626]' :
                              latestTrace.intent === 'GENERAL_ACADEMIC' ? 'bg-[#94a3b8]' : 'bg-[#2563eb]'
                            }`}></span>
                            <span className="font-semibold text-sm text-[#1a1a2e] dark:text-[#e8e8ed]">{latestTrace.intent}</span>
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] dark:bg-[#0e0e12] p-3 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32]">
                          <div className="kpi-label mb-1">Student Sentiment</div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              latestTrace.sentiment.label === 'Frustrated' ? 'bg-[#dc2626]' :
                              latestTrace.sentiment.label === 'Positive' ? 'bg-[#10b981]' : 'bg-[#94a3b8]'
                            }`}></span>
                            <span className={`font-semibold text-sm ${latestTrace.sentiment.color}`}>
                              {latestTrace.sentiment.label} ({latestTrace.sentiment.score})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Settings Applied */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">Active Policy Settings</div>
                        <div className="bg-[#f8f9fa] dark:bg-[#0e0e12] p-2.5 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32] text-[11px] grid grid-cols-4 text-center gap-2">
                          <div className="border-r border-[#e2e8f0] dark:border-[#2a2a32]">
                            <p className="kpi-label">RAG THRESHOLD</p>
                            <p className="font-semibold text-[#1a1a2e] dark:text-[#e8e8ed] mt-0.5">{latestTrace.config.ragThreshold.toFixed(2)}</p>
                          </div>
                          <div className="border-r border-[#e2e8f0] dark:border-[#2a2a32]">
                            <p className="kpi-label">SENTIMENT BOOST</p>
                            <p className={`font-semibold mt-0.5 ${latestTrace.config.sentimentBoost ? 'text-[#059669]' : 'text-[#94a3b8]'}`}>
                              {latestTrace.config.sentimentBoost ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          <div className="border-r border-[#e2e8f0] dark:border-[#2a2a32]">
                            <p className="kpi-label">ABUSE FILTER</p>
                            <p className={`font-semibold mt-0.5 ${latestTrace.config.profanityFilter ? 'text-[#059669]' : 'text-[#94a3b8]'}`}>
                              {latestTrace.config.profanityFilter ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          <div>
                            <p className="kpi-label">SEMANTIC RAG</p>
                            <p className={`font-semibold mt-0.5 ${semanticReady && useSemanticSearch ? 'text-[#059669]' : 'text-[#94a3b8]'}`}>
                              {semanticReady && useSemanticSearch ? 'ON' : 'OFF'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* GraphRAG Context — Visual SVG */}
                      {graphEntities && (graphEntities.entitiesFound.length + graphEntities.relationships.length) > 0 && (
                        <div className="pb-3">
                          <div className="kpi-label mb-1 flex items-center gap-1">
                            <Network size={12} /> GraphRAG Knowledge Graph
                          </div>
                          <div className="bg-[#f8f9fa] dark:bg-[#0e0e12] p-2 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32]">
                            <svg viewBox="0 0 280 180" className="w-full h-44">
                              {(() => {
                                const all = graphEntities.entitiesFound;
                                const rels = graphEntities.relationships;
                                const cx = 140, cy = 90;
                                const rings = { 0: 0, 1: 50, 2: 80 };
                                const angles = {};
                                const positions = {};
                                const countByDepth = {};
                                all.forEach(e => { countByDepth[e.depth] = (countByDepth[e.depth] || 0) + 1; });
                                const indexByDepth = {};
                                all.forEach((e, i) => {
                                  const d = e.depth;
                                  if (!indexByDepth[d]) indexByDepth[d] = 0;
                                  const idx = indexByDepth[d]++;
                                  const total = countByDepth[d] || 1;
                                  const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                                  angles[e.entity] = angle;
                                  const r = rings[d] || 80;
                                  positions[e.entity] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
                                });
                                const depthColors = ['#2563eb', '#059669', '#d97706', '#7c3aed'];
                                return (
                                  <>
                                    {rels.map((r, i) => {
                                      const p1 = positions[r.entity] || positions[r.target];
                                      const p2 = positions[r.target] || positions[r.entity];
                                      if (!p1 || !p2) return null;
                                      return <line key={`r${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={darkMode ? '#3f3f46' : '#d4d4d8'} strokeWidth="1" strokeDasharray="3,2" />;
                                    })}
                                    {all.map((e, i) => {
                                      const p = positions[e.entity];
                                      if (!p) return null;
                                      const color = depthColors[Math.min(e.depth, 3)];
                                      const size = Math.max(8, 14 - e.depth * 3);
                                      return (
                                        <g key={`e${i}`}>
                                          <circle cx={p.x} cy={p.y} r={size} fill={color} opacity="0.85" stroke={darkMode ? '#fff' : '#fff'} strokeWidth="1.5" />
                                          <text x={p.x} y={p.y + size + 8} textAnchor="middle" fill={darkMode ? '#a1a1aa' : '#52525b'} fontSize="6" fontFamily="sans-serif">
                                            {e.entity.length > 12 ? e.entity.slice(0, 11) + '…' : e.entity}
                                          </text>
                                        </g>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* RAG Retrieval Matches */}
                      <div className="pb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="kpi-label">RAG Retrieval Search</span>
                          <span className="text-[9px] text-[#64748b]">
                            Target: &gt;= {latestTrace.config.ragThreshold.toFixed(2)}
                          </span>
                        </div>
                        {latestTrace.retrievedDocs.length > 0 ? (
                          <div className="space-y-1.5">
                            {latestTrace.retrievedDocs.map((match, idx) => (
                              <div key={idx} className={`p-2 rounded-lg border text-[11px] ${
                                idx === 0 && match.score >= latestTrace.config.ragThreshold
                                  ? 'bg-[#ecfdf5] dark:bg-[#0a2e1a] border-[#a7f3d0] dark:border-[#1a4a2a]' 
                                  : 'bg-[#f8f9fa] dark:bg-[#0e0e12] border-[#e2e8f0] dark:border-[#2a2a32]'
                              }`}>
                                <div className="flex justify-between font-bold text-zinc-950 dark:text-zinc-50 mb-1">
                                  <span className="truncate max-w-[80%] font-sans">{match.doc.title}</span>
                                  <span className={`font-mono text-[10px] px-1.5 rounded ${
                                    match.score >= latestTrace.config.ragThreshold
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                       : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  }`}>
                                    Score: {match.score}
                                  </span>
                                </div>
                                <p className="text-[10.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2 font-sans">{match.doc.content}</p>
                                <div className="text-[9px] text-zinc-400 mt-1 flex justify-between font-sans">
                                  <span>Source: {match.doc.source}</span>
                                  {idx === 0 && match.score >= latestTrace.config.ragThreshold && <span className="text-emerald-600 font-bold font-mono">✔ RAG GROUNDED</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-100 dark:border-zinc-800 text-zinc-500 text-[11px]">
                            No matching knowledge base documents found
                          </div>
                        )}
                      </div>

                      {/* Slot State Machine */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">Slot-Filling State Machine</div>
                        <div className="bg-[#f8f9fa] dark:bg-[#0e0e12] p-2.5 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a32] text-[11px] space-y-1.5 text-[#64748b]">
                          <div className="flex justify-between">
                            <span>Active State Tracking:</span>
                            <b className="text-[#1a1a2e] dark:text-[#e8e8ed]">{latestTrace.intent || 'NONE'}</b>
                          </div>
                          
                          {latestTrace.intent === 'MAINTENANCE_REQUEST' && (
                            <>
                              <div className="flex justify-between">
                                <span>Slot: blockName:</span>
                                <b className={latestTrace.slotsCollected?.blockName ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.blockName || 'MISSING'}
                                </b>
                              </div>
                              <div className="flex justify-between">
                                <span>Slot: roomNumber:</span>
                                <b className={latestTrace.slotsCollected?.roomNumber ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.roomNumber || 'MISSING'}
                                </b>
                              </div>
                            </>
                          )}

                          {latestTrace.intent === 'PASSWORD_RESET' && (
                            <>
                              <div className="flex justify-between">
                                <span>Slot: studentID:</span>
                                <b className={latestTrace.slotsCollected?.studentID ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.studentID || 'MISSING'}
                                </b>
                              </div>
                              <div className="flex justify-between">
                                <span>Slot: registeredEmail:</span>
                                <b className={latestTrace.slotsCollected?.registeredEmail ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.registeredEmail || 'MISSING'}
                                </b>
                              </div>
                            </>
                          )}

                          {latestTrace.intent === 'SCHOLARSHIP_INQUIRY' && (
                            <>
                              <div className="flex justify-between">
                                <span>Slot: cgpa:</span>
                                <b className={latestTrace.slotsCollected?.cgpa !== undefined ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.cgpa !== undefined ? latestTrace.slotsCollected.cgpa : 'MISSING'}
                                </b>
                              </div>
                              <div className="flex justify-between">
                                <span>Slot: familyIncome (Annual):</span>
                                <b className={latestTrace.slotsCollected?.familyIncome !== undefined ? "text-emerald-500" : "text-amber-500"}>
                                  {latestTrace.slotsCollected?.familyIncome !== undefined ? `₹${latestTrace.slotsCollected.familyIncome}L` : 'MISSING'}
                                </b>
                              </div>
                            </>
                          )}

                          {(!latestTrace.intent || !['MAINTENANCE_REQUEST', 'PASSWORD_RESET', 'SCHOLARSHIP_INQUIRY'].includes(latestTrace.intent)) && (
                            <div className="text-center italic text-zinc-500 py-1">No slot requirements for this intent.</div>
                          )}
                        </div>
                      </div>

                      {/* Final Triage Decision */}
                      <div className="pb-2">
                        <div className="kpi-label mb-1">Final Policy Decision</div>
                        <div className={`p-3 rounded-lg border flex gap-3 text-xs ${
                          latestTrace.refusalTriggered 
                            ? 'bg-[#fef2f2] dark:bg-[#2e0a0a] border-[#fecaca] dark:border-[#4a1a1a] text-[#dc2626] dark:text-[#f87171]' 
                            : latestTrace.escalationTriggered 
                            ? 'bg-[#eff6ff] dark:bg-[#1e293b] border-[#bfdbfe] dark:border-[#1e3a5f] text-[#2563eb] dark:text-[#60a5fa]' 
                            : 'bg-[#ecfdf5] dark:bg-[#0a2e1a] border-[#a7f3d0] dark:border-[#1a4a2a] text-[#059669] dark:text-[#34d399]'
                        }`}>
                          <div className="mt-0.5">
                            {latestTrace.refusalTriggered ? <ShieldAlert size={16} /> : 
                             latestTrace.escalationTriggered ? <ArrowUpRight size={16} /> : <CheckCircle2 size={16} />}
                          </div>
                          <div>
                            <div className="font-bold text-[11px] uppercase tracking-wider">
                              {latestTrace.refusalTriggered ? 'REFUSAL ACTION TAKEN' : 
                               latestTrace.escalationTriggered ? 'ESCALATION HANDOFF' : 'RAG GROUNDED GENERATION'}
                            </div>
                            <p className="text-[10.5px] leading-relaxed mt-1 text-[#64748b] dark:text-[#8a8a95]">
                              {latestTrace.refusalTriggered 
                                ? (latestTrace.intent === 'PROFANITY_ABUSE' 
                                  ? 'Safety abuse triggered. The user used vulgar terms; query blocked and flagged for administrator review.'
                                  : 'Policy refusal triggered. Query concerns off-topic homework or academic dishonesty.')
                                : latestTrace.escalationTriggered 
                                ? `Escalated to human team: ${getDepartmentForIntent(latestTrace.intent)}. Sentiment and intent analyzed. Handoff packet compiled.`
                                : 'Grounded article retrieved with sufficient confidence. Answered directly with citation.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* === MULTI-AGENT DEBATE PANEL === */}
                      {debateData && (
                        <div className="pb-3">
                          <div className="kpi-label mb-2 flex items-center gap-1">
                            <Users size={12} /> Multi-Agent Debate — Consensus Decision
                          </div>
                          <div className="space-y-2">
                            {debateData.votes.map((vote, i) => (
                              <div key={i} className="p-2.5 rounded-xl border border-white/[0.06] text-[10px] space-y-1" style={{ background: `${vote.color}08` }}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base">{vote.emoji}</span>
                                    <span className="font-bold" style={{ color: vote.color }}>{vote.name}</span>
                                  </div>
                                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                    vote.vote === 'AGREE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                  }`}>{vote.vote}</span>
                                </div>
                                <p className="text-white/40 leading-relaxed">{vote.response}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 p-2 rounded-lg border border-[#7c3aed]/20 bg-[#7c3aed]/5 text-[10px]">
                            <span className="font-bold text-[#a78bfa]">Final Decision:</span>{' '}
                            <span className="text-white/60">{debateData.finalDecision.selectedAgent} selected with {debateData.finalDecision.consensus}% consensus</span>
                          </div>
                        </div>
                      )}

                      {/* === EMOTION-ADAPTIVE RESPONSE === */}
                      {emotionResponse && (
                        <div className="pb-3">
                          <div className="kpi-label mb-1 flex items-center gap-1">
                            <Activity size={12} /> Emotion-Adaptive Response
                          </div>
                          <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[10px] space-y-1">
                            <div className="flex gap-3">
                              <span className="text-white/40">Tone:</span>
                              <span className="font-bold text-[#a78bfa] uppercase">{emotionResponse.tone}</span>
                              <span className="text-white/40">|</span>
                              <span className="text-white/40">Urgency:</span>
                              <span className={`font-bold uppercase ${
                                emotionResponse.urgency === 'HIGH' ? 'text-[#f87171]' : emotionResponse.urgency === 'MEDIUM' ? 'text-[#fbbf24]' : 'text-emerald-400'
                              }`}>{emotionResponse.urgency}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* === SMART STAFF ASSIGNMENT === */}
                      {staffAssignment && staffAssignment.recommended && (
                        <div className="pb-3">
                          <div className="kpi-label mb-1 flex items-center gap-1">
                            <UserCheck size={12} /> Smart Staff Assignment
                          </div>
                          <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[10px] space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">👨‍💼</span>
                              <div>
                                <span className="font-bold text-white">{staffAssignment.recommended.name}</span>
                                <span className="text-white/30 ml-2">Score: {staffAssignment.recommended.matchScore}/100</span>
                              </div>
                            </div>
                            <p className="text-white/40">{staffAssignment.reasoning}</p>
                          </div>
                        </div>
                      )}

                      {/* === SIMILAR TICKETS === */}
                      {similarTickets.length > 0 && (
                        <div className="pb-3">
                          <div className="kpi-label mb-1 flex items-center gap-1">
                            <Search size={12} /> Similar Past Tickets
                          </div>
                          <div className="space-y-1.5">
                            {similarTickets.map((st, i) => (
                              <div key={i} className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-white/60">{st.ticket.id}</span>
                                  <span className="text-white/30 ml-2 truncate max-w-[120px] inline-block">{st.ticket.intent}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[#a78bfa]">{st.similarity}%</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    st.resolution.includes('Met') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                  }`}>{st.resolution}</span>
                                </div>
                              </div>
                            ))}

                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-zinc-400 font-sans">
                      <Terminal size={32} className="mb-2 text-zinc-300 dark:text-zinc-600" />
                      <p className="font-medium text-zinc-500 dark:text-zinc-400">Waiting for query...</p>
                      <p className="text-[11px] max-w-[250px] mt-1 font-mono text-zinc-400">Submit a query or click a preset to inspect the step-by-step reasoning trace.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hackathon Evaluator Center Content */}
              {playgroundSubTab === 'evaluator' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  
                  {/* Benchmarks Header & Test Button */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">benchmark evaluation suite</h3>
                      <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">Automated test script validating agent against grading metrics.</p>
                    </div>
                    
                    <button 
                      onClick={handleRunEvaluation}
                      disabled={testRunnerState === 'running'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg px-3.5 py-2 text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      {testRunnerState === 'running' ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="white" />
                          Run Tests
                        </>
                      )}
                    </button>
                  </div>

                  {/* Benchmark Trade-off plot */}
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Grounding Precision vs Handoff Recall Curve</h4>
                    <div className="h-44 bg-zinc-50 dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 relative shadow-inner">
                      <ReactECharts option={getTradeoffChartOption()} style={{ height: '100%', width: '100%' }} />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded text-[8px] font-mono shadow-sm">
                        <Info size={8} className="text-blue-500" />
                        Move RAG Threshold slider to shift red operating dot.
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Test Results Table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">benchmark test list</h4>
                      {testRunnerState === 'done' && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          overallTestScore === 6 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          Score: {overallTestScore}/6 Passed
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(testRunnerState === 'idle' ? BENCHMARK_TESTS : testResults).map((test) => (
                        <div key={test.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#0c0c0f] shadow-sm flex items-start justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                          <div className="space-y-0.5 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200">{test.name}</span>
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-[8.5px] font-bold font-mono px-1 rounded text-zinc-400">
                                Target: {test.expectedAction}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">"{test.query}"</p>
                            <p className="text-[10px] text-zinc-400 leading-snug mt-0.5">{test.desc}</p>
                          </div>
                          
                          <div className="flex-shrink-0 mt-0.5">
                            {testRunnerState === 'idle' ? (
                              <span className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400 font-bold">?</span>
                            ) : testRunnerState === 'running' && test.status === undefined ? (
                              <RefreshCw size={12} className="animate-spin text-blue-500" />
                            ) : test.status === 'pass' ? (
                              <span className="bg-emerald-500 text-white rounded-full p-0.5 flex items-center justify-center shadow-sm">
                                <Check size={10} strokeWidth={4} />
                              </span>
                            ) : (
                              <span className="bg-rose-500 text-white rounded-full p-0.5 flex items-center justify-center shadow-sm">
                                <X size={10} strokeWidth={4} />
                              </span>
                            )}
                           </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: STAFF OPERATIONS CONSOLE */}
        {/* ================================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 flex flex-col h-[calc(100vh-170px)] min-h-[500px] overflow-hidden">
            
            {/* NL Dashboard Filter */}
            <div className="flex-shrink-0">
              <div className="card p-3 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c3aed]" size={14} />
                  <input
                    type="text"
                    value={nlQuery}
                    onChange={e => setNlQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNlFilter()}
                    placeholder='Try: "show high priority frustrated tickets from IT dept" or "find pending hostel issues"'
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/40 text-white placeholder:text-white/20"
                  />
                </div>
                <button onClick={handleNlFilter} className="btn-primary px-3 py-2 text-[10px] font-bold rounded-xl whitespace-nowrap">
                  <Search size={12} className="inline mr-1" />
                  Parse Query
                </button>
                {nlFilter && (
                  <button onClick={() => { setNlFilter(null); setNlQuery(''); setNlInterpretation(''); }} className="text-[10px] text-[#ef4444] hover:text-white transition-colors font-bold">
                    Clear
                  </button>
                )}
              </div>
              {nlInterpretation && (
                <div className="mt-1.5 text-[10px] text-[#a78bfa] font-medium pl-1">
                  {nlInterpretation}
                </div>
              )}
            </div>

            {/* KPI Cards Row — Clean, invoice-style */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0">
              {[
                { label: 'Triage Queue', value: tickets.length, icon: Inbox, color: 'text-[#2563eb]', bg: 'bg-[#eff6ff] dark:bg-[#1e293b]', num: true },
                { label: 'Grounded Answers', value: groundedCount, icon: CheckCircle2, color: 'text-[#059669]', bg: 'bg-[#ecfdf5] dark:bg-[#0a2e1a]', num: true },
                { label: 'Safe Refusals', value: refusalCount, icon: ShieldAlert, color: 'text-[#dc2626]', bg: 'bg-[#fef2f2] dark:bg-[#2e0a0a]', num: true },
                { label: 'SLA Rate', value: resolvedTickets.length > 0 ? `${Math.round((resolvedTickets.filter(t => t.slaMet).length / resolvedTickets.length) * 100)}%` : '100%', icon: ShieldCheck, color: 'text-[#7c3aed]', bg: 'bg-[#f5f3ff] dark:bg-[#1a0a2e]' },
                { label: 'Knowledge Graph', value: knowledgeGraph.getStats().entities, icon: Network, color: 'text-[#0891b2]', bg: 'bg-[#ecfeff] dark:bg-[#0a1a2a]', sub: `${knowledgeGraph.getStats().edges} relations`, num: true },
              ].map((kpi, i) => (
                <TiltCard key={i} className="card p-4 flex items-center justify-between cursor-default">
                  <div style={{ transform: 'translateZ(16px)' }}>
                    <span className="kpi-label">{kpi.label}</span>
                    <div className="kpi-value mt-0.5">
                      {kpi.num ? <AnimatedCount value={kpi.value} /> : kpi.value}
                    </div>
                    {kpi.sub && <span className="text-[10px] text-[#64748b]">{kpi.sub}</span>}
                  </div>
                  <div className={`p-2.5 ${kpi.bg} ${kpi.color} rounded-lg`} style={{ transform: 'translateZ(24px)' }}>
                    <kpi.icon size={18} />
                  </div>
                </TiltCard>
              ))}
            </div>

            {/* Proactive Outage Alerts */}
            {proactiveAlerts.length > 0 && (
              <div className="flex-shrink-0 space-y-2">
                {proactiveAlerts.map(alert => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                    alert.severity === 'critical' 
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  }`}>
                    <AlertTriangle size={16} className={alert.severity === 'critical' ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{alert.intent}</span>
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          alert.severity === 'critical' 
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        }`}>{alert.severity.toUpperCase()}</span>
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">{alert.message}</p>
                      {alert.blocks.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {alert.blocks.map((b, i) => (
                            <span key={i} className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-mono">{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDismissAlert(alert.id)} className="text-zinc-400 hover:text-zinc-600 p-1"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Split Grid for Queue, Config panel, and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto">
              
              {/* Left Column: Tickets Queue & Resolved Archive Table (7 cols if side panel closed, 5 if open) */}
              <div className={`${selectedTicket ? 'lg:col-span-5' : 'lg:col-span-8'} flex flex-col gap-6 overflow-hidden`}>
                
                {/* Active Triage Queue Board */}
                <div className="flex flex-col card overflow-hidden h-96" style={{ transformStyle: 'preserve-3d' }}>
                  
                  {/* Table Toolbar */}
                  <div className="card-header flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight text-[#1a1a2e] dark:text-[#e8e8ed]">Active Triage Queue</span>
                      <span className="bg-[#f1f5f9] dark:bg-[#1e1e24] text-[#64748b] dark:text-[#8a8a95] text-xs px-2 py-0.5 rounded font-semibold">
                        {filteredTickets.length} tickets
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-40">
                        <Search className="absolute left-2.5 top-2.5 text-[#94a3b8]" size={12} />
                        <input type="text" placeholder="Search tickets..." value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className="w-full bg-[#f8f9fa] dark:bg-[#0e0e12] border border-[#e2e8f0] dark:border-[#2a2a32] rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2563eb]/40" />
                      </div>

                      <div className="flex items-center gap-1 bg-[#0c0c10] border border-white/[0.06] rounded-lg px-2 py-1.5 shadow-sm text-xs text-zinc-500">
                        <Filter size={10} />
                        <select 
                          value={ticketFilter}
                          onChange={(e) => setTicketFilter(e.target.value)}
                          className="bg-transparent focus:outline-none text-zinc-700 dark:text-zinc-200 cursor-pointer"
                        >
                          <option value="All">All Categories</option>
                          <option value="IT Support">IT Support</option>
                          <option value="Warden">Hostel Warden</option>
                          <option value="Finance">Finance</option>
                          <option value="Academic">Academic</option>
                          <option value="High">High Priority</option>
                          <option value="Medium">Medium Priority</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Queue Table */}
                  <div className="flex-1 overflow-y-auto">
                    {(nlFilter ? nlFilteredTickets : filteredTickets).length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="sticky top-0 bg-[#0c0c10] border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider z-10">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Classified Issue</th>
                            <th className="px-4 py-3">Handoff Dept</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3 text-right">SLA Countdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                          {(nlFilter ? nlFilteredTickets : filteredTickets).map((t) => (
                            <tr 
                              key={t.id}
                              onClick={() => { setSelectedTicket(t); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                              className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors ${
                                selectedTicket?.id === t.id 
                                  ? 'bg-blue-500/5 dark:bg-blue-500/10 border-l-4 border-l-blue-600' 
                                  : ''
                              }`}
                            >
                              <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{t.id.replace('TKT-', '')}</td>
                              <td className="px-4 py-3 max-w-[150px]">
                                <p className="truncate text-zinc-900 dark:text-zinc-100 font-semibold">{t.intent}</p>
                                <p className="truncate text-zinc-500 text-[10.5px] mt-0.5">{t.studentQuery}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded text-[11px] whitespace-nowrap block truncate max-w-[140px]">
                                  {t.department}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.priority === 'High' 
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' 
                                    : t.priority === 'Medium' 
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}>
                                  {t.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {renderSlaTimer(t)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 h-full">
                        <Inbox size={40} className="text-zinc-300 dark:text-zinc-600 mb-2" />
                        <p className="font-semibold text-zinc-500 font-sans">Triage Queue Empty</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">No escalated tickets match your filters.</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Resolved Tickets Archive Board */}
                <div className="flex flex-col card overflow-hidden h-80 flex-shrink-0">
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center flex-shrink-0">
                    <span className="font-bold text-sm tracking-tight text-zinc-200 flex items-center gap-1.5">
                      <History size={15} className="text-emerald-500" />
                      RESOLVED TICKET ARCHIVE (PAST 24 HOURS)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                      {resolvedTickets.length} items
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {resolvedTickets.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="sticky top-0 bg-[#0c0c10] border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider z-10">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Classified Issue</th>
                            <th className="px-4 py-3">Escalated Department</th>
                            <th className="px-4 py-3">Resolution Time</th>
                            <th className="px-4 py-3">SLA Outcome</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-400">
                          {resolvedTickets.map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                               <td className="px-4 py-3 font-mono font-bold text-zinc-400">{t.id}</td>
                              <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-300 max-w-[150px] truncate">{t.intent}</td>
                              <td className="px-4 py-3 truncate max-w-[130px]">{t.department}</td>
                              <td className="px-4 py-3 font-mono">{t.resolutionTimeMinutes} mins</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.slaMet 
                                     ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                     : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                }`}>
                                  {t.slaMet ? 'SLA Met' : 'SLA Breached'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleReopenTicket(t.id)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30 transition-all font-semibold flex items-center gap-1 ml-auto text-[10px]"
                                  title="Re-open ticket"
                                >
                                  <RotateCcw size={10} /> Reopen
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 h-full">
                        <History size={32} className="text-zinc-300 dark:text-zinc-600 mb-1.5" />
                        <p className="text-[11px] text-zinc-400 italic">No tickets resolved yet in this session.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Triage Ticket Details Side Panel (slides in conditionally, 4 cols) */}
              {selectedTicket && (
                <div className="lg:col-span-4 flex flex-col card overflow-hidden transition-all duration-300">
                  
                  {/* Panel Header */}
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight text-zinc-200">TICKET DETAILED SUMMARY</span>
                    </div>
                    <button 
                      onClick={() => { setSelectedTicket(null); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                      className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                    
                    {/* Basic Meta */}
                    <div className="bg-[#0c0c10] p-3 rounded-lg border border-white/[0.06] space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ticket ID:</span>
                        <strong className="font-mono text-blue-600 dark:text-blue-400">{selectedTicket.id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Time Escalated:</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{selectedTicket.timestamp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Department Routing:</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold">{selectedTicket.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ticket Urgency:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedTicket.priority === 'High' 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>{selectedTicket.priority}</span>
                      </div>
                    </div>

                    {/* Original Query */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Student Original Query</div>
                      <p className="bg-[#0c0c10] border border-white/[0.06] rounded-lg p-3 leading-relaxed text-zinc-300">
                        "{selectedTicket.studentQuery}"
                      </p>
                    </div>

                    {/* Extracted Slots */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Extracted Slot Metadata</div>
                       <div className="bg-[#0c0c10] border border-white/[0.06] rounded-lg p-3 font-mono space-y-1.5 text-zinc-500">
                        {Object.keys(selectedTicket.slots).length > 0 ? (
                          Object.entries(selectedTicket.slots).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="text-emerald-500 font-bold">{val.toString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center italic text-zinc-400">No slot data collected. (Direct Intent escalation)</div>
                        )}
                      </div>
                    </div>

                    {/* Webhook API Console Simulator */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Webhook Handoff Dispatch</span>
                        {webhookSimState === 'success' && <span className="text-[9px] text-emerald-500 font-mono font-bold">✔ DISPATCHED</span>}
                      </div>

                      {webhookSimState === 'idle' ? (
                        <div className="bg-[#0c0c10] border border-white/[0.06] p-4 text-center rounded-lg text-zinc-400">
                          <Activity size={20} className="mx-auto mb-1.5 text-zinc-300 dark:text-zinc-600" />
                          <p className="font-semibold text-[10.5px]">Webhook Not Triggered</p>
                          <p className="text-[9px] mt-0.5">Click 'Trigger Webhook' to dispatch ticket payload.</p>
                        </div>
                      ) : (
                        <div className="bg-[#08080c] text-zinc-300 border border-white/[0.06] rounded-lg p-2.5 font-mono text-[9.5px] space-y-2 overflow-y-auto max-h-[220px]">
                          <div>
                            <span className="text-blue-400">POST</span> /api/handoff/webhook HTTP/1.1<br/>
                            <span className="text-zinc-500">Host: helpdesk.vitbhopal.ac.in<br/>
                            Content-Type: application/json</span>
                          </div>
                          
                           <div className="text-[9px] border-t border-white/[0.06] pt-1.5 text-zinc-400">
                            {JSON.stringify({
                              ticketId: selectedTicket.id,
                              department: selectedTicket.department,
                              slots: selectedTicket.slots
                            })}
                          </div>

                          {webhookSimState === 'sending' ? (
                            <div className="flex items-center gap-2 text-amber-500 border-t border-zinc-800 pt-1.5">
                              <RefreshCw size={10} className="animate-spin" />
                              <span>Sending handoff payload packet...</span>
                            </div>
                          ) : (
                            <div className="border-t border-white/[0.06] pt-1.5 space-y-1.5">
                              <div className="text-emerald-400">HTTP/1.1 200 OK</div>
                              <div className="text-zinc-500 text-[9px]">
                                Date: {new Date().toUTCString()}<br/>
                                Connection: close
                              </div>
                              <pre className="text-[9px] text-emerald-400/90 leading-tight">
{JSON.stringify(webhookLoggedResponse?.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Panel */}
                    <div className="flex gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                      <button 
                        onClick={() => handleResolveTicket(selectedTicket.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2 text-xs flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <Check size={12} /> Mark Resolved
                      </button>
                      <button 
                        onClick={handleTriggerWebhook}
                        disabled={webhookSimState === 'sending'}
                        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold rounded-lg px-3 py-2 text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        {webhookSimState === 'sending' ? 'Sending...' : 'Trigger Webhook'}
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* Right Column: Audit Logs & Configuration (4 cols persistent if side panel closed) */}
              <div className={`${selectedTicket ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col gap-6 overflow-y-auto`}>
                  
                  {/* Policies Configuration Panel */}
                  <div className="card p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <Settings size={16} className="text-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">AI Triage Guardrails</span>
                    </div>

                    {/* Config Slider: RAG score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-zinc-500">RAG Score Threshold:</span>
                        <b className="font-mono text-blue-600 dark:text-blue-400">{settings.ragThreshold.toFixed(2)}</b>
                      </div>
                      <input 
                        type="range" 
                        min="0.10" 
                        max="0.80" 
                        step="0.10"
                        value={settings.ragThreshold}
                        onChange={(e) => setSettings(prev => ({ ...prev, ragThreshold: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <p className="text-[9.5px] text-zinc-400 leading-tight">Strictness of answer retrieval. Higher values force escalations instead of guessing.</p>
                    </div>

                    {/* Toggle Switch: Sentiment boost */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 block">Sentiment Priority Boost</span>
                        <span className="text-[9.5px] text-zinc-400 block leading-tight">Elevate frustrated messages to High Priority.</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.sentimentBoost}
                        onChange={(e) => setSettings(prev => ({ ...prev, sentimentBoost: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Toggle Switch: Abusive Filter */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 block">Abusive Language Filter</span>
                        <span className="text-[9.5px] text-zinc-400 block leading-tight">Proactively block and flag toxic/profane entries.</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.profanityFilter}
                        onChange={(e) => setSettings(prev => ({ ...prev, profanityFilter: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Toggle Switch: Semantic Search */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 block">Semantic Embedding RAG</span>
                        <span className="text-[9.5px] text-zinc-400 block leading-tight">Use vector embeddings for deeper semantic retrieval.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono ${semanticReady ? 'text-emerald-500' : 'text-zinc-400'}`}>
                          {semanticReady ? '✓ Model Ready' : 'Offline'}
                        </span>
                        <input 
                          type="checkbox"
                          checked={useSemanticSearch && semanticReady}
                          disabled={!semanticReady}
                          onChange={(e) => setUseSemanticSearch(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Audit Logs Widget */}
                  <div className="card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-rose-500" />
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">System Audit & Safety Logs</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>

                    <div className="bg-zinc-950 text-zinc-400 rounded-lg p-2.5 font-mono text-[9px] leading-relaxed h-44 overflow-y-auto space-y-1.5 shadow-inner">
                      {auditLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-zinc-900 pb-1">
                          <span className="text-zinc-600">[{log.time}]</span>{' '}
                          <span className={`font-bold px-1 rounded-[2px] ${
                            log.type === 'SAFETY' ? 'bg-rose-950 text-rose-400' :
                            log.type === 'SLOT' ? 'bg-amber-950 text-amber-400' : 'bg-blue-950 text-blue-400'
                          }`}>{log.type}</span>{' '}
                          <span className="text-zinc-300">{log.message}</span>
                        </div>
                      ))}
                      <div ref={auditLogsEndRef} />
                    </div>
                  </div>

                  {/* Analytics Section */}
                  <div className="card p-4 flex flex-col gap-6">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <BarChart2 size={16} className="text-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Real-Time Metrics Overview</span>
                    </div>

                    {/* EChart 1: Ticket Load by Dept */}
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Escalations by Department</h4>
                      <div className="h-44">
                        <ReactECharts option={getDeptChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                    {/* EChart 2: Sentiment Pie */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Student Sentiment Distribution</h4>
                      <div className="h-44">
                        <ReactECharts option={getSentimentChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                    {/* EChart 3: System Performance */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Agent Performance Metrics</h4>
                      <div className="h-44">
                        <ReactECharts option={getSummaryChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                  </div>

                </div>

            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: RAG KNOWLEDGE BASE MANAGER */}
        {/* ================================================================ */}
        {activeTab === 'kb' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)] min-h-[500px] overflow-hidden">
            
            {/* Left side: Upload custom policy chunks (LHS, 4 cols) */}
            <div className="lg:col-span-4 flex flex-col card overflow-hidden">
              <div className="p-4 bg-white/[0.02] border-b border-white/[0.06]">
                <span className="font-bold text-sm tracking-tight text-zinc-200 flex items-center gap-2">
                  <Plus size={16} className="text-blue-500" />
                  INDEX NEW POLICY DOCUMENT
                </span>
              </div>

              <form onSubmit={handleAddDocument} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Document Category</label>
                  <select 
                    value={newDoc.category}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="IT Support">IT Support</option>
                    <option value="Hostel">Hostel Rules</option>
                    <option value="Academics">Academic Policy</option>
                    <option value="Finance">Finance & Fees</option>
                    <option value="Admissions">Admissions</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Document Title</label>
                  <input 
                    type="text"
                    required
                    value={newDoc.title}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. WiFi Port restrictions on Hostels"
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Document Content (Grounded Source Chunk)</label>
                  <textarea 
                    required
                    rows={4}
                    value={newDoc.content}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Provide the exact guidelines, timelines, and instructions that the AI agent must ground its answers in..."
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Search Tags (Comma separated)</label>
                  <input 
                    type="text"
                    value={newDoc.tags}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g. ports, gaming, block, steam"
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Source / Document Citation Reference</label>
                  <input 
                    type="text"
                    value={newDoc.source}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="e.g. IT Firewall Policy §2.1"
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles size={14} />
                  Index & Ground Document
                </button>

              </form>

            </div>

            {/* Right side: RAG similarity sandbox and Browse Indexed chunks (RHS, 8 cols) */}
            <div className="lg:col-span-8 flex flex-col card overflow-hidden h-full">
              
              {/* RAG Sandbox Tester Widget (Top half) */}
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-col gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-blue-500" />
                  <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">RAG Similarity Search Sandbox</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Type a test query to see immediate RAG similarity matching scores..."
                    value={ragSandboxQuery}
                    onChange={(e) => setRagSandboxQuery(e.target.value)}
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-100"
                  />
                </div>

                {/* Sandbox Results Grid */}
                {ragSandboxQuery ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto">
                    {ragSandboxResults.length > 0 ? (
                      ragSandboxResults.slice(0, 4).map((r, i) => (
                        <div key={r.doc.id} className="p-2 border border-white/[0.06] rounded-lg bg-[#0c0c10] text-[10px] flex justify-between items-center shadow-sm font-mono">
                          <div className="truncate max-w-[75%] font-sans">
                            <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{r.doc.title}</p>
                            <p className="text-zinc-400 italic font-mono text-[9px] truncate">{r.doc.source}</p>
                          </div>
                          <span className={`font-mono px-1.5 py-0.5 rounded font-bold ${
                            r.score >= settings.ragThreshold 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            Score: {r.score.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-zinc-500 italic text-[11px] py-1 font-mono">No documents exceed RAG scoring index floor.</div>
                    )}
                  </div>
                ) : (
                   <p className="text-[10px] text-zinc-400">Type above to test RAG mathematical vector weights live without writing chat logs.</p>
                )}
              </div>

              {/* Header with Search and List */}
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">INDEXED KNOWLEDGE BASE</span>
                   <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded font-bold font-mono">
                    {knowledgeBase.length} chunks
                  </span>
                </div>
                
                {/* Search Input */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 text-zinc-400" size={12} />
                  <input 
                    type="text"
                    placeholder="Filter list..."
                    value={ragSearchQuery}
                    onChange={(e) => setRagSearchQuery(e.target.value)}
                    className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Indexed document list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {knowledgeBase.filter(doc => {
                  const query = ragSearchQuery.toLowerCase();
                  return doc.title.toLowerCase().includes(query) || 
                         doc.content.toLowerCase().includes(query) || 
                         doc.category.toLowerCase().includes(query) ||
                         doc.tags.some(tag => tag.includes(query));
                }).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-white/[0.06] bg-[#0c0c10] shadow-sm relative group hover:border-white/[0.12] transition-colors">
                    
                    {/* Floating Delete button */}
                    <button 
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete document chunk"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                        {doc.category}
                      </span>
                       <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        Updated: {doc.lastUpdated}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 mb-1">{doc.title}</h3>
                    
                    {/* Content */}
                     <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-[#0c0c10] p-2.5 rounded border border-white/[0.06]">{doc.content}</p>
                    
                    {/* Tags & Citation Footer */}
                    <div className="flex flex-wrap items-center justify-between mt-3 text-[10px] text-zinc-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-zinc-400 dark:text-zinc-500 font-mono uppercase">Tags:</span>
                        {doc.tags.map((tag, i) => (
                          <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9.5px] font-mono text-zinc-500 hover:text-zinc-700 cursor-pointer" onClick={() => setRagSearchQuery(tag)}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="font-mono text-zinc-500 italic mt-1 md:mt-0">Source: {doc.source}</span>
                    </div>

                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`toast pointer-events-auto ${
            t.type === 'success' 
              ? 'bg-[#0a2e1a] border-[#1a4a2a] text-[#34d399]'
              : t.type === 'error'
              ? 'bg-[#2e0a0a] border-[#4a1a1a] text-[#f87171]'
              : 'bg-[#121216] border-[#2a2a32] text-[#64748b]'
          }`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Student Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
                  <div className="card p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()} style={{ backdropFilter: 'blur(24px)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-[#2563eb] to-[#7c3aed] rounded-xl text-white shadow-lg"><User size={20} /></div>
              <div>
                <h2 className="font-bold text-lg">Student Login</h2>
                <p className="text-xs text-zinc-500">Login to auto-inject your campus context</p>
              </div>
            </div>
            <input
              type="text"
              value={loginRegNo}
              onChange={e => setLoginRegNo(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter Registration No. (e.g. 22BCE1001)"
              className="w-full bg-[#0c0c10] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder:text-white/30"
            />
            {loginError && <p className="text-xs text-rose-500 mb-3">{loginError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowLoginModal(false)} className="flex-1 px-4 py-2 text-sm border border-white/[0.06] rounded-lg hover:bg-white/5 transition-colors text-zinc-400">Cancel</button>
              <button onClick={handleLogin} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Login</button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-3 text-center">Demo accounts: 22BCE1001, 22BCE1002, 22BME2001, 22BIT1023, 22BCE2005</p>
          </div>
        </div>
      )}

      {/* Grounding Document Details Modal (Citations) */}
      {activeCitationDoc && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="card shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-500" />
                <span className="font-bold text-sm tracking-tight text-zinc-200">GROUNDING SOURCE ENTRY</span>
              </div>
              <button
                onClick={() => setActiveCitationDoc(null)}
                className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs leading-relaxed">

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Title / Section</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{activeCitationDoc.title}</h3>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">RAG Category</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider block w-fit mt-1">
                  {activeCitationDoc.category}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verbatim Indexed Text Chunk</span>
                <p className="bg-[#0c0c10] border border-white/[0.06] rounded-lg p-3.5 text-zinc-300 leading-relaxed font-sans mt-1">
                  "{activeCitationDoc.content}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Metadata Citation</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{activeCitationDoc.source}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Last Verification Date</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{activeCitationDoc.lastUpdated}</span>
                </div>
              </div>

              {activeCitationDoc.tags?.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Index Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCitationDoc.tags.map((tag, i) => (
                      <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9.5px] font-mono text-zinc-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] text-right">
              <button
                onClick={() => setActiveCitationDoc(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-2 text-xs transition-colors shadow-sm"
              >
                Close Verification
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
