package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// ─── Handler Central ─────────────────────────────────────────────────────────

// TaskHandler agrupa o store e expõe os handlers HTTP como métodos.
// Essa abordagem evita variáveis globais e facilita testes unitários (injeção de dependência).
type TaskHandler struct {
	store Store
}

// NewTaskHandler cria um TaskHandler com o store fornecido.
func NewTaskHandler(store Store) *TaskHandler {
	return &TaskHandler{store: store}
}

// ─── Roteamento ───────────────────────────────────────────────────────────────

// ServeHTTP implementa http.Handler, centralizando o roteamento de /tasks e /tasks/{id}.
func (h *TaskHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extrai o segmento após /tasks/ para obter o ID, se houver.
	// Exemplo: /tasks/123 → id = "123"
	//          /tasks     → id = ""
	id := strings.TrimPrefix(r.URL.Path, "/tasks")
	id = strings.TrimPrefix(id, "/")

	switch {
	case id == "" && r.Method == http.MethodGet:
		h.listTasks(w, r)

	case id == "" && r.Method == http.MethodPost:
		h.createTask(w, r)

	case id != "" && r.Method == http.MethodGet:
		h.getTask(w, r, id)

	case id != "" && r.Method == http.MethodPut:
		h.updateTask(w, r, id)

	case id != "" && r.Method == http.MethodDelete:
		h.deleteTask(w, r, id)

	default:
		respondError(w, http.StatusMethodNotAllowed, "método não suportado")
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

// GET /tasks → lista todas as tarefas
func (h *TaskHandler) listTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.store.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "erro ao buscar tarefas")
		return
	}

	// Garante que a resposta seja sempre um array JSON, nunca null.
	if tasks == nil {
		tasks = []Task{}
	}
	respondJSON(w, http.StatusOK, tasks)
}

// GET /tasks/{id} → busca uma tarefa específica
func (h *TaskHandler) getTask(w http.ResponseWriter, r *http.Request, id string) {
	task, err := h.store.GetByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, task)
}

// POST /tasks → cria uma nova tarefa
func (h *TaskHandler) createTask(w http.ResponseWriter, r *http.Request) {
	var input Task
	if err := decodeBody(r, &input); err != nil {
		respondError(w, http.StatusBadRequest, "corpo da requisição inválido: "+err.Error())
		return
	}

	// Validação das regras de negócio antes de persistir.
	if err := input.Validate(); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	created, err := h.store.Create(input)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "erro ao criar tarefa")
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

// PUT /tasks/{id} → atualiza uma tarefa existente
func (h *TaskHandler) updateTask(w http.ResponseWriter, r *http.Request, id string) {
	var input Task
	if err := decodeBody(r, &input); err != nil {
		respondError(w, http.StatusBadRequest, "corpo da requisição inválido: "+err.Error())
		return
	}

	if err := input.Validate(); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	updated, err := h.store.Update(id, input)
	if err != nil {
		if isNotFound(err) {
			respondError(w, http.StatusNotFound, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, "erro ao atualizar tarefa")
		}
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

// DELETE /tasks/{id} → remove uma tarefa
func (h *TaskHandler) deleteTask(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.Delete(id); err != nil {
		if isNotFound(err) {
			respondError(w, http.StatusNotFound, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, "erro ao deletar tarefa")
		}
		return
	}
	// 204 No Content: sucesso sem corpo de resposta.
	w.WriteHeader(http.StatusNoContent)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// apiError é o envelope padrão de erros da API.
type apiError struct {
	Error string `json:"error"`
}

// respondJSON serializa o payload como JSON e define os headers corretos.
func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// respondError envia uma resposta de erro padronizada em JSON.
func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, apiError{Error: msg})
}

// decodeBody deserializa o corpo JSON da request. Retorna erro descritivo em caso de falha.
func decodeBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

// isNotFound verifica se a mensagem de erro indica "não encontrado".
func isNotFound(err error) bool {
	return errors.Is(err, errNotFound) || strings.Contains(err.Error(), "não encontrada")
}

// errNotFound é um sentinel error para identificação de recursos não encontrados.
var errNotFound = errors.New("não encontrada")
