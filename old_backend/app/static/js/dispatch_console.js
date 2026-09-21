/**
 * LIFELINK — Dispatch Console Engine
 * Step-by-step dispatcher coordination console
 */

class DispatchConsole {
  constructor() {
    this.selectedEmergency = null;
    this.selectedAmbulance = null;
    this.selectedHospital = null;
    this.dispatchMap = null;
    this.routeLine = null;
  }

  initMap() {
    const el = document.getElementById('dispatch-mini-map');
    if (!el || this.dispatchMap) return;

    this.dispatchMap = L.map('dispatch-mini-map', {
      center: [18.5204, 73.8567],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(this.dispatchMap);
  }

  renderWorkflow(emergencies, ambulances, hospitals) {
    this.initMap();
    this.renderEmergenciesList(emergencies);
    this.renderAvailableAmbulances(ambulances);
    this.renderCandidateHospitals(hospitals);
  }

  renderEmergenciesList(emergencies) {
    const container = document.getElementById('dispatch-emergency-list');
    if (!container) return;

    if (emergencies.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:12px; text-align:center;">No pending emergencies awaiting dispatch.</div>`;
      return;
    }

    container.innerHTML = emergencies.map(emg => {
      const isSelected = this.selectedEmergency && this.selectedEmergency.id === emg.id;
      return `
        <div onclick="DispatchController.selectEmergency('${emg.id}')"
             style="padding:10px 12px; border-radius:8px; border:1px solid ${isSelected ? '#38BDF8' : 'var(--border-subtle)'}; background:${isSelected ? 'var(--accent-cyan-soft)' : 'var(--bg-surface-elevated)'}; cursor:pointer; margin-bottom:8px; transition:all 0.15s;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-weight:700; color:#FFFFFF; font-size:12px;">🚨 ${emg.tracking_code}</div>
            <span class="status-chip ${emg.preliminary_urgency.includes('LEVEL_1') ? 'critical' : 'urgent'}">${emg.preliminary_urgency.replace(/_/g, ' ')}</span>
          </div>
          <div style="font-size:11px; color:#F1F5F9; font-weight:500; margin-bottom:2px;">${emg.chief_complaint}</div>
          <div style="font-size:10px; color:#94A3B8;">📍 ${emg.address}</div>
        </div>
      `;
    }).join('');
  }

  renderAvailableAmbulances(ambulances) {
    const container = document.getElementById('dispatch-ambulance-list');
    if (!container) return;

    const available = ambulances.filter(a => a.status === 'AVAILABLE');
    if (available.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:12px;">No fleet units currently available.</div>`;
      return;
    }

    // Sort by distance to selected emergency if selected
    let list = [...available];
    if (this.selectedEmergency) {
      list.forEach(a => {
        a._tempDist = this._haversine(this.selectedEmergency.latitude, this.selectedEmergency.longitude, a.current_lat, a.current_lng);
      });
      list.sort((a, b) => a._tempDist - b._tempDist);
    }

    container.innerHTML = list.map(amb => {
      const isSelected = this.selectedAmbulance && this.selectedAmbulance.id === amb.id;
      const distLabel = amb._tempDist !== undefined ? `${amb._tempDist.toFixed(1)} km away` : 'Idle';
      return `
        <div onclick="DispatchController.selectAmbulance('${amb.id}')"
             style="padding:10px 12px; border-radius:8px; border:1px solid ${isSelected ? '#10B981' : 'var(--border-subtle)'}; background:${isSelected ? 'var(--accent-emerald-soft)' : 'var(--bg-surface-elevated)'}; cursor:pointer; margin-bottom:8px; transition:all 0.15s;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-weight:700; color:#FFFFFF; font-size:12px;">🚑 ${amb.callsign}</div>
            <span class="status-chip available">${amb.capability}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#94A3B8;">
            <span>Status: <strong style="color:#10B981;">AVAILABLE</strong></span>
            <span style="color:#38BDF8; font-weight:600;">${distLabel}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCandidateHospitals(hospitals) {
    const container = document.getElementById('dispatch-hospital-list');
    if (!container) return;

    container.innerHTML = hospitals.slice(0, 6).map(h => {
      const isSelected = this.selectedHospital && this.selectedHospital.id === h.id;
      const isDiversion = h.status === 'DIVERSION' || h.icu_available === 0;
      return `
        <div onclick="DispatchController.selectHospital('${h.id}')"
             style="padding:10px 12px; border-radius:8px; border:1px solid ${isSelected ? '#38BDF8' : 'var(--border-subtle)'}; background:${isSelected ? 'var(--accent-blue-soft)' : 'var(--bg-surface-elevated)'}; cursor:pointer; margin-bottom:8px; transition:all 0.15s;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <div style="font-weight:700; color:#FFFFFF; font-size:12px;">🏥 ${h.name}</div>
            <span class="status-chip ${isDiversion ? 'diversion' : 'available'}">${h.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#94A3B8;">
            <span>${h.trauma_level}</span>
            <span>ICU: <strong style="color:${h.icu_available > 0 ? '#10B981' : '#EF4444'}">${h.icu_available}</strong> | ED: <strong>${h.ed_beds_available}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  updateDispatchSummary() {
    const sumEmg = document.getElementById('sum-selected-emg');
    const sumAmb = document.getElementById('sum-selected-amb');
    const sumHosp = document.getElementById('sum-selected-hosp');
    const btnDispatch = document.getElementById('btn-execute-dispatch');

    if (sumEmg) sumEmg.textContent = this.selectedEmergency ? `${this.selectedEmergency.tracking_code}` : 'None Selected';
    if (sumAmb) sumAmb.textContent = this.selectedAmbulance ? `${this.selectedAmbulance.callsign} (${this.selectedAmbulance.capability})` : 'None Selected';
    if (sumHosp) sumHosp.textContent = this.selectedHospital ? `${this.selectedHospital.name}` : 'Recommended / None';

    if (btnDispatch) {
      btnDispatch.disabled = !(this.selectedEmergency && this.selectedAmbulance);
      btnDispatch.style.opacity = (this.selectedEmergency && this.selectedAmbulance) ? '1' : '0.5';
    }

    // Preview on mini map if both selected
    if (this.selectedEmergency && this.selectedAmbulance && this.dispatchMap) {
      if (this.routeLine) this.dispatchMap.removeLayer(this.routeLine);
      const coords = [
        [this.selectedAmbulance.current_lat, this.selectedAmbulance.current_lng],
        [this.selectedEmergency.latitude, this.selectedEmergency.longitude]
      ];
      this.routeLine = L.polyline(coords, { color: '#38BDF8', weight: 4, dashArray: '6, 6' }).addTo(this.dispatchMap);
      this.dispatchMap.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });
    }
  }

  async executeDispatch() {
    if (!this.selectedEmergency || !this.selectedAmbulance) {
      App.showToast('Please select both an emergency and an available ambulance', 'alert');
      return;
    }

    try {
      const ambId = this.selectedAmbulance.id;
      const emgId = this.selectedEmergency.id;
      const hospId = this.selectedHospital ? this.selectedHospital.id : null;

      const res = await API.dispatchAmbulance(ambId, emgId, hospId);
      App.showToast(`DISPATCH CONFIRMED: ${this.selectedAmbulance.callsign} assigned to ${this.selectedEmergency.tracking_code}`, 'success');

      // Draw route on hero map
      if (window.MapEngineInstance) {
        window.MapEngineInstance.drawAmbulanceRoute(
          this.selectedAmbulance.current_lat, this.selectedAmbulance.current_lng,
          this.selectedEmergency.latitude, this.selectedEmergency.longitude
        );
      }

      // Reset selection
      this.selectedEmergency = null;
      this.selectedAmbulance = null;
      this.selectedHospital = null;
      this.updateDispatchSummary();

      // Refresh all data
      App.refreshAllData();
      App.switchSection('live-map');
    } catch (e) {
      App.showToast(`Dispatch failed: ${e.message}`, 'alert');
    }
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

window.DispatchConsoleInstance = new DispatchConsole();

window.DispatchController = {
  selectEmergency(id) {
    const emg = (window.MapEngineInstance.dataStore.emergencies || []).find(e => e.id === id);
    window.DispatchConsoleInstance.selectedEmergency = emg;
    window.DispatchConsoleInstance.renderWorkflow(
      window.MapEngineInstance.dataStore.emergencies,
      window.MapEngineInstance.dataStore.ambulances,
      window.MapEngineInstance.dataStore.hospitals
    );
    window.DispatchConsoleInstance.updateDispatchSummary();
  },
  selectAmbulance(id) {
    const amb = (window.MapEngineInstance.dataStore.ambulances || []).find(a => a.id === id);
    window.DispatchConsoleInstance.selectedAmbulance = amb;
    window.DispatchConsoleInstance.renderWorkflow(
      window.MapEngineInstance.dataStore.emergencies,
      window.MapEngineInstance.dataStore.ambulances,
      window.MapEngineInstance.dataStore.hospitals
    );
    window.DispatchConsoleInstance.updateDispatchSummary();
  },
  selectHospital(id) {
    const hosp = (window.MapEngineInstance.dataStore.hospitals || []).find(h => h.id === id);
    window.DispatchConsoleInstance.selectedHospital = hosp;
    window.DispatchConsoleInstance.renderWorkflow(
      window.MapEngineInstance.dataStore.emergencies,
      window.MapEngineInstance.dataStore.ambulances,
      window.MapEngineInstance.dataStore.hospitals
    );
    window.DispatchConsoleInstance.updateDispatchSummary();
  },
  executeDispatch() {
    window.DispatchConsoleInstance.executeDispatch();
  }
};
