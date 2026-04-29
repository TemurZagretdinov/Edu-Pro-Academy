import asyncio
from collections.abc import Awaitable, Callable
import logging
from pathlib import Path
import re
import sys
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from aiogram import BaseMiddleware, Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import BotCommand, CallbackQuery, InlineKeyboardMarkup, Message, TelegramObject

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.message_templates import (
    StudentInfo,
    build_ask_code_message,
    build_code_too_short_message,
    build_link_success_message,
    build_no_linked_students_message,
    build_profile_unavailable_message,
    build_welcome_message,
)
from app.services.parent_bot_service import ParentBotService, ParentContext, ParentLinkedChild
from app.services.parent_notifications import link_parent_by_code
from bot.parent_bot_templates import (
    build_attendance_summary_message,
    build_child_profile_message,
    build_children_list_message,
    build_contact_request_message,
    build_contact_saved_message,
    build_contact_share_error_message,
    build_grade_summary_message,
    build_help_message,
    build_homework_list_message,
    build_notification_settings_message,
    build_notifications_message,
    build_parent_home_message,
    build_payment_summary_message,
    build_select_child_message,
    build_settings_message,
)
from bot.parent_bot_ui import (
    ATTENDANCE_TEXT,
    BACK_TEXT,
    CHILDREN_TEXT,
    CONTACT_REQUEST_MENU,
    GRADES_TEXT,
    HELP_TEXT,
    HOME_TEXT,
    HOMEWORK_TEXT,
    LEGACY_MY_CHILD_TEXT,
    LEGACY_NOTIFICATIONS_TEXT,
    MAIN_MENU,
    NOTIFICATIONS_TEXT,
    PAYMENTS_TEXT,
    SEND_CODE_TEXT,
    SETTINGS_TEXT,
    SHARE_CONTACT_TEXT,
    build_child_section_keyboard,
    build_child_selection_keyboard,
    build_notifications_keyboard,
    build_settings_keyboard,
)


router = Router()
logger = logging.getLogger(__name__)

_PARENT_BOT: Bot | None = None
_PARENT_DISPATCHER: Dispatcher | None = None
_ACTIVE_CHILD_BY_USER: dict[str, int] = {}
_AWAITING_CODE_USERS: set[str] = set()
_CODE_PATTERN = re.compile(r"^[A-Za-z0-9]{6,20}$")


class IncomingMessageLogger(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if isinstance(event, Message):
            logger.info(
                "Incoming Telegram message text=%r user_id=%s chat_id=%s",
                event.text,
                event.from_user.id if event.from_user else None,
                event.chat.id if event.chat else None,
            )
        return await handler(event, data)


def _normalize_text(value: str | None) -> str:
    text = (value or "").strip().lower()
    text = text.translate(str.maketrans({"‘": "'", "’": "'", "`": "'", "ʼ": "'", "ʻ": "'"}))
    text = re.sub(r"[^\w\s']", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


MENU_INTENTS: dict[str, set[str]] = {
    "home": {"bosh sahifa", "home"},
    "children": {"farzandim", "mening farzandim", "farzandlarim", "mening farzandlarim"},
    "attendance": {"davomat"},
    "grades": {"baholar", "baho"},
    "homework": {"vazifalar", "vazifa"},
    "payments": {"to'lovlar", "tolovlar", "to lovlar", "to'lov", "tolov", "to lov"},
    "notifications": {
        "bildirishnomalar",
        "bildirishnoma",
        "xabar",
        "so'nggi bildirishnomalar",
        "songgi bildirishnomalar",
        "so nggi bildirishnomalar",
        "so'nggi xabarlar",
        "songgi xabarlar",
        "so nggi xabarlar",
        "xabarlar",
    },
    "link": {"ulash kodi", "ulash kodi yuborish", "kod yuborish"},
    "settings": {"sozlamalar", "sozlama"},
    "help": {"yordam"},
    "back": {"orqaga"},
}


def _message_intent(text: str | None) -> str | None:
    normalized = _normalize_text(text)
    for intent, aliases in MENU_INTENTS.items():
        if normalized in aliases:
            return intent
    return None


def _log_matched_handler(name: str, message: Message | None = None) -> None:
    logger.info(
        "Matched parent bot handler=%s user_id=%s chat_id=%s text=%r",
        name,
        message.from_user.id if message and message.from_user else None,
        message.chat.id if message and message.chat else None,
        message.text if message else None,
    )
_NON_CODE_TEXTS = {
    _normalize_text(value)
    for value in [
        ATTENDANCE_TEXT,
        BACK_TEXT,
        CHILDREN_TEXT,
        GRADES_TEXT,
        HELP_TEXT,
        HOME_TEXT,
        HOMEWORK_TEXT,
        LEGACY_MY_CHILD_TEXT,
        LEGACY_NOTIFICATIONS_TEXT,
        NOTIFICATIONS_TEXT,
        PAYMENTS_TEXT,
        SEND_CODE_TEXT,
        SETTINGS_TEXT,
        SHARE_CONTACT_TEXT,
        "Xabarlar",
        "Bildirishnomalar",
        "Mening farzandim",
        "So'nggi bildirishnomalar",
        "Ulash kodi yuborish",
    ]
}

SECTION_TITLES = {
    "profile": "Farzand profili",
    "attendance": "Davomat",
    "grades": "Baholar",
    "homework": "Vazifalar",
    "payments": "To‘lovlar",
    "notifications": "Xabarlar",
}


def _display_name(message: Message) -> str:
    user = message.from_user
    if user is None:
        return "Ota-ona"
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part)
    return full_name or user.username or "Ota-ona"


def _user_key(event: Message | CallbackQuery) -> str | None:
    user = event.from_user
    return str(user.id) if user is not None else None


def _portal_url() -> str | None:
    value = (settings.parent_portal_url or "").strip()
    return value or None


def _remember_active_child(user_key: str, child_id: int) -> None:
    _ACTIVE_CHILD_BY_USER[user_key] = child_id


def _mark_awaiting_code(user_key: str | None, enabled: bool) -> None:
    if user_key is None:
        return
    if enabled:
        _AWAITING_CODE_USERS.add(user_key)
    else:
        _AWAITING_CODE_USERS.discard(user_key)


def _resolve_active_child(user_key: str | None, context: ParentContext | None) -> ParentLinkedChild | None:
    if context is None or not context.children:
        return None
    if user_key is None:
        return context.children[0]
    active_id = _ACTIVE_CHILD_BY_USER.get(user_key)
    child = next((item for item in context.children if item.student_id == active_id), None)
    if child is None:
        child = context.children[0]
        _remember_active_child(user_key, child.student_id)
    return child


async def _answer_html(message: Message, text: str, *, reply_markup=MAIN_MENU) -> None:
    if isinstance(reply_markup, InlineKeyboardMarkup):
        await message.answer("Kerakli bo'limni pastdagi menyudan tanlang.", reply_markup=MAIN_MENU)
    await message.answer(text, reply_markup=reply_markup)


async def _answer_main_html(message: Message, text: str, *, inline_markup=None) -> None:
    await message.answer(text, reply_markup=MAIN_MENU)
    if inline_markup is not None:
        await message.answer("Tezkor amallar:", reply_markup=inline_markup)


async def _show_main_menu_message(message: Message) -> None:
    _mark_awaiting_code(_user_key(message), False)
    await _answer_main_html(
        message,
        "🏠 <b>Asosiy menyu</b>\n\nKerakli bo'limni pastdagi tugmalardan tanlang.",
    )


async def _edit_html(callback: CallbackQuery, text: str, *, reply_markup=None) -> None:
    if callback.message is None:
        await callback.answer("Xabar topilmadi", show_alert=True)
        return
    try:
        await callback.message.edit_text(text, reply_markup=reply_markup)
    except TelegramBadRequest as exc:
        if "message is not modified" not in str(exc).lower():
            raise
    await callback.answer()


def _home_payload(service: ParentBotService, user_key: str, context: ParentContext) -> tuple[str, object | None]:
    active_child = _resolve_active_child(user_key, context)
    attendance = service.get_child_attendance_summary(user_key, active_child.student_id) if active_child else None
    grades = service.get_child_grades(user_key, active_child.student_id) if active_child else None
    homework = service.get_child_homework(user_key, active_child.student_id) if active_child else None
    payment = service.get_child_payment_info(user_key, active_child.student_id) if active_child else None
    text = build_parent_home_message(
        parent_name=context.parent_name,
        children=context.children,
        active_child=active_child,
        attendance=attendance,
        grades=grades,
        homework=homework,
        payment=payment,
    )
    if active_child is None:
        return text, None
    keyboard = build_child_section_keyboard(
        active_child.student_id,
        current_section="profile",
        show_switch_child=len(context.children) > 1,
        portal_url=_portal_url(),
    )
    return text, keyboard


def _child_section_text(service: ParentBotService, user_key: str, child: ParentLinkedChild, section: str) -> str:
    if section == "profile":
        return build_child_profile_message(child)
    if section == "attendance":
        summary = service.get_child_attendance_summary(user_key, child.student_id)
        return build_attendance_summary_message(child, summary) if summary is not None else build_no_linked_students_message()
    if section == "grades":
        summary = service.get_child_grades(user_key, child.student_id)
        return build_grade_summary_message(child, summary) if summary is not None else build_no_linked_students_message()
    if section == "homework":
        summary = service.get_child_homework(user_key, child.student_id)
        return build_homework_list_message(child, summary) if summary is not None else build_no_linked_students_message()
    if section == "payments":
        summary = service.get_child_payment_info(user_key, child.student_id)
        return build_payment_summary_message(child, summary) if summary is not None else build_no_linked_students_message()
    if section == "notifications":
        items = service.get_recent_parent_notifications(user_key, student_id=child.student_id, limit=8)
        return build_notifications_message(items, selected_child_name=child.full_name)
    return build_child_profile_message(child)


async def _show_home_message(message: Message) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _answer_html(message, build_welcome_message())
            return
        text, keyboard = _home_payload(service, user_key, context)
        await _answer_main_html(message, text, inline_markup=keyboard)
    except Exception:
        logger.exception("DB query failed while showing parent home user_id=%s", user_key)
        await _answer_html(message, "⚠️ <b>Xatolik yuz berdi.</b>\n\nIltimos, birozdan keyin qayta urinib ko'ring.")
    finally:
        db.close()


async def _show_home_callback(callback: CallbackQuery) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_welcome_message())
            return
        text, keyboard = _home_payload(service, user_key, context)
        await _edit_html(callback, text, reply_markup=keyboard)
    finally:
        db.close()


async def _show_children_message(message: Message) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _answer_html(message, build_no_linked_students_message())
            return
        active_child = _resolve_active_child(user_key, context)
        if len(context.children) == 1 and active_child is not None:
            await _answer_html(
                message,
                build_child_profile_message(active_child),
                reply_markup=build_child_section_keyboard(
                    active_child.student_id,
                    current_section="profile",
                    show_switch_child=False,
                    portal_url=_portal_url(),
                ),
            )
            return
        await _answer_html(
            message,
            build_children_list_message(context.children, active_child_id=active_child.student_id if active_child else None),
            reply_markup=build_child_selection_keyboard(
                context.children,
                section="profile",
                active_child_id=active_child.student_id if active_child else None,
                portal_url=_portal_url(),
            ),
        )
    except Exception:
        logger.exception("DB query failed while showing children user_id=%s", user_key)
        await _answer_html(message, "⚠️ <b>Farzandlar ma'lumotini yuklab bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


async def _show_children_callback(callback: CallbackQuery) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_no_linked_students_message())
            return
        active_child = _resolve_active_child(user_key, context)
        if len(context.children) == 1 and active_child is not None:
            await _edit_html(
                callback,
                build_child_profile_message(active_child),
                reply_markup=build_child_section_keyboard(
                    active_child.student_id,
                    current_section="profile",
                    show_switch_child=False,
                    portal_url=_portal_url(),
                ),
            )
            return
        await _edit_html(
            callback,
            build_children_list_message(context.children, active_child_id=active_child.student_id if active_child else None),
            reply_markup=build_child_selection_keyboard(
                context.children,
                section="profile",
                active_child_id=active_child.student_id if active_child else None,
                portal_url=_portal_url(),
            ),
        )
    finally:
        db.close()


async def _show_child_section_message(message: Message, section: str) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _answer_html(message, build_no_linked_students_message())
            return
        if section == "notifications":
            items = service.get_recent_parent_notifications(user_key, limit=8)
            await _answer_html(
                message,
                build_notifications_message(items),
                reply_markup=build_notifications_keyboard(context.children, portal_url=_portal_url()),
            )
            return
        child = _resolve_active_child(user_key, context)
        if child is None:
            await _answer_html(message, build_no_linked_students_message())
            return
        await _answer_html(
            message,
            _child_section_text(service, user_key, child, section),
            reply_markup=build_child_section_keyboard(
                child.student_id,
                current_section=section,
                show_switch_child=len(context.children) > 1,
                portal_url=_portal_url(),
            ),
        )
    except Exception:
        logger.exception("DB query failed while showing section=%s user_id=%s", section, user_key)
        await _answer_html(message, "⚠️ <b>Ma'lumotlarni yuklab bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


async def _show_child_section_callback(callback: CallbackQuery, student_id: int, section: str) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_no_linked_students_message())
            return
        child = service.get_child_profile(user_key, student_id)
        if child is None:
            await callback.answer("Bu farzand sizga ulanmagan", show_alert=True)
            return
        _remember_active_child(user_key, child.student_id)
        await _edit_html(
            callback,
            _child_section_text(service, user_key, child, section),
            reply_markup=build_child_section_keyboard(
                child.student_id,
                current_section=section,
                show_switch_child=len(context.children) > 1,
                portal_url=_portal_url(),
            ),
        )
    finally:
        db.close()


async def _show_child_selector_callback(callback: CallbackQuery, section: str) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_no_linked_students_message())
            return
        active_child = _resolve_active_child(user_key, context)
        await _edit_html(
            callback,
            build_select_child_message(SECTION_TITLES.get(section, "Farzand tanlash")),
            reply_markup=build_child_selection_keyboard(
                context.children,
                section=section,
                active_child_id=active_child.student_id if active_child else None,
                portal_url=_portal_url(),
            ),
        )
    finally:
        db.close()


async def _show_notifications_callback(callback: CallbackQuery, student_id: int | None = None) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_no_linked_students_message())
            return
        selected_child_name = None
        if student_id is not None:
            child = service.get_child_profile(user_key, student_id)
            if child is None:
                await callback.answer("Bu farzand sizga ulanmagan", show_alert=True)
                return
            _remember_active_child(user_key, child.student_id)
            selected_child_name = child.full_name
        items = service.get_recent_parent_notifications(user_key, student_id=student_id, limit=8)
        await _edit_html(
            callback,
            build_notifications_message(items, selected_child_name=selected_child_name),
            reply_markup=build_notifications_keyboard(
                context.children,
                selected_child_id=student_id,
                portal_url=_portal_url(),
            ),
        )
    finally:
        db.close()


async def _show_settings_message(message: Message) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _answer_html(message, build_welcome_message())
            return
        active_child = _resolve_active_child(user_key, context)
        await _answer_html(
            message,
            build_settings_message(
                active_child,
                len(context.children),
                parent_phone_number=context.phone_number,
            ),
            reply_markup=build_settings_keyboard(
                has_multiple_children=len(context.children) > 1,
                portal_url=_portal_url(),
            ),
        )
    except Exception:
        logger.exception("DB query failed while showing settings user_id=%s", user_key)
        await _answer_html(message, "⚠️ <b>Sozlamalarni yuklab bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


async def _show_settings_callback(callback: CallbackQuery, target: str) -> None:
    user_key = _user_key(callback)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await callback.answer("Profil aniqlanmadi", show_alert=True)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _edit_html(callback, build_welcome_message())
            return
        if target == "help":
            await _edit_html(
                callback,
                build_help_message(),
                reply_markup=build_settings_keyboard(
                    has_multiple_children=len(context.children) > 1,
                    portal_url=_portal_url(),
                ),
            )
            return
        if target == "notifications":
            await _edit_html(
                callback,
                build_notification_settings_message(),
                reply_markup=build_settings_keyboard(
                    has_multiple_children=len(context.children) > 1,
                    portal_url=_portal_url(),
                ),
            )
            return
        if target == "contact":
            if callback.message is not None:
                await callback.message.answer(
                    build_contact_request_message(context.phone_number),
                    reply_markup=CONTACT_REQUEST_MENU,
                )
            await callback.answer("Telefon raqamingizni yuboring")
            return
        active_child = _resolve_active_child(user_key, context)
        await _edit_html(
            callback,
            build_select_child_message("Faol farzand"),
            reply_markup=build_child_selection_keyboard(
                context.children,
                section="profile",
                active_child_id=active_child.student_id if active_child else None,
                portal_url=_portal_url(),
            ),
        )
    finally:
        db.close()


async def _show_help_message(message: Message) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    await _answer_html(message, build_help_message())


async def _show_contact_request_message(message: Message) -> None:
    user_key = _user_key(message)
    _mark_awaiting_code(user_key, False)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None:
            await _answer_html(message, build_no_linked_students_message())
            return
        await _answer_html(
            message,
            build_contact_request_message(context.phone_number),
            reply_markup=CONTACT_REQUEST_MENU,
        )
    except Exception:
        logger.exception("DB query failed while showing contact request user_id=%s", user_key)
        await _answer_html(message, "⚠️ <b>Telefon so'rovini ochib bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


async def _ask_code(message: Message) -> None:
    _mark_awaiting_code(_user_key(message), True)
    await _answer_main_html(message, build_ask_code_message())


async def _handle_link_code(message: Message, code_text: str) -> None:
    user_key = _user_key(message)
    if message.from_user is None or message.chat is None or user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    code = code_text.strip()
    if len(code) < 6:
        await _answer_html(message, build_code_too_short_message())
        return

    db = SessionLocal()
    try:
        _, student = link_parent_by_code(
            db,
            code=code,
            telegram_chat_id=str(message.chat.id),
            telegram_user_id=user_key,
            full_name=_display_name(message),
        )
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        child = service.get_child_profile(user_key, student.id)
        if child is None:
            child = ParentLinkedChild(
                student_id=student.id,
                full_name=f"{student.firstname} {student.lastname}".strip(),
                group_name=student.group.name if student.group else "Guruhsiz",
                teacher_name=student.group.teacher.name if student.group and student.group.teacher else None,
                phone_number=student.phone_number,
                relation_type="guardian",
                is_active=student.is_active,
            )
        _remember_active_child(user_key, child.student_id)
        _mark_awaiting_code(user_key, False)
        await _answer_html(
            message,
            build_link_success_message(
                student=StudentInfo(
                    full_name=child.full_name,
                    group_name=child.group_name,
                    teacher_name=child.teacher_name,
                    phone_number=child.phone_number,
                    relation_type=child.relation_type,
                    is_active=child.is_active,
                )
            ),
        )
        await _answer_html(
            message,
            build_child_profile_message(child),
            reply_markup=build_child_section_keyboard(
                child.student_id,
                current_section="profile",
                show_switch_child=bool(context and len(context.children) > 1),
                portal_url=_portal_url(),
            ),
        )
    except ValueError as exc:
        logger.info("Parent link code rejected user_id=%s code=%r reason=%s", user_key, code, exc)
        _mark_awaiting_code(user_key, True)
        await _answer_html(message, str(exc))
    except Exception:
        logger.exception("DB query failed while linking parent user_id=%s code=%r", user_key, code)
        await _answer_html(message, "⚠️ <b>Ulash kodini tekshirib bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


def _should_try_link_code(message: Message) -> bool:
    user_key = _user_key(message)
    if user_key is None or not message.text:
        return False
    text = message.text.strip()
    if not text or _normalize_text(text) in _NON_CODE_TEXTS or text.startswith("/"):
        return False
    return user_key in _AWAITING_CODE_USERS or bool(_CODE_PATTERN.fullmatch(text))


def _bot_commands() -> list[BotCommand]:
    return [
        BotCommand(command="start", description="Botni boshlash"),
        BotCommand(command="menu", description="Asosiy menyu"),
        BotCommand(command="link", description="Ulash kodini yuborish"),
        BotCommand(command="children", description="Farzandlarim"),
        BotCommand(command="attendance", description="Davomat"),
        BotCommand(command="grades", description="Baholar"),
        BotCommand(command="homework", description="Vazifalar"),
        BotCommand(command="payments", description="To‘lovlar"),
        BotCommand(command="notifications", description="Xabarlar"),
        BotCommand(command="help", description="Yordam"),
    ]


async def _set_commands(bot: Bot) -> None:
    try:
        await bot.set_my_commands(_bot_commands())
    except Exception:
        logger.exception("Failed to sync Telegram bot commands")


def create_parent_bot_dispatcher() -> Dispatcher:
    global _PARENT_DISPATCHER
    if _PARENT_DISPATCHER is None:
        dispatcher = Dispatcher()
        dispatcher.message.outer_middleware(IncomingMessageLogger())
        dispatcher.include_router(router)
        _PARENT_DISPATCHER = dispatcher
    return _PARENT_DISPATCHER


def create_parent_bot() -> Bot:
    global _PARENT_BOT
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required to create the parent bot")
    if _PARENT_BOT is None:
        _PARENT_BOT = Bot(
            token=settings.telegram_bot_token,
            default=DefaultBotProperties(parse_mode="HTML"),
        )
    return _PARENT_BOT


async def setup_parent_bot_webhook() -> None:
    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN is missing; Telegram webhook was not configured")
        return
    if not settings.backend_public_url:
        logger.warning("BACKEND_PUBLIC_URL is missing; Telegram webhook was not configured")
        return

    bot = create_parent_bot()
    create_parent_bot_dispatcher()
    await _set_commands(bot)
    webhook_url = (
        settings.backend_public_url.rstrip("/")
        + settings.api_v1_prefix.rstrip("/")
        + "/telegram/webhook"
    )
    await bot.set_webhook(webhook_url, secret_token=settings.telegram_webhook_secret or None)
    logger.info("Telegram webhook set: %s", webhook_url)


async def close_parent_bot() -> None:
    if _PARENT_BOT is not None:
        await _PARENT_BOT.session.close()


@router.message(CommandStart())
async def start(message: Message, command: CommandObject | None = None) -> None:
    _log_matched_handler("start", message)
    if command and command.args:
        await _handle_link_code(message, command.args)
        return
    await _show_home_message(message)


@router.message(Command("menu"))
async def menu_command(message: Message) -> None:
    _log_matched_handler("menu", message)
    await _show_main_menu_message(message)


@router.message(Command("link"))
async def link_command(message: Message) -> None:
    _log_matched_handler("link", message)
    await _ask_code(message)


@router.message(Command("children"))
async def children_command(message: Message) -> None:
    _log_matched_handler("children", message)
    await _show_children_message(message)


@router.message(Command("attendance"))
async def attendance_command(message: Message) -> None:
    _log_matched_handler("attendance", message)
    await _show_child_section_message(message, "attendance")


@router.message(Command("grades"))
async def grades_command(message: Message) -> None:
    _log_matched_handler("grades", message)
    await _show_child_section_message(message, "grades")


@router.message(Command("homework"))
async def homework_command(message: Message) -> None:
    _log_matched_handler("homework", message)
    await _show_child_section_message(message, "homework")


@router.message(Command("payments"))
async def payments_command(message: Message) -> None:
    _log_matched_handler("payments", message)
    await _show_child_section_message(message, "payments")


@router.message(Command("notifications"))
async def notifications_command(message: Message) -> None:
    _log_matched_handler("notifications", message)
    await _show_child_section_message(message, "notifications")


@router.message(Command("help"))
async def help_command(message: Message) -> None:
    _log_matched_handler("help", message)
    await _show_help_message(message)


@router.message(F.text)
async def menu_text_router(message: Message) -> None:
    intent = _message_intent(message.text)
    if intent:
        _log_matched_handler(f"text:{intent}", message)

    if intent == "home":
        await _show_home_message(message)
        return
    if intent == "children":
        await _show_children_message(message)
        return
    if intent == "attendance":
        await _show_child_section_message(message, "attendance")
        return
    if intent == "grades":
        await _show_child_section_message(message, "grades")
        return
    if intent == "homework":
        await _show_child_section_message(message, "homework")
        return
    if intent == "payments":
        await _show_child_section_message(message, "payments")
        return
    if intent == "notifications":
        await _show_child_section_message(message, "notifications")
        return
    if intent == "link":
        await _ask_code(message)
        return
    if intent == "settings" or intent == "back":
        await _show_settings_message(message)
        return
    if intent == "help":
        await _show_help_message(message)
        return

    if _should_try_link_code(message):
        _log_matched_handler("text:link-code", message)
        await _handle_link_code(message, message.text or "")
        return

    logger.info("Unknown parent bot text user_id=%s text=%r", message.from_user.id if message.from_user else None, message.text)
    await _answer_html(
        message,
        "Men sizni tushunmadim. Iltimos, menyudan birini tanlang.",
        reply_markup=MAIN_MENU,
    )


@router.message(F.text == HOME_TEXT)
async def home_button(message: Message) -> None:
    await _show_home_message(message)


@router.message(F.text == CHILDREN_TEXT)
@router.message(F.text == LEGACY_MY_CHILD_TEXT)
@router.message(F.text == "Mening farzandim")
async def children_button(message: Message) -> None:
    await _show_children_message(message)


@router.message(F.text == ATTENDANCE_TEXT)
async def attendance_button(message: Message) -> None:
    await _show_child_section_message(message, "attendance")


@router.message(F.text == GRADES_TEXT)
async def grades_button(message: Message) -> None:
    await _show_child_section_message(message, "grades")


@router.message(F.text == HOMEWORK_TEXT)
async def homework_button(message: Message) -> None:
    await _show_child_section_message(message, "homework")


@router.message(F.text == PAYMENTS_TEXT)
async def payments_button(message: Message) -> None:
    await _show_child_section_message(message, "payments")


@router.message(F.text == NOTIFICATIONS_TEXT)
@router.message(F.text == LEGACY_NOTIFICATIONS_TEXT)
@router.message(F.text == "So'nggi bildirishnomalar")
async def notifications_button(message: Message) -> None:
    await _show_child_section_message(message, "notifications")


@router.message(F.text == SEND_CODE_TEXT)
@router.message(F.text == "Ulash kodi yuborish")
async def ask_code_button(message: Message) -> None:
    await _ask_code(message)


@router.message(F.text == SETTINGS_TEXT)
async def settings_button(message: Message) -> None:
    await _show_settings_message(message)


@router.message(F.text == HELP_TEXT)
async def help_button(message: Message) -> None:
    await _show_help_message(message)


@router.message(F.text == SHARE_CONTACT_TEXT)
async def share_contact_button(message: Message) -> None:
    await _show_contact_request_message(message)


@router.message(F.text == BACK_TEXT)
async def back_button(message: Message) -> None:
    await _show_settings_message(message)


@router.message(F.contact)
async def contact_shared(message: Message) -> None:
    contact = message.contact
    user_key = _user_key(message)
    if contact is None or message.from_user is None or user_key is None:
        await _answer_html(message, build_contact_share_error_message(), reply_markup=CONTACT_REQUEST_MENU)
        return
    if contact.user_id is not None and contact.user_id != message.from_user.id:
        await _answer_html(message, build_contact_share_error_message(), reply_markup=CONTACT_REQUEST_MENU)
        return

    db = SessionLocal()
    try:
        service = ParentBotService(db)
        saved = service.update_parent_phone(user_key, contact.phone_number or "")
        if not saved:
            await _answer_html(message, build_no_linked_students_message())
            return
        await _answer_html(message, build_contact_saved_message(contact.phone_number or "-"))
    except Exception:
        logger.exception("DB query failed while saving parent contact user_id=%s", user_key)
        await _answer_html(message, "⚠️ <b>Telefon raqamini saqlab bo'lmadi.</b>\n\nIltimos, keyinroq qayta urinib ko'ring.")
    finally:
        db.close()


@router.callback_query(F.data == "home")
@router.callback_query(F.data == "back:home")
async def back_home(callback: CallbackQuery) -> None:
    await _show_home_callback(callback)


@router.callback_query(F.data == "children")
@router.callback_query(F.data == "back:children")
async def children_callback(callback: CallbackQuery) -> None:
    await _show_children_callback(callback)


@router.callback_query(F.data.startswith("choose:"))
async def choose_child_callback(callback: CallbackQuery) -> None:
    _, section = (callback.data or "choose:profile").split(":", maxsplit=1)
    await _show_child_selector_callback(callback, section)


@router.callback_query(F.data == "notifications:all")
async def notifications_all_callback(callback: CallbackQuery) -> None:
    await _show_notifications_callback(callback, student_id=None)


@router.callback_query(F.data.startswith("refresh:"))
async def refresh_callback(callback: CallbackQuery) -> None:
    parts = (callback.data or "").split(":")
    if len(parts) < 3:
        await callback.answer("Yangilash bo'limi topilmadi", show_alert=True)
        return
    section = parts[1]
    target = parts[2]
    if section == "notifications":
        if target == "all":
            await _show_notifications_callback(callback, student_id=None)
            return
        try:
            await _show_notifications_callback(callback, student_id=int(target))
            return
        except ValueError:
            await callback.answer("Farzand aniqlanmadi", show_alert=True)
            return
    try:
        student_id = int(target)
    except ValueError:
        await callback.answer("Farzand aniqlanmadi", show_alert=True)
        return
    await _show_child_section_callback(callback, student_id, section)


@router.callback_query(F.data.startswith("settings:"))
async def settings_callback(callback: CallbackQuery) -> None:
    _, target = (callback.data or "settings:help").split(":", maxsplit=1)
    await _show_settings_callback(callback, target)


@router.callback_query(F.data.startswith("child:"))
async def child_callback(callback: CallbackQuery) -> None:
    data = callback.data or ""
    parts = data.split(":")
    if len(parts) < 2:
        await callback.answer("Bo'lim topilmadi", show_alert=True)
        return
    try:
        student_id = int(parts[1])
    except ValueError:
        await callback.answer("Farzand aniqlanmadi", show_alert=True)
        return
    section = parts[2] if len(parts) > 2 else "profile"
    if section == "notifications":
        await _show_child_section_callback(callback, student_id, section)
        return
    await _show_child_section_callback(callback, student_id, section)


@router.message()
async def fallback(message: Message) -> None:
    if _should_try_link_code(message):
        await _handle_link_code(message, message.text or "")
        return
    user_key = _user_key(message)
    if user_key is None:
        await _answer_html(message, build_profile_unavailable_message(), reply_markup=None)
        return
    db = SessionLocal()
    try:
        service = ParentBotService(db)
        context = service.get_parent_context(user_key)
        if context is None or not context.children:
            await _answer_html(message, build_welcome_message())
            return
    finally:
        db.close()
    await _answer_html(message, "Kerakli bo'limni pastdagi menyudan tanlang.")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required to run the parent bot")
    bot = create_parent_bot()
    try:
        logger.info("Parent Telegram bot startup requested")
        await _set_commands(bot)
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Telegram webhook deleted before polling")
        print("✅ Parent Telegram bot started", flush=True)
        logger.info("✅ Parent Telegram bot started")
        dispatcher = create_parent_bot_dispatcher()
        await dispatcher.start_polling(bot)
    except Exception:
        logger.exception("Parent Telegram bot stopped with an error")
        raise
    finally:
        await close_parent_bot()


if __name__ == "__main__":
    asyncio.run(main())
