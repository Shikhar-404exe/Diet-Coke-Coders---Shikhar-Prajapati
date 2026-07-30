/** Shared field list for page modules — keep App `app` bag and page destructures in sync. */
export const APP_PAGE_FIELDS = [
  'userRole', 'activeTab', 'setActiveTab', 'playgroundSubTab', 'setPlaygroundSubTab',
  'studentProfile', 'session', 'apiOnline', 'darkMode', 'setDarkMode',
  'chatInput', 'setChatInput', 'chatMessages', 'isProcessing', 'slotState',
  'pendingEscalate', 'agentPlan', 'latestTrace', 'agentTraceSteps',
  'chatScrollRef', 'chatEndRef', 'auditScrollRef', 'auditLogsEndRef',
  'handleSendMessage', 'handleConfirmEscalate', 'handleCancelEscalate',
  'handlePresetTrigger', 'handleVoiceToggle', 'handleSpeakResponse',
  'voiceListening', 'voiceSupported', 'outages', 'proactiveAlerts', 'handleDismissAlert',
  'startCampusAsk', 'handleAskAboutTicket', 'handleTicketPhoto',
  'myOpenTickets', 'myResolvedTickets', 'selectedTicket', 'setSelectedTicket',
  'notifications', 'tickets', 'resolvedTickets', 'filteredTickets', 'nlFilteredTickets',
  'nlQuery', 'setNlQuery', 'nlFilter', 'setNlFilter', 'nlInterpretation', 'setNlInterpretation',
  'handleNlFilter', 'ticketSearch', 'setTicketSearch', 'ticketFilter', 'setTicketFilter',
  'deptFilter', 'setDeptFilter', 'refreshTicketsFromApi', 'renderSlaTimer', 'currentTime',
  'groundedCount', 'refusalCount', 'knowledgeGraph', 'knowledgeBase', 'setKnowledgeBase',
  'ragCandidates', 'setRagCandidates', 'ragBusyId', 'setRagBusyId', 'addToast',
  'ragSearchQuery', 'setRagSearchQuery', 'ragSandboxQuery', 'setRagSandboxQuery', 'ragSandboxResults',
  'newDoc', 'setNewDoc', 'handleAddDocument', 'handlePdfUpload', 'handleDeleteDocument', 'pdfUploading',
  'settings', 'setSettings', 'auditLogs', 'webhookSimState', 'webhookLoggedResponse', 'handleTriggerWebhook',
  'opsNote', 'setOpsNote', 'handleClaimTicket', 'handleOpsNote', 'handleResolveTicket', 'handleReopenTicket',
  'testRunnerState', 'testResults', 'overallTestScore', 'handleRunEvaluation',
  'getTradeoffChartOption', 'getDeptChartOption', 'getSentimentChartOption', 'getSummaryChartOption',
  'debateData', 'slaPredictions', 'anomalies', 'similarTickets',
  'staffAssignment', 'emotionResponse', 'graphEntities', 'semanticReady', 'semanticStatus',
  'useSemanticSearch', 'setUseSemanticSearch', 'demoRunning', 'runDemo',
  'trackTicketId', 'setTrackTicketId', 'handleTrackTicket',
  'activeCitationDoc', 'setActiveCitationDoc', 'handleOpenCitation',
  'toasts', 'confettiRef', 'handleLogout', 'navTabs', 'BENCHMARK_TESTS',
];

export function pickApp(app) {
  const out = {};
  for (const key of APP_PAGE_FIELDS) out[key] = app[key];
  return out;
}
