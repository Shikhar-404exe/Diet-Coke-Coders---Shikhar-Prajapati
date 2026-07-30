import React from 'react';
import {
  AlertTriangle, ArrowRight, Plus, Inbox, Info, History, Camera, X
} from 'lucide-react';
import TicketQr from '../TicketQr';
import { OwnerContactCard } from '../components/ui/TicketBits';
import { etaForPriority } from '../deptDirectory';

/** StudentDashboard — presentational page; state/actions via `app` bag from App. */
export default function StudentDashboard({ app }) {
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

            <div className={`card p-4 space-y-3 ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'var(--primary)', color: 'var(--primary-on)' }}>
                    {(studentProfile?.name || 'S').split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
                      {studentProfile?.name || 'My requests'}
                    </div>
                    <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                      {studentProfile
                        ? `${studentProfile.regNo} · ${studentProfile.program} · ${studentProfile.hostel} Room ${studentProfile.room}`
                        : 'Track escalations, photos, and staff updates'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startCampusAsk(
                    studentProfile
                      ? `I need help with a campus issue for ${studentProfile.regNo} in ${studentProfile.hostel} room ${studentProfile.room}.`
                      : 'I need help with a campus issue.'
                  )}
                  className="btn-primary px-3 py-2.5 text-[12px] rounded-md flex items-center gap-1.5 self-stretch sm:self-start justify-center"
                >
                  <Plus size={14} /> New request
                </button>
              </div>
              <div className="stat-tiles">
                <div className="stat-tile">
                  <div className="n">{myOpenTickets.length}</div>
                  <div className="l">Open</div>
                </div>
                <div className="stat-tile">
                  <div className="n">{myResolvedTickets.length}</div>
                  <div className="l">Resolved</div>
                </div>
                <div className="stat-tile">
                  <div className="n">{notifications.filter((n) => !n.read).length || outages.length}</div>
                  <div className="l">Alerts</div>
                </div>
              </div>
            </div>

            <div className={`card p-4 space-y-2.5 ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Start without typing</div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Tap a problem — Ask help opens and your query is sent automatically.
                </p>
              </div>
              <div className="topic-grid">
                <button
                  type="button"
                  className="topic-card"
                  onClick={() => startCampusAsk(
                    studentProfile
                      ? `I forgot my portal password. My ID is ${studentProfile.regNo} and email is ${studentProfile.email}.`
                      : 'I lost my student portal password, can you help me?'
                  )}
                >
                  <span className="topic-card-title">Portal password</span>
                  <span className="topic-card-sub">Auto-sends · IT path</span>
                </button>
                <button
                  type="button"
                  className="topic-card"
                  onClick={() => startCampusAsk(
                    studentProfile
                      ? `My hostel room light is broken in ${studentProfile.hostel} room ${studentProfile.room}.`
                      : 'My hostel room light is broken'
                  )}
                >
                  <span className="topic-card-title">Hostel fix</span>
                  <span className="topic-card-sub">Auto-sends · facilities</span>
                </button>
                <button
                  type="button"
                  className="topic-card"
                  onClick={() => startCampusAsk('How do I connect to campus secure WiFi?')}
                >
                  <span className="topic-card-title">Campus Wi‑Fi</span>
                  <span className="topic-card-sub">Auto-sends · cited answer</span>
                </button>
                <button
                  type="button"
                  className="topic-card"
                  onClick={() => startCampusAsk(
                    studentProfile
                      ? `Can I get a merit scholarship? My CGPA is ${studentProfile.cgpa} and family income is 3.2 Lakhs.`
                      : 'Can I get a scholarship? My CGPA is 8.5 and family income is 3 Lakhs.'
                  )}
                >
                  <span className="topic-card-title">Scholarship</span>
                  <span className="topic-card-sub">Auto-sends · eligibility</span>
                </button>
              </div>
            </div>

            {(outages.length > 0 || notifications.length > 0) && (
              <div className={`space-y-2 ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
                {outages.map((o) => (
                  <div key={o.id} className="flex items-start gap-3 p-3 rounded-xl border text-xs"
                    style={{ borderColor: 'color-mix(in oklch, var(--warn) 35%, var(--line))', background: 'color-mix(in oklch, var(--warn) 8%, var(--surface))' }}>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color: 'var(--ink)' }}>{o.title}</span>
                      <p className="mt-0.5" style={{ color: 'var(--muted)' }}>{o.body}</p>
                    </div>
                  </div>
                ))}
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border text-xs"
                    style={{ borderColor: 'var(--line)', background: 'color-mix(in oklch, var(--ok) 6%, var(--surface))' }}>
                    <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--ok)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color: 'var(--ink)' }}>{n.title}</span>
                      <p className="mt-0.5" style={{ color: 'var(--muted)' }}>{n.body || n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {proactiveAlerts.length > 0 && (
              <div className={`space-y-2 ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
                {proactiveAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl border text-xs"
                    style={{ borderColor: 'color-mix(in oklch, var(--warn) 35%, var(--line))', background: 'color-mix(in oklch, var(--warn) 8%, var(--surface))' }}>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color: 'var(--ink)' }}>{alert.intent}</span>
                      <p className="mt-0.5" style={{ color: 'var(--muted)' }}>{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`dash-split ${selectedTicket ? 'has-detail' : ''}`}>
              <section className={`dash-pane card ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
                <div className="card-header flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--ink)' }}>Open requests</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: 'color-mix(in oklch, var(--ink) 6%, var(--surface))', color: 'var(--muted)' }}>
                      {myOpenTickets.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCampusAsk(
                      studentProfile
                        ? `I need to file a new campus request for ${studentProfile.regNo}.`
                        : 'I need to file a new campus request.'
                    )}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1 min-h-9"
                    style={{ background: 'var(--action)', color: 'oklch(0.22 0.04 55)' }}
                  >
                    <Plus size={12} /> New
                  </button>
                </div>
                <div className="dash-pane-body">
                  {myOpenTickets.length > 0 ? (
                    <div className="space-y-2">
                      {myOpenTickets.map((t) => (
                        <div
                          key={t.id}
                          className="w-full text-left p-3 rounded-xl border transition-colors"
                          style={{
                            borderColor: selectedTicket?.id === t.id ? 'var(--primary)' : 'var(--line)',
                            background: selectedTicket?.id === t.id
                              ? 'color-mix(in oklch, var(--primary) 8%, var(--surface))'
                              : 'var(--surface)',
                          }}
                        >
                          <button type="button" className="w-full text-left" onClick={() => setSelectedTicket(t)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--primary)' }}>{t.id}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    t.priority === 'High' ? 'badge-error' : t.priority === 'Medium' ? 'badge-warning' : 'badge-success'
                                  }`}>{t.priority}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                    style={{ background: 'color-mix(in oklch, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
                                    {t.workflow === 'in_progress' || t.claimedBy ? 'In progress' : 'Open'}
                                  </span>
                                </div>
                                <p className="text-[13px] font-semibold mt-1 truncate" style={{ color: 'var(--ink)' }}>{t.intent}</p>
                                <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>{t.studentQuery}</p>
                                {t.studentReply && (
                                  <p className="text-[11px] mt-1.5 line-clamp-2 rounded-md px-2 py-1"
                                    style={{ background: 'color-mix(in oklch, var(--ok) 10%, var(--surface))', color: 'var(--ink)' }}>
                                    Staff: {t.studentReply}
                                  </p>
                                )}
                                <p className="text-[10px] mt-1.5" style={{ color: 'var(--muted)' }}>
                                  {t.department}
                                  {(t.attachments || []).length > 0 ? ` · ${(t.attachments || []).length} photo(s)` : ''}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">{renderSlaTimer(t)}</div>
                            </div>
                          </button>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(t)}
                              className="text-[11px] font-semibold px-3 py-2 rounded-md border min-h-10"
                              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                            >
                              Open status
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAskAboutTicket(t)}
                              className="text-[11px] font-semibold px-3 py-2 rounded-md flex items-center gap-1 min-h-10"
                              style={{ background: 'var(--primary)', color: 'var(--primary-on)' }}
                            >
                              Continue in Help <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Inbox size={32} style={{ color: 'var(--muted)', opacity: 0.5 }} className="mb-3" />
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>No open requests yet</p>
                      <p className="text-[12px] mt-1 max-w-[36ch]" style={{ color: 'var(--muted)' }}>
                        Tap a problem above, or New request — Ask help will auto-send so you do not have to type.
                      </p>
                      <button
                        type="button"
                        onClick={() => startCampusAsk(
                          studentProfile
                            ? `My hostel fan is not working in ${studentProfile.hostel} room ${studentProfile.room}.`
                            : 'My hostel fan is not working'
                        )}
                        className="btn-primary mt-4 px-3 py-2.5 text-[12px] rounded-md flex items-center gap-1.5"
                      >
                        <Plus size={12} /> Open a hostel request
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {selectedTicket ? (
                <section className="dash-pane card dash-detail">
                  <div className="card-header flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="lg:hidden p-2 -ml-1 rounded-lg min-h-10 min-w-10"
                        style={{ color: 'var(--ink)' }}
                        aria-label="Back to requests"
                      >
                        <ArrowRight size={16} className="rotate-180" />
                      </button>
                      <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--ink)' }}>Request status</span>
                    </div>
                    <button type="button" onClick={() => setSelectedTicket(null)} className="hidden lg:inline-flex p-2 rounded-lg" style={{ color: 'var(--muted)' }} aria-label="Close">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="dash-pane-body space-y-4 text-xs">
                    <div className="status-rail">
                      <div className="status-step done">
                        <div className="label">Filed</div>
                        <div className="value">{selectedTicket.timestamp || 'Submitted'}</div>
                      </div>
                      <div className={`status-step ${selectedTicket.workflow === 'in_progress' || selectedTicket.claimedBy || selectedTicket.status === 'resolved' ? 'done' : 'active'}`}>
                        <div className="label">Ops desk</div>
                        <div className="value">
                          {selectedTicket.status === 'resolved'
                            ? 'Done'
                            : (selectedTicket.claimedName || selectedTicket.claimedBy)
                              ? 'Claimed'
                              : 'Waiting'}
                        </div>
                      </div>
                      <div className={`status-step ${selectedTicket.status === 'resolved' ? 'done' : ''}`}>
                        <div className="label">Close</div>
                        <div className="value">{selectedTicket.status === 'resolved' ? 'Resolved' : 'Open'}</div>
                      </div>
                    </div>

                    <TicketQr ticketId={selectedTicket.id} size={160} />

                    <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--line)', background: 'color-mix(in oklch, var(--ink) 3%, var(--surface))' }}>
                      <div className="flex justify-between gap-2"><span style={{ color: 'var(--muted)' }}>Ticket</span><strong className="font-mono" style={{ color: 'var(--primary)' }}>{selectedTicket.id}</strong></div>
                      <div className="flex justify-between gap-2"><span style={{ color: 'var(--muted)' }}>Intent</span><span className="font-semibold text-right" style={{ color: 'var(--ink)' }}>{selectedTicket.intent || '—'}</span></div>
                      <div className="flex justify-between gap-2"><span style={{ color: 'var(--muted)' }}>Priority</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          selectedTicket.priority === 'High' ? 'badge-error' : selectedTicket.priority === 'Medium' ? 'badge-warning' : 'badge-success'
                        }`}>{selectedTicket.priority}</span>
                      </div>
                      <div className="flex justify-between gap-2"><span style={{ color: 'var(--muted)' }}>Assigned to</span><span className="font-semibold text-right" style={{ color: 'var(--ink)' }}>{selectedTicket.department}</span></div>
                      {selectedTicket.claimedName && (
                        <div className="flex justify-between gap-2"><span style={{ color: 'var(--muted)' }}>Claimed by</span><span style={{ color: 'var(--ink)' }}>{selectedTicket.claimedName}</span></div>
                      )}
                      <div className="flex justify-between items-center gap-2"><span style={{ color: 'var(--muted)' }}>SLA</span>{renderSlaTimer(selectedTicket)}</div>
                      <div className="flex justify-between gap-2">
                        <span style={{ color: 'var(--muted)' }}>ETA</span>
                        <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                          {selectedTicket.etaLabel || etaForPriority(selectedTicket.priority)}
                        </span>
                      </div>
                    </div>

                    <OwnerContactCard ticket={selectedTicket} />

                    <div>
                      <div className="text-[10px] font-bold mb-2" style={{ color: 'var(--muted)' }}>Progress timeline</div>
                      <ul className="timeline">
                        <li className="done">
                          <div className="t-title">Request filed</div>
                          <div className="t-sub">{selectedTicket.timestamp} · routed to {selectedTicket.department}</div>
                        </li>
                        <li className={selectedTicket.claimedBy || selectedTicket.claimedName || selectedTicket.status === 'resolved' ? 'done' : 'pending'}>
                          <div className="t-title">
                            {selectedTicket.claimedName || selectedTicket.claimedBy ? 'Claimed by staff' : 'Waiting for claim'}
                          </div>
                          <div className="t-sub">
                            {selectedTicket.claimedName
                              ? `${selectedTicket.claimedName} is working this`
                              : 'Ops will claim when free — SLA clock is running'}
                          </div>
                        </li>
                        <li className={selectedTicket.studentReply ? 'done' : 'pending'}>
                          <div className="t-title">{selectedTicket.studentReply ? 'Staff messaged you' : 'Staff update pending'}</div>
                          <div className="t-sub">
                            {selectedTicket.studentReply || 'You will see a green update here when Ops replies'}
                          </div>
                        </li>
                        <li className={selectedTicket.status === 'resolved' ? 'done' : 'pending'}>
                          <div className="t-title">{selectedTicket.status === 'resolved' ? 'Resolved' : 'Resolution'}</div>
                          <div className="t-sub">
                            {selectedTicket.status === 'resolved'
                              ? 'Closed — check Recently resolved for SLA'
                              : 'Attach a photo if facilities/IT need visual proof'}
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold mb-1" style={{ color: 'var(--muted)' }}>Your query</div>
                      <p className="rounded-xl border p-3 leading-relaxed" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                        "{selectedTicket.studentQuery}"
                      </p>
                    </div>

                    {selectedTicket.studentReply ? (
                      <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: 'color-mix(in oklch, var(--ok) 35%, var(--line))', background: 'color-mix(in oklch, var(--ok) 8%, var(--surface))' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ok)' }}>Staff update</div>
                        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>{selectedTicket.studentReply}</p>
                      </div>
                    ) : null}

                    <div>
                      <div className="text-[10px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                        <Camera size={12} /> Evidence photos
                      </div>
                      <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
                        Clear photo of the issue helps facilities / IT close faster.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(selectedTicket.attachments || []).map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
                            <img src={a.url} alt={a.originalName || 'attachment'} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                      {selectedTicket.status !== 'resolved' && (
                        <label className="inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold rounded-lg cursor-pointer min-h-11"
                          style={{ background: 'var(--primary)', color: 'var(--primary-on)' }}>
                          <Camera size={14} />
                          Attach photo
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (f) handleTicketPhoto(selectedTicket.id, f);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => handleAskAboutTicket(selectedTicket)} className="btn-primary w-full py-3 text-xs rounded-lg flex items-center justify-center gap-1.5">
                        Continue in Help <ArrowRight size={12} />
                        <span className="opacity-80 font-normal">(auto-sends)</span>
                      </button>
                      <button type="button" onClick={() => setActiveTab('playground')} className="w-full py-2.5 text-xs rounded-lg border min-h-11" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                        Open Ask help blank
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="dash-pane dash-aside-col">
                  <div className="card p-4 space-y-3">
                    <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>How this works</div>
                    <ul className="timeline">
                      <li className="done">
                        <div className="t-title">See open / resolved here first</div>
                        <div className="t-sub">Dashboard loads light — Ask help is second</div>
                      </li>
                      <li className="pending">
                        <div className="t-title">Tap a problem or New request</div>
                        <div className="t-sub">Query auto-sends — no typing needed</div>
                      </li>
                      <li className="pending">
                        <div className="t-title">Open an existing ticket</div>
                        <div className="t-sub">Status + photo + QR, or Continue in Help</div>
                      </li>
                    </ul>
                  </div>
                  <div className="card p-4 space-y-3">
                    <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Room on file</div>
                    <div className="text-[12px] space-y-1.5" style={{ color: 'var(--muted)' }}>
                      <div className="flex justify-between"><span>Hostel</span><strong style={{ color: 'var(--ink)' }}>{studentProfile?.hostel || '—'}</strong></div>
                      <div className="flex justify-between"><span>Room</span><strong style={{ color: 'var(--ink)' }}>{studentProfile?.room || '—'}</strong></div>
                      <div className="flex justify-between"><span>Program</span><strong style={{ color: 'var(--ink)' }}>{studentProfile?.program || '—'}</strong></div>
                      <div className="flex justify-between"><span>CGPA</span><strong style={{ color: 'var(--ink)' }}>{studentProfile?.cgpa ?? '—'}</strong></div>
                    </div>
                    <button
                      type="button"
                      className="suggestion-chip w-full justify-start text-left"
                      onClick={() => startCampusAsk(
                        studentProfile
                          ? `Ask about my room ${studentProfile.hostel} ${studentProfile.room} — fan not working`
                          : 'Ask about my room — fan not working'
                      )}
                    >
                      Report room issue (auto-send)
                    </button>
                  </div>
                </section>
              )}
            </div>

            <section className={`card overflow-hidden ${selectedTicket ? 'dash-hide-mobile-detail' : ''}`}>
              <div className="card-header flex justify-between items-center">
                <span className="font-bold text-sm tracking-tight flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                  <History size={15} style={{ color: 'var(--ok)' }} />
                  Recently resolved
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold badge-success">{myResolvedTickets.length}</span>
              </div>
              <div className="p-2 max-h-56 overflow-y-auto">
                {myResolvedTickets.length > 0 ? (
                  <div className="space-y-1.5">
                    {myResolvedTickets.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{t.intent}</p>
                          <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{t.id} · {t.resolutionTimeMinutes} mins</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.slaMet ? 'badge-success' : 'badge-error'}`}>
                          {t.slaMet ? 'On time' : 'Late'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-[12px]" style={{ color: 'var(--muted)' }}>
                    Resolved campus requests will show here.
                  </div>
                )}
              </div>
            </section>
          </div>
  );
}
