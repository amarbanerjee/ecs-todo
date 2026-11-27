import { useEffect, useState } from 'react';

const API = '/api/todos';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState('');
  const [error, setError] = useState('');

  async function loadTodos() {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error('Could not load tasks');
      setTodos(await response.json());
      setError('');
    } catch {
      setError('API unavailable. Check that the backend is running.');
    }
  }

  useEffect(() => { loadTodos(); }, []);

  async function addTodo(event) {
    event.preventDefault();
    if (!task.trim()) return;
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: task.trim() })
    });
    if (response.ok) { setTask(''); await loadTodos(); }
    else setError('Unable to create task.');
  }

  async function toggleTodo(todo) {
    await fetch(`${API}/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed })
    });
    await loadTodos();
  }

  async function deleteTodo(id) {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    await loadTodos();
  }

  return <main className="shell">
    <section className="card">
      <p className="eyebrow">AWS • LEARNING PROJECT</p>
      <h1>My To-Do List</h1>
      <p className="subtitle">Plan your work. Track your progress.</p>
      <form onSubmit={addTodo} className="add-form">
        <input value={task} onChange={e => setTask(e.target.value)} placeholder="What needs to be done?" maxLength="200" />
        <button type="submit">Add task</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="summary">{todos.filter(t => t.completed).length} completed · {todos.length} total</div>
      <ul className="todos">
        {todos.map(todo => <li key={todo.id} className={todo.completed ? 'done' : ''}>
          <label><input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo)} /><span>{todo.title}</span></label>
          <button className="delete" onClick={() => deleteTodo(todo.id)} aria-label={`Delete ${todo.title}`}>Delete</button>
        </li>)}
      </ul>
      {!todos.length && !error && <p className="empty">No tasks yet. Add your first task above.</p>}
      <footer>React frontend · Node.js API · Docker · AWS ECS</footer>
    </section>
  </main>;
}