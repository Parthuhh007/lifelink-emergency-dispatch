/**
 * LIFELINK — Central Application Controller
 * Handles 13-section routing, real-time WebSocket bindings, emergency intake,
 * clinician approvals, simulation triggers, audio alerts, and trilingual support.
 */

class Application {
  constructor() {
    this.currentSection = 'command-center';
    this.currentLang = 'en';
    this.audioContext = null;
    this.cachedData = {
      emergencies: [],
      ambulances: [],
      hospitals: [],
      responseTeams: [],
      auditLogs: [],
    };
  }

  async init() {
    console.log('[LIFELINK] Bootstrapping Emergency Operations Command Center...');

    // 1. Setup Navigation & Layout
    this._bindNavigation();
    this._bindSidebarToggle();
    this._bindModals();
    this._bindSimulationTriggers();

    // 2. Initialize WebSocket Client
    WS.connect();
    this._bindWebSocketEvents();

    // 3. Initial Data Fetch
    await this.refreshAllData();

    // 4. Initialize Map Engine
    if (window.MapEngineInstance) {
      window.MapEngineInstance.init('live-map-container');
      window.MapEngineInstance.renderAll(this.cachedData);
    }

    // 5. Initialize AI Assistant
    if (window.AIAssistantInstance) {
      window.AIAssistantInstance.init();
    }

    // 6. Start Periodic Health Poll (every 15s)
    this._startHealthPoll();

    console.log('[LIFELINK] Ready.');
  }

  // 13 SECTION ROUTING
  switchSection(sectionId) {
    this.currentSection = sectionId;

    // Update active nav button in sidebar
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      if (btn.getAttribute('data-section') === sectionId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle view containers
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${sectionId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // On section-specific activations
    if (sectionId === 'live-map' && window.MapEngineInstance) {
      setTimeout(() => {
        window.MapEngineInstance.map.invalidateSize();
        window.MapEngineInstance.renderAll(this.cachedData);
      }, 100);
    } else if (sectionId === 'heatmap' && window.HeatmapEngineInstance) {
      setTimeout(() => {
        window.HeatmapEngineInstance.init('heatmap-container');
        window.HeatmapEngineInstance.refresh();
      }, 100);
    } else if (sectionId === 'dispatch' && window.DispatchConsoleInstance) {
      setTimeout(() => {
        window.DispatchConsoleInstance.renderWorkflow(
          this.cachedData.emergencies,
          this.cachedData.ambulances,
          this.cachedData.hospitals
        );
      }, 100);
    } else if (sectionId === 'analytics' && window.AnalyticsEngineInstance) {
      setTimeout(() => {
        window.AnalyticsEngineInstance.render(
          this.cachedData.emergencies,
          this.cachedData.ambulances,
          this.cachedData.hospitals
        );
      }, 100);
    }

    // Update header title
    this._updateHeaderTitle(sectionId);

    // Close mobile drawer if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
  }

  _updateHeaderTitle(sectionId) {
    const titles = {
      'command-center': { title: 'Emergency Command Center', sub: 'Pune Metropolitan Area (PMC & PCMC) Real-Time Coordination' },
      'live-map': { title: 'Live GIS Operations Map', sub: 'Real-Time Telematics, Fleet Relocation & Routing Polylines' },
      'emergencies': { title: 'Emergency Incident Queue', sub: 'Intake Calls, Urgency Triage & Clinician Approvals' },
      'fleet': { title: 'Ambulance Fleet Management', sub: '108 EMRI Maharashtra & Hospital Mobile Critical Care Units' },
      'hospitals': { title: 'Hospital Network & Trauma Centers', sub: 'Real-Time ICU Bed Telemetry & Diversion Monitoring' },
      'patients': { title: 'Patient Lifecycle Monitoring', sub: 'Chronological Event Audit Trail from Intake to Arrival' },
      'response-teams': { title: 'Specialized Response Teams', sub: 'Disaster Rescue, Rapid Medical Teams & Ambulance Crews' },
      'heatmap': { title: 'Incident Density Heatmap', sub: 'Geographic Emergency Concentration & Regional Trends' },
      'dispatch': { title: 'Dispatch Operations Console', sub: '4-Step Incident Matching, Nearest Fleet Routing & Handoff' },
      'analytics': { title: 'Operational Analytics & Insights', sub: 'Capacity Utilization, Response Time Trends & Distribution' },
      'ai-assistant': { title: 'AI Coordination Assistant', sub: 'Operational GIS & Clinical Matching Engine (Integration Ready)' },
      'audit-activity': { title: 'System Activity & Audit Log', sub: 'Immutable Event Trail with Timestamped Agent Actions' },
      'settings': { title: 'Settings & System Health', sub: 'Service Connectivity, Digital Twin Controls & Helplines' },
    };

    const info = titles[sectionId] || { title: 'Emergency Operations Console', sub: 'LIFELINK Intelligent EOC' };
    const titleEl = document.getElementById('header-main-title');
    const subEl = document.getElementById('header-sub-title');
    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;
  }

  // DATA REFRESH
  async refreshAllData() {
    try {
      const [emergencies, ambulances, hospitals, teams, auditLogs] = await Promise.all([
        API.getEmergencies().catch(() => []),
        API.getAmbulances().catch(() => []),
        API.getHospitals().catch(() => []),
        API.getResponseTeams().catch(() => []),
        API.getAuditLogs(50).catch(() => []),
      ]);

      this.cachedData = {
        emergencies,
        ambulances,
        hospitals,
        responseTeams: teams,
        auditLogs,
      };

      this._renderAllViews();
    } catch (e) {
      console.error('[LIFELINK] Error refreshing data:', e);
    }
  }

  _renderAllViews() {
    this.renderCommandCenterDashboard();
    this.renderEmergenciesTable();
    this.renderFleetTable();
    this.renderHospitalsGrid();
    this.renderPatientsTimelineView();
    this.renderResponseTeamsList();
    this.renderAuditActivityTable();
    this.updateSidebarBadges();

    if (window.MapEngineInstance && window.MapEngineInstance.map) {
      window.MapEngineInstance.renderAll(this.cachedData);
    }
  }

  // 1. COMMAND CENTER DASHBOARD
  renderCommandCenterDashboard() {
    const { emergencies, ambulances, hospitals, responseTeams, auditLogs } = this.cachedData;

    // Metrics
    const activeEmgCount = emergencies.filter(e => e.status !== 'RESOLVED' && e.status !== 'CANCELLED').length;
    const availAmbCount = ambulances.filter(a => a.status === 'AVAILABLE').length;
    const enRouteAmbCount = ambulances.filter(a => a.status === 'DISPATCHED' || a.status === 'EN_ROUTE_PATIENT' || a.status === 'TRANSPORTING').length;
    const totalAvailICU = hospitals.reduce((acc, h) => acc + (h.status === 'NORMAL' ? h.icu_available : 0), 0);
    const criticalIncidents = emergencies.filter(e => e.preliminary_urgency.includes('LEVEL_1') || e.preliminary_urgency.includes('LEVEL_2')).length;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal('metric-active-emergencies', activeEmgCount);
    setVal('metric-available-ambulances', `${availAmbCount} / ${ambulances.length}`);
    setVal('metric-enroute-ambulances', enRouteAmbCount);
    setVal('metric-hospital-capacity', `${totalAvailICU} ICU Beds`);
    setVal('metric-critical-incidents', criticalIncidents);
    setVal('metric-response-teams', `${responseTeams.length} Units`);

    // Live Activity Feed
    const feedContainer = document.getElementById('dashboard-activity-feed');
    if (feedContainer) {
      if (auditLogs.length === 0) {
        feedContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:12px;">No activity logs recorded yet.</div>`;
      } else {
        feedContainer.innerHTML = auditLogs.slice(0, 10).map(log => {
          const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `
            <div class="feed-item">
              <div class="feed-time">${timeStr}</div>
              <div class="feed-text">
                <strong>${log.agent_name}</strong>: ${log.reason}
                ${log.emergency_id ? `<span class="mono" style="color:var(--accent-cyan); font-size:11px; margin-left:6px;">[${log.emergency_id}]</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Active Incidents Preview Table
    const activeTable = document.getElementById('dashboard-active-emergencies-table');
    if (activeTable) {
      const activeList = emergencies.slice(0, 5);
      if (activeList.length === 0) {
        activeTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">No active emergencies recorded.</td></tr>`;
      } else {
        activeTable.innerHTML = activeList.map(e => `
          <tr>
            <td class="mono" style="font-weight:700; color:#FFFFFF;">${e.tracking_code}</td>
            <td><span class="status-chip ${e.preliminary_urgency.includes('LEVEL_1') ? 'critical' : 'urgent'}">${e.preliminary_urgency.replace(/_/g, ' ')}</span></td>
            <td style="color:#F1F5F9; max-width:240px; overflow:hidden; text-overflow:ellipsis;">${e.chief_complaint}</td>
            <td style="color:#94A3B8;">${e.address.split(',')[0]}</td>
            <td>
              <button onclick="App.openEmergencyModal('${e.id}')" class="btn-secondary" style="padding:4px 9px; font-size:11px;">
                Inspect
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // 2. EMERGENCIES TABLE
  renderEmergenciesTable() {
    const container = document.getElementById('emergencies-table-body');
    if (!container) return;

    const { emergencies } = this.cachedData;
    if (emergencies.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">No emergencies currently recorded.</td></tr>`;
      return;
    }

    container.innerHTML = emergencies.map(emg => {
      const isApproved = emg.human_confirmation_status === 'APPROVED';
      const isRejected = emg.human_confirmation_status === 'REJECTED';
      const confChip = isApproved
        ? `<span class="chip-clinician-confirmed">✓ APPROVED</span>`
        : isRejected
        ? `<span class="status-chip critical">✕ REJECTED</span>`
        : `<span class="chip-ai-rec">⚡ AWAITING APPROVAL</span>`;

      return `
        <tr>
          <td class="mono" style="font-weight:700; color:#FFFFFF;">${emg.tracking_code}</td>
          <td><span class="status-chip ${emg.preliminary_urgency.includes('LEVEL_1') ? 'critical' : 'urgent'}">${emg.preliminary_urgency.replace(/_/g, ' ')}</span></td>
          <td style="color:#F1F5F9; font-weight:500;">${emg.chief_complaint}</td>
          <td style="color:#94A3B8; max-width:200px; overflow:hidden; text-overflow:ellipsis;">${emg.address}</td>
          <td><span class="status-chip ${emg.status === 'REPORTED' ? 'urgent' : 'dispatched'}">${emg.status}</span></td>
          <td>${confChip}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button onclick="App.openEmergencyModal('${emg.id}')" class="btn-secondary" style="padding:4px 9px; font-size:11px;">
                View
              </button>
              ${!isApproved && !isRejected ? `
                <button onclick="App.approveEmergency('${emg.id}')" class="btn-primary" style="padding:4px 9px; font-size:11px; background:#10B981;">
                  Approve
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 3. FLEET TABLE
  renderFleetTable() {
    const container = document.getElementById('fleet-table-body');
    if (!container) return;

    const { ambulances } = this.cachedData;
    container.innerHTML = ambulances.map(a => {
      const isAvail = a.status === 'AVAILABLE';
      return `
        <tr>
          <td class="mono" style="font-weight:700; color:#FFFFFF;">${a.callsign}</td>
          <td><span class="status-chip dispatched">${a.capability}</span></td>
          <td><span class="status-chip ${isAvail ? 'available' : 'urgent'}">${a.status}</span></td>
          <td class="mono" style="color:#94A3B8;">${a.current_lat.toFixed(4)}, ${a.current_lng.toFixed(4)}</td>
          <td style="color:#FFFFFF; font-weight:600;">${a.speed_kmh} km/h</td>
          <td style="color:#38BDF8;">${a.eta_minutes ? a.eta_minutes + ' min' : '—'}</td>
          <td style="color:#94A3B8;">${a.assigned_emergency_id || 'None'}</td>
          <td>
            <button onclick="App.viewAmbulanceOnMap('${a.id}')" class="btn-secondary" style="padding:4px 9px; font-size:11px;">
              View on Map
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 4. HOSPITALS GRID
  renderHospitalsGrid() {
    const container = document.getElementById('hospitals-cards-grid');
    if (!container) return;

    const { hospitals } = this.cachedData;
    container.innerHTML = hospitals.map(h => {
      const isDiversion = h.status === 'DIVERSION' || h.icu_available === 0;
      return `
        <div class="metric-card ${isDiversion ? 'accent-red' : 'accent-cyan'}" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <div style="font-weight:700; color:#FFFFFF; font-size:13px;">${h.name}</div>
              <div style="font-size:10px; color:#94A3B8; margin-top:2px;">${h.trauma_level}</div>
            </div>
            <span class="status-chip ${isDiversion ? 'diversion' : 'available'}">${h.status}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0;">
            <div style="background:var(--bg-surface-elevated); padding:8px; border-radius:6px; text-align:center;">
              <div class="form-label" style="font-size:9px;">ICU Beds</div>
              <div style="font-size:18px; font-weight:800; color:${h.icu_available > 0 ? '#10B981' : '#EF4444'}">${h.icu_available} <span style="font-size:10px; color:#64748B;">/ ${h.icu_total}</span></div>
            </div>
            <div style="background:var(--bg-surface-elevated); padding:8px; border-radius:6px; text-align:center;">
              <div class="form-label" style="font-size:9px;">ED Beds</div>
              <div style="font-size:18px; font-weight:800; color:#38BDF8;">${h.ed_beds_available} <span style="font-size:10px; color:#64748B;">/ ${h.ed_beds_total}</span></div>
            </div>
          </div>
          <div style="font-size:11px; color:#94A3B8; margin-bottom:12px; height:32px; overflow:hidden;">
            ${h.address}
          </div>
          <div style="display:flex; gap:6px; border-top:1px solid var(--border-subtle); padding-top:10px;">
            <button onclick="App.viewHospitalOnMap('${h.id}')" class="btn-secondary" style="flex:1; font-size:11px; padding:5px 0;">
              View on Map
            </button>
            <button onclick="App.triggerCapacityDrop('${h.id}')" class="btn-crimson" style="padding:5px 10px; font-size:11px;">
              ${isDiversion ? 'Reset' : 'Simulate Surge'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. PATIENTS TIMELINE VIEW
  renderPatientsTimelineView() {
    const listContainer = document.getElementById('patients-list-selector');
    if (!listContainer) return;

    const { emergencies } = this.cachedData;
    if (emergencies.length === 0) {
      listContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:12px;">No patient incident records found.</div>`;
      return;
    }

    listContainer.innerHTML = emergencies.map((emg, idx) => `
      <div onclick="App.selectPatientTimeline('${emg.id}')"
           style="padding:10px 12px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-surface-elevated); cursor:pointer; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <div style="font-weight:700; color:#FFFFFF; font-size:12px;">🚨 ${emg.tracking_code}</div>
          <span class="status-chip ${emg.preliminary_urgency.includes('LEVEL_1') ? 'critical' : 'urgent'}">${emg.preliminary_urgency.replace(/_/g, ' ')}</span>
        </div>
        <div style="font-size:11px; color:#F1F5F9; font-weight:500;">${emg.chief_complaint}</div>
        <div style="font-size:10px; color:#94A3B8; margin-top:2px;">Caller: ${emg.caller_name} (${emg.caller_phone})</div>
      </div>
    `).join('');

    // Default select first patient
    if (emergencies.length > 0 && !document.getElementById('patient-active-timeline-title')) {
      this.selectPatientTimeline(emergencies[0].id);
    }
  }

  selectPatientTimeline(emgId) {
    const emg = this.cachedData.emergencies.find(e => e.id === emgId);
    if (!emg) return;

    const timelineContainer = document.getElementById('patient-timeline-events');
    const headerTitle = document.getElementById('patient-selected-code');
    const headerDetails = document.getElementById('patient-selected-details');

    if (headerTitle) headerTitle.textContent = `Incident Record: ${emg.tracking_code}`;
    if (headerDetails) {
      headerDetails.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
          <span class="status-chip critical">${emg.preliminary_urgency.replace(/_/g, ' ')}</span>
          <span style="color:#94A3B8; font-size:11px;">📍 ${emg.address}</span>
          <span style="color:#38BDF8; font-size:11px;">Assigned Unit: <strong>${emg.assigned_ambulance_id || 'Pending'}</strong></span>
        </div>
      `;
    }

    if (timelineContainer) {
      const events = emg.timeline_events || [];
      if (events.length === 0) {
        timelineContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:20px;">No timeline events recorded yet.</div>`;
      } else {
        timelineContainer.innerHTML = events.map(evt => {
          const time = new Date(evt.created_at).toLocaleTimeString();
          return `
            <div class="timeline-node">
              <div class="timeline-node-dot"></div>
              <div class="timeline-node-header">
                <div class="timeline-node-title">${evt.title}</div>
                <div class="timeline-node-time">${time}</div>
              </div>
              <div class="timeline-node-desc">${evt.description}</div>
              <div style="font-size:10px; color:var(--accent-cyan); margin-top:2px;">Logged by: ${evt.agent_name}</div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // 6. RESPONSE TEAMS
  renderResponseTeamsList() {
    const container = document.getElementById('response-teams-cards-grid');
    if (!container) return;

    const { responseTeams } = this.cachedData;
    container.innerHTML = responseTeams.map(tm => `
      <div class="command-panel" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; color:#FFFFFF; font-size:13px;">👨‍⚕️ ${tm.name}</div>
            <div style="font-size:10px; color:#38BDF8; margin-top:2px;">${tm.team_type.replace(/_/g, ' ')}</div>
          </div>
          <span class="status-chip available">${tm.status}</span>
        </div>
        <div style="font-size:11px; margin:8px 0; color:#F1F5F9;">
          <div class="form-label" style="font-size:9px;">Specialization</div>
          ${tm.specialization}
        </div>
        <div style="font-size:10px; color:#94A3B8; margin-bottom:12px;">
          <strong>Base:</strong> ${tm.base_station}
        </div>
        <div style="background:var(--bg-surface-elevated); padding:8px 10px; border-radius:6px; margin-bottom:12px; font-size:11px;">
          <div class="form-label" style="font-size:9px;">Assigned Crew</div>
          ${tm.members.map(m => `<div>• <strong>${m.name}</strong> (${m.role})</div>`).join('')}
        </div>
        <button onclick="App.viewResponseTeamOnMap('${tm.id}')" class="btn-secondary" style="width:100%; font-size:11px; padding:6px 0;">
          View on Map
        </button>
      </div>
    `).join('');
  }

  // 7. AUDIT ACTIVITY TABLE
  renderAuditActivityTable() {
    const container = document.getElementById('audit-table-body');
    if (!container) return;

    const { auditLogs } = this.cachedData;
    if (auditLogs.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No audit trail events captured.</td></tr>`;
      return;
    }

    container.innerHTML = auditLogs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <tr>
          <td class="mono" style="color:var(--accent-cyan); font-weight:600;">${time}</td>
          <td class="mono" style="color:#94A3B8;">${log.emergency_id || 'System'}</td>
          <td style="font-weight:600; color:#FFFFFF;">${log.agent_name}</td>
          <td><span class="status-chip dispatched">${log.action}</span></td>
          <td class="mono" style="font-size:11px; color:#A7F3D0;">${log.tool_used}</td>
          <td style="max-width:320px; overflow:hidden; text-overflow:ellipsis; color:#F1F5F9;">${log.reason}</td>
        </tr>
      `;
    }).join('');
  }

  updateSidebarBadges() {
    const activeEmg = this.cachedData.emergencies.filter(e => e.status !== 'RESOLVED' && e.status !== 'CANCELLED').length;
    const availAmb = this.cachedData.ambulances.filter(a => a.status === 'AVAILABLE').length;

    const bEmg = document.getElementById('badge-side-emergencies');
    const bAmb = document.getElementById('badge-side-ambulances');
    const bHosp = document.getElementById('badge-side-hospitals');

    if (bEmg) {
      bEmg.textContent = activeEmg;
      bEmg.className = activeEmg > 0 ? 'sidebar-badge alert' : 'sidebar-badge';
    }
    if (bAmb) bAmb.textContent = availAmb;
    if (bHosp) bHosp.textContent = this.cachedData.hospitals.length;
  }

  // MAP FOCUS HELPERS
  viewAmbulanceOnMap(id) {
    const amb = this.cachedData.ambulances.find(a => a.id === id);
    if (!amb) return;
    this.switchSection('live-map');
    setTimeout(() => {
      window.MapEngineInstance.centerOn(amb.current_lat, amb.current_lng, 16);
      window.MapEngineInstance.selectAmbulance(amb);
    }, 150);
  }

  viewHospitalOnMap(id) {
    const h = this.cachedData.hospitals.find(item => item.id === id);
    if (!h) return;
    this.switchSection('live-map');
    setTimeout(() => {
      window.MapEngineInstance.centerOn(h.latitude, h.longitude, 16);
      window.MapEngineInstance.selectHospital(h);
    }, 150);
  }

  viewResponseTeamOnMap(id) {
    const tm = this.cachedData.responseTeams.find(t => t.id === id);
    if (!tm) return;
    this.switchSection('live-map');
    setTimeout(() => {
      window.MapEngineInstance.centerOn(tm.current_lat, tm.current_lng, 16);
      window.MapEngineInstance.selectResponseTeam(tm);
    }, 150);
  }

  // MODALS & CONFIRMATIONS
  openEmergencyModal(emgId) {
    const emg = this.cachedData.emergencies.find(e => e.id === emgId);
    if (!emg) return;

    this.selectPatientTimeline(emgId);
    this.switchSection('patients');
  }

  async approveEmergency(emgId) {
    try {
      await API.confirmEmergency(emgId, 'APPROVED', 'Clinician verified triage priority.');
      this.showToast('Triage recommendation APPROVED by human clinician.', 'success');
      await this.refreshAllData();
    } catch (e) {
      this.showToast(`Approval failed: ${e.message}`, 'alert');
    }
  }

  // SIMULATION ACTIONS
  async triggerCapacityDrop(hospitalId) {
    const h = this.cachedData.hospitals.find(item => item.id === hospitalId);
    if (!h) return;

    const newIcu = h.icu_available > 0 ? 0 : 8;
    const newStatus = newIcu === 0 ? 'DIVERSION' : 'NORMAL';

    try {
      await API.injectCapacityDrop(hospitalId, newIcu, newStatus);
      this.showToast(`Simulated status change for ${h.name} -> ${newStatus} (ICU: ${newIcu})`, 'alert');
      this.playAlertSound();
      await this.refreshAllData();
    } catch (e) {
      this.showToast(`Simulation error: ${e.message}`, 'alert');
    }
  }

  async generateRandomEmergency() {
    const punePresets = [
      {
        caller_name: 'Anil Deshpande',
        caller_phone: '+91 98220 99881',
        address: 'FC Road, Near Goodluck Cafe, Deccan Gymkhana, Pune, Maharashtra 411004',
        latitude: 18.5175,
        longitude: 73.8415,
        chief_complaint: 'Severe chest tightness, radiation to left shoulder, diaphoresis.',
        symptoms: { chest_pain: true, shortness_of_breath: true },
      },
      {
        caller_name: 'Dr. Sunita Ranade',
        caller_phone: '+91 98220 77441',
        address: 'Hinjawadi Infotech Park Phase 1 Chowk, Pune, Maharashtra 411057',
        latitude: 18.5912,
        longitude: 73.7388,
        chief_complaint: 'High-speed two-wheeler collision, head trauma, altered consciousness.',
        symptoms: { head_trauma: true, unconscious: false, bleeding: true },
      },
      {
        caller_name: 'Pooja Kulkarni',
        caller_phone: '+91 98220 55331',
        address: 'Hadapsar Gadital Chowk, Pune-Solapur Rd, Pune 411028',
        latitude: 18.5089,
        longitude: 73.9259,
        chief_complaint: 'Acute asthma exacerbation, severe dyspnea, cyanosis.',
        symptoms: { respiratory_distress: true, wheezing: true },
      },
      {
        caller_name: 'Suresh Patil',
        caller_phone: '+91 98220 33221',
        address: 'Pune Junction Railway Station Main Concourse, Pune 411001',
        latitude: 18.5285,
        longitude: 73.8740,
        chief_complaint: 'Elderly passenger collapsed, weak pulse, syncope.',
        symptoms: { syncope: true, hypotension: true },
      }
    ];

    const pick = punePresets[Math.floor(Math.random() * punePresets.length)];
    try {
      const res = await API.createEmergency({
        caller_name: pick.caller_name,
        caller_phone: pick.caller_phone,
        address: pick.address,
        latitude: pick.latitude,
        longitude: pick.longitude,
        chief_complaint: pick.chief_complaint,
        reported_symptoms: pick.symptoms,
      });

      this.showToast(`NEW EMERGENCY INTAKE: ${res.tracking_code} at ${pick.address.split(',')[0]}`, 'alert');
      this.playAlertSound();
      await this.refreshAllData();

      // Focus map
      this.switchSection('live-map');
      if (window.MapEngineInstance) {
        window.MapEngineInstance.centerOn(pick.latitude, pick.longitude, 15);
      }
    } catch (e) {
      this.showToast(`Failed to create intake: ${e.message}`, 'alert');
    }
  }

  // WEBSOCKET DISPATCHER
  _bindWebSocketEvents() {
    WS.on('new_emergency', (data) => {
      this.showToast(`🚨 INCOMING EMERGENCY: ${data.tracking_code || 'Incident'}`, 'alert');
      this.playAlertSound();
      this.refreshAllData();
    });

    WS.on('ambulance_update', (data) => {
      this.refreshAllData();
    });

    WS.on('hospital_update', (data) => {
      this.refreshAllData();
    });

    WS.on('dispatch_event', (data) => {
      this.showToast(`🚑 FLEET DISPATCH: ${data.callsign} dispatched!`, 'success');
      this.refreshAllData();
    });

    WS.on('alerts', (data) => {
      if (data.type === 'HOSPITAL_CAPACITY_LOST') {
        this.showToast(`⚠️ SURGE ALERT: ${data.hospital_name} on ${data.status} (ICU: ${data.icu_available})`, 'alert');
        this.playAlertSound();
      }
      this.refreshAllData();
    });

    WS.on('telemetry', (data) => {
      // Gentle sync of live stats
      this.updateSidebarBadges();
    });
  }

  // AUDIO ALERT VIA WEB AUDIO SYNTHESIS
  playAlertSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15); // Drop to A4

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // TOAST NOTIFICATIONS
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div>${message}</div>
      <button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:inherit; cursor:pointer; font-weight:700;">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  // HEALTH CHECK
  async _startHealthPoll() {
    const poll = async () => {
      try {
        const health = await API.getSystemHealth();
        const monBackend = document.getElementById('monitor-backend-status');
        const monDb = document.getElementById('monitor-db-status');
        const monMap = document.getElementById('monitor-map-status');

        if (monBackend) monBackend.textContent = health.status === 'HEALTHY' ? 'Operational' : 'Degraded';
        if (monDb) monDb.textContent = 'Connected';
        if (monMap) monMap.textContent = `${health.maps_provider.toUpperCase()} Active`;
      } catch (e) {
        const monBackend = document.getElementById('monitor-backend-status');
        if (monBackend) monBackend.textContent = 'Offline';
      }
    };

    poll();
    setInterval(poll, 15000);
  }

  // UI EVENT BINDINGS
  _bindNavigation() {
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-section');
        if (sec) this.switchSection(sec);
      });
    });
  }

  _bindSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 960) {
          sidebar.classList.toggle('mobile-open');
        } else {
          sidebar.classList.toggle('collapsed');
        }
      });
    }
  }

  _bindModals() {
    // New Emergency Modal
    const btnOpenReport = document.getElementById('btn-open-report-modal');
    const modalReport = document.getElementById('emergency-report-modal');
    const btnCloseReport = document.getElementById('btn-close-report-modal');
    const formReport = document.getElementById('form-report-emergency');

    if (btnOpenReport && modalReport) {
      btnOpenReport.addEventListener('click', () => modalReport.classList.add('open'));
    }
    if (btnCloseReport && modalReport) {
      btnCloseReport.addEventListener('click', () => modalReport.classList.remove('open'));
    }

    if (formReport) {
      formReport.addEventListener('submit', async (e) => {
        e.preventDefault();
        const callerName = document.getElementById('report-caller-name').value;
        const callerPhone = document.getElementById('report-caller-phone').value;
        const address = document.getElementById('report-address').value;
        const complaint = document.getElementById('report-complaint').value;

        try {
          await API.createEmergency({
            caller_name: callerName,
            caller_phone: callerPhone,
            address,
            chief_complaint: complaint,
          });

          this.showToast('Incident successfully logged into dispatch queue', 'success');
          modalReport.classList.remove('open');
          formReport.reset();
          await this.refreshAllData();
        } catch (err) {
          this.showToast(`Intake error: ${err.message}`, 'alert');
        }
      });
    }
  }

  _bindSimulationTriggers() {
    const btnRandomEmg = document.getElementById('btn-trigger-random-emg');
    if (btnRandomEmg) {
      btnRandomEmg.addEventListener('click', () => this.generateRandomEmergency());
    }

    const btnDropRuby = document.getElementById('btn-trigger-ruby-drop');
    if (btnDropRuby) {
      btnDropRuby.addEventListener('click', () => this.triggerCapacityDrop('HOSP-RHC-02'));
    }

    const btnDelay = document.getElementById('btn-trigger-traffic-delay');
    if (btnDelay) {
      btnDelay.addEventListener('click', async () => {
        try {
          await API.injectTrafficDelay('108-MH-PUNE-01', 14.0);
          this.showToast('Injected 14-min traffic delay for 108 Swargate', 'alert');
        } catch (e) {
          this.showToast(`Delay trigger failed: ${e.message}`, 'alert');
        }
      });
    }
  }

  // TRILINGUAL TOGGLES (EN / MR / HI)
  setLanguage(lang) {
    this.currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const dict = {
      en: { emg: 'Report Emergency', active: 'Active Emergencies', fleet: 'Fleet Available' },
      mr: { emg: 'तातडीची नोंदणी', active: 'सक्रिय आणीबाणी', fleet: 'वाहने उपलब्ध' },
      hi: { emg: 'आपातकालीन रिपोर्ट', active: 'सक्रिय आपातकाल', fleet: 'एम्बुलेंस उपलब्ध' },
    };

    const t = dict[lang] || dict.en;
    const btnText = document.getElementById('btn-report-text');
    if (btnText) btnText.textContent = t.emg;
    this.showToast(`Language switched to ${lang.toUpperCase()}`, 'info');
  }
}

window.App = new Application();
document.addEventListener('DOMContentLoaded', () => window.App.init());
