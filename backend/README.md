# Silk Optima Backend

## Stack
- FastAPI
- SQLAlchemy
- PostgreSQL (Neon)
- Pydantic

## Local setup
1. Copy `.env.example` to `.env` and set each placeholder value.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the API:
   ```bash
   uvicorn main:app --reload
   ```

The application creates its tables on startup. Use `postgresql+psycopg2` URLs with `sslmode=require` for Neon.

## Render deployment
Deploy `backend` as a Docker web service using the included `Dockerfile`. Set the values from `.env.example` in Render's protected environment variables. The start command is included in the image.

Neon has no IP allowlist, so no firewall configuration is required. Never commit `.env`.

## Available endpoints
- `/health`
- `/users`
- `/employees`
- `/open-positions`
- `/candidates`
- `/applications`
