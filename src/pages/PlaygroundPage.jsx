import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  MessageSquare, Terminal, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  Send, Check, RefreshCw, Award, Inbox, GitBranch, X, Mic, MicOff, Volume2, Info, Play,
  Database, UserCheck, ArrowUpRight, Network, Users, Activity, Search,
} from 'lucide-react';
import { getToken } from '../api';

/** PlaygroundPage — presentational page; state/actions via `app` bag from App. */
export default function PlaygroundPage({ app }) {
  const {
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
    toasts, confettiRef, handleLogout, navTabs, BENCHMARK_TESTS,
  } = app;

  return (
<div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[70dvh] lg:min-h-[480px] ${userRole === 'admin' ? 'pipeline-admin lg:h-[calc(100dvh-7.5rem)]' : 'lg:h-[calc(100dvh-7.5rem)]'}`}>
            
            {/* Student Chat / Admin simulate */}
            <div className={`${userRole === 'admin' ? 'lg:col-span-5 order-2' : 'lg:col-span-12'} flex flex-col card overflow-hidden`}>
              
              <div className="card-header flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${slotState.activeIntent ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <span className="font-bold text-sm tracking-tight block" style={{ color: 'var(--ink)' }}>
                      {userRole === 'student' ? 'Ask Campus Help' : 'Simulate student ask'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {userRole === 'student'
                        ? (studentProfile
                          ? `${studentProfile.hostel} · Room ${studentProfile.room} · ${studentProfile.regNo}`
                          : 'Policy-cited answers · confirm before ticket')
                        : 'Judge path only — run sample asks; Trace panel shows the agent steps'}
                    </span>
                  </div>
                </div>
                <div className="help-meta">
                  <span className={`help-meta-pill ${apiOnline ? 'live' : 'warn'}`}>
                    {apiOnline ? 'API live' : (getToken() ? 'Offline rules' : 'Sign in again')}
                  </span>
                  <span className="help-meta-pill">
                    {chatMessages.filter((m) => m.sender === 'student').length} asks
                  </span>
                  {slotState.activeIntent && (
                    <span className="help-meta-pill warn">{String(slotState.activeIntent).replace(/_/g, ' ')}</span>
                  )}
                  {userRole === 'student' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Inbox size={12} /> Requests
                    </button>
                  )}
                </div>
              </div>

              {/* Campus outage banner (trusted ops signal) */}
              {userRole === 'student' && outages.length > 0 && (
                <div className="px-4 pt-3 space-y-2">
                  {outages.map((o) => (
                    <div key={o.id} className="flex items-start gap-2.5 p-2.5 rounded-lg text-xs border"
                      style={{ borderColor: 'color-mix(in oklch, var(--warn) 40%, var(--line))', background: 'color-mix(in oklch, var(--warn) 10%, var(--surface))' }}>
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--ink)' }}>{o.title}</div>
                        <p className="mt-0.5" style={{ color: 'var(--muted)' }}>{o.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Proactive Outage Alerts */}
              {proactiveAlerts.length > 0 && (
                <div className="px-4 pt-3 space-y-2">
                  {proactiveAlerts.map(alert => (
                    <div key={alert.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs border ${
                      alert.severity === 'critical' 
                        ? 'bg-rose-950/20 border-rose-900/40' 
                        : 'bg-amber-950/20 border-amber-900/40'
                    }`}>
                      <AlertTriangle size={14} className={alert.severity === 'critical' ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">{alert.intent}</span>
                          <span className={`badge ${alert.severity === 'critical' ? 'badge-error' : 'badge-warning'}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-zinc-500 mt-0.5">{alert.message}</p>
                      </div>
                      <button onClick={() => handleDismissAlert(alert.id)} className="text-zinc-500 hover:text-zinc-400 p-1"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
                {userRole === 'student' ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2 mb-2.5">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                        {studentProfile ? `Hi ${studentProfile.name.split(' ')[0]} — common campus topics` : 'Common campus topics'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Tap to prefill</span>
                    </div>
                    <div className="topic-grid">
                      <button
                        type="button"
                        className="topic-card"
                        onClick={() => handlePresetTrigger(
                          studentProfile
                            ? `I forgot my portal password. My ID is ${studentProfile.regNo} and email is ${studentProfile.email}.`
                            : 'I lost my student portal password, can you help me?'
                        )}
                      >
                        <span className="topic-card-title">Portal password</span>
                        <span className="topic-card-sub">Reset path · IT handoff if needed</span>
                      </button>
                      <button
                        type="button"
                        className="topic-card"
                        onClick={() => handlePresetTrigger(
                          studentProfile
                            ? `My hostel room light is broken in ${studentProfile.hostel} room ${studentProfile.room}.`
                            : 'My hostel room light is broken'
                        )}
                      >
                        <span className="topic-card-title">Hostel fix</span>
                        <span className="topic-card-sub">Lights, fan, leak · photo later</span>
                      </button>
                      <button
                        type="button"
                        className="topic-card"
                        onClick={() => handlePresetTrigger('How do I connect to campus secure WiFi?')}
                      >
                        <span className="topic-card-title">Campus Wi‑Fi</span>
                        <span className="topic-card-sub">VITB-Secure setup steps</span>
                      </button>
                      <button
                        type="button"
                        className="topic-card"
                        onClick={() => handlePresetTrigger(
                          studentProfile
                            ? `Can I get a merit scholarship? My CGPA is ${studentProfile.cgpa} and family income is 3.2 Lakhs.`
                            : 'Can I get a scholarship? My CGPA is 8.5 and family income is 3 Lakhs.'
                        )}
                      >
                        <span className="topic-card-title">Scholarship</span>
                        <span className="topic-card-sub">CGPA + income check</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--muted)' }}>Evaluator scenarios</span>
                    <div className="topic-grid">
                      <button type="button" className="topic-card" onClick={() => handlePresetTrigger("I lost my student portal password, can you help me?")}>
                        <span className="topic-card-title">IT Handoff</span>
                        <span className="topic-card-sub">Escalate to support</span>
                      </button>
                      <button type="button" className="topic-card" onClick={() => handlePresetTrigger("Can I get a scholarship? My CGPA is 8.5 and family income is 3 Lakhs.")}>
                        <span className="topic-card-title">Scholarship OK</span>
                        <span className="topic-card-sub">Grounded qualify</span>
                      </button>
                      <button type="button" className="topic-card" onClick={() => handlePresetTrigger("I want to apply for the merit scholarship. My CGPA is 7.4 and annual income is 3.5 Lakhs.")}>
                        <span className="topic-card-title">Refusal</span>
                        <span className="topic-card-sub">Below CGPA floor</span>
                      </button>
                      <button type="button" className="topic-card" onClick={() => handlePresetTrigger("This stupid router wifi is shit, reset my credentials right fucking now!")}>
                        <span className="topic-card-title">Abuse filter</span>
                        <span className="topic-card-sub">Safety refusal</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Chat Message Logs */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && !isProcessing && (
                  <div className="chat-empty">
                    <h3>What do you need from campus?</h3>
                    <p>
                      Ask in plain language. The agent cites approved policy, refuses when unsure,
                      and only files a ticket after you confirm.
                    </p>
                    <ul className="chat-empty-points">
                      <li>
                        <CheckCircle2 size={14} style={{ color: 'var(--ok)', marginTop: 2 }} />
                        <div>
                          <strong>Grounded answers</strong>
                          Wi‑Fi, fees, hostel rules — with source when available
                        </div>
                      </li>
                      <li>
                        <ShieldAlert size={14} style={{ color: 'var(--danger)', marginTop: 2 }} />
                        <div>
                          <strong>Safe refusal</strong>
                          Off-policy or incomplete asks get a clear no — not a guess
                        </div>
                      </li>
                      <li>
                        <UserCheck size={14} style={{ color: 'var(--accent)', marginTop: 2 }} />
                        <div>
                          <strong>Controllable handoff</strong>
                          You confirm before Ops is notified; track in My Requests
                        </div>
                      </li>
                    </ul>
                  </div>
                )}
                {chatMessages.map((msg, index) => {
                  if (msg.sender === 'system') {
                    return (
                      <div key={index} className="flex justify-center my-2">
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full font-medium text-zinc-500 flex items-center gap-1.5">
                          <ArrowRight size={10} className="text-blue-500" />
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
                              <span className="badge badge-success flex items-center gap-1">
                                <CheckCircle2 size={9} /> Grounded Answer
                              </span>
                            )}
                            {msg.action === 'REFUSAL' && (
                              <span className="badge badge-error flex items-center gap-1">
                                <ShieldAlert size={9} /> Safe Refusal
                              </span>
                            )}
                            {msg.action === 'CLARIFY' && (
                              <span className="badge badge-warning flex items-center gap-1">
                                <Info size={9} /> Gathering Details
                              </span>
                            )}
                            {msg.action === 'ESCALATE' && (
                              <span className="badge badge-info flex items-center gap-1">
                                <ArrowUpRight size={9} /> Escalated
                              </span>
                            )}
                            {msg.action === 'ESCALATE_PROPOSE' && (
                              <span className="badge badge-warning flex items-center gap-1">
                                <UserCheck size={9} /> Confirm handoff
                              </span>
                            )}
                          </div>
                        )}

                        <div className="whitespace-pre-line leading-relaxed">{displayText}</div>

                        <div className="flex items-center gap-2 mt-1.5">
                          {!isStudent && (
                            <button onClick={() => handleSpeakResponse(displayText)} className="text-zinc-500 hover:text-blue-500 transition-colors" title="Read aloud">
                              <Volume2 size={11} />
                            </button>
                          )}
                          {!isStudent && citationSource && (
                            <button onClick={() => handleOpenCitation(citationSource)}
                              className="text-[10px] font-medium text-blue-500 hover:text-blue-400 border border-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">
                              <Database size={9} /> View Source
                            </button>
                          )}
                          <span className={`text-[9px] ml-auto ${isStudent ? 'text-blue-300' : 'text-zinc-500'}`}>{msg.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {pendingEscalate && (
                <div className="px-4 py-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--line)', background: 'color-mix(in oklch, var(--warn) 8%, var(--surface))' }}>
                  <span className="text-[11px] font-medium flex-1" style={{ color: 'var(--ink)' }}>
                    Controllable handoff ready — file ticket to staff?
                  </span>
                  <button type="button" onClick={handleConfirmEscalate} disabled={isProcessing} className="btn-primary px-3 py-1.5 text-[11px] rounded-md">
                    Confirm file ticket
                  </button>
                  <button type="button" onClick={handleCancelEscalate} className="px-3 py-1.5 text-[11px] rounded-md border" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                    Cancel
                  </button>
                </div>
              )}

              {agentPlan?.steps?.length > 0 && (
                <details className="agent-plan-details">
                  <summary>
                    Agent plan
                    {typeof agentPlan.confidence === 'number' && (
                      <span className="font-normal" style={{ color: 'var(--muted)' }}>
                        {' '}· {Math.round(agentPlan.confidence * 100)}% retrieval
                      </span>
                    )}
                  </summary>
                  <ol className="agent-plan-body space-y-1">
                    {agentPlan.steps.map((s) => (
                      <li key={s.id} style={{ color: 'var(--muted)' }}>
                        <strong style={{ color: 'var(--ink)' }}>{s.label}</strong> — {s.detail}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {/* Chat Input */}
              <div className="composer-shell">
                <p className="composer-hint">
                  <span>Approved docs only</span>
                  <span>Confirm before escalate</span>
                  {slotState.activeIntent
                    ? <span>Collecting: {String(slotState.activeIntent).replace(/_/g, ' ')}</span>
                    : <span>Ready for a new ask</span>}
                </p>
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2">
                  {voiceSupported && (
                    <button type="button" onClick={handleVoiceToggle}
                      className={`rounded-lg px-3 py-2 flex items-center justify-center text-xs font-medium transition-all ${
                        voiceListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'border'
                      }`}
                      style={!voiceListening ? { borderColor: 'var(--line)', color: 'var(--muted)' } : undefined}
                      title={voiceListening ? 'Listening...' : 'Voice input'}>
                      {voiceListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  )}
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      slotState.activeIntent === 'PASSWORD_RESET' ? "Enter your Student ID or email..."
                      : slotState.activeIntent === 'SCHOLARSHIP_INQUIRY' ? "CGPA and annual income..."
                      : slotState.activeIntent === 'MAINTENANCE_REQUEST' ? "Block name and room number..."
                      : "Type your campus query…"
                    }
                    className="input-friendly flex-1"
                  />
                  <button type="submit" disabled={!chatInput.trim() || isProcessing}
                    className="btn-primary px-3 py-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                    {isProcessing ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
              </div>

            </div>

            {/* RHS Panel: Reasoning Trace vs Evaluator — Academic Ops only */}
            {userRole === 'admin' && (
            <div className="lg:col-span-7 order-1 flex flex-col card overflow-hidden text-xs">
              
              {/* Tab Selector Header */}
              <div className="card-header flex flex-col gap-2">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
                  Pipeline — agent steps judges care about (Trace first)
                </div>
                <div className="flex items-center gap-1">
                <button onClick={() => setPlaygroundSubTab('trace')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    playgroundSubTab === 'trace'
                      ? 'bg-zinc-800 text-blue-500 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                  <Terminal size={13} />
                  Reasoning Trace
                </button>
                <button onClick={() => setPlaygroundSubTab('evaluator')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    playgroundSubTab === 'evaluator'
                      ? 'bg-zinc-800 text-blue-500 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                  <Award size={13} />
                  Evaluator
                </button>
                </div>
              </div>

              {/* Trace Viewer Content */}
              {playgroundSubTab === 'trace' && (
                <div className="flex-1 flex flex-col overflow-hidden text-zinc-200">
                  {/* Multi-Agent Pipeline */}
                  {agentTraceSteps.length > 0 && (
                    <div className="px-4 pt-3 pb-1 border-b border-zinc-800">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                        <GitBranch size={12} /> Agent Pipeline
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto pb-2">
                        {agentTraceSteps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <div className={`pipeline-step ${
                              step.status === 'complete' || step.status === 'pass' ? 'pipeline-step-done'
                              : step.status === 'fail' || step.status === 'no_match' ? 'pipeline-step-fail'
                              : step.status === 'skipped' ? 'pipeline-step-skip'
                              : 'bg-amber-950/20 border-amber-800/30 text-amber-400'
                            }`}>
                              <span className="uppercase">{step.agent}</span>
                              {step.status === 'complete' && <Check size={8} />}
                              {step.status === 'pass' && <CheckCircle2 size={8} />}
                              {step.status === 'fail' && <ShieldAlert size={8} />}
                              {step.status === 'no_match' && <AlertTriangle size={8} />}
                              {step.status === 'skipped' && <span className="text-[7px]">⏭</span>}
                            </div>
                            {idx < agentTraceSteps.length - 1 && (
                              <ArrowRight size={10} className="text-zinc-600 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="space-y-1 mb-2">
                        {agentTraceSteps.map((step, idx) => (
                          <div key={idx} className="text-[10px] flex items-start gap-2 bg-zinc-900 p-1.5 rounded">
                            <span className={`font-semibold uppercase shrink-0 w-16 ${
                              step.status === 'complete' || step.status === 'pass' ? 'text-emerald-500' :
                              step.status === 'fail' ? 'text-rose-500' :
                              step.status === 'skipped' ? 'text-zinc-500' : 'text-amber-400'
                            }`}>{step.agent}</span>
                            <span className="text-zinc-500">{step.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* === PREDICTIVE SLA PANEL === */}
                  {slaPredictions.length > 0 && (
                    <div className="card p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-300">Predictive SLA Engine</span>
                        <span className="ml-auto text-[9px] text-zinc-500 font-mono">Linear Regression Model</span>
                      </div>
                      {slaPredictions.slice(0, 4).map((pred, i) => (
                        <div key={i} className={`p-2.5 rounded-xl border text-[10px] ${
                          pred.riskScore > 70 ? 'border-rose-900/40 bg-rose-950/20' :
                          pred.riskScore > 40 ? 'border-amber-900/40 bg-amber-950/20' :
                          'border-emerald-900/40 bg-emerald-950/20'
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono font-bold text-zinc-400">{pred.ticketId}</span>
                            <span className={`font-mono font-bold text-[11px] ${
                              pred.riskScore > 70 ? 'text-rose-400' : pred.riskScore > 40 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>{pred.riskScore}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full transition-all ${
                              pred.riskScore > 70 ? 'bg-rose-500' :
                              pred.riskScore > 40 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`} style={{ width: `${pred.riskScore}%` }} />
                          </div>
                          <div className="flex justify-between text-zinc-500">
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
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <ShieldAlert size={14} className="text-rose-500" />
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-300">Anomaly Detection</span>
                        <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      </div>
                      {anomalies.slice(0, 3).map((anomaly, i) => (
                        <div key={i} className={`p-2.5 rounded-xl border text-[10px] ${
                          anomaly.severity === 'critical' ? 'border-rose-900/40 bg-rose-950/20' : 'border-amber-900/40 bg-amber-950/20'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={10} className={anomaly.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'} />
                            <span className="font-bold text-zinc-300">{anomaly.type.replace(/_/g, ' ')}</span>
                            <span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              anomaly.severity === 'critical' ? 'bg-rose-950/40 text-rose-400' : 'bg-amber-950/40 text-amber-400'
                            }`}>{anomaly.severity.toUpperCase()}</span>
                          </div>
                          <p className="text-zinc-500 mb-1">{anomaly.message}</p>
                          <p className="text-zinc-500 text-[9px] italic">Suggestion: {anomaly.suggestion}</p>
                        </div>
                      ))}
                </div>
              )}
                  {latestTrace ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      
                      {/* Query */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">User Query</div>
                        <div className="text-zinc-200 break-words bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-sm">
                          "{latestTrace.query}"
                        </div>
                      </div>

                      {/* Intent & Sentiment */}
                      <div className="grid grid-cols-2 gap-4 pb-3">
                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                          <div className="kpi-label mb-1">Classified Intent</div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              latestTrace.intent === 'OFF_TOPIC' || latestTrace.intent === 'PROFANITY_ABUSE' ? 'bg-rose-500' :
                              latestTrace.intent === 'GENERAL_ACADEMIC' ? 'bg-zinc-500' : 'bg-blue-500'
                            }`}></span>
                            <span className="font-semibold text-sm text-zinc-200">{latestTrace.intent}</span>
                          </div>
                        </div>
                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                          <div className="kpi-label mb-1">Student Sentiment</div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              latestTrace.sentiment?.label === 'Frustrated' ? 'bg-rose-500' :
                              latestTrace.sentiment?.label === 'Positive' ? 'bg-emerald-500' : 'bg-zinc-500'
                            }`}></span>
                            <span className={`font-semibold text-sm ${latestTrace.sentiment?.color || 'text-zinc-500'}`}>
                              {latestTrace.sentiment?.label || 'Neutral'} ({latestTrace.sentiment?.score ?? 0})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Settings Applied */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">Active Policy Settings</div>
                        <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-[11px] grid grid-cols-4 text-center gap-2">
                          <div className="border-r border-zinc-800">
                            <p className="kpi-label">RAG THRESHOLD</p>
                            <p className="font-semibold text-zinc-200 mt-0.5">{Number(latestTrace.config?.ragThreshold ?? 0.55).toFixed(2)}</p>
                          </div>
                          <div className="border-r border-zinc-800">
                            <p className="kpi-label">SENTIMENT BOOST</p>
                            <p className={`font-semibold mt-0.5 ${latestTrace.config?.sentimentBoost ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {latestTrace.config?.sentimentBoost ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          <div className="border-r border-zinc-800">
                            <p className="kpi-label">ABUSE FILTER</p>
                            <p className={`font-semibold mt-0.5 ${latestTrace.config?.profanityFilter ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {latestTrace.config?.profanityFilter ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          <div>
                            <p className="kpi-label">SEMANTIC RAG</p>
                            <p className={`font-semibold mt-0.5 ${semanticReady && useSemanticSearch ? 'text-emerald-500' : 'text-zinc-500'}`}>
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
                          <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
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
                                      return <line key={`r${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,2" />;
                                    })}
                                    {all.map((e, i) => {
                                      const p = positions[e.entity];
                                      if (!p) return null;
                                      const color = depthColors[Math.min(e.depth, 3)];
                                      const size = Math.max(8, 14 - e.depth * 3);
                                      return (
                                        <g key={`e${i}`}>
                                          <circle cx={p.x} cy={p.y} r={size} fill={color} opacity="0.85" stroke="#fff" strokeWidth="1.5" />
                                          <text x={p.x} y={p.y + size + 8} textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="sans-serif">
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
                          <span className="text-[9px] text-zinc-500">
                            Target: &gt;= {Number(latestTrace.config?.ragThreshold ?? 0.55).toFixed(2)}
                          </span>
                        </div>
                        {(latestTrace.retrievedDocs || []).length > 0 ? (
                          <div className="space-y-1.5">
                            {(latestTrace.retrievedDocs || []).map((match, idx) => {
                              const doc = match.doc || match;
                              const score = Number(match.score ?? doc.score ?? 0);
                              const thr = Number(latestTrace.config?.ragThreshold ?? 0.55);
                              return (
                              <div key={idx} className={`p-2 rounded-lg border text-[11px] ${
                                idx === 0 && score >= thr
                                  ? 'bg-emerald-950/20 border-emerald-900/40' 
                                  : 'bg-zinc-900 border-zinc-800'
                              }`}>
                                <div className="flex justify-between font-bold text-zinc-100 mb-1">
                                  <span className="truncate max-w-[80%]">{doc.title || doc.id || 'Document'}</span>
                                  <span className={`font-mono text-[10px] px-1.5 rounded ${
                                    score >= thr
                                      ? 'bg-emerald-950/40 text-emerald-400' 
                                       : 'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    Score: {score.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-[10.5px] leading-relaxed text-zinc-400 line-clamp-2">{doc.content || ''}</p>
                                <div className="text-[9px] text-zinc-500 mt-1 flex justify-between">
                                  <span>Source: {doc.source || '—'}</span>
                                  {idx === 0 && score >= thr && <span className="text-emerald-500 font-bold font-mono">✔ RAG GROUNDED</span>}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-zinc-900 rounded border border-zinc-800 text-zinc-500 text-[11px]">
                            No matching knowledge base documents found — run Ask help to populate
                          </div>
                        )}
                      </div>

                      {/* Slot State Machine */}
                      <div className="pb-3">
                        <div className="kpi-label mb-1">Slot-Filling State Machine</div>
                        <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-[11px] space-y-1.5 text-zinc-500">
                          <div className="flex justify-between">
                            <span>Active State Tracking:</span>
                            <b className="text-zinc-200">{latestTrace.intent || 'NONE'}</b>
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
                            ? 'bg-rose-950/20 border-rose-900/40 text-rose-400' 
                            : latestTrace.escalationTriggered 
                            ? 'bg-blue-950/20 border-blue-900/40 text-blue-400' 
                            : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
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
                            <p className="text-[10.5px] leading-relaxed mt-1 text-zinc-500">
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
                              <div key={i} className="p-2.5 rounded-xl border border-zinc-800 text-[10px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base">{vote.emoji}</span>
                                    <span className="font-bold text-zinc-300">{vote.name}</span>
                                  </div>
                                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                    vote.vote === 'AGREE' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-amber-950/40 text-amber-400'
                                  }`}>{vote.vote}</span>
                                </div>
                                <p className="text-zinc-500 leading-relaxed">{vote.response}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px]">
                            <span className="font-bold text-zinc-400">Final Decision:</span>{' '}
                            <span className="text-zinc-500">{debateData.finalDecision.selectedAgent} selected with {debateData.finalDecision.consensus}% consensus</span>
                          </div>
                        </div>
                      )}

                      {/* === EMOTION-ADAPTIVE RESPONSE === */}
                      {emotionResponse && (
                        <div className="pb-3">
                          <div className="kpi-label mb-1 flex items-center gap-1">
                            <Activity size={12} /> Emotion-Adaptive Response
                          </div>
                          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-[10px] space-y-1">
                            <div className="flex gap-3">
                              <span className="text-zinc-500">Tone:</span>
                              <span className="font-bold text-zinc-400 uppercase">{emotionResponse.tone}</span>
                              <span className="text-zinc-600">|</span>
                              <span className="text-zinc-500">Urgency:</span>
                              <span className={`font-bold uppercase ${
                                emotionResponse.urgency === 'HIGH' ? 'text-rose-400' : emotionResponse.urgency === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
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
                          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-[10px] space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">👨‍💼</span>
                              <div>
                                <span className="font-bold text-zinc-300">{staffAssignment.recommended.name}</span>
                                <span className="text-zinc-600 ml-2">Score: {staffAssignment.recommended.matchScore}/100</span>
                              </div>
                            </div>
                            <p className="text-zinc-500">{staffAssignment.reasoning}</p>
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
                              <div key={i} className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-zinc-400">{st.ticket.id}</span>
                                  <span className="text-zinc-600 ml-2 truncate max-w-[120px] inline-block">{st.ticket.intent}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-zinc-400">{st.similarity}%</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    st.resolution.includes('Met') ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
                                  }`}>{st.resolution}</span>
                                </div>
                              </div>
                            ))}

                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-zinc-400">
                      <Terminal size={32} className="mb-2 text-zinc-600" />
                      <p className="font-medium text-zinc-500">Waiting for query...</p>
                      <p className="text-[11px] max-w-[250px] mt-1 text-zinc-500">Submit a query or click a preset to inspect the step-by-step reasoning trace.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hackathon Evaluator Center Content */}
              {playgroundSubTab === 'evaluator' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  
                  {/* Benchmarks Header & Test Button */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200">benchmark evaluation suite</h3>
                      <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">Automated test script validating agent against grading metrics.</p>
                    </div>
                    
                    <button 
                      onClick={handleRunEvaluation}
                      disabled={testRunnerState === 'running'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg px-3.5 py-2 text-xs flex items-center gap-1.5 transition-colors"
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
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Grounding Precision vs Handoff Recall Curve</h4>
                    <div className="h-44 bg-zinc-950 border border-zinc-800 rounded-xl p-2 relative">
                      <ReactECharts option={getTradeoffChartOption()} style={{ height: '100%', width: '100%' }} />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[8px]">
                        <Info size={8} className="text-blue-500" />
                        Move RAG Threshold slider to shift red operating dot.
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Test Results Table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">benchmark test list</h4>
                      {testRunnerState === 'done' && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          overallTestScore === 6 
                            ? 'bg-emerald-950/40 text-emerald-400' 
                            : 'bg-rose-950/40 text-rose-400'
                        }`}>
                          Score: {overallTestScore}/6 Passed
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(testRunnerState === 'idle' ? BENCHMARK_TESTS : testResults).map((test) => (
                        <div key={test.id} className="p-3 border border-zinc-800 rounded-xl bg-zinc-900 flex items-start justify-between gap-3 hover:border-zinc-700 transition-colors">
                          <div className="space-y-0.5 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] text-zinc-200">{test.name}</span>
                              <span className="bg-zinc-800 text-[8.5px] font-bold px-1 rounded text-zinc-400">
                                Target: {test.expectedAction}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate">"{test.query}"</p>
                            <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{test.desc}</p>
                          </div>
                          
                          <div className="flex-shrink-0 mt-0.5">
                            {testRunnerState === 'idle' ? (
                              <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[9px] text-zinc-500 font-bold">?</span>
                            ) : testRunnerState === 'running' && test.status === undefined ? (
                              <RefreshCw size={12} className="animate-spin text-blue-500" />
                            ) : test.status === 'pass' ? (
                              <span className="bg-emerald-500 text-white rounded-full p-0.5 flex items-center justify-center">
                                <Check size={10} strokeWidth={4} />
                              </span>
                            ) : (
                              <span className="bg-rose-500 text-white rounded-full p-0.5 flex items-center justify-center">
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
            )}
          </div>
  );
}
