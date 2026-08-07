import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

/**
 * TaskCard representa uma única tarefa no Kanban.
 * É draggável via @dnd-kit — o ID do draggable é o ID da tarefa.
 *
 * Quando isDragging = true, o card original fica como placeholder semitransparente
 * enquanto o DragOverlay no Board exibe a cópia que segue o cursor.
 */
export function TaskCard({ task, onEdit, onDelete, isDragOverlay = false }) {
  const [deleting, setDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id });

  // Aplica a transform durante o drag. CSS.Translate evita distorções.
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deletar "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={[
        'task-card',
        isDragging   ? 'task-card--dragging'  : '',
        isDragOverlay ? 'task-card--overlay'   : '',
        deleting     ? 'task-card--deleting'  : '',
      ].join(' ').trim()}
      // Atributos de acessibilidade e listeners de drag ficam no handle.
    >
      {/* ── Drag Handle ─────────────────────────────────────────────────── */}
      <div
        className="task-card__drag-handle"
        {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
        aria-label="Arrastar tarefa"
        title="Arrastar para mover"
      >
        ⠿
      </div>

      <div className="task-card__header">
        <h3 className="task-card__title">{task.title}</h3>
        <div className="task-card__actions">
          <button
            className="btn-icon btn-icon--edit"
            onClick={() => onEdit(task)}
            title="Editar tarefa"
            aria-label={`Editar ${task.title}`}
          >
            ✏️
          </button>
          <button
            className="btn-icon btn-icon--delete"
            onClick={handleDelete}
            disabled={deleting}
            title="Deletar tarefa"
            aria-label={`Deletar ${task.title}`}
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="task-card__description">{task.description}</p>
      )}

      <div className="task-card__footer">
        <span className="task-card__date">
          {new Date(task.updated_at).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
}
