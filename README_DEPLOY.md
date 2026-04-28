# Production Deployment

This project deploys as four separate parts:

- Frontend: Vercel, project root `frontend`, output `dist`
- Backend API: Render or Railway web service, project root `backend`
- Database: managed PostgreSQL
- Telegram parent bot: separate worker service, project root `backend`

Never commit real `.env` files. Use `backend/.env.example` and `frontend/.env.example` as templates.

## GitHub Cleanup

Before pushing:

```bash
git status
git add .gitignore backend/.env.example frontend/.env.example README_DEPLOY.md render.yaml
git diff --cached
```

Check that no real secrets are staged:

```bash
git diff --cached -- . ':!backend/.env.example' ':!frontend/.env.example'
```

If a real `.env` was ever committed, rotate the secrets and remove the file from git history before deploying.

## Required Environment Variables

Backend web service:

```env
APP_NAME=EduPro Academy
API_V1_PREFIX=/api/v1
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
FRONTEND_ORIGINS=https://your-frontend.vercel.app
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
BOT_USERNAME=your_bot_username
```

Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

Bot worker:

```env
APP_NAME=EduPro Academy
SECRET_KEY=replace-with-the-same-backend-secret
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
BOT_USERNAME=your_bot_username
```

Optional backend variables:

```env
PARENT_PORTAL_URL=https://your-frontend.vercel.app/student/login
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=replace-with-temporary-strong-password
```

## PostgreSQL Setup

Create a managed PostgreSQL database on Render, Railway, Neon, Supabase, or another provider.

Use a SQLAlchemy URL with the installed psycopg driver:

```env
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
```

Use the same `DATABASE_URL` for:

- Backend web service
- Alembic migrations
- Telegram bot worker

## Backend Deploy

Create a web service from the `backend` directory.

Install command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set all backend environment variables in the provider dashboard. `FRONTEND_ORIGINS` must contain the exact Vercel origin, without a trailing slash.

Health check:

```text
https://your-backend.onrender.com/health
```

## Alembic Migrations

Run from the `backend` directory after `DATABASE_URL` is set:

```bash
alembic upgrade head
```

Alembic imports `app.core.config.settings`, so it uses the same `DATABASE_URL` as the FastAPI app. Do not run reset/drop commands against production.

## Frontend Vercel Deploy

Create a Vercel project from the `frontend` directory.

Settings:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
```

Set:

```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

Redeploy the frontend after changing `VITE_API_URL`; Vite embeds this value at build time.

## Telegram Bot Worker

Deploy the bot as a separate worker service from the `backend` directory.

Install command:

```bash
pip install -r requirements.txt
```

Worker start command:

```bash
python bot/parent_bot.py
```

The bot reads `TELEGRAM_BOT_TOKEN` and `DATABASE_URL` from environment variables. It is not started inside `app.main` or the FastAPI web service.

Local development:

```text
Terminal 1:
cd backend
uvicorn app.main:app --reload

Terminal 2:
cd backend
python bot/parent_bot.py
```

## Common Errors

CORS error:
Set `FRONTEND_ORIGINS` to the exact frontend origin, for example `https://your-frontend.vercel.app`. Include localhost only for local development.

DATABASE_URL error:
Use `postgresql+psycopg://...`, not a copied URL with an unsupported driver. Confirm the database accepts connections from your hosting provider.

Alembic error:
Run `alembic upgrade head` from `backend`. Make sure the same `DATABASE_URL` is available and all migration files are deployed.

VITE_API_URL not set:
Set `VITE_API_URL` in Vercel to the backend API base URL including `/api/v1`, then redeploy.

TELEGRAM_BOT_TOKEN missing:
Set `TELEGRAM_BOT_TOKEN` on the worker service. The bot intentionally exits when the token is missing.

Telegram polling conflict:
Only one worker may poll a Telegram bot token. Stop local polling and make sure no second production worker is running. If a webhook was configured previously, this bot deletes it before polling.
