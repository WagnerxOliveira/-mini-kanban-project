import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';

// Mapeamento de status para metadados visuais de cada coluna.
const COLUMN_META = {
  'A Fazer': {
    label: 'A Fazer',
    icon: '📋',
    colorClass: 'column--todo',
  },
  'Em Progresso': {
    label: 'Em Progresso',
    icon: '⚡',
    colorClass: 'column--progress',
  },
  Concluídas: {
    label: 'Concluídas',
    icon: '✅',
    colorClass: 'column--done',
  },
};

/**
 * Column representa uma das três colunas do Kanban.
 * O ID do droppable é o próprio status string — usado pelo Board
 * no onDragEnd para saber para qual coluna o card foi solto.
 */
export function Column({ status, tasks, onEdit, onDelete, onAddTask }) {
  const meta = COLUMN_META[status];

  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`column ${meta.colorClass} ${isOver ? 'column--drop-over' : ''}`}>
      <div className="column__header">
        <div className="column__title-group">
          <span className="column__icon">{meta.icon}</span>
          <h2 className="column__title">{meta.label}</h2>
          <span className="column__count">{tasks.length}</span>
        </div>
        {status === 'A Fazer' && (
          <button
            className="btn-add"
            onClick={onAddTask}
            aria-label="Adicionar nova tarefa"
            title="Nova tarefa"
          >
            +
          </button>
        )}
      </div>

      {/* setNodeRef na área de cards define a drop zone */}
      <div ref={setNodeRef} className={`column__cards ${isOver ? 'column__cards--over' : ''}`}>
        {tasks.length === 0 ? (
          <div className={`column__empty ${isOver ? 'column__empty--over' : ''}`}>
            <span>{isOver ? 'Solte aqui ↓' : 'Nenhuma tarefa'}</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
