import React from 'react';
import { Search, Sparkles, Trash2 } from 'lucide-react';
import { fetchDocuments, promoteRagCandidate, rejectRagCandidate } from '../api';

/** AdminKbPage — presentational page; state/actions via `app` bag from App. */
export default function AdminKbPage({ app }) {
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
<div className="kb-page">
            <div className="ops-hero kb-hero">
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight m-0" style={{ color: 'var(--ink)' }}>RAG desk</h2>
                <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--muted)' }}>
                  Approved policy chunks the agent may cite. Promote only what you trust.
                </p>
              </div>
              <div className="kb-hero-meta">
                <span className="ops-kpi" style={{ padding: '0.45rem 0.7rem' }}>
                  <span className="n" style={{ fontSize: '1rem' }}>{knowledgeBase.length}</span>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)', display: 'block' }}>indexed</span>
                </span>
                <span className="ops-kpi" style={{ padding: '0.45rem 0.7rem' }}>
                  <span className="n" style={{ fontSize: '1rem', color: ragCandidates.length ? 'var(--action)' : 'var(--accent-ops)' }}>{ragCandidates.length}</span>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)', display: 'block' }}>pending</span>
                </span>
              </div>
            </div>

            {ragCandidates.length > 0 && (
              <section className="card kb-pending">
                <div className="card-header flex justify-between items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Promote to index</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, var(--action) 18%, transparent)', color: 'var(--action)' }}>
                    {ragCandidates.length} waiting
                  </span>
                </div>
                <div className="kb-pending-list">
                  {ragCandidates.slice(0, 6).map((c) => (
                    <div key={c.id} className="kb-pending-row">
                      <div className="min-w-0">
                        <p className="font-semibold text-[12px] truncate m-0" style={{ color: 'var(--ink)' }}>{c.query}</p>
                        <p className="text-[11px] line-clamp-2 mt-0.5 m-0" style={{ color: 'var(--muted)' }}>{c.answer}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={ragBusyId === c.id}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold min-h-9"
                          style={{ background: 'var(--accent-ops)', color: 'oklch(0.18 0.03 200)' }}
                          onClick={async () => {
                            setRagBusyId(c.id);
                            try {
                              await promoteRagCandidate(c.id);
                              setRagCandidates((prev) => prev.filter((x) => x.id !== c.id));
                              addToast('Promoted into RAG index', 'success');
                              const docs = await fetchDocuments();
                              if (docs?.documents) {
                                setKnowledgeBase(docs.documents.map((d) => ({
                                  id: d.id,
                                  title: d.title,
                                  category: d.category,
                                  source: d.source,
                                  tags: String(d.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
                                  content: d.content || '',
                                  lastUpdated: d.last_updated || '',
                                })));
                              }
                            } catch (err) {
                              addToast(err.message || 'Promote failed', 'error');
                            } finally {
                              setRagBusyId(null);
                            }
                          }}
                        >
                          Promote
                        </button>
                        <button
                          type="button"
                          disabled={ragBusyId === c.id}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border min-h-9"
                          style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                          onClick={async () => {
                            setRagBusyId(c.id);
                            try {
                              await rejectRagCandidate(c.id);
                              setRagCandidates((prev) => prev.filter((x) => x.id !== c.id));
                            } catch (err) {
                              addToast(err.message || 'Reject failed', 'error');
                            } finally {
                              setRagBusyId(null);
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="kb-split">
              <section className="card kb-index">
                <div className="card-header">
                  <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Add policy</span>
                </div>
                <form onSubmit={handleAddDocument} className="kb-form">
                  <label className="kb-field">
                    <span>Category</span>
                    <select
                      value={newDoc.category}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, category: e.target.value }))}
                      className="input-friendly"
                    >
                      <option value="IT Support">IT Support</option>
                      <option value="Hostel">Hostel Rules</option>
                      <option value="Academics">Academic Policy</option>
                      <option value="Finance">Finance & Fees</option>
                      <option value="Admissions">Admissions</option>
                    </select>
                  </label>

                  <label className="kb-field">
                    <span>Title</span>
                    <input
                      type="text"
                      required
                      value={newDoc.title}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Hostel Wi‑Fi port policy"
                      className="input-friendly"
                    />
                  </label>

                  <label className="kb-field">
                    <span>Grounded text</span>
                    <textarea
                      required
                      rows={5}
                      value={newDoc.content}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Exact policy wording the agent may quote…"
                      className="input-friendly resize-none"
                    />
                  </label>

                  <label className="kb-field">
                    <span>Source citation</span>
                    <input
                      type="text"
                      value={newDoc.source}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="e.g. IT Firewall Policy §2.1"
                      className="input-friendly"
                    />
                  </label>

                  <label className="kb-field">
                    <span>Tags</span>
                    <input
                      type="text"
                      value={newDoc.tags}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="wifi, ports, hostel"
                      className="input-friendly"
                    />
                  </label>

                  <div className="kb-upload">
                    <span className="kb-field-label">Or PDF upload</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={pdfUploading}
                      onChange={handlePdfUpload}
                      className="block w-full text-[11px]"
                      style={{ color: 'var(--muted)' }}
                    />
                    {pdfUploading && <p className="text-[11px] m-0" style={{ color: 'var(--accent-ops)' }}>Uploading & indexing…</p>}
                  </div>

                  <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5">
                    <Sparkles size={14} />
                    Index chunk
                  </button>
                </form>
              </section>

              <section className="card kb-browse">
                <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Indexed chunks</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, var(--ink) 8%, transparent)', color: 'var(--muted)' }}>
                      {knowledgeBase.length}
                    </span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter or test retrieval…"
                      value={ragSandboxQuery || ragSearchQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRagSearchQuery(v);
                        setRagSandboxQuery(v);
                      }}
                      className="input-friendly pl-8"
                    />
                  </div>
                </div>

                {(ragSandboxQuery || ragSearchQuery) && ragSandboxResults.length > 0 && (
                  <div className="kb-score-strip">
                    {ragSandboxResults.slice(0, 3).map((r) => (
                      <div key={r.doc.id} className="kb-score-pill">
                        <span className="truncate">{r.doc.title}</span>
                        <strong className={r.score >= settings.ragThreshold ? 'ok' : ''}>{r.score.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="kb-doc-list">
                  {knowledgeBase.filter(doc => {
                    const query = (ragSearchQuery || ragSandboxQuery || '').toLowerCase().trim();
                    if (!query) return true;
                    const tokens = query.split(/\s+/).filter(Boolean);
                    const hay = `${doc.title} ${doc.content} ${doc.category} ${(doc.tags || []).join(' ')}`.toLowerCase();
                    return tokens.every((tok) => hay.includes(tok));
                  }).map((doc) => (
                    <article key={doc.id} className="kb-doc">
                      <div className="kb-doc-top">
                        <span className="kb-doc-cat">{doc.category}</span>
                        <span className="kb-doc-date">{doc.lastUpdated}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="kb-doc-del"
                          title="Delete chunk"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h3 className="kb-doc-title">{doc.title}</h3>
                      <p className="kb-doc-body">{doc.content}</p>
                      <div className="kb-doc-foot">
                        <div className="kb-doc-tags">
                          {doc.tags.map((tag, i) => (
                            <button
                              key={i}
                              type="button"
                              className="kb-tag"
                              onClick={() => { setRagSearchQuery(tag); setRagSandboxQuery(tag); }}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                        <span className="kb-doc-source">{doc.source}</span>
                      </div>
                    </article>
                  ))}
                  {knowledgeBase.length === 0 && (
                    <p className="text-[13px] py-8 text-center m-0" style={{ color: 'var(--muted)' }}>
                      No chunks yet — add a policy on the left.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
  );
}
