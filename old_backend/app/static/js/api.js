/**
 * LIFELINK — Unified Client API Service
 * Interacts with FastAPI backend endpoints (/api/v1/...)
 */

const API = {
  // Base configuration
  BASE_URL: '/api/v1',

  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[API ERROR] ${options.method || 'GET'} ${url}:`, error);
      throw error;
    }
  },

  // EMERGENCIES
  getEmergencies() {
    return this.request('/emergencies');
  },

  getEmergency(id) {
    return this.request(`/emergencies/${id}`);
  },

  createEmergency(payload) {
    return this.request('/emergencies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  confirmEmergency(emergencyId, decision, clinicianNotes = '') {
    return this.request(`/emergencies/${emergencyId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        clinician_notes: clinicianNotes,
      }),
    });
  },

  // AMBULANCES / FLEET
  getAmbulances() {
    return this.request('/ambulances');
  },

  getAmbulance(id) {
    return this.request(`/ambulances/${id}`);
  },

  updateAmbulanceTelemetry(id, payload) {
    return this.request(`/ambulances/${id}/telemetry`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  dispatchAmbulance(ambulanceId, emergencyId, assignedHospitalId = null) {
    return this.request(`/ambulances/${ambulanceId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({
        emergency_id: emergencyId,
        assigned_hospital_id: assignedHospitalId,
      }),
    });
  },

  // HOSPITALS
  getHospitals() {
    return this.request('/hospitals');
  },

  getHospital(id) {
    return this.request(`/hospitals/${id}`);
  },

  updateHospitalCapacity(id, payload) {
    return this.request(`/hospitals/${id}/capacity`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // RESPONSE TEAMS
  getResponseTeams() {
    return this.request('/response-teams');
  },

  // AUDIT LOGS
  getAuditLogs(limit = 60, emergencyId = null) {
    let q = `?limit=${limit}`;
    if (emergencyId) q += `&emergency_id=${emergencyId}`;
    return this.request(`/audit-logs${q}`);
  },

  // MAPS & ROUTING
  getRoute(originLat, originLng, destLat, destLng) {
    const q = `?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`;
    return this.request(`/maps/route${q}`);
  },

  reverseGeocode(lat, lng) {
    const q = `?lat=${lat}&lng=${lng}`;
    return this.request(`/maps/reverse-geocode${q}`);
  },

  // SIMULATION CONTROLS
  injectCapacityDrop(hospitalId, icuAvailable = 0, status = 'DIVERSION') {
    return this.request('/simulation/inject/capacity-drop', {
      method: 'POST',
      body: JSON.stringify({
        hospital_id: hospitalId,
        icu_available: icuAvailable,
        status,
      }),
    });
  },

  injectTrafficDelay(ambulanceId, delayMinutes = 12.0) {
    return this.request('/simulation/inject/traffic-delay', {
      method: 'POST',
      body: JSON.stringify({
        ambulance_id: ambulanceId,
        delay_minutes: delayMinutes,
      }),
    });
  },

  getSimulationStatus() {
    return this.request('/simulation/status');
  },

  startSimulation() {
    return this.request('/simulation/start', { method: 'POST' });
  },

  stopSimulation() {
    return this.request('/simulation/stop', { method: 'POST' });
  },

  // HEALTH CHECK
  getSystemHealth() {
    return fetch('/health').then(r => r.json());
  },
};

window.API = API;
