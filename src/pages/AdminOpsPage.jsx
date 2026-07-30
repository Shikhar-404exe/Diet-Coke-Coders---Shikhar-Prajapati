import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Terminal, Search, Inbox, CheckCircle2, ShieldAlert, ShieldCheck, AlertTriangle, X,
  History, RotateCcw, ImagePlus, Activity, RefreshCw, Settings, Filter, ArrowRight,
  Shield, Check, BarChart2,
} from 'lucide-react';
import TicketQr from '../TicketQr';
import { AnimatedCount } from '../components/ui/TicketBits';
/** AdminOpsPage — presentational page; state/actions via `app` bag from App. */
export default function AdminOpsPage({ app }) {
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
<div className="dash-page">
            
            {/* Ops filters + KPIs */}
            <div className="ops-hero flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight m-0" style={{ color: 'var(--ink)' }}>Ops queue</h2>
                <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--muted)' }}>
                  Claim escalations, leave notes, hit SLAs — student tickets land here live.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--accent-ops)' }} />
                  <input
                    type="text"
                    value={nlQuery}
                    onChange={e => setNlQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNlFilter()}
                    placeholder='Filter: "high priority hostel"…'
                    className="input-friendly pl-9"
                  />
                </div>
                <button type="button" onClick={handleNlFilter} className="btn-primary px-3 py-2 text-[11px] rounded-lg min-h-10" title="Parse filter">
                  <Search size={14} />
                </button>
              </div>
            </div>
            {nlInterpretation && (
              <div className="text-[11px] font-medium flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                {nlInterpretation}
                {nlFilter && (
                  <button type="button" onClick={() => { setNlFilter(null); setNlQuery(''); setNlInterpretation(''); }} className="font-semibold" style={{ color: 'var(--danger)' }}>
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Queue', value: tickets.length, icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-950/30', num: true },
                { label: 'Grounded', value: groundedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-950/30', num: true },
                { label: 'Refusals', value: refusalCount, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-950/30', num: true },
                { label: 'SLA met', value: resolvedTickets.length > 0 ? `${Math.round((resolvedTickets.filter(t => t.slaMet).length / resolvedTickets.length) * 100)}%` : '—', icon: ShieldCheck, color: 'text-zinc-400', bg: 'bg-zinc-800/50' },
              ].map((kpi, i) => (
                <div key={i} className="ops-kpi flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{kpi.label}</span>
                    <div className="n mt-0.5" style={{ fontSize: '1.2rem' }}>
                      {kpi.num ? <AnimatedCount value={kpi.value} /> : kpi.value}
                    </div>
                  </div>
                  <div className={`p-2 ${kpi.bg} ${kpi.color} rounded-lg`}>
                    <kpi.icon size={16} />
                  </div>
                </div>
              ))}
            </div>

            {/* Proactive Outage Alerts */}
            {proactiveAlerts.length > 0 && (
              <div className="space-y-2">
                {proactiveAlerts.map(alert => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                    alert.severity === 'critical' 
                      ? 'bg-rose-950/20 border-rose-900/40' 
                      : 'bg-amber-950/20 border-amber-900/40'
                  }`}>
                    <AlertTriangle size={16} className={alert.severity === 'critical' ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{alert.intent}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          alert.severity === 'critical' 
                            ? 'bg-rose-950/40 text-rose-400'
                            : 'bg-amber-950/40 text-amber-400'
                        }`}>{alert.severity.toUpperCase()}</span>
                      </div>
                      <p className="text-zinc-500 mt-0.5">{alert.message}</p>
                      {alert.blocks.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {alert.blocks.map((b, i) => (
                            <span key={i} className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDismissAlert(alert.id)} className="text-zinc-500 hover:text-zinc-400 p-1"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Split Grid for Queue + detail */}
            <div className={`dash-split ${selectedTicket ? 'has-detail' : ''}`}>
              
              {/* Left Column: Tickets Queue & Resolved Archive Table */}
              <div className={`${selectedTicket ? 'dash-hide-mobile-detail' : ''} flex flex-col gap-4 min-w-0`}>
                
                {/* Active Triage Queue Board */}
                <div className="flex flex-col card overflow-hidden">
                  
                  {/* Table Toolbar */}
                  <div className="card-header flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight text-zinc-100">Active Triage Queue</span>
                      <span className="bg-zinc-800 text-zinc-500 text-xs px-2 py-0.5 rounded font-semibold">
                        {filteredTickets.length} tickets
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-40 min-w-[140px]">
                        <Search className="absolute left-2.5 top-2.5 text-zinc-500" size={12} />
                        <input type="text" placeholder="Search tickets..." value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/40 text-zinc-100 placeholder:text-zinc-600 min-h-10" />
                      </div>

                      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-500 min-h-10">
                        <Filter size={10} />
                        <select 
                          value={ticketFilter}
                          onChange={(e) => setTicketFilter(e.target.value)}
                          className="bg-transparent focus:outline-none text-zinc-200 cursor-pointer"
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
                      <select
                        value={deptFilter}
                        onChange={(e) => {
                          setDeptFilter(e.target.value);
                          setTimeout(() => refreshTicketsFromApi(), 0);
                        }}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 min-h-10"
                        title="API department scope"
                      >
                        <option value="all">All depts (API)</option>
                        <option value="IT">IT</option>
                        <option value="Hostel">Hostel</option>
                        <option value="Finance">Finance</option>
                        <option value="Academic">Academic</option>
                      </select>
                    </div>
                  </div>

                  {/* Queue Table */}
                  <div className="overflow-x-auto max-h-[min(28rem,55dvh)] overflow-y-auto">
                    {(nlFilter ? nlFilteredTickets : filteredTickets).length > 0 ? (
                      <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                          <tr className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider z-10">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Classified Issue</th>
                            <th className="px-4 py-3">Handoff Dept</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3 text-right">SLA Countdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-xs">
                          {(nlFilter ? nlFilteredTickets : filteredTickets).map((t) => (
                            <tr 
                              key={t.id}
                              onClick={() => { setSelectedTicket(t); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                              className={`hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                                selectedTicket?.id === t.id 
                                  ? 'bg-blue-500/10 border-l-4 border-l-blue-600' 
                                  : ''
                              }`}
                            >
                              <td className="px-4 py-3 font-mono font-bold text-blue-400">{t.id.replace('TKT-', '')}</td>
                              <td className="px-4 py-3 max-w-[150px]">
                                <p className="truncate text-zinc-100 font-semibold">{t.intent}</p>
                                <p className="truncate text-zinc-500 text-[10.5px] mt-0.5">{t.studentQuery}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[11px] whitespace-nowrap block truncate max-w-[140px]">
                                  {t.department}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.priority === 'High' 
                                    ? 'bg-rose-950/40 text-rose-400' 
                                    : t.priority === 'Medium' 
                                    ? 'bg-amber-950/40 text-amber-400' 
                                    : 'bg-emerald-950/40 text-emerald-400'
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
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Inbox size={40} className="text-zinc-600 mb-2" />
                        <p className="font-semibold text-zinc-500">Triage Queue Empty</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">No escalated tickets match your filters.</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Resolved Tickets Archive Board */}
                <div className="flex flex-col card overflow-hidden">
                  <div className="card-header flex justify-between items-center gap-2">
                    <span className="font-bold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
                      <History size={15} className="text-emerald-500" />
                      Resolved archive
                    </span>
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded font-bold">
                      {resolvedTickets.length} items
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    {resolvedTickets.length > 0 ? (
                      <table className="w-full text-left border-collapse min-w-[560px]">
                        <thead>
                          <tr className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider z-10">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Classified Issue</th>
                            <th className="px-4 py-3">Escalated Department</th>
                            <th className="px-4 py-3">Resolution Time</th>
                            <th className="px-4 py-3">SLA Outcome</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-400">
                          {resolvedTickets.map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-800/20">
                               <td className="px-4 py-3 font-mono font-bold text-zinc-500">{t.id}</td>
                              <td className="px-4 py-3 font-semibold text-zinc-300 max-w-[150px] truncate">{t.intent}</td>
                              <td className="px-4 py-3 truncate max-w-[130px]">{t.department}</td>
                              <td className="px-4 py-3 font-mono">{t.resolutionTimeMinutes} mins</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.slaMet 
                                     ? 'bg-emerald-950/40 text-emerald-400' 
                                     : 'bg-rose-950/40 text-rose-400'
                                }`}>
                                  {t.slaMet ? 'SLA Met' : 'SLA Breached'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleReopenTicket(t.id)}
                                  className="p-1 text-blue-400 hover:bg-blue-950/20 rounded border border-transparent hover:border-blue-900/30 transition-all font-semibold flex items-center gap-1 ml-auto text-[10px] min-h-9"
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
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <History size={32} className="text-zinc-600 mb-1.5" />
                        <p className="text-[11px] text-zinc-500 italic">No tickets resolved yet in this session.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Triage Ticket Details Side Panel */}
              {selectedTicket && (
                <div className="dash-pane card overflow-hidden">
                  
                  {/* Panel Header */}
                  <div className="card-header flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => { setSelectedTicket(null); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                        className="lg:hidden p-2 -ml-1 rounded-lg min-h-10 min-w-10 text-zinc-300"
                        aria-label="Back to queue"
                      >
                        <ArrowRight size={16} className="rotate-180" />
                      </button>
                      <span className="font-bold text-sm tracking-tight text-zinc-100">Ticket detail</span>
                    </div>
                    <button 
                      onClick={() => { setSelectedTicket(null); setWebhookSimState('idle'); setWebhookLoggedResponse(null); }}
                      className="hidden lg:inline-flex p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="dash-pane-body space-y-4 text-xs">
                    
                    <TicketQr ticketId={selectedTicket.id} size={148} label="Desk QR — scan at counter" />

                    {/* Basic Meta */}
                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-2">
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-500">Ticket ID:</span>
                        <strong className="font-mono text-blue-400">{selectedTicket.id}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-500">Time Escalated:</span>
                        <span className="text-zinc-300 font-medium">{selectedTicket.timestamp}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-500">Department Routing:</span>
                        <span className="text-zinc-300 font-bold">{selectedTicket.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ticket Urgency:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedTicket.priority === 'High' 
                            ? 'bg-rose-950/40 text-rose-400' 
                            : 'bg-amber-950/40 text-amber-400'
                        }`}>{selectedTicket.priority}</span>
                      </div>
                    </div>

                    {/* Original Query */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Student Original Query</div>
                      <p className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 leading-relaxed text-zinc-300">
                        "{selectedTicket.studentQuery}"
                      </p>
                    </div>

                    {/* Extracted Slots */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Extracted Slot Metadata</div>
                       <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1.5 text-zinc-500">
                        {Object.keys(selectedTicket.slots || {}).length > 0 ? (
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

                    {(selectedTicket.attachments || []).length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                          <ImagePlus size={11} /> Student photos
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.attachments.map((a) => (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block w-14 h-14 rounded border border-zinc-700 overflow-hidden">
                              <img src={a.url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTicket.handoffSummary && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Handoff summary (for ops)</div>
                        <p className="text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg p-3 leading-relaxed">
                          {selectedTicket.handoffSummary}
                        </p>
                      </div>
                    )}

                    {selectedTicket.claimedName && (
                      <div className="text-[11px] text-zinc-400">
                        Claimed by <strong className="text-zinc-200">{selectedTicket.claimedName}</strong>
                        {selectedTicket.workflow && <> · workflow <code>{selectedTicket.workflow}</code></>}
                      </div>
                    )}

                    {(selectedTicket.staffNotes || []).length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Internal notes</div>
                        <ul className="space-y-1.5 text-[11px] text-zinc-400">
                          {selectedTicket.staffNotes.map((n) => (
                            <li key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5">
                              <strong className="text-zinc-300">{n.by}</strong>: {n.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Staff note / student resolution message</div>
                      <textarea
                        value={opsNote}
                        onChange={(e) => setOpsNote(e.target.value)}
                        rows={2}
                        placeholder="Internal note or message shown to student on resolve…"
                        className="input-friendly text-xs resize-none min-h-[64px]"
                      />
                    </div>

                    {/* Webhook API Console Simulator */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Webhook Handoff Dispatch</span>
                        {webhookSimState === 'success' && <span className="text-[9px] text-emerald-500 font-bold">✔ DISPATCHED</span>}
                      </div>

                      {webhookSimState === 'idle' ? (
                        <div className="bg-zinc-900 border border-zinc-800 p-4 text-center rounded-lg text-zinc-400">
                          <Activity size={20} className="mx-auto mb-1.5 text-zinc-600" />
                          <p className="font-semibold text-[10.5px]">Webhook Not Triggered</p>
                          <p className="text-[9px] mt-0.5">Click 'Trigger Webhook' to dispatch ticket payload.</p>
                        </div>
                      ) : (
                        <div className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-lg p-2.5 text-[9.5px] space-y-2 overflow-y-auto max-h-[220px]">
                          <div>
                            <span className="text-blue-400">POST</span> /api/handoff/webhook HTTP/1.1<br/>
                            <span className="text-zinc-500">Host: helpdesk.vitbhopal.ac.in<br/>
                            Content-Type: application/json</span>
                          </div>
                          
                           <div className="text-[9px] border-t border-zinc-800 pt-1.5 text-zinc-500">
                            {JSON.stringify({
                              ticketId: selectedTicket.id,
                              department: selectedTicket.department,
                              slots: selectedTicket.slots,
                              attachments: (selectedTicket.attachments || []).map((a) => a.url),
                              handoffSummary: selectedTicket.handoffSummary,
                            })}
                          </div>

                          {webhookSimState === 'sending' ? (
                            <div className="flex items-center gap-2 text-amber-500 border-t border-zinc-800 pt-1.5">
                              <RefreshCw size={10} className="animate-spin" />
                              <span>Sending handoff payload packet...</span>
                            </div>
                          ) : (
                            <div className="border-t border-zinc-800 pt-1.5 space-y-1.5">
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
                    <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                      {!selectedTicket.claimedBy && selectedTicket.status === 'open' && (
                        <button
                          onClick={() => handleClaimTicket(selectedTicket.id)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-lg px-3 py-2 text-xs"
                        >
                          Claim ticket
                        </button>
                      )}
                      <button
                        onClick={() => handleOpsNote(selectedTicket.id)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-lg px-3 py-2 text-xs"
                      >
                        Save note
                      </button>
                      <button 
                        onClick={() => handleResolveTicket(selectedTicket.id)}
                        className="btn-success flex-1 py-2 text-xs flex items-center justify-center gap-1"
                      >
                        <Check size={12} /> Mark Resolved
                      </button>
                      <button 
                        onClick={handleTriggerWebhook}
                        disabled={webhookSimState === 'sending'}
                        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 border border-zinc-700 font-semibold rounded-lg px-3 py-2 text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        {webhookSimState === 'sending' ? 'Sending...' : 'Trigger Webhook'}
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* Right Column: Audit Logs & Configuration */}
              <div className={`${selectedTicket ? 'dash-hide-mobile-detail' : ''} flex flex-col gap-4 min-w-0`}>
                  
                  {/* Policies Configuration Panel */}
                  <div className="card p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <Settings size={16} className="text-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-zinc-200">AI Triage Guardrails</span>
                    </div>

                    {/* Config Slider: RAG score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-zinc-500">RAG Score Threshold:</span>
                        <b className="font-mono text-blue-400">{settings.ragThreshold.toFixed(2)}</b>
                      </div>
                      <input 
                        type="range" 
                        min="0.10" 
                        max="0.80" 
                        step="0.10"
                        value={settings.ragThreshold}
                        onChange={(e) => setSettings(prev => ({ ...prev, ragThreshold: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <p className="text-[9.5px] text-zinc-500 leading-tight">Strictness of answer retrieval. Higher values force escalations instead of guessing.</p>
                    </div>

                    {/* Toggle Switch: Sentiment boost */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-200 block">Sentiment Priority Boost</span>
                        <span className="text-[9.5px] text-zinc-500 block leading-tight">Elevate frustrated messages to High Priority.</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.sentimentBoost}
                        onChange={(e) => setSettings(prev => ({ ...prev, sentimentBoost: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Toggle Switch: Abusive Filter */}
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-200 block">Abusive Language Filter</span>
                        <span className="text-[9.5px] text-zinc-500 block leading-tight">Proactively block and flag toxic/profane entries.</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.profanityFilter}
                        onChange={(e) => setSettings(prev => ({ ...prev, profanityFilter: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Toggle Switch: Semantic Search */}
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-200 block">Semantic Embedding RAG</span>
                        <span className="text-[9.5px] text-zinc-500 block leading-tight">Use vector embeddings for deeper semantic retrieval.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono ${semanticReady ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {semanticReady ? '✓ Model Ready' : 'Offline'}
                        </span>
                        <input 
                          type="checkbox"
                          checked={useSemanticSearch && semanticReady}
                          disabled={!semanticReady}
                          onChange={(e) => setUseSemanticSearch(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Audit Logs Widget */}
                  <div className="card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-rose-500" />
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-200">System Audit & Safety Logs</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>

                    <div ref={auditScrollRef} className="bg-zinc-950 text-zinc-400 rounded-lg p-2.5 text-[9px] leading-relaxed h-44 overflow-y-auto space-y-1.5">
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
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <BarChart2 size={16} className="text-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-zinc-200">Real-Time Metrics Overview</span>
                    </div>

                    {/* EChart 1: Ticket Load by Dept */}
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Escalations by Department</h4>
                      <div className="h-44">
                        <ReactECharts option={getDeptChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                    {/* EChart 2: Sentiment Pie */}
                    <div className="border-t border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Student Sentiment Distribution</h4>
                      <div className="h-44">
                        <ReactECharts option={getSentimentChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                    {/* EChart 3: System Performance */}
                    <div className="border-t border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Agent Performance Metrics</h4>
                      <div className="h-44">
                        <ReactECharts option={getSummaryChartOption()} style={{ height: '100%', width: '100%' }} />
                      </div>
                    </div>

                  </div>

                </div>

            </div>

          </div>
  );
}
