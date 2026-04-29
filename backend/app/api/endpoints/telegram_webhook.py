from typing import Annotated

from aiogram.types import Update
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from bot.parent_bot import create_parent_bot, create_parent_bot_dispatcher

router = APIRouter()


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Annotated[str | None, Header()] = None,
) -> dict[str, bool]:
    if (
        settings.telegram_webhook_secret
        and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram webhook secret")

    try:
        bot = create_parent_bot()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    payload = await request.json()
    update = Update.model_validate(payload, context={"bot": bot})
    dispatcher = create_parent_bot_dispatcher()
    await dispatcher.feed_update(bot, update)
    return {"ok": True}
