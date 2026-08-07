package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

// ─── Configuração ─────────────────────────────────────────────────────────────

const (
	defaultPort    = "8080"
	dataFilePath   = "data.json"
	useFilePersist = false // Mude para true para ativar persistência em JSON
)

// ─── CORS Middleware ──────────────────────────────────────────────────────────

// corsMiddleware adiciona os headers necessários para permitir requisições
// de origens diferentes (e.g., frontend em localhost:3000).
// Também trata o preflight request (OPTIONS) enviado pelo browser antes de PUT/DELETE.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Preflight request: responde imediatamente sem passar para o handler real.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ─── Logger Middleware ────────────────────────────────────────────────────────

// loggerMiddleware registra cada requisição com método e caminho.
func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[%s] %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

func main() {
	// Seleção do store via constante de configuração.
	// Em produção, isso viria de uma variável de ambiente (e.g., USE_FILE_PERSIST=true).
	var store Store
	var err error

	if useFilePersist {
		store, err = NewFileStore(dataFilePath)
		if err != nil {
			log.Fatalf("falha ao inicializar FileStore: %v", err)
		}
		log.Printf("modo de persistência: arquivo JSON (%s)", dataFilePath)
	} else {
		store = NewMemoryStore()
		log.Println("modo de persistência: memória (dados perdidos ao reiniciar)")
	}

	// Injeção do store no handler (sem estado global).
	taskHandler := NewTaskHandler(store)

	// Mux com as rotas da API.
	mux := http.NewServeMux()
	mux.Handle("/tasks", taskHandler)
	mux.Handle("/tasks/", taskHandler) // Captura /tasks/{id}

	// Rota de health check — útil para monitoramento e containers.
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"status":"ok"}`)
	})

	// Encadeamento de middlewares: Logger → CORS → Mux
	handler := loggerMiddleware(corsMiddleware(mux))

	// Porta configurável via variável de ambiente, com fallback para 8080.
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	log.Printf("🚀 Servidor iniciado em http://localhost:%s", port)
	log.Printf("📋 Endpoints disponíveis:")
	log.Printf("   GET    /tasks        → listar todas as tarefas")
	log.Printf("   POST   /tasks        → criar nova tarefa")
	log.Printf("   GET    /tasks/{id}   → buscar tarefa por ID")
	log.Printf("   PUT    /tasks/{id}   → atualizar tarefa")
	log.Printf("   DELETE /tasks/{id}   → deletar tarefa")
	log.Printf("   GET    /health       → health check")

	server := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}
