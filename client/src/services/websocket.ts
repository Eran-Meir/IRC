export type MessageHandler = (line: string) => void;
export type StatusHandler = (connected: boolean) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: MessageHandler;
  private onStatusCallback: StatusHandler;
  private reconnectTimer: number | null = null;
  private isExplicitDisconnect: boolean = false;

  constructor(url: string, onMessage: MessageHandler, onStatus: StatusHandler) {
    this.url = url;
    this.onMessageCallback = onMessage;
    this.onStatusCallback = onStatus;
  }

  public connect() {
    this.isExplicitDisconnect = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to IRC Gateway');
        this.onStatusCallback(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        const lines = event.data.split('\r\n');
        for (const line of lines) {
          if (line.trim()) {
            this.onMessageCallback(line.trim());
          }
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected from IRC Gateway');
        this.onStatusCallback(false);
        if (!this.isExplicitDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
        this.onStatusCallback(false);
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {
            // Ignore close error
          }
        }
      };
    } catch (e) {
      console.error('[WebSocket] Setup exception:', e);
      this.onStatusCallback(false);
      if (!this.isExplicitDisconnect) {
        this.scheduleReconnect();
      }
    }
  }

  public send(line: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(line + '\r\n');
    } else {
      console.warn('[WebSocket] Cannot send, socket not open');
    }
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitDisconnect) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitDisconnect) {
        console.log('[WebSocket] Attempting auto-reconnect...');
        this.connect();
      }
    }, 3000);
  }
}
