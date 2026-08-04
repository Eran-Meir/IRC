package server

import (
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
)

const websocketGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// WSConn wraps a hijacked WebSocket connection into a standard net.Conn interface
type WSConn struct {
	conn net.Conn
	buf  []byte
}

func (w *WSConn) Read(b []byte) (n int, err error) {
	for {
		if len(w.buf) > 0 {
			n = copy(b, w.buf)
			w.buf = w.buf[n:]
			return n, nil
		}

		// Read WebSocket frame header (minimal RFC 6455 frame reader)
		header := make([]byte, 2)
		if _, err := io.ReadFull(w.conn, header); err != nil {
			return 0, err
		}

		opcode := header[0] & 0x0f
		masked := header[1]&0x80 != 0
		payloadLen := int(header[1] & 0x7f)

		if opcode == 0x8 { // Connection Close
			return 0, io.EOF
		}

		if payloadLen == 126 {
			extended := make([]byte, 2)
			if _, err := io.ReadFull(w.conn, extended); err != nil {
				return 0, err
			}
			payloadLen = int(extended[0])<<8 | int(extended[1])
		}

		maskKey := make([]byte, 4)
		if masked {
			if _, err := io.ReadFull(w.conn, maskKey); err != nil {
				return 0, err
			}
		}

		payload := make([]byte, payloadLen)
		if _, err := io.ReadFull(w.conn, payload); err != nil {
			return 0, err
		}

		if masked {
			for i := 0; i < payloadLen; i++ {
				payload[i] ^= maskKey[i%4]
			}
		}

		if opcode == 0x9 { // Ping frame -> Respond with Pong frame (0x8a)
			pongHeader := []byte{0x8a, byte(len(payload))}
			w.conn.Write(append(pongHeader, payload...))
			continue
		}

		if opcode == 0xa { // Pong frame -> Keepalive acknowledged
			continue
		}

		if opcode == 0x1 || opcode == 0x2 || opcode == 0x0 { // Text, Binary, or Continuation frame
			w.buf = append(w.buf, payload...)
		}
	}
}

func (w *WSConn) Write(b []byte) (n int, err error) {
	// Write RFC 6455 unmasked Text Frame (0x81)
	payloadLen := len(b)
	var header []byte

	if payloadLen <= 125 {
		header = []byte{0x81, byte(payloadLen)}
	} else if payloadLen <= 65535 {
		header = []byte{0x81, 126, byte(payloadLen >> 8), byte(payloadLen & 0xff)}
	} else {
		return 0, fmt.Errorf("payload too large")
	}

	frame := append(header, b...)
	_, err = w.conn.Write(frame)
	if err != nil {
		return 0, err
	}
	return len(b), nil
}

func (w *WSConn) Close() error {
	return w.conn.Close()
}
func (w *WSConn) LocalAddr() net.Addr                { return w.conn.LocalAddr() }
func (w *WSConn) RemoteAddr() net.Addr               { return w.conn.RemoteAddr() }
func (w *WSConn) SetDeadline(t time.Time) error      { return w.conn.SetDeadline(t) }
func (w *WSConn) SetReadDeadline(t time.Time) error  { return w.conn.SetReadDeadline(t) }
func (w *WSConn) SetWriteDeadline(t time.Time) error { return w.conn.SetWriteDeadline(t) }

// HandleWebSocket upgrades HTTP GET /ws to a WebSocket stream and launches client.Handle()
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Upgrade") != "websocket" {
		http.Error(w, "Not a websocket handshake", http.StatusBadRequest)
		return
	}

	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		http.Error(w, "Missing Sec-WebSocket-Key", http.StatusBadRequest)
		return
	}

	h := sha1.New()
	h.Write([]byte(key + websocketGUID))
	acceptKey := base64.StdEncoding.EncodeToString(h.Sum(nil))

	hj, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Webserver does not support hijacking", http.StatusInternalServerError)
		return
	}

	conn, bufrw, err := hj.Hijack()
	if err != nil {
		logger.Error("Hijack failed: %v", err)
		return
	}
	_ = bufrw

	resp := fmt.Sprintf("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n", acceptKey)
	conn.Write([]byte(resp))

	ws := &WSConn{conn: conn}
	client := NewClient(ws)
	go client.Handle()
}
