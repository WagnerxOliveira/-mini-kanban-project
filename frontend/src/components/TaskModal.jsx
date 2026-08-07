import { useState, useEffect } from 'react';

const STATUSES = ['A Fazer', 'Em Progresso', 'Concluídas'];

const EMPTY_FORM = { title: '', description: '', status: 'A Fazer' };

/**
 * TaskModal é o formulário de criação e edição de tarefas.
 * Recebe `task` para edição (ou null para criação) e callbacks de submit/cancel.
 */
export function TaskModal({ task, onSubmit, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = Boolean(task);

  // Popula o formulário ao editar, reseta ao criar.
  useEffect(() => {
    setForm(
      task
        ? { title: task.title, description: task.description || '', status: task.status }
        : EMPTY_FORM
    );
    setError(null);
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fecha ao clicar no backdrop (fora do modal).
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">
            {isEditing ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          {/* Título */}
          <div className="form-group">
            <label htmlFor="task-title" className="form-label">
              Título <span className="required">*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              className="form-input"
              placeholder="Ex: Criar tela de login"
              value={form.title}
              onChange={handleChange}
              autoFocus
              maxLength={120}
            />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label htmlFor="task-description" className="form-label">
              Descrição <span className="optional">(opcional)</span>
            </label>
            <textarea
              id="task-description"
              name="description"
              className="form-input form-textarea"
              placeholder="Detalhes sobre a tarefa..."
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="task-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="task-status"
              name="status"
              className="form-input form-select"
              value={form.status}
              onChange={handleChange}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Feedback de erro da API */}
          {error && (
            <div className="form-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
