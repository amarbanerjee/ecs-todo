import express from 'express';
import helmet from 'helmet';
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 3000);
const databaseName = process.env.DB_NAME || 'cloudops_todos';
const databaseHost = process.env.DB_HOST;
const databaseUser = process.env.DB_USER;
const databasePassword = process.env.DB_PASSWORD;
const databasePort = Number(process.env.DB_PORT || 3306);

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
}
if (!databaseHost || !databaseUser || !databasePassword) {
  throw new Error('DB_HOST, DB_USER, and DB_PASSWORD must be provided at runtime.');
}

const baseDatabaseConfig = {
  host: databaseHost,
  port: databasePort,
  user: databaseUser,
  password: databasePassword,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  const setupConnection = await mysql.createConnection({
    host: databaseHost,
    port: databasePort,
    user: databaseUser,
    password: databasePassword
  });

  try {
    const createDatabaseSql = 'CREATE DATABASE IF NOT EXISTS ' + databaseName;
    await setupConnection.query(createDatabaseSql);
  } finally {
    await setupConnection.end();
  }

  pool = mysql.createPool({
    ...baseDatabaseConfig,
    database: databaseName,
    dateStrings: false
  });

  await pool.query(
    'CREATE TABLE IF NOT EXISTS todos (' +
    'id CHAR(36) NOT NULL PRIMARY KEY, ' +
    'title VARCHAR(200) NOT NULL, ' +
    'completed TINYINT(1) NOT NULL DEFAULT 0, ' +
    'created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)' +
    ') ENGINE=InnoDB'
  );
}

function toTodo(row) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: new Date(row.createdAt).toISOString()
  };
}

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

app.use(helmet());
app.use(express.json({ limit: '20kb' }));

app.get('/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.status(200).json({ status: 'healthy' });
}));

app.get('/api/todos', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, title, completed, created_at AS createdAt FROM todos ORDER BY created_at DESC'
  );
  res.json(rows.map(toTodo));
}));

app.post('/api/todos', asyncRoute(async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 200) {
    return res.status(400).json({ error: 'Title is required (max 200 characters).' });
  }

  const todo = {
    id: randomUUID(),
    title,
    completed: false
  };
  await pool.execute(
    'INSERT INTO todos (id, title, completed) VALUES (?, ?, ?)',
    [todo.id, todo.title, todo.completed]
  );
  const [rows] = await pool.execute(
    'SELECT id, title, completed, created_at AS createdAt FROM todos WHERE id = ?',
    [todo.id]
  );
  res.status(201).json(toTodo(rows[0]));
}));

app.patch('/api/todos/:id', asyncRoute(async (req, res) => {
  const title = typeof req.body.title === 'string' && req.body.title.trim()
    ? req.body.title.trim().slice(0, 200)
    : null;
  const completed = typeof req.body.completed === 'boolean' ? req.body.completed : null;

  await pool.execute(
    'UPDATE todos SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ?',
    [title, completed, req.params.id]
  );
  const [rows] = await pool.execute(
    'SELECT id, title, completed, created_at AS createdAt FROM todos WHERE id = ?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Task not found.' });
  res.json(toTodo(rows[0]));
}));

app.delete('/api/todos/:id', asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM todos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  res.status(204).end();
}));

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error);
  res.status(500).json({ error: 'Internal server error.' });
});

initializeDatabase()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log('To-do API listening on port ' + port);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
