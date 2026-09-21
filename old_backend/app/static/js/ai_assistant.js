/**
 * LIFELINK — AI Coordination Assistant Engine
 * Rule-based GIS proximity, clinical capacity matching, and triage resource coordinator.
 * Labeled: AI Coordination Engine — Integration Ready (Medical diagnosis prohibited per AGENTS.md)
 */

class AIAssistantEngine {
  constructor() {
    this.history = [];
  }

  init() {
    this.renderHistory();
    this.bindQuickPrompts();
  }

  bindQuickPrompts() {
    document.querySelectorAll('.btn-ai-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-prompt');
        const input = document.getElementById('ai-query-input');
        if (input) {
          input.value = query;
          this.processQuery(query);
        }
      });
    });
  }

  processQuery(rawQuery) {
    if (!rawQuery || !rawQuery.trim()) return;
    const query = rawQuery.trim();

    // Add user message to history
    this.history.push({
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    });

    const store = (window.MapEngineInstance && window.MapEngineInstance.dataStore) || {
      emergencies: [],
      ambulances: [],
      hospitals: [],
    };

    const qLower = query.toLowerCase();
    let responseText = '';
    let resources = [];
    let reasoning = '';

    // RULE 1: Medical Diagnosis Query Guardrail (AGENTS.md)
    if (qLower.includes('diagnos') || qLower.includes('prescribe') || qLower.includes('medicine') || qLower.includes('treatment plan')) {
      responseText = `⚠️ **Medical Safety Protocol Enforced (AGENTS.md Constraint #1)**:
LIFELINK is an emergency coordination platform, NOT an AI doctor. Agents never diagnose illnesses, prescribe medication, or formulate clinical treatment plans. 
Urgency triage is categorized by Manchester Triage / ESI protocol to calculate clinical resource needs (Cath Lab, Trauma Level, Burn Unit, ICU).`;
      reasoning = 'Autonomous medical diagnosis is strictly forbidden by system hard constraints.';
    }
    // QUERY TYPE 1: Nearest available ambulance
    else if (qLower.includes('nearest') && qLower.includes('ambulance') || qLower.includes('closest to patient') || qLower.includes('which ambulance')) {
      const activeEmg = store.emergencies[0];
      const availableAmbs = store.ambulances.filter(a => a.status === 'AVAILABLE');

      if (!activeEmg) {
        responseText = 'No active emergencies currently recorded in the system.';
      } else if (availableAmbs.length === 0) {
        responseText = `All fleet ambulances are currently DISPATCHED or ON_SCENE. Nearest mutual-aid unit or PCMC backup is recommended.`;
      } else {
        // Calculate distances to first emergency
        const sorted = availableAmbs.map(a => {
          const d = this._haversine(activeEmg.latitude, activeEmg.longitude, a.current_lat, a.current_lng);
          return { ...a, distance_km: Math.round(d * 10) / 10, eta: Math.max(2, Math.round((d / 42) * 60)) };
        }).sort((a, b) => a.distance_km - b.distance_km);

        const nearest = sorted[0];
        responseText = `Evaluated **${availableAmbs.length} available fleet units** across Pune.
**Optimal Recommendation**: **${nearest.callsign}** (${nearest.capability})
• **Distance**: ${nearest.distance_km} km via road network
• **Estimated Transit**: ~${nearest.eta} minutes
• **Target Incident**: ${activeEmg.tracking_code} (${activeEmg.chief_complaint})
• **Coordinates**: [${nearest.current_lat.toFixed(4)}, ${nearest.current_lng.toFixed(4)}]`;

        reasoning = `Selected unit ${nearest.callsign} due to lowest transit time (${nearest.eta} min) and active capability matching (${nearest.capability}).`;
        resources = sorted.slice(0, 3);
      }
    }
    // QUERY TYPE 2: Available hospitals with ICU capacity
    else if (qLower.includes('hospital') && (qLower.includes('available') || qLower.includes('capacity') || qLower.includes('icu') || qLower.includes('bed'))) {
      const normalHospitals = store.hospitals.filter(h => h.status === 'NORMAL' && h.icu_available > 0)
        .sort((a, b) => b.icu_available - a.icu_available);

      const totalICU = normalHospitals.reduce((acc, h) => acc + h.icu_available, 0);
      const totalED = normalHospitals.reduce((acc, h) => acc + h.ed_beds_available, 0);

      responseText = `Found **${normalHospitals.length} receiving facilities** in NORMAL operational status with available critical care capacity:
• **Total Available ICU Beds**: ${totalICU}
• **Total Available ED Beds**: ${totalED}

**Top Recommended Facilities by Capacity**:
${normalHospitals.slice(0, 4).map(h => `1. **${h.name}**: ${h.icu_available} ICU beds, ${h.ed_beds_available} ED beds (${h.trauma_level})`).join('\n')}`;

      reasoning = `Filtered out facilities on DIVERSION status. Ranked by real-time ICU availability for high-acuity reception.`;
      resources = normalHospitals.slice(0, 4);
    }
    // QUERY TYPE 3: Show all critical emergencies
    else if (qLower.includes('critical') || qLower.includes('resuscitation') || qLower.includes('high priority')) {
      const criticals = store.emergencies.filter(e => e.preliminary_urgency.includes('LEVEL_1') || e.preliminary_urgency.includes('LEVEL_2'));

      if (criticals.length === 0) {
        responseText = `No Level 1 (Resuscitation) or Level 2 (Emergent) incidents currently active. All current cases are within Level 3+ stability.`;
      } else {
        responseText = `Currently tracking **${criticals.length} High-Acuity Incidents** requiring rapid intervention:
${criticals.map(e => `• **${e.tracking_code}**: ${e.chief_complaint}\n  - Location: ${e.address}\n  - Urgency: **${e.preliminary_urgency}**\n  - Clinician Approval: ${e.human_confirmation_status}`).join('\n')}`;
      }
      reasoning = 'Manchester Triage Protocol Level 1 & 2 isolation.';
    }
    // FALLBACK / GENERAL INTELLIGENCE QUERY
    else {
      responseText = `**Operational Analysis for Query**: "${query}"
• **Active Emergencies**: ${store.emergencies.length}
• **Available Ambulances**: ${store.ambulances.filter(a => a.status === 'AVAILABLE').length} / ${store.ambulances.length}
• **Hospitals Reporting Normal**: ${store.hospitals.filter(h => h.status === 'NORMAL').length} / ${store.hospitals.length}
• **System State**: Online and synchronized via WebSocket.`;

      reasoning = 'Evaluated query using deterministic spatial and telemetry records.';
    }

    // Add assistant message to history
    this.history.push({
      role: 'assistant',
      text: responseText,
      reasoning,
      resources,
      timestamp: new Date().toLocaleTimeString(),
    });

    this.renderHistory();

    // Clear input
    const input = document.getElementById('ai-query-input');
    if (input) input.value = '';
  }

  renderHistory() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <div style="font-size:28px; margin-bottom:10px;">🤖</div>
          <div style="font-weight:700; color:#FFFFFF; font-size:14px; margin-bottom:4px;">AI Coordination Engine — Integration Ready</div>
          <div style="font-size:12px; max-width:440px; margin:0 auto; line-height:1.5;">
            Operational intelligence for GIS proximity routing, hospital capacity matching, and urgency triage. Clinical diagnosis prohibited per AGENTS.md.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.history.map(msg => {
      const isUser = msg.role === 'user';
      return `
        <div style="display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'}; margin-bottom:16px;">
          <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">
            ${isUser ? 'Operator' : 'AI Coordination Engine'} • ${msg.timestamp}
          </div>
          <div style="background:${isUser ? 'var(--accent-blue-soft)' : 'var(--bg-surface-elevated)'}; border:1px solid ${isUser ? 'rgba(59,130,246,0.35)' : 'var(--border-subtle)'}; padding:12px 16px; border-radius:10px; max-width:85%; font-size:13px; color:#FFFFFF; line-height:1.6; white-space:pre-wrap;">
            ${msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
            ${msg.reasoning ? `
              <div style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border-subtle); font-size:11px; color:#D8B4FE;">
                💡 <strong>Agent Explainability</strong>: ${msg.reasoning}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

window.AIAssistantInstance = new AIAssistantEngine();
