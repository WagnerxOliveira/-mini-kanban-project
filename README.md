# ⬡ Mini Kanban — Desafio Fullstack Veritas

> Aplicação fullstack de gerenciamento de tarefas no estilo Kanban, desenvolvida como desafio técnico.

🔗 **[Ver Demo no Vercel](https://mini-kanban-frontend-delta.vercel.app)**  
🚂 **Backend hospedado no Railway** ← *configure após o deploy do backend*

---

## ✨ Features

- ✅ **CRUD completo** de tarefas (criar, listar, editar, deletar)
- 🎯 **3 colunas fixas**: A Fazer · Em Progresso · Concluídas
- 🖱️ **Drag & Drop** para mover tarefas entre colunas ([@dnd-kit](https://dndkit.com))
- ⚡ **Optimistic UI** — a UI atualiza antes da API responder, com rollback automático em falha
- 💾 **Persistência em JSON** (bônus) — ative `useFilePersist = true` em `main.go`
- 🌐 **CORS** configurado para o frontend
- 🛡️ **Validação** de status no backend (`A Fazer`, `Em Progresso`, `Concluídas`)
- 🎨 **Design futurístico** com tema cyber/neon e animações

---

## 🏗️ Arquitetura

```
desafio-fullstack-veritas/
├── backend/               # API REST em Go (stdlib pura)
│   ├── main.go            # Entry point, CORS, Logger middlewares, servidor
│   ├── handlers.go        # HTTP handlers (GET, POST, PUT, DELETE /tasks)
│   ├── models.go          # Task, Store interface, MemoryStore, FileStore
│   └── go.mod
│
└── frontend/              # SPA React + Vite
    └── src/
        ├── services/
        │   └── api.js     # Camada de comunicação com a API (fetch)
        ├── hooks/
        │   └── useTasks.js# Estado, loading, error, CRUD com Optimistic UI
        ├── components/
        │   ├── Board.jsx  # DndContext, orquestra as colunas e modal
        │   ├── Column.jsx # useDroppable — drop zone por status
        │   ├── TaskCard.jsx  # useDraggable — drag handle + ações
        │   └── TaskModal.jsx # Formulário criar/editar com validação
        ├── App.jsx
        └── index.css      # Design system cyber/neon completo
```

---

## 🛠️ Tech Stack

| Camada    | Tecnologia                            |
|-----------|---------------------------------------|
| Backend   | Go 1.26 · `net/http` (stdlib pura)   |
| Frontend  | React 19 · Vite 8                    |
| Drag&Drop | @dnd-kit/core                        |
| Estilo    | Vanilla CSS (design system próprio)  |
| Deploy FE | Vercel                               |
| Deploy BE | Railway / Render                     |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- [Go 1.20+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)

### 1. Backend

```bash
cd backend
go mod tidy
go run .
# API disponível em http://localhost:8080
```

Para ativar **persistência em JSON**, edite `main.go`:
```go
const useFilePersist = true  // linha 13
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # configure a URL da API
npm install
npm run dev
# App disponível em http://localhost:5173
```

---

## 📡 API Endpoints

| Método   | Rota            | Descrição                  |
|----------|-----------------|----------------------------|
| `GET`    | `/tasks`        | Lista todas as tarefas     |
| `POST`   | `/tasks`        | Cria uma nova tarefa       |
| `GET`    | `/tasks/{id}`   | Busca tarefa por ID        |
| `PUT`    | `/tasks/{id}`   | Atualiza uma tarefa        |
| `DELETE` | `/tasks/{id}`   | Remove uma tarefa          |
| `GET`    | `/health`       | Health check               |

### Exemplo de Payload (POST/PUT)

```json
{
  "title": "Implementar autenticação",
  "description": "JWT com refresh token",
  "status": "A Fazer"
}
```

### Valores válidos para `status`
```
"A Fazer" | "Em Progresso" | "Concluídas"
```

---

## ☁️ Deploy

### Frontend → Vercel

1. Faça push do repositório para o GitHub
2. No [Vercel Dashboard](https://vercel.com), importe o repositório
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Adicione a variável de ambiente:
   ```
   VITE_API_URL = https://sua-api.railway.app
   ```
5. Clique em **Deploy** ✅

### Backend → Railway

1. Acesse [railway.app](https://railway.app) e crie um projeto
2. Conecte o repositório GitHub
3. Configure **Root Directory**: `backend`
4. Railway detecta Go automaticamente e faz o deploy
5. Copie a URL gerada e cole como `VITE_API_URL` no Vercel

---

## 🧪 Testando a API

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:8080/health"

# Criar tarefa
Invoke-RestMethod -Uri "http://localhost:8080/tasks" -Method Post `
  -ContentType "application/json" `
  -Body '{"title":"Minha tarefa","status":"A Fazer"}'

# Listar todas
Invoke-RestMethod -Uri "http://localhost:8080/tasks"

# Atualizar
Invoke-RestMethod -Uri "http://localhost:8080/tasks/{id}" -Method Put `
  -ContentType "application/json" `
  -Body '{"title":"Atualizada","status":"Em Progresso"}'

# Deletar
Invoke-RestMethod -Uri "http://localhost:8080/tasks/{id}" -Method Delete
```

---

## 📁 Estrutura de Dados

```go
type Task struct {
    ID          string    `json:"id"`
    Title       string    `json:"title"`         // obrigatório
    Description string    `json:"description,omitempty"` // opcional
    Status      Status    `json:"status"`        // validado
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

---

## 👨‍💻 Autor

**Wagner Oliveira**  
Desafio Técnico — Fullstack Veritas · 2026
