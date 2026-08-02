package metrics

import (
	"fmt"
	"net/http"
	"sync/atomic"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
)

const (
	// DefaultMetricsPort specifies the default HTTP port for Prometheus metrics
	DefaultMetricsPort = "9090"
	// MetricsPath specifies the default path for Prometheus metrics scraping
	MetricsPath = "/metrics"
)

var (
	activeClients atomic.Int64
	totalMsgs     atomic.Int64
)

// ClientConnected increments the active IRC client gauge
func ClientConnected() {
	activeClients.Add(1)
}

// ClientDisconnected decrements the active IRC client gauge
func ClientDisconnected() {
	activeClients.Add(-1)
}

// MessageProcessed increments the total IRC message counter
func MessageProcessed() {
	totalMsgs.Add(1)
}

// Handler outputs standard Prometheus exposition text format
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	fmt.Fprintf(w, "# HELP ircd_connected_clients Number of active connected IRC clients\n")
	fmt.Fprintf(w, "# TYPE ircd_connected_clients gauge\n")
	fmt.Fprintf(w, "ircd_connected_clients %d\n\n", activeClients.Load())

	fmt.Fprintf(w, "# HELP ircd_messages_total Total IRC messages processed\n")
	fmt.Fprintf(w, "# TYPE ircd_messages_total counter\n")
	fmt.Fprintf(w, "ircd_messages_total %d\n", totalMsgs.Load())
}

// StartServer starts the HTTP metrics endpoint in a background goroutine
func StartServer(port string) {
	mux := http.NewServeMux()
	mux.HandleFunc(MetricsPath, Handler)

	addr := fmt.Sprintf(":%s", port)
	logger.Info("Starting Prometheus metrics HTTP server on %s%s...", addr, MetricsPath)

	go func() {
		if err := http.ListenAndServe(addr, mux); err != nil {
			logger.Error("Metrics HTTP server error: %v", err)
		}
	}()
}
