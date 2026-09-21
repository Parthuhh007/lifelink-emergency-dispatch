/**
 * LIFELINK — Hero Live Operations Map Engine
 *
 * Leaflet GIS controller with:
 * - MapTiler base map
 * - Custom SVG markers
 * - Draggable ambulance telemetry
 * - Real road routing through backend / OSRM
 * - Area intelligence
 * - Reverse geocoding
 * - Interactive entity inspection
 * - Layer controls
 * - Fleet filtering
 */


class MapEngine {

  constructor() {

    this.map = null;

    this.markers = {
      emergencies: new Map(),
      ambulances: new Map(),
      hospitals: new Map(),
      teams: new Map(),
      hazards: new Map(),
    };

    this.layerGroups = {
      emergencies: null,
      ambulances: null,
      hospitals: null,
      teams: null,
      hazards: null,
      routes: null,
    };

    this.activeRoutePolyline = null;

    this.draggedAmbulanceTemp = null;

    this.selectedEntity = null;

    this.dataStore = {
      emergencies: [],
      ambulances: [],
      hospitals: [],
      teams: [],
    };
  }


  // ==========================================================
  // MAP INITIALIZATION
  // ==========================================================

  async init(containerId = 'live-map-container') {

    if (this.map) {
      return;
    }

    // Pune Metropolitan Area
    const puneCenter = [
      18.5204,
      73.8567
    ];

    // --------------------------------------------------------
    // CREATE LEAFLET MAP
    // --------------------------------------------------------

    this.map = L.map(containerId, {

      center: puneCenter,

      zoom: 12,

      zoomControl: false,

      attributionControl: true,

    });


    // --------------------------------------------------------
    // LOAD MAPTILER API KEY FROM FASTAPI
    // --------------------------------------------------------

    let mapTilerKey = '';

    try {

      const response = await fetch('/maps/config');

      if (response.ok) {

        const config = await response.json();

        mapTilerKey =
          config.maptiler_api_key || '';

      }

    } catch (error) {

      console.warn(
        '[MapEngine] Failed to load MapTiler configuration:',
        error
      );

    }


    // --------------------------------------------------------
    // MAPTILER BASE MAP
    // --------------------------------------------------------

    if (mapTilerKey) {
      const mapTilerKey = "AlZa7xkLqxRXOSpjALsS";

      const mapTilerLayer = L.tileLayer(

        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerKey)}`,

        {

          maxZoom: 20,

          tileSize: 512,

          zoomOffset: -1,

          attribution:
            '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; OpenStreetMap contributors',

        }

      );

      mapTilerLayer.addTo(this.map);

      console.log(
        '[MapEngine] MapTiler base map loaded.'
      );

    } else {

      // ------------------------------------------------------
      // FALLBACK CARTO DARK MAP
      // ------------------------------------------------------

      const mapTilerKey = "AlZa7xkLqxRXOSpjALsS";

const mapTilerLayer = L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerKey)}`,
    {
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 20,
        attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
    }
).addTo(this.map);

      console.warn(
        '[MapEngine] MapTiler API key unavailable. Using Carto fallback.'
      );
    }


    // --------------------------------------------------------
    // ZOOM CONTROL
    // --------------------------------------------------------

    L.control.zoom({

      position: 'bottomright'

    }).addTo(this.map);


    // --------------------------------------------------------
    // INITIALIZE LAYER GROUPS
    // --------------------------------------------------------

    for (const key of [

      'emergencies',

      'ambulances',

      'hospitals',

      'teams',

      'hazards',

      'routes'

    ]) {

      this.layerGroups[key] =
        L.layerGroup().addTo(this.map);

    }


    // --------------------------------------------------------
    // MAP CLICK → AREA INTELLIGENCE
    // --------------------------------------------------------

    this.map.on('click', (e) => {

      this.inspectArea(
        e.latlng.lat,
        e.latlng.lng
      );

    });


    console.log(
      '[MapEngine] Initialized on Pune coordinates.'
    );

  }


  // ==========================================================
  // RENDER EVERYTHING
  // ==========================================================

  renderAll(data) {

    if (data.emergencies) {

      this.dataStore.emergencies =
        data.emergencies;

    }

    if (data.ambulances) {

      this.dataStore.ambulances =
        data.ambulances;

    }

    if (data.hospitals) {

      this.dataStore.hospitals =
        data.hospitals;

    }

    if (data.teams) {

      this.dataStore.teams =
        data.teams;

    }


    this.renderHospitals(
      this.dataStore.hospitals
    );

    this.renderEmergencies(
      this.dataStore.emergencies
    );

    this.renderAmbulances(
      this.dataStore.ambulances
    );

    this.renderResponseTeams(
      this.dataStore.teams
    );

    this.updateLiveStatsHUD();

  }


  // ==========================================================
  // HOSPITALS
  // ==========================================================

  renderHospitals(hospitals) {

    this.layerGroups.hospitals.clearLayers();

    this.markers.hospitals.clear();


    hospitals.forEach((h) => {

      const isDiversion =
        h.status === 'DIVERSION' ||
        h.icu_available === 0;


      const bedBadgeClass =
        isDiversion
          ? 'hospital-bed-badge zero'
          : 'hospital-bed-badge';


      const iconHtml = `

        <div
          class="hospital-marker-box"
          title="${h.name}"
        >

          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
          >

            <path d="M12 4v16M4 12h16"/>

          </svg>

          <div class="${bedBadgeClass}">
            ${h.icu_available}
          </div>

        </div>

      `;


      const customIcon = L.divIcon({

        html: iconHtml,

        className: 'custom-map-icon',

        iconSize: [
          36,
          36
        ],

        iconAnchor: [
          18,
          18
        ],

      });


      const marker = L.marker(

        [
          h.latitude,
          h.longitude
        ],

        {
          icon: customIcon
        }

      );


      marker.bindTooltip(

        `

          <div
            style="
              font-weight:700;
              color:#38BDF8;
            "
          >
            ${h.name}
          </div>

          <div>
            ICU Beds:
            <strong>
              ${h.icu_available}/${h.icu_total}
            </strong>

            |

            ED:
            <strong>
              ${h.ed_beds_available}/${h.ed_beds_total}
            </strong>
          </div>

          <div
            style="
              font-size:10px;
              color:${isDiversion ? '#EF4444' : '#10B981'};
              font-weight:700;
            "
          >
            ${h.status}
          </div>

        `,

        {
          offset: [
            0,
            -15
          ],

          opacity: 0.95

        }

      );


      marker.on('click', (e) => {

        L.DomEvent.stopPropagation(e);

        this.selectHospital(h);

      });


      marker.addTo(
        this.layerGroups.hospitals
      );


      this.markers.hospitals.set(
        h.id,
        marker
      );

    });

  }


  // ==========================================================
  // EMERGENCIES
  // ==========================================================

  renderEmergencies(emergencies) {

    this.layerGroups.emergencies.clearLayers();

    this.markers.emergencies.clear();


    emergencies.forEach((emg) => {

      const isCritical =
        emg.preliminary_urgency.includes('LEVEL_1') ||
        emg.preliminary_urgency.includes('LEVEL_2');


      const pulseClass =
        isCritical
          ? 'pulse-circle'
          : 'pulse-circle urgent';


      const iconHtml = `

        <div
          class="pulse-marker-beacon"
          title="Emergency ${emg.tracking_code}"
        >

          <div
            class="${pulseClass}"
          ></div>

          <div
            class="pulse-core"
            style="${!isCritical
              ? 'background:#F59E0B;'
              : ''
            }"
          >

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >

              <path
                d="M12 9v4M12 17h.01M5 19h14a2 2 0 0 0 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.27 16A2 2 0 0 0 5 19z"
              />

            </svg>

          </div>

        </div>

      `;


      const customIcon = L.divIcon({

        html: iconHtml,

        className: 'custom-map-icon',

        iconSize: [
          38,
          38
        ],

        iconAnchor: [
          19,
          19
        ],

      });


      const marker = L.marker(

        [
          emg.latitude,
          emg.longitude
        ],

        {
          icon: customIcon
        }

      );


      marker.bindTooltip(

        `

          <div
            style="
              color:#EF4444;
              font-weight:700;
            "
          >

            🚨 [${emg.tracking_code}]

            ${emg.preliminary_urgency
              .replace(/_/g, ' ')
            }

          </div>

          <div
            style="
              font-size:11px;
            "
          >

            ${emg.chief_complaint}

          </div>

          <div
            style="
              font-size:10px;
              color:#94A3B8;
            "
          >

            ${emg.address}

          </div>

        `,

        {
          offset: [
            0,
            -18
          ],

          opacity: 0.95

        }

      );


      marker.on('click', (e) => {

        L.DomEvent.stopPropagation(e);

        this.selectEmergency(emg);

      });


      marker.addTo(
        this.layerGroups.emergencies
      );


      this.markers.emergencies.set(
        emg.id,
        marker
      );

    });

  }


  // ==========================================================
  // AMBULANCES
  // ==========================================================

  renderAmbulances(ambulances) {

    this.layerGroups.ambulances.clearLayers();

    this.markers.ambulances.clear();


    ambulances.forEach((amb) => {

      let stateClass = '';


      if (
        amb.status === 'EN_ROUTE_PATIENT' ||
        amb.status === 'DISPATCHED'
      ) {

        stateClass = 'enroute';

      }

      else if (
        amb.status === 'ON_SCENE' ||
        amb.status === 'TRANSPORTING'
      ) {

        stateClass = 'dispatched';

      }


      const iconHtml = `

        <div
          class="ambulance-marker-box ${stateClass}"
          title="${amb.callsign} (${amb.capability})"
        >

          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >

            <rect
              x="2"
              y="7"
              width="15"
              height="9"
              rx="1.5"
            />

            <path
              d="M17 10h4l2 3v3h-6"
            />

            <circle
              cx="6"
              cy="18"
              r="2"
            />

            <circle
              cx="17"
              cy="18"
              r="2"
            />

          </svg>

          <div class="ambulance-cap-tag">
            ${amb.capability}
          </div>

        </div>

      `;


      const customIcon = L.divIcon({

        html: iconHtml,

        className: 'custom-map-icon',

        iconSize: [
          42,
          42
        ],

        iconAnchor: [
          21,
          21
        ],

      });


      const marker = L.marker(

        [
          amb.current_lat,
          amb.current_lng
        ],

        {

          icon: customIcon,

          draggable: true

        }

      );


      marker.bindTooltip(

        `

          <div
            style="
              color:#10B981;
              font-weight:700;
            "
          >

            🚑 ${amb.callsign}
            (${amb.capability})

          </div>

          <div>

            Status:
            <strong>
              ${amb.status}
            </strong>

            |

            Speed:
            ${amb.speed_kmh}
            km/h

          </div>

          <div
            style="
              font-size:10px;
              color:#38BDF8;
            "
          >

            💡 Drag to re-position
            (Simulation Mode)

          </div>

        `,

        {
          offset: [
            0,
            -20
          ],

          opacity: 0.95

        }

      );


      marker.on('click', (e) => {

        L.DomEvent.stopPropagation(e);

        this.selectAmbulance(amb);

      });


      marker.on(
        'dragend',
        async (e) => {

          const newLatLng =
            e.target.getLatLng();

          const prevLatLng = [

            amb.current_lat,

            amb.current_lng

          ];


          this.confirmAmbulanceMove(

            amb,

            prevLatLng,

            [
              newLatLng.lat,
              newLatLng.lng
            ],

            marker

          );

        }

      );


      marker.addTo(
        this.layerGroups.ambulances
      );


      this.markers.ambulances.set(
        amb.id,
        marker
      );

    });

  }


  // ==========================================================
  // RESPONSE TEAMS
  // ==========================================================

  renderResponseTeams(teams) {

    this.layerGroups.teams.clearLayers();

    this.markers.teams.clear();


    teams.forEach((tm) => {

      const iconHtml = `

        <div
          style="
            width:34px;
            height:34px;
            border-radius:50%;
            background:#1E293B;
            border:2px solid #3B82F6;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#38BDF8;
            box-shadow:
              0 2px 10px
              rgba(0,0,0,0.6);
          "
          title="${tm.name}"
        >

          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >

            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            />

            <circle
              cx="9"
              cy="7"
              r="4"
            />

            <path
              d="M22 21v-2a4 4 0 0 0-3-3.87"
            />

            <path
              d="M16 3.13a4 4 0 0 1 0 7.75"
            />

          </svg>

        </div>

      `;


      const customIcon = L.divIcon({

        html: iconHtml,

        className: 'custom-map-icon',

        iconSize: [
          34,
          34
        ],

        iconAnchor: [
          17,
          17
        ],

      });


      const marker = L.marker(

        [
          tm.current_lat,
          tm.current_lng
        ],

        {
          icon: customIcon
        }

      );


      marker.bindTooltip(

        `

          <div
            style="
              color:#60A5FA;
              font-weight:700;
            "
          >

            👨‍⚕️ ${tm.name}

          </div>

          <div
            style="
              font-size:11px;
            "
          >

            Type:
            ${tm.team_type.replace(/_/g, ' ')}

            |

            Status:
            ${tm.status}

          </div>

        `,

        {
          offset: [
            0,
            -16
          ]
        }

      );


      marker.on('click', (e) => {

        L.DomEvent.stopPropagation(e);

        this.selectResponseTeam(tm);

      });


      marker.addTo(
        this.layerGroups.teams
      );


      this.markers.teams.set(
        tm.id,
        marker
      );

    });

  }


  // ==========================================================
  // EMERGENCY INSPECTOR
  // ==========================================================

  selectEmergency(emg) {

    this.selectedEntity = {
      type: 'EMERGENCY',
      data: emg
    };


    const inspectorEl =
      document.getElementById(
        'map-inspector-hud'
      );


    if (!inspectorEl) {
      return;
    }


    const nearbyAmbs =
      this._getNearestAmbulances(
        emg.latitude,
        emg.longitude,
        3
      );


    let ambListHtml = '';


    if (nearbyAmbs.length > 0) {

      ambListHtml =
        nearbyAmbs.map(item => `

          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              padding:8px 10px;
              background:var(--bg-surface-elevated);
              border:1px solid var(--border-subtle);
              border-radius:6px;
              margin-bottom:6px;
            "
          >

            <div>

              <div
                style="
                  font-weight:700;
                  color:#FFFFFF;
                  font-size:12px;
                "
              >

                🚑 ${item.ambulance.callsign}

                <span
                  style="
                    font-size:10px;
                    color:#A7F3D0;
                  "
                >

                  (${item.ambulance.capability})

                </span>

              </div>

              <div
                style="
                  font-size:11px;
                  color:#94A3B8;
                "
              >

                Dist:
                <strong>
                  ${item.distance_km} km
                </strong>

                |

                Est:
                ~${item.est_eta} min

              </div>

            </div>


            <button
              onclick="MapController.dispatchAmbulanceToSelected('${item.ambulance.id}', '${emg.id}')"
              class="btn-crimson"
              style="
                padding:4px 10px;
                font-size:11px;
              "
            >

              Dispatch

            </button>

          </div>

        `).join('');

    }

    else {

      ambListHtml = `

        <div
          style="
            color:#94A3B8;
            font-size:11px;
            padding:8px;
          "
        >

          No available ambulances currently
          within response radius.

        </div>

      `;

    }


    inspectorEl.style.display = 'flex';


    inspectorEl.innerHTML = `

      <div class="inspector-header">

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <span
            style="
              color:#EF4444;
              font-size:14px;
            "
          >
            🔴
          </span>

          <div
            style="
              font-weight:700;
              font-size:13px;
              color:#FFFFFF;
            "
          >

            EMERGENCY
            ${emg.tracking_code}

          </div>

        </div>


        <button
          onclick="MapController.closeInspector()"
          style="
            background:transparent;
            border:none;
            color:#94A3B8;
            cursor:pointer;
            font-size:16px;
          "
        >

          ✕

        </button>

      </div>


      <div class="inspector-body">

        <div
          style="
            display:flex;
            gap:6px;
            margin-bottom:12px;
          "
        >

          <span class="status-chip critical">

            ${emg.preliminary_urgency
              .replace(/_/g, ' ')
            }

          </span>

          <span
            class="status-chip ${
              emg.status === 'REPORTED'
                ? 'urgent'
                : 'dispatched'
            }"
          >

            ${emg.status}

          </span>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:10px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Chief Complaint

          </div>

          <div
            style="
              color:#F1F5F9;
              font-weight:500;
            "
          >

            ${emg.chief_complaint}

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:12px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Reported Location

          </div>

          <div
            style="
              color:#94A3B8;
            "
          >

            ${emg.address}

          </div>

          <div
            class="mono"
            style="
              color:#64748B;
              font-size:10px;
              margin-top:2px;
            "
          >

            [
              ${emg.latitude.toFixed(4)},
              ${emg.longitude.toFixed(4)}
            ]

          </div>

        </div>


        <div
          style="
            border-top:
              1px solid var(--border-subtle);
            padding-top:10px;
            margin-top:8px;
          "
        >

          <div
            class="form-label"
            style="
              font-size:10px;
              color:#38BDF8;
            "
          >

            Nearby Available Ambulances

          </div>

          ${ambListHtml}

        </div>


        <div
          style="
            display:flex;
            gap:8px;
            margin-top:14px;
          "
        >

          <button
            onclick="App.openEmergencyModal('${emg.id}')"
            class="btn-secondary"
            style="
              flex:1;
              font-size:11px;
              padding:6px 0;
            "
          >

            Full Lifecycle

          </button>


          <button
            onclick="MapController.centerOn(
              ${emg.latitude},
              ${emg.longitude},
              15
            )"
            class="btn-secondary"
            style="
              flex:1;
              font-size:11px;
              padding:6px 0;
            "
          >

            Center View

          </button>

        </div>

      </div>

    `;

  }


  // ==========================================================
  // AMBULANCE INSPECTOR
  // ==========================================================

  selectAmbulance(amb) {

    this.selectedEntity = {
      type: 'AMBULANCE',
      data: amb
    };


    const inspectorEl =
      document.getElementById(
        'map-inspector-hud'
      );


    if (!inspectorEl) {
      return;
    }


    inspectorEl.style.display = 'flex';


    inspectorEl.innerHTML = `

      <div class="inspector-header">

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <span
            style="
              color:#10B981;
              font-size:14px;
            "
          >
            🚑
          </span>

          <div
            style="
              font-weight:700;
              font-size:13px;
              color:#FFFFFF;
            "
          >

            ${amb.callsign}

          </div>

        </div>


        <button
          onclick="MapController.closeInspector()"
          style="
            background:transparent;
            border:none;
            color:#94A3B8;
            cursor:pointer;
            font-size:16px;
          "
        >

          ✕

        </button>

      </div>


      <div class="inspector-body">

        <div
          style="
            display:flex;
            gap:6px;
            margin-bottom:12px;
          "
        >

          <span
            class="status-chip ${
              amb.status === 'AVAILABLE'
                ? 'available'
                : 'urgent'
            }"
          >

            ${amb.status}

          </span>

          <span
            class="status-chip dispatched"
          >

            ${amb.capability}

          </span>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            font-size:11px;
            margin-bottom:12px;
          "
        >

          <div
            style="
              background:
                var(--bg-surface-elevated);
              padding:8px;
              border-radius:6px;
              border:
                1px solid var(--border-subtle);
            "
          >

            <div
              class="form-label"
              style="font-size:9px;"
            >

              Current Speed

            </div>

            <div
              style="
                font-size:14px;
                font-weight:700;
                color:#FFFFFF;
              "
            >

              ${amb.speed_kmh}

              <span
                style="
                  font-size:10px;
                  color:#94A3B8;
                "
              >

                km/h

              </span>

            </div>

          </div>


          <div
            style="
              background:
                var(--bg-surface-elevated);
              padding:8px;
              border-radius:6px;
              border:
                1px solid var(--border-subtle);
            "
          >

            <div
              class="form-label"
              style="font-size:9px;"
            >

              Active ETA

            </div>

            <div
              style="
                font-size:14px;
                font-weight:700;
                color:#38BDF8;
              "
            >

              ${
                amb.eta_minutes
                  ? amb.eta_minutes + ' min'
                  : 'Idle'
              }

            </div>

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:12px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Coordinates

          </div>

          <div
            class="mono"
            style="
              color:#94A3B8;
            "
          >

            ${amb.current_lat.toFixed(5)},
            ${amb.current_lng.toFixed(5)}

          </div>

        </div>


        ${
          amb.assigned_emergency_id
            ? `

              <div
                style="
                  background:
                    rgba(239,68,68,0.1);
                  border:
                    1px solid
                    rgba(239,68,68,0.3);
                  padding:8px 10px;
                  border-radius:6px;
                  margin-bottom:12px;
                  font-size:11px;
                "
              >

                <div
                  style="
                    color:#FCA5A5;
                    font-weight:700;
                  "
                >

                  Assigned to Incident

                </div>

                <div
                  style="
                    color:#FFFFFF;
                  "
                >

                  ID:
                  ${amb.assigned_emergency_id}

                </div>

              </div>

            `
            : ''
        }


        <div
          style="
            background:
              rgba(168,85,247,0.12);
            border:
              1px solid
              rgba(168,85,247,0.3);
            padding:8px 10px;
            border-radius:6px;
            font-size:11px;
            color:#D8B4FE;
            margin-bottom:12px;
          "
        >

          💡

          <strong>
            Simulation Mode
          </strong>

          : You can drag this vehicle
          on the map to relocate its telematics.

        </div>


        <button
          onclick="MapController.centerOn(
            ${amb.current_lat},
            ${amb.current_lng},
            15
          )"
          class="btn-secondary"
          style="
            width:100%;
            font-size:11px;
            padding:7px 0;
          "
        >

          Center Vehicle

        </button>

      </div>

    `;

  }


  // ==========================================================
  // HOSPITAL INSPECTOR
  // ==========================================================

  selectHospital(h) {

    this.selectedEntity = {
      type: 'HOSPITAL',
      data: h
    };


    const inspectorEl =
      document.getElementById(
        'map-inspector-hud'
      );


    if (!inspectorEl) {
      return;
    }


    inspectorEl.style.display = 'flex';


    inspectorEl.innerHTML = `

      <div class="inspector-header">

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <span
            style="
              color:#38BDF8;
              font-size:14px;
            "
          >
            🏥
          </span>

          <div
            style="
              font-weight:700;
              font-size:13px;
              color:#FFFFFF;
            "
          >

            ${h.name}

          </div>

        </div>


        <button
          onclick="MapController.closeInspector()"
          style="
            background:transparent;
            border:none;
            color:#94A3B8;
            cursor:pointer;
            font-size:16px;
          "
        >

          ✕

        </button>

      </div>


      <div class="inspector-body">

        <div
          style="
            display:flex;
            gap:6px;
            margin-bottom:12px;
          "
        >

          <span
            class="status-chip ${
              h.status === 'NORMAL'
                ? 'available'
                : 'diversion'
            }"
          >

            ${h.status}

          </span>

          <span
            class="status-chip dispatched"
          >

            ${h.trauma_level}

          </span>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            font-size:11px;
            margin-bottom:14px;
          "
        >

          <div
            style="
              background:
                var(--bg-surface-elevated);
              padding:10px;
              border-radius:6px;
              border:
                1px solid
                var(--border-subtle);
              text-align:center;
            "
          >

            <div
              class="form-label"
              style="font-size:9px;"
            >

              Available ICU Beds

            </div>

            <div
              style="
                font-size:20px;
                font-weight:800;
                color:${
                  h.icu_available > 0
                    ? '#10B981'
                    : '#EF4444'
                };
              "
            >

              ${h.icu_available}

              <span
                style="
                  font-size:11px;
                  color:#64748B;
                "
              >

                / ${h.icu_total}

              </span>

            </div>

          </div>


          <div
            style="
              background:
                var(--bg-surface-elevated);
              padding:10px;
              border-radius:6px;
              border:
                1px solid
                var(--border-subtle);
              text-align:center;
            "
          >

            <div
              class="form-label"
              style="font-size:9px;"
            >

              Available ED Beds

            </div>

            <div
              style="
                font-size:20px;
                font-weight:800;
                color:#38BDF8;
              "
            >

              ${h.ed_beds_available}

              <span
                style="
                  font-size:11px;
                  color:#64748B;
                "
              >

                / ${h.ed_beds_total}

              </span>

            </div>

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:12px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Clinical Facilities

          </div>


          <div
            style="
              display:flex;
              flex-wrap:wrap;
              gap:5px;
              margin-top:4px;
            "
          >

            ${
              h.has_cath_lab
                ? '<span class="status-chip available">Cath Lab</span>'
                : ''
            }

            ${
              h.has_stroke_center
                ? '<span class="status-chip available">Stroke Center</span>'
                : ''
            }

            ${
              h.has_burn_unit
                ? '<span class="status-chip available">Burn Unit</span>'
                : ''
            }

            ${
              h.has_pediatric_icu
                ? '<span class="status-chip available">Pediatric ICU</span>'
                : ''
            }

            ${
              h.has_ct_scan
                ? '<span class="status-chip dispatched">CT Scan</span>'
                : ''
            }

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:14px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Address

          </div>

          <div
            style="
              color:#94A3B8;
            "
          >

            ${h.address}

          </div>

        </div>


        <div
          style="
            display:flex;
            gap:8px;
          "
        >

          <button
            onclick="App.triggerCapacityDrop('${h.id}')"
            class="btn-crimson"
            style="
              flex:1;
              font-size:11px;
              padding:6px 0;
            "
          >

            Simulate Drop

          </button>


          <button
            onclick="MapController.centerOn(
              ${h.latitude},
              ${h.longitude},
              15
            )"
            class="btn-secondary"
            style="
              flex:1;
              font-size:11px;
              padding:6px 0;
            "
          >

            Center

          </button>

        </div>

      </div>

    `;

  }


  // ==========================================================
  // RESPONSE TEAM INSPECTOR
  // ==========================================================

  selectResponseTeam(tm) {

    const inspectorEl =
      document.getElementById(
        'map-inspector-hud'
      );


    if (!inspectorEl) {
      return;
    }


    inspectorEl.style.display = 'flex';


    inspectorEl.innerHTML = `

      <div class="inspector-header">

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <span
            style="
              color:#60A5FA;
              font-size:14px;
            "
          >
            👨‍⚕️
          </span>

          <div
            style="
              font-weight:700;
              font-size:13px;
              color:#FFFFFF;
            "
          >

            ${tm.name}

          </div>

        </div>


        <button
          onclick="MapController.closeInspector()"
          style="
            background:transparent;
            border:none;
            color:#94A3B8;
            cursor:pointer;
            font-size:16px;
          "
        >

          ✕

        </button>

      </div>


      <div class="inspector-body">

        <div
          style="
            display:flex;
            gap:6px;
            margin-bottom:12px;
          "
        >

          <span
            class="status-chip available"
          >

            ${tm.status}

          </span>

          <span
            class="status-chip dispatched"
          >

            ${tm.team_type.replace(/_/g, ' ')}

          </span>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:10px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Specialization

          </div>

          <div
            style="
              color:#FFFFFF;
            "
          >

            ${tm.specialization}

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:10px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Base Station

          </div>

          <div
            style="
              color:#94A3B8;
            "
          >

            ${tm.base_station}

          </div>

        </div>


        <div
          style="
            font-size:11px;
            margin-bottom:12px;
          "
        >

          <div
            class="form-label"
            style="font-size:10px;"
          >

            Team Members

          </div>


          <div
            style="
              display:flex;
              flex-direction:column;
              gap:4px;
              margin-top:4px;
            "
          >

            ${tm.members.map(m => `

              <div
                style="
                  padding:4px 8px;
                  background:
                    var(--bg-surface-elevated);
                  border-radius:4px;
                  font-size:11px;
                "
              >

                <strong>
                  ${m.name}
                </strong>

                —

                <span
                  style="
                    color:#94A3B8;
                  "
                >

                  ${m.role}

                </span>

              </div>

            `).join('')}

          </div>

        </div>


        <button
          onclick="MapController.centerOn(
            ${tm.current_lat},
            ${tm.current_lng},
            15
          )"
          class="btn-secondary"
          style="
            width:100%;
            font-size:11px;
            padding:7px 0;
          "
        >

          Center Base Station

        </button>

      </div>

    `;

  }


  // ==========================================================
  // AREA INTELLIGENCE
  // ==========================================================

  async inspectArea(lat, lng) {

    const areaHud =
      document.getElementById(
        'map-area-hud'
      );


    if (!areaHud) {
      return;
    }


    areaHud.style.display = 'block';


    areaHud.innerHTML = `

      <div class="hud-title">

        <span>
          Area Overview
        </span>

        <span
          class="mono"
          style="
            font-size:10px;
            color:#94A3B8;
          "
        >

          ${lat.toFixed(4)},
          ${lng.toFixed(4)}

        </span>

      </div>


      <div
        style="
          font-size:11px;
          color:#94A3B8;
        "
      >

        Querying Pune GIS
        spatial data...

      </div>

    `;


    // --------------------------------------------------------
    // REVERSE GEOCODING
    // --------------------------------------------------------

    let areaName =
      'Pune Metropolitan Area';


    try {

      const geo =
        await API.reverseGeocode(
          lat,
          lng
        );


      areaName =
        geo.formatted_address
          .split(',')
          .slice(0, 2)
          .join(', ');

    }

    catch (e) {

      areaName =
        `Sector [${lat.toFixed(3)}, ${lng.toFixed(3)}]`;

    }


    // --------------------------------------------------------
    // PROXIMITY
    // --------------------------------------------------------

    const radiusKm = 4.5;


    const nearbyEmg =
      this.dataStore.emergencies.filter(

        e =>
          this._haversine(
            lat,
            lng,
            e.latitude,
            e.longitude
          ) <= radiusKm

      );


    const nearbyAmb =
      this.dataStore.ambulances.filter(

        a =>
          this._haversine(
            lat,
            lng,
            a.current_lat,
            a.current_lng
          ) <= radiusKm

      );


    const nearbyHosp =
      this.dataStore.hospitals.filter(

        h =>
          this._haversine(
            lat,
            lng,
            h.latitude,
            h.longitude
          ) <= radiusKm

      );


    // --------------------------------------------------------
    // RISK LEVEL
    // --------------------------------------------------------

    let riskLevel = 'LOW';

    let riskColor = '#10B981';


    if (nearbyEmg.length >= 2) {

      riskLevel = 'HIGH';

      riskColor = '#EF4444';

    }

    else if (nearbyEmg.length === 1) {

      riskLevel = 'MODERATE';

      riskColor = '#F59E0B';

    }


    // --------------------------------------------------------
    // RENDER AREA HUD
    // --------------------------------------------------------

    areaHud.innerHTML = `

      <div class="hud-title">

        <span>
          Area Overview
        </span>


        <button
          onclick="
            document
              .getElementById('map-area-hud')
              .style.display='none'
          "
          style="
            background:transparent;
            border:none;
            color:#94A3B8;
            cursor:pointer;
          "
        >

          ✕

        </button>

      </div>


      <div
        style="
          font-size:12px;
          font-weight:700;
          color:#FFFFFF;
          margin-bottom:8px;
        "
      >

        ${areaName}

      </div>


      <div
        style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          font-size:11px;
          margin-bottom:10px;
        "
      >

        <div
          style="
            background:
              rgba(255,255,255,0.04);
            padding:6px;
            border-radius:5px;
          "
        >

          <div
            style="
              color:#94A3B8;
              font-size:10px;
            "
          >

            Active Emergencies

          </div>

          <div
            style="
              font-weight:700;
              color:#EF4444;
              font-size:14px;
            "
          >

            ${nearbyEmg.length}

          </div>

        </div>


        <div
          style="
            background:
              rgba(255,255,255,0.04);
            padding:6px;
            border-radius:5px;
          "
        >

          <div
            style="
              color:#94A3B8;
              font-size:10px;
            "
          >

            Nearby Ambulances

          </div>

          <div
            style="
              font-weight:700;
              color:#10B981;
              font-size:14px;
            "
          >

            ${nearbyAmb.length}

          </div>

        </div>


        <div
          style="
            background:
              rgba(255,255,255,0.04);
            padding:6px;
            border-radius:5px;
          "
        >

          <div
            style="
              color:#94A3B8;
              font-size:10px;
            "
          >

            Nearby Hospitals

          </div>

          <div
            style="
              font-weight:700;
              color:#38BDF8;
              font-size:14px;
            "
          >

            ${nearbyHosp.length}

          </div>

        </div>


        <div
          style="
            background:
              rgba(255,255,255,0.04);
            padding:6px;
            border-radius:5px;
          "
        >

          <div
            style="
              color:#94A3B8;
              font-size:10px;
            "
          >

            Risk Level

          </div>

          <div
            style="
              font-weight:700;
              color:${riskColor};
              font-size:12px;
            "
          >

            ${riskLevel}

          </div>

        </div>

      </div>


      <div
        style="
          font-size:10px;
          color:#64748B;
        "
      >

        Radius ~4.5 km
        from clicked point

      </div>

    `;

  }


  // ==========================================================
  // AMBULANCE MOVE CONFIRMATION
  // ==========================================================

  confirmAmbulanceMove(
    amb,
    prevCoords,
    newCoords,
    marker
  ) {

    const modalEl =
      document.getElementById(
        'ambulance-move-modal'
      );


    if (!modalEl) {

      this._applyAmbulanceMove(
        amb,
        newCoords
      );

      return;

    }


    document.getElementById(
      'move-amb-callsign'
    ).textContent =
      amb.callsign;


    document.getElementById(
      'move-amb-prev'
    ).textContent =
      `${prevCoords[0].toFixed(4)},
       ${prevCoords[1].toFixed(4)}`;


    document.getElementById(
      'move-amb-new'
    ).textContent =
      `${newCoords[0].toFixed(4)},
       ${newCoords[1].toFixed(4)}`;


    this.draggedAmbulanceTemp = {

      amb,

      prevCoords,

      newCoords,

      marker

    };


    modalEl.classList.add('open');

  }


  // ==========================================================
  // EXECUTE AMBULANCE MOVE
  // ==========================================================

  async executeAmbulanceMove() {

    if (!this.draggedAmbulanceTemp) {
      return;
    }


    const {
      amb,
      newCoords
    } = this.draggedAmbulanceTemp;


    try {

      await API.updateAmbulanceTelemetry(

        amb.id,

        {

          current_lat: newCoords[0],

          current_lng: newCoords[1],

          status: amb.status

        }

      );


      App.showToast(

        `Relocated ${amb.callsign} to [` +
        `${newCoords[0].toFixed(3)}, ` +
        `${newCoords[1].toFixed(3)}]`,

        'success'

      );

    }


    catch (e) {

      App.showToast(

        `Failed to update vehicle location: ${e.message}`,

        'alert'

      );

      this.cancelAmbulanceMove();

    }


    finally {

      const modal =
        document.getElementById(
          'ambulance-move-modal'
        );


      if (modal) {
        modal.classList.remove('open');
      }


      this.draggedAmbulanceTemp = null;

    }

  }


  // ==========================================================
  // CANCEL AMBULANCE MOVE
  // ==========================================================

  cancelAmbulanceMove() {

    if (this.draggedAmbulanceTemp) {

      const {
        prevCoords,
        marker
      } = this.draggedAmbulanceTemp;


      marker.setLatLng(
        prevCoords
      );


      this.draggedAmbulanceTemp = null;

    }


    const modal =
      document.getElementById(
        'ambulance-move-modal'
      );


    if (modal) {

      modal.classList.remove('open');

    }

  }


  // ==========================================================
  // ROAD ROUTING
  // ==========================================================

  async drawAmbulanceRoute(
    originLat,
    originLng,
    destLat,
    destLng,
    meta = {}
  ) {

    if (this.activeRoutePolyline) {

      this.layerGroups.routes.removeLayer(
        this.activeRoutePolyline
      );

      this.activeRoutePolyline = null;

    }


    try {

      const route =
        await API.getRoute(

          originLat,
          originLng,

          destLat,
          destLng

        );


      if (
        route &&
        route.polyline_coords
      ) {

        this.activeRoutePolyline =
          L.polyline(

            route.polyline_coords,

            {

              color: '#38BDF8',

              weight: 4,

              opacity: 0.85,

              dashArray: '8, 8',

              lineCap: 'round',

            }

          ).addTo(
            this.layerGroups.routes
          );


        this.map.fitBounds(

          this.activeRoutePolyline.getBounds(),

          {
            padding: [
              60,
              60
            ]
          }

        );


        App.showToast(

          `Route dispatched: ${route.distance_km} km, ETA: ~${route.duration_minutes} min`,

          'success'

        );


        return route;

      }

    }


    catch (e) {

      console.warn(

        '[MapEngine] Routing failed. ' +
        'Drawing direct fallback line.',

        e

      );


      this.activeRoutePolyline =
        L.polyline(

          [
            [
              originLat,
              originLng
            ],

            [
              destLat,
              destLng
            ]
          ],

          {

            color: '#EF4444',

            weight: 3,

            opacity: 0.8,

            dashArray: '5, 5'

          }

        ).addTo(
          this.layerGroups.routes
        );

    }

  }


  // ==========================================================
  // HUD CONTROLS
  // ==========================================================

  _bindHUDControls() {

    const chkEmg =
      document.getElementById(
        'layer-chk-emg'
      );

    const chkAmb =
      document.getElementById(
        'layer-chk-amb'
      );

    const chkHosp =
      document.getElementById(
        'layer-chk-hosp'
      );

    const chkTeam =
      document.getElementById(
        'layer-chk-team'
      );


    if (chkEmg) {

      chkEmg.addEventListener(
        'change',
        (e) => {

          this.toggleLayer(
            'emergencies',
            e.target.checked
          );

        }
      );

    }


    if (chkAmb) {

      chkAmb.addEventListener(
        'change',
        (e) => {

          this.toggleLayer(
            'ambulances',
            e.target.checked
          );

        }
      );

    }


    if (chkHosp) {

      chkHosp.addEventListener(
        'change',
        (e) => {

          this.toggleLayer(
            'hospitals',
            e.target.checked
          );

        }
      );

    }


    if (chkTeam) {

      chkTeam.addEventListener(
        'change',
        (e) => {

          this.toggleLayer(
            'teams',
            e.target.checked
          );

        }
      );

    }


    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const searchInput =
      document.getElementById(
        'map-search-input'
      );


    if (searchInput) {

      searchInput.addEventListener(
        'input',
        (e) => {

          this.filterBySearch(
            e.target.value
              .toLowerCase()
              .trim()
          );

        }
      );

    }

  }


  // ==========================================================
  // LAYER TOGGLE
  // ==========================================================

  toggleLayer(
    layerKey,
    isVisible
  ) {

    if (!this.layerGroups[layerKey]) {
      return;
    }


    if (isVisible) {

      this.map.addLayer(
        this.layerGroups[layerKey]
      );

    }

    else {

      this.map.removeLayer(
        this.layerGroups[layerKey]
      );

    }

  }


  // ==========================================================
  // CENTER MAP
  // ==========================================================

  centerOn(
    lat,
    lng,
    zoom = 14
  ) {

    if (!this.map) {
      return;
    }


    this.map.setView(

      [
        lat,
        lng
      ],

      zoom,

      {
        animate: true,
        duration: 0.8
      }

    );

  }


  // ==========================================================
  // FIT ALL
  // ==========================================================

  fitAll() {

    const allMarkers = [

      ...Array.from(
        this.markers.emergencies.values()
      ),

      ...Array.from(
        this.markers.ambulances.values()
      ),

      ...Array.from(
        this.markers.hospitals.values()
      )

    ];


    if (allMarkers.length > 0) {

      const group =
        L.featureGroup(
          allMarkers
        );


      this.map.fitBounds(

        group.getBounds(),

        {
          padding: [
            50,
            50
          ]
        }

      );

    }

  }


  // ==========================================================
  // LOCATE AVAILABLE AMBULANCES
  // ==========================================================

  locateAvailableAmbulances() {

    const available =
      this.dataStore.ambulances.filter(

        a =>
          a.status === 'AVAILABLE'

      );


    if (available.length === 0) {

      App.showToast(

        'No ambulances currently available in fleet',

        'alert'

      );

      return;

    }


    const markers =
      available
        .map(
          a =>
            this.markers.ambulances.get(
              a.id
            )
        )
        .filter(Boolean);


    if (markers.length > 0) {

      const group =
        L.featureGroup(
          markers
        );


      this.map.fitBounds(

        group.getBounds(),

        {
          padding: [
            50,
            50
          ]
        }

      );

    }

  }


  // ==========================================================
  // LIVE HUD STATISTICS
  // ==========================================================

  updateLiveStatsHUD() {

    const elEmg =
      document.getElementById(
        'hud-count-emg'
      );

    const elAmb =
      document.getElementById(
        'hud-count-amb'
      );

    const elHosp =
      document.getElementById(
        'hud-count-hosp'
      );


    if (elEmg) {

      elEmg.textContent =
        this.dataStore.emergencies.length;

    }


    if (elAmb) {

      const avail =
        this.dataStore.ambulances.filter(

          a =>
            a.status === 'AVAILABLE'

        ).length;


      elAmb.textContent =
        `${avail}/${this.dataStore.ambulances.length}`;

    }


    if (elHosp) {

      elHosp.textContent =
        this.dataStore.hospitals.length;

    }

  }


  // ==========================================================
  // SEARCH/FILTER
  // ==========================================================

  filterBySearch(query) {

    if (!query) {

      this.markers.emergencies.forEach(
        marker =>
          marker.setOpacity(1)
      );

      this.markers.ambulances.forEach(
        marker =>
          marker.setOpacity(1)
      );

      this.markers.hospitals.forEach(
        marker =>
          marker.setOpacity(1)
      );

      this.markers.teams.forEach(
        marker =>
          marker.setOpacity(1)
      );

      return;

    }


    this.dataStore.emergencies.forEach(
      emg => {

        const marker =
          this.markers.emergencies.get(
            emg.id
          );


        if (!marker) {
          return;
        }


        const text = [

          emg.tracking_code,

          emg.chief_complaint,

          emg.address,

          emg.status

        ]
          .join(' ')
          .toLowerCase();


        marker.setOpacity(
          text.includes(query)
            ? 1
            : 0.15
        );

      }
    );


    this.dataStore.ambulances.forEach(
      amb => {

        const marker =
          this.markers.ambulances.get(
            amb.id
          );


        if (!marker) {
          return;
        }


        const text = [

          amb.callsign,

          amb.capability,

          amb.status,

          amb.assigned_emergency_id || ''

        ]
          .join(' ')
          .toLowerCase();


        marker.setOpacity(
          text.includes(query)
            ? 1
            : 0.15
        );

      }
    );


    this.dataStore.hospitals.forEach(
      h => {

        const marker =
          this.markers.hospitals.get(
            h.id
          );


        if (!marker) {
          return;
        }


        const text = [

          h.name,

          h.address,

          h.status,

          h.trauma_level

        ]
          .join(' ')
          .toLowerCase();


        marker.setOpacity(
          text.includes(query)
            ? 1
            : 0.15
        );

      }
    );


    this.dataStore.teams.forEach(
      tm => {

        const marker =
          this.markers.teams.get(
            tm.id
          );


        if (!marker) {
          return;
        }


        const text = [

          tm.name,

          tm.team_type,

          tm.status,

          tm.specialization,

          tm.base_station

        ]
          .join(' ')
          .toLowerCase();


        marker.setOpacity(
          text.includes(query)
            ? 1
            : 0.15
        );

      }
    );

  }


  // ==========================================================
  // FIND NEAREST AMBULANCES
  // ==========================================================

  _getNearestAmbulances(
    lat,
    lng,
    limit = 3
  ) {

    const available =
      this.dataStore.ambulances.filter(

        a =>
          a.status === 'AVAILABLE'

      );


    const withDistance =
      available.map(a => {

        const dist =
          this._haversine(

            lat,
            lng,

            a.current_lat,
            a.current_lng

          );


        return {

          ambulance: a,

          distance_km:
            Math.round(
              dist * 10
            ) / 10,

          est_eta:
            Math.max(

              2,

              Math.round(
                (dist / 40) * 60
              )

            )

        };

      });


    withDistance.sort(

      (a, b) =>
        a.distance_km -
        b.distance_km

    );


    return withDistance.slice(
      0,
      limit
    );

  }


  // ==========================================================
  // HAVERSINE DISTANCE
  // ==========================================================

  _haversine(
    lat1,
    lon1,
    lat2,
    lon2
  ) {

    const R = 6371;


    const dLat =
      (lat2 - lat1) *
      Math.PI / 180;


    const dLon =
      (lon2 - lon1) *
      Math.PI / 180;


    const a =

      Math.sin(
        dLat / 2
      ) *
      Math.sin(
        dLat / 2
      )

      +

      Math.cos(
        lat1 * Math.PI / 180
      )

      *

      Math.cos(
        lat2 * Math.PI / 180
      )

      *

      Math.sin(
        dLon / 2
      )

      *

      Math.sin(
        dLon / 2
      );


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return R * c;

  }

}


// ============================================================
// GLOBAL MAP ENGINE INSTANCE
// ============================================================

window.MapEngineInstance =
  new MapEngine();


// ============================================================
// GLOBAL MAP CONTROLLER
// Used by inline HTML buttons
// ============================================================

window.MapController = {

  closeInspector() {

    const inspectorEl =
      document.getElementById(
        'map-inspector-hud'
      );


    if (inspectorEl) {

      inspectorEl.style.display =
        'none';

    }

  },


  centerOn(
    lat,
    lng,
    zoom
  ) {

    window.MapEngineInstance.centerOn(
      lat,
      lng,
      zoom
    );

  },


  async dispatchAmbulanceToSelected(
    ambId,
    emgId
  ) {

    const engine =
      window.MapEngineInstance;


    const emg =
      engine.dataStore.emergencies.find(
        e =>
          e.id === emgId
      );


    const amb =
      engine.dataStore.ambulances.find(
        a =>
          a.id === ambId
      );


    if (!emg || !amb) {
      return;
    }


    if (
      confirm(
        `Confirm dispatch of ${amb.callsign} (${amb.capability}) to Emergency ${emg.tracking_code}?`
      )
    ) {

      try {

        await API.dispatchAmbulance(
          ambId,
          emgId
        );


        await engine.drawAmbulanceRoute(

          amb.current_lat,
          amb.current_lng,

          emg.latitude,
          emg.longitude

        );


        App.showToast(

          `Ambulance ${amb.callsign} dispatched to ${emg.tracking_code}`,

          'success'

        );


        this.closeInspector();


        App.refreshAllData();

      }


      catch (err) {

        App.showToast(

          `Dispatch failed: ${err.message}`,

          'alert'

        );

      }

    }

  }

};