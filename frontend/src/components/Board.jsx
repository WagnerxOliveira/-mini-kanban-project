import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';

import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useTasks } from '../hooks/useTasks';

const STATUSES = ['A Fazer', 'Em Progresso', 'Concluídas'];

/**
 * Board orquestra todo o Kanban.
 *
 * Fluxo do Drag and Drop:
 * 1. onDragStart  → guarda qual tarefa está sendo arrastada (para o DragOverlay).
 * 2. onDragEnd    → identifica a coluna de destino (over.id = status string).
 *                   Se o status mudou, chama updateTask com Optimistic UI.
 *                   Se a API falhar, o rollback é feito automaticamente no hook.
 *
 * Sensores configurados:
 * - PointerSensor com distância mínima de 8px (evita drag acidental em clicks).
 * - KeyboardSensor para acessibilidade (arrastar com teclado).
 */
export function Board() {
  const { tasks, loading, error, refetch, createTask, updateTask, deleteTask } =
    useTasks();

  const [editingTask, setEditingTask] = useState(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [activeTask, setActiveTask]   = useState(null); // task sendo arrastada
  const [dragError, setDragError]     = useState(null); // erro de drop

  // ─── Sensores DnD ────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Distância mínima de 8px antes de iniciar o drag.
      // Garante que clicks normais (editar, deletar) não acionem o drag.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor) // suporte a teclado (acessibilidade)
  );

  // ─── Handlers DnD ────────────────────────────────────────────────────────────

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
    setDragError(null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);

    // Sem destino válido (solto fora de qualquer coluna).
    if (!over) return;

    const newStatus = over.id; // ID da drop zone = string do status
    const task = tasks.find((t) => t.id === active.id);

    // Sem mudança de coluna — não faz nada.
    if (!task || task.status === newStatus) return;

    try {
      await updateTask(task.id, {
        title:       task.title,
        description: task.description,
        status:      newStatus,
      });
    } catch (err) {
      // Rollback já foi feito no hook; exibe feedback de erro temporário.
      setDragError(`Falha ao mover tarefa: ${err.message}`);
      setTimeout(() => setDragError(null), 4000);
    }
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────────

  const openCreateModal = () => { setEditingTask(undefined); setModalOpen(true); };
  const openEditModal   = (task) => { setEditingTask(task); setModalOpen(true); };
  const closeModal      = () => { setModalOpen(false); setEditingTask(null); };

  const handleModalSubmit = async (formData) => {
    if (editingTask) {
      await updateTask(editingTask.id, formData);
    } else {
      await createTask(formData);
    }
  };

  // ─── Estados de Loading e Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="board-feedback">
        <div className="spinner" aria-label="Carregando tarefas" />
        <p>Carregando tarefas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-feedback board-feedback--error">
        <span className="board-feedback__icon">⚠️</span>
        <p>Não foi possível conectar à API.</p>
        <p className="board-feedback__detail">{error}</p>
        <button className="btn btn--primary" onClick={refetch}>
          Tentar novamente
        </button>
      </div>
    );
  }

  // ─── Render Principal ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Toast de erro de drag */}
      {dragError && (
        <div className="drag-error-toast" role="alert">
          ⚠️ {dragError}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onEdit={openEditModal}
              onDelete={deleteTask}
              onAddTask={openCreateModal}
            />
          ))}
        </div>

        {/*
          DragOverlay: renderiza um clone do card que "flutua" e segue o cursor.
          isDragOverlay=true desabilita o useDraggable interno (evita recursão).
          dropAnimation suaviza o retorno se o card for solto fora de uma coluna.
        */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          onSubmit={handleModalSubmit}
          onClose={closeModal}
        />
      )}
    </>
  );
}
