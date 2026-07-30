const ENTITY_PATTERNS = {
  location: /\b(Block\s*[A-F0-9]|Room\s*\d{2,4}|Hostel\s*\w+|Library|Academic\s*Block|Main\s*Gate|Ground\s*Floor)\b/gi,
  person: /\b(Warden|IT\s*Helpdesk|Registrar|Faculty\s*Advisor|Chief\s*Finance\s*Officer|Medical\s*Officer|Scholarship\s*Committee)\b/gi,
  service: /\b(Wi-Fi|Password\s*Reset|Printer|Printing|Maintenance|Scholarship|Curfew|Gate\s*Pass|Admission|Fee\s*Refund|Document\s*Verification)\b/gi,
  policy: /\b(CGPA|Attendance|Debarred|SLA|Merit-cum-Means|Tuition\s*Waiver|Late\s*Entry|Biometric|OTP)\b/gi,
  department: /\b(IT\s*Support|Hostel\s*Warden|Finance|Academics|Admissions|Registrar)\b/gi,
  id: /\b(\d{2}[A-Za-z]{3}\d{4})\b/g
};

const RELATIONSHIPS = {
  'Wi-Fi':             { locatedIn: ['Block A', 'Block B', 'Block C', 'Library', 'Academic Block'], handledBy: 'IT Support Services' },
  'Password Reset':    { handledBy: 'IT Support Services', requires: ['Student ID', 'Registered Email'] },
  'Maintenance':       { handledBy: 'Hostel Warden & Facilities', involves: ['Warden', 'Block Supervisor'] },
  'Scholarship':       { handledBy: 'Finance & Accounts', requires: ['CGPA', 'Income Certificate'], involves: ['Scholarship Committee'] },
  'Curfew':            { policyOf: 'Hostel Code of Conduct', handledBy: 'Hostel Warden & Facilities' },
  'Fee Refund':        { handledBy: 'Finance & Accounts', policyOf: 'Student Fee Rules' },
  'Admission':         { handledBy: 'Admissions & Registrar', involves: ['Registrar'] },
  'Document Verification': { handledBy: 'Admissions & Registrar', locatedIn: 'Central Seminar Hall' },
  'IT Support Services': { locatedIn: 'Academic Block' },
  'Hostel Warden & Facilities': { locatedIn: 'Hostel Ground Floor' },
  'Finance & Accounts': { locatedIn: 'Academic Block' },
  'General Academic Support': { locatedIn: 'Academic Block' }
};

class KnowledgeGraph {
  constructor() {
    this.entities = new Map();
    this.edges = [];
  }

  extractEntities(text) {
    const found = new Set();
    for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
      const matches = text.matchAll(pattern);
      for (const m of matches) {
        found.add({ name: m[0].trim(), type });
      }
    }
    return Array.from(found);
  }

  addEntity(name, type, metadata = {}) {
    if (!this.entities.has(name)) {
      this.entities.set(name, { name, type, metadata, connections: new Set() });
    }
  }

  addEdge(from, to, relation) {
    if (!this.edges.find(e => e.from === from && e.to === to && e.relation === relation)) {
      this.edges.push({ from, to, relation });
      if (this.entities.has(from)) this.entities.get(from).connections.add(to);
      if (this.entities.has(to)) this.entities.get(to).connections.add(from);
    }
  }

  buildFromDocuments(docs) {
    docs.forEach(doc => {
      const entities = this.extractEntities(doc.title + ' ' + doc.content + ' ' + doc.tags.join(' '));
      entities.forEach(e => this.addEntity(e.name, e.type, { source: doc.id }));
      entities.forEach((e1, i) => {
        entities.slice(i + 1).forEach(e2 => {
          if (e1.name !== e2.name) this.addEdge(e1.name, e2.name, 'related_to');
        });
      });
      doc.tags?.forEach(tag => {
        this.addEntity(tag, 'tag', { source: doc.id });
        entities.forEach(e => this.addEdge(e.name, tag, 'tagged_with'));
      });
    });

    for (const [entity, relations] of Object.entries(RELATIONSHIPS)) {
      this.addEntity(entity, 'service');
      for (const [rel, targets] of Object.entries(relations)) {
        const arr = Array.isArray(targets) ? targets : [targets];
        arr.forEach(t => { this.addEntity(t, 'entity'); this.addEdge(entity, t, rel); });
      }
    }
  }

  traverse(startEntity, maxDepth = 2) {
    const visited = new Set();
    const results = [];
    const queue = [{ entity: startEntity, depth: 0, path: [startEntity] }];
    visited.add(startEntity.toLowerCase());

    while (queue.length > 0) {
      const { entity, depth, path } = queue.shift();
      if (depth > maxDepth) continue;
      results.push({ entity, depth, path });

      const node = this.entities.get(entity);
      if (!node) continue;

      const relatedEdges = this.edges.filter(e => e.from === entity || e.to === entity);
      for (const edge of relatedEdges) {
        const neighbor = edge.from === entity ? edge.to : edge.from;
        if (!visited.has(neighbor.toLowerCase())) {
          visited.add(neighbor.toLowerCase());
          queue.push({ entity: neighbor, depth: depth + 1, path: [...path, neighbor] });
        }
      }
    }
    return results.sort((a, b) => a.depth - b.depth);
  }

  searchByQuery(query) {
    const entities = this.extractEntities(query);
    const results = new Map();
    entities.forEach(e => {
      const traversal = this.traverse(e.name, 2);
      traversal.forEach(t => {
        if (!results.has(t.entity)) {
          results.set(t.entity, { entity: t.entity, depth: t.depth, path: t.path });
        }
      });
    });
    const edgeResults = [];
    for (const [_, edge] of Object.entries(RELATIONSHIPS)) {
      for (const [rel, targets] of Object.entries(edge)) {
        const arr = Array.isArray(targets) ? targets : [targets];
        arr.forEach(t => {
          if (query.toLowerCase().includes(t.toLowerCase()) || query.toLowerCase().includes(t.split(' ')[0].toLowerCase())) {
            edgeResults.push({ entity: t, relation: rel, target: Object.keys(RELATIONSHIPS).find(k => RELATIONSHIPS[k] === edge) });
          }
        });
      }
    }
    return { entitiesFound: Array.from(results.values()).slice(0, 10), relationships: edgeResults.slice(0, 5) };
  }

  getStats() {
    return { entities: this.entities.size, edges: this.edges.length };
  }
}

export const knowledgeGraph = new KnowledgeGraph();
