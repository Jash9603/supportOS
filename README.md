# SupportOS

AI-powered customer support platform for 0–20 person startups.

## Architecture

```
supportos/
├── frontend/    # React 18 + Vite + Tailwind CSS
├── backend/     # FastAPI (Python 3.11+)
├── agents/      # LangGraph agent definitions
├── scripts/     # Dev & seed utilities
└── docker-compose.yml
```

## Local Development

### 1. Start infrastructure
```bash
docker-compose up -d
# Starts: Postgres (5432)
# Redis → Redis Cloud, Qdrant → Qdrant Cloud (configured in .env)
```

### 2. Set up environment
```bash
cp .env.example .env
# Fill in OPENAI_API_KEY and AUTH_SECRET in .env
```

### 3. Start backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 4. Start frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### 5. Start Celery worker (for doc ingestion)
```bash
cd backend
celery -A workers.celery_app worker --loglevel=info
```

## Services

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |
