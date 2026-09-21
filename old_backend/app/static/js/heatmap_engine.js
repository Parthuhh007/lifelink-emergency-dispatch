/**
 * LIFELINK — Incident Heatmap Engine
 * Visualizes spatial concentration of emergency incidents across Pune Metropolitan Area.
 */

class HeatmapEngine {
  constructor() {
    this.map = null;
    this.heatLayer = null;
    this.markerGroup = null;
    this.currentFilter = {
      timeframe: '7d',
      category: 'ALL',
    };

    // Realistic regional Pune baseline incidents for spatial density
    this.puneIncidentClusters = [
      { lat: 18.5285, lng: 73.8740, type: 'ACCIDENT', intensity: 0.9, label: 'Pune Junction / Station Chowk', date: '2026-09-16' },
      { lat: 18.5018, lng: 73.8636, type: 'MEDICAL', intensity: 0.85, label: 'Swargate Bus Terminal & Flyover', date: '2026-09-15' },
      { lat: 18.5912, lng: 73.7388, type: 'TRAUMA', intensity: 0.8, label: 'Hinjawadi IT Corridor Phase 1', date: '2026-09-17' },
      { lat: 18.5074, lng: 73.8077, type: 'MEDICAL', intensity: 0.75, label: 'Kothrud Karve Road Junction', date: '2026-09-14' },
      { lat: 18.5089, lng: 73.9259, type: 'ACCIDENT', intensity: 0.8, label: 'Hadapsar Gadital Chowk', date: '2026-09-16' },
      { lat: 18.5679, lng: 73.9143, type: 'ACCIDENT', intensity: 0.7, label: 'Viman Nagar / Airport Rd', date: '2026-09-13' },
      { lat: 18.5590, lng: 73.7868, type: 'TRAUMA', intensity: 0.65, label: 'Baner High Street Junction', date: '2026-09-12' },
      { lat: 18.6210, lng: 73.7745, type: 'FIRE', intensity: 0.7, label: 'PCMC Thergaon / Chinchwad', date: '2026-09-11' },
      { lat: 18.4575, lng: 73.8508, type: 'MEDICAL', intensity: 0.6, label: 'Katraj Snake Park / Satara Rd', date: '2026-09-10' },
      { lat: 18.5204, lng: 73.8567, type: 'MEDICAL', intensity: 0.75, label: 'Shivajinagar / Sancheti Chowk', date: '2026-09-15' },
    ];
  }

  init(containerId = 'heatmap-container') {
    if (this.map) return;

    this.map = L.map(containerId, {
      center: [18.5204, 73.8567],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);

    this.markerGroup = L.layerGroup().addTo(this.map);
    this.refresh();
  }

  setFilter(timeframe, category) {
    if (timeframe) this.currentFilter.timeframe = timeframe;
    if (category) this.currentFilter.category = category;
    this.refresh();
  }

  refresh() {
    if (!this.map) return;

    this.markerGroup.clearLayers();
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    // Combine live emergencies with Pune cluster points
    const liveEmergencies = (window.MapEngineInstance && window.MapEngineInstance.dataStore.emergencies) || [];
    const livePoints = liveEmergencies.map(e => ({
      lat: e.latitude,
      lng: e.longitude,
      type: 'MEDICAL',
      intensity: 1.0,
      label: `Active: ${e.tracking_code} (${e.chief_complaint})`,
      date: 'Live',
    }));

    let allPoints = [...livePoints, ...this.puneIncidentClusters];

    // Filter by Category
    if (this.currentFilter.category !== 'ALL') {
      allPoints = allPoints.filter(p => p.type === this.currentFilter.category);
    }

    // Prepare heat points [lat, lng, intensity]
    const heatCoords = allPoints.map(p => [p.lat, p.lng, p.intensity]);

    if (typeof L.heatLayer === 'function') {
      this.heatLayer = L.heatLayer(heatCoords, {
        radius: 35,
        blur: 25,
        maxZoom: 16,
        gradient: {
          0.2: '#06B6D4',
          0.4: '#10B981',
          0.6: '#F59E0B',
          0.8: '#EF4444',
          1.0: '#DC2626',
        },
      }).addTo(this.map);
    }

    // Add translucent hotspot indicators
    allPoints.forEach((p) => {
      const circle = L.circleMarker([p.lat, p.lng], {
        radius: 14 * p.intensity,
        color: p.type === 'ACCIDENT' ? '#EF4444' : p.type === 'FIRE' ? '#F59E0B' : '#38BDF8',
        weight: 1.5,
        fillColor: p.type === 'ACCIDENT' ? '#DC2626' : p.type === 'FIRE' ? '#D97706' : '#2563EB',
        fillOpacity: 0.35,
      });

      circle.bindTooltip(`
        <div style="font-weight:700; color:#FFFFFF;">${p.label}</div>
        <div style="font-size:11px; color:#94A3B8;">Type: <strong>${p.type}</strong> | Density: ${(p.intensity * 100).toFixed(0)}%</div>
      `);

      circle.addTo(this.markerGroup);
    });

    // Update heatmap counter UI
    const countEl = document.getElementById('heatmap-incident-count');
    if (countEl) countEl.textContent = allPoints.length;
  }
}

window.HeatmapEngineInstance = new HeatmapEngine();
