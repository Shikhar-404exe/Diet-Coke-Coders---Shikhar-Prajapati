const TIME_WINDOW_MS = 15 * 60 * 1000;
const INCIDENT_THRESHOLD = 5;

class ProactiveDetector {
  constructor() {
    this.ticketWindow = [];
    this.incidents = [];
    this.activeAlerts = [];
  }

  ingestTicket(ticket) {
    const now = Date.now();
    this.ticketWindow.push({ ...ticket, timestamp: now });
    this.ticketWindow = this.ticketWindow.filter(t => now - t.timestamp < TIME_WINDOW_MS);

    const clusters = {};
    this.ticketWindow.forEach(t => {
      const key = `${t.department}|${t.intent}`;
      if (!clusters[key]) clusters[key] = { department: t.department, intent: t.intent, tickets: [], firstSeen: t.timestamp, blocks: new Set() };
      clusters[key].tickets.push(t);
      if (t.slots?.blockName) clusters[key].blocks.add(t.slots.blockName);
    });

    this.activeAlerts = [];
    for (const [, cluster] of Object.entries(clusters)) {
      if (cluster.tickets.length >= INCIDENT_THRESHOLD) {
        const blockInfo = cluster.blocks.size > 0 ? ` in [${Array.from(cluster.blocks).join(', ')}]` : '';
        this.activeAlerts.push({
          id: `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          department: cluster.department,
          intent: cluster.intent,
          ticketCount: cluster.tickets.length,
          firstSeen: cluster.firstSeen,
          blocks: Array.from(cluster.blocks),
          message: `Possible ${cluster.intent} outage detected${blockInfo} — ${cluster.tickets.length} tickets in ${Math.round((now - cluster.firstSeen) / 60000)} min`,
          severity: cluster.tickets.length >= 10 ? 'critical' : 'warning',
          detectedAt: now
        });
      }
    }
    return this.activeAlerts;
  }

  getAlerts() {
    const now = Date.now();
    return this.activeAlerts.filter(a => now - a.detectedAt < 3600000);
  }

  resolveAlert(alertId) {
    this.activeAlerts = this.activeAlerts.filter(a => a.id !== alertId);
  }

  getStats() {
    return { windowSize: this.ticketWindow.length, activeAlerts: this.activeAlerts.length };
  }
}

export const proactiveDetector = new ProactiveDetector();
