# CloudOps To-Do App

A learning project for AWS Solutions Architecture and DevOps: React frontend and Node.js/Express API, packaged as separate Docker images.

## Run locally with Docker

Prerequisites: Docker Desktop or Docker Engine with Compose.

From the project root:

```bash
docker compose up --build -d
docker compose ps
```

Open http://localhost:8080

API checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/todos
curl -X POST http://localhost:8080/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Practice ECS deployment"}'
```

Stop:

```bash
docker compose down
```

## Run without Docker

Terminal 1:

```bash
cd backend
npm install
npm run dev
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

For direct Vite development, configure a Vite proxy or use Docker Compose gateway. Compose is the recommended first validation path.

## API

- `GET /health`
- `GET /api/todos`
- `POST /api/todos` with `{"title":"Task"}`
- `PATCH /api/todos/:id` with `{"completed":true}`
- `DELETE /api/todos/:id`

## Learning-stage note

The initial backend stores tasks in memory. Tasks are lost when the backend restarts and are not shared between multiple backend replicas. This is intentional for the first deployment exercise. We will replace it with MySQL/RDS before scaling the backend.

## Planned AWS deployment

- React/Nginx frontend image -> ECR -> ECS Fargate frontend service
- Node.js API image -> ECR -> ECS Fargate backend service
- ALB listener rules: `/api/*` to backend target group; default path to frontend target group
- CloudFront in front of the ALB in a later stage
- RDS MySQL in private DB subnets in the persistence stage
