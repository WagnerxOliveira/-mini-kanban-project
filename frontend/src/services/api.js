const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Wrapper interno para fetch com tratamento de erros padronizado.
 */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

export const api = {
  getTasks:   ()          => request('/tasks'),
  getTask:    (id)        => request(`/tasks/${id}`),
  createTask: (task)      => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, task)  => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  deleteTask: (id)        => request(`/tasks/${id}`, { method: 'DELETE' }),
};
