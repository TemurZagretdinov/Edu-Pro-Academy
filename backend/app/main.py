import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from bot.parent_bot import close_parent_bot, setup_parent_bot_webhook

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def configure_telegram_webhook() -> None:
    try:
        await setup_parent_bot_webhook()
    except Exception:
        logger.exception("Telegram webhook setup failed")


@app.on_event("shutdown")
async def shutdown_telegram_bot() -> None:
    await close_parent_bot()
