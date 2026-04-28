import asyncio
import logging

from aiogram import Bot

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_message(chat_id: int | str, text: str, parse_mode: str | None = "HTML") -> bool:
    if not settings.telegram_bot_token:
        logger.warning("Telegram bot token is not configured")
        return False

    bot = Bot(token=settings.telegram_bot_token)
    try:
        await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
        return True
    except Exception:
        logger.exception("Telegram send failed for chat_id=%s", chat_id)
        return False
    finally:
        await bot.session.close()


def send_telegram_message_sync(chat_id: int | str, text: str, parse_mode: str | None = "HTML") -> bool:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(send_telegram_message(chat_id, text, parse_mode=parse_mode))

    logger.error("Cannot call sync Telegram sender while an event loop is already running")
    return False
