import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Hook customizado que centraliza toda a lógica de estado das tarefas.
 * Suporta optimistic updates com rollback automático em caso de falha da API.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Busca inicial ──────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Ações CRUD ─────────────────────────────────────────────────────────────

  const createTask = useCallback(async (taskData) => {
    const created = await api.createTask(taskData);
    setTasks((prev) => [...prev, created]);
    return created;
  }, []);

  /**
   * updateTask com Optimistic UI:
   * 1. Captura o estado anterior para rollback.
   * 2. Aplica a mudança localmente de imediato (sem esperar a API).
   * 3. Confirma com a resposta real da API (atualiza timestamps etc.).
   * 4. Em caso de erro, restaura o estado anterior e relança o erro.
   */
  const updateTask = useCallback(async (id, taskData) => {
    // Captura o snapshot anterior dentro do setter para evitar stale closure.
    let previousTasks;
    setTasks((prev) => {
      previousTasks = prev;
      return prev.map((t) =>
        t.id === id ? { ...t, ...taskData } : t
      );
    });

    try {
      const updated = await api.updateTask(id, taskData);
      // Substitui pelo dado canônico retornado pela API (com updated_at correto).
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err) {
      // Rollback: restaura o estado anterior se a API falhar.
      setTasks(previousTasks);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
