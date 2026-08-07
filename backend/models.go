package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
)

// ─── Domínio ────────────────────────────────────────────────────────────────

// Status representa os estados válidos de uma tarefa.
type Status string

const (
	StatusToDo       Status = "A Fazer"
	StatusInProgress Status = "Em Progresso"
	StatusDone       Status = "Concluídas"
)

// validStatuses lista todos os status aceitos para facilitar a validação.
var validStatuses = map[Status]bool{
	StatusToDo:       true,
	StatusInProgress: true,
	StatusDone:       true,
}

// Task é a entidade central do Mini Kanban.
type Task struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"` // omitempty: não serializa se vazio
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Validate aplica as regras de negócio da entidade Task.
func (t *Task) Validate() error {
	if t.Title == "" {
		return errors.New("o campo 'title' é obrigatório")
	}
	if t.Status == "" {
		return errors.New("o campo 'status' é obrigatório")
	}
	if !validStatuses[t.Status] {
		return fmt.Errorf("status inválido: '%s'. Valores aceitos: 'A Fazer', 'Em Progresso', 'Concluídas'", t.Status)
	}
	return nil
}

// ─── Interface do Store ──────────────────────────────────────────────────────

// Store define o contrato para qualquer implementação de persistência.
// Isso garante que MemoryStore e FileStore são intercambiáveis sem alterar os handlers.
type Store interface {
	GetAll() ([]Task, error)
	GetByID(id string) (Task, error)
	Create(task Task) (Task, error)
	Update(id string, task Task) (Task, error)
	Delete(id string) error
}

// ─── Implementação In-Memory ─────────────────────────────────────────────────

// MemoryStore armazena tarefas em um mapa na memória RAM.
// O RWMutex permite leituras concorrentes e escritas exclusivas (thread-safe).
type MemoryStore struct {
	mu      sync.RWMutex
	records map[string]Task
	counter int64
}

// NewMemoryStore cria e inicializa um MemoryStore vazio.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		records: make(map[string]Task),
	}
}

// generateID cria um ID único baseado em timestamp + contador atômico.
// Evita dependência de pacotes externos (uuid) mantendo unicidade prática.
func (s *MemoryStore) generateID() string {
	s.counter++
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), s.counter)
}

func (s *MemoryStore) GetAll() ([]Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tasks := make([]Task, 0, len(s.records))
	for _, t := range s.records {
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (s *MemoryStore) GetByID(id string) (Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, ok := s.records[id]
	if !ok {
		return Task{}, fmt.Errorf("tarefa com id '%s' não encontrada", id)
	}
	return task, nil
}

func (s *MemoryStore) Create(task Task) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	task.ID = s.generateID()
	task.CreatedAt = now
	task.UpdatedAt = now
	s.records[task.ID] = task
	return task, nil
}

func (s *MemoryStore) Update(id string, updated Task) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.records[id]
	if !ok {
		return Task{}, fmt.Errorf("tarefa com id '%s' não encontrada", id)
	}

	// Preserva metadados imutáveis e aplica apenas os campos editáveis.
	existing.Title = updated.Title
	existing.Description = updated.Description
	existing.Status = updated.Status
	existing.UpdatedAt = time.Now()

	s.records[id] = existing
	return existing, nil
}

func (s *MemoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.records[id]; !ok {
		return fmt.Errorf("tarefa com id '%s' não encontrada", id)
	}
	delete(s.records, id)
	return nil
}

// ─── Implementação FileStore (Bônus: Persistência em JSON) ───────────────────

// FileStore persiste os dados em um arquivo JSON no disco.
// Herda o MemoryStore como cache em memória e sincroniza com o arquivo a cada escrita.
type FileStore struct {
	*MemoryStore
	filePath string
}

// NewFileStore cria um FileStore, carregando dados existentes do arquivo se houver.
func NewFileStore(path string) (*FileStore, error) {
	ms := NewMemoryStore()
	fs := &FileStore{
		MemoryStore: ms,
		filePath:    path,
	}
	if err := fs.load(); err != nil {
		return nil, err
	}
	return fs, nil
}

// load lê o arquivo JSON e popula o MemoryStore. Ignora se o arquivo não existir.
func (fs *FileStore) load() error {
	data, err := os.ReadFile(fs.filePath)
	if errors.Is(err, os.ErrNotExist) {
		return nil // Primeira execução: arquivo ainda não existe, tudo certo.
	}
	if err != nil {
		return fmt.Errorf("erro ao ler arquivo de dados: %w", err)
	}

	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		return fmt.Errorf("erro ao deserializar dados: %w", err)
	}

	for _, t := range tasks {
		fs.records[t.ID] = t
	}
	return nil
}

// persist serializa o estado atual do mapa para o arquivo JSON.
// Deve ser chamado dentro de um bloco já protegido por Lock.
func (fs *FileStore) persist() error {
	tasks := make([]Task, 0, len(fs.records))
	for _, t := range fs.records {
		tasks = append(tasks, t)
	}

	data, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return fmt.Errorf("erro ao serializar dados: %w", err)
	}
	return os.WriteFile(fs.filePath, data, 0644)
}

// Os métodos de escrita sobrescrevem os do MemoryStore para adicionar persistência.

func (fs *FileStore) Create(task Task) (Task, error) {
	created, err := fs.MemoryStore.Create(task)
	if err != nil {
		return Task{}, err
	}
	fs.mu.Lock()
	defer fs.mu.Unlock()
	if err := fs.persist(); err != nil {
		delete(fs.records, created.ID)
		return Task{}, fmt.Errorf("erro ao persistir tarefa: %w", err)
	}
	return created, nil
}

func (fs *FileStore) Update(id string, task Task) (Task, error) {
	updated, err := fs.MemoryStore.Update(id, task)
	if err != nil {
		return Task{}, err
	}
	fs.mu.Lock()
	defer fs.mu.Unlock()
	if err := fs.persist(); err != nil {
		return Task{}, fmt.Errorf("erro ao persistir atualização: %w", err)
	}
	return updated, nil
}

func (fs *FileStore) Delete(id string) error {
	if err := fs.MemoryStore.Delete(id); err != nil {
		return err
	}
	fs.mu.Lock()
	defer fs.mu.Unlock()
	return fs.persist()
}
