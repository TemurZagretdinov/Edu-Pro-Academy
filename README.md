# Education Center CRM

Full-stack starter for an education center public website plus admin management system.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- Migrations: Alembic
- API style: REST

## Project Structure

```text
backend/
  app/
    api/endpoints/
    core/
    crud/
    models/
    schemas/
    utils/
  alembic/
  requirements.txt
frontend/
  src/
    api/
    components/
    hooks/
    pages/
    routes/
    types/
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/education_center"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
SECRET_KEY="change-this-secret-in-production"
BOOTSTRAP_ADMIN_EMAIL="admin@edupro.uz"
BOOTSTRAP_ADMIN_PASSWORD="Admin12345"
```

Create the PostgreSQL database, then run migrations:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Run the parent Telegram bot as a separate worker in another terminal:

```bash
cd backend
python bot/parent_bot.py
```

Local development should use two processes:

```text
Terminal 1: cd backend && uvicorn app.main:app --reload
Terminal 2: cd backend && python bot/parent_bot.py
```

Do not start the Telegram bot inside the FastAPI app. Notification sending uses the same bot token, while `bot/parent_bot.py` handles interactive menu buttons through polling.

Create the first admin user once:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/bootstrap-admin
```

Then log in with the bootstrap credentials from `backend/.env`. The frontend admin login page also has a first-admin bootstrap button.

Backend health check:

```text
http://127.0.0.1:8000/health
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:5173
```

## Useful Endpoints

- `POST /api/v1/students`
- `GET /api/v1/students`
- `GET /api/v1/students/{student_id}/payments`
- `GET /api/v1/students/{student_id}/attendance`
- `POST /api/v1/teachers`
- `POST /api/v1/groups`
- `PATCH /api/v1/groups/{group_id}/activate`
- `PATCH /api/v1/groups/{group_id}/deactivate`
- `POST /api/v1/groups/{group_id}/teachers/{teacher_id}`
- `POST /api/v1/payments`
- `GET /api/v1/payments/summary/monthly`
- `POST /api/v1/attendance`
- `POST /api/v1/lessons`
- `POST /api/v1/lessons/months`
- `GET /api/v1/dashboard/stats`

## Optional Admin Token

Phase two uses JWT authentication instead of the old admin header token.

Login:

```http
POST /api/v1/auth/login
```

Send the returned access token as:

```http
Authorization: Bearer <token>
```

## Role Access

- Admin can access `/admin` in the frontend and admin APIs for students, teachers, groups, payments, attendance, homework analytics and financial dashboard cards.
- Teacher can access `/teacher` in the frontend and teacher APIs only.
- Teacher routes never return payment, revenue, overdue payment, or other financial data.

## Phase Two Routes

- Public registration: `POST /api/v1/students/register`
- Auth: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- Admin dashboard: `GET /api/v1/dashboard/admin`
- Teacher dashboard: `GET /api/v1/dashboard/teacher`
- Homework: `GET/POST /api/v1/homework`, `POST /api/v1/homework/status`
- Teacher panel: `GET /api/v1/teacher/groups`, `GET /api/v1/teacher/students`, `POST /api/v1/teacher/attendance`, `POST /api/v1/teacher/homework`

Frontend URLs:

- Public site: `http://127.0.0.1:5173`
- Student registration: `http://127.0.0.1:5173/register`
- Admin login: `http://127.0.0.1:5173/admin/login`
- Teacher login: `http://127.0.0.1:5173/teacher/login`
