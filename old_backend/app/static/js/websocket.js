/**
 * LIFELINK — Real-time WebSocket Client
 * Connects to ws://localhost:8000/ws with automatic reconnect and event dispatcher
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 10000;
    this.heartbeatTimer = null;
    this.isConnected = false;
    this.lastSyncTime = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastSyncTime = new Date();
        this._updateStatusUI('LIVE', true);
        this._startHeartbeat();
        this._emit('status_change', { isConnected: true });
        console.log('[WebSocket] Connected to', wsUrl);
      };

      this.ws.onmessage = (event) => {
        this.lastSyncTime = new Date();
        this._updateSyncTimeUI();

        try {
          const message = JSON.parse(event.data);
          if (message.type === 'pong') return;

          const channel = message.channel || message.type || 'message';
          const data = message.data || message;

          this._emit(channel, data);
          this._emit('*', { channel, data });
        } catch (err) {
          console.warn('[WebSocket] Error parsing incoming message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Error:', err);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this._stopHeartbeat();
        this._updateStatusUI('RECONNECTING...', false);
        this._emit('status_change', { isConnected: false });

        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      };
    } catch (e) {
      console.error('[WebSocket] Setup exception:', e);
      setTimeout(() => this.connect(), 3000);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, filtered);
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[WebSocket] Listener error on '${event}':`, e);
        }
      });
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _updateStatusUI(text, isLive) {
    const dotEl = document.getElementById('ws-conn-dot');
    const textEl = document.getElementById('ws-conn-text');
    if (dotEl) {
      dotEl.className = isLive ? 'conn-dot' : 'conn-dot offline';
    }
    if (textEl) {
      textEl.textContent = text;
    }
    const monitorWs = document.getElementById('monitor-ws-status');
    if (monitorWs) {
      monitorWs.textContent = isLive ? 'Connected' : 'Reconnecting';
      monitorWs.className = isLive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold';
    }
  }

  _updateSyncTimeUI() {
    const timeEl = document.getElementById('ws-sync-time');
    if (timeEl && this.lastSyncTime) {
      const hours = String(this.lastSyncTime.getHours()).padStart(2, '0');
      const mins = String(this.lastSyncTime.getMinutes()).padStart(2, '0');
      const secs = String(this.lastSyncTime.getSeconds()).padStart(2, '0');
      timeEl.textContent = `${hours}:${mins}:${secs}`;
    }
    const monitorSync = document.getElementById('monitor-last-sync');
    if (monitorSync && this.lastSyncTime) {
      monitorSync.textContent = this.lastSyncTime.toLocaleTimeString();
    }
  }
}

window.WS = new WebSocketClient();
