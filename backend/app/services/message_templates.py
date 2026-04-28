from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from html import escape
import re
from typing import Iterable


DEFAULT_VALUE = "-"
ACADEMY_NAME = "EduPro Academy"

UZBEK_MONTHS = {
    1: "Yanvar",
    2: "Fevral",
    3: "Mart",
    4: "Aprel",
    5: "May",
    6: "Iyun",
    7: "Iyul",
    8: "Avgust",
    9: "Sentabr",
    10: "Oktabr",
    11: "Noyabr",
    12: "Dekabr",
}

NOTIFICATION_TYPE_LABELS = {
    "absent": "Davomat",
    "late": "Davomat",
    "bad_grade": "Baho",
    "homework_missing": "Vazifa",
    "payment_reminder": "To'lov",
    "announcement": "Bildirishnoma",
}

NOTIFICATION_TYPE_EMOJIS = {
    "absent": "❌",
    "late": "⏰",
    "bad_grade": "⚠️",
    "homework_missing": "📚",
    "payment_reminder": "💳",
    "announcement": "📣",
}


@dataclass(frozen=True)
class StudentInfo:
    full_name: str
    group_name: str | None = None
    teacher_name: str | None = None
    phone_number: str | None = None
    relation_type: str | None = None
    is_active: bool | None = None


@dataclass(frozen=True)
class RecentNotificationInfo:
    title: str
    message: str
    notification_type: str
    created_at: datetime | None = None
    is_sent: bool = False
    student_name: str | None = None


def html_text(value: object | None, default: str = DEFAULT_VALUE) -> str:
    text = str(value).strip() if value is not None else ""
    return escape(text or default, quote=False)


def format_date(value: date | datetime | str | None) -> str:
    if value is None:
        return DEFAULT_VALUE
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.strftime("%d.%m.%Y")
    return html_text(value)


def format_datetime(value: datetime | None) -> str:
    if value is None:
        return DEFAULT_VALUE
    return value.strftime("%d.%m.%Y %H:%M")


def format_month(value: date | datetime | str | None) -> str:
    if value is None:
        return DEFAULT_VALUE
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return f"{UZBEK_MONTHS.get(value.month, value.month)} {value.year}"
    return html_text(value)


def format_money(value: Decimal | int | float | str | None) -> str:
    if value is None:
        return DEFAULT_VALUE
    try:
        amount = Decimal(str(value))
    except Exception:
        return html_text(value)
    formatted = f"{amount:,.2f}".replace(",", " ")
    if formatted.endswith(".00"):
        formatted = formatted[:-3]
    return f"{formatted} so'm"


def student_full_name(firstname: str | None, lastname: str | None) -> str:
    return " ".join(part.strip() for part in [firstname or "", lastname or ""] if part and part.strip()) or DEFAULT_VALUE


def relation_label(value: str | None) -> str:
    return {
        "mother": "Ona",
        "father": "Ota",
        "guardian": "Vasiy",
    }.get((value or "").strip().lower(), value or DEFAULT_VALUE)


def attendance_status_label(status: str | None) -> str:
    return {
        "present": "Keldi",
        "came": "Keldi",
        "late": "Kechikdi",
        "absent": "Kelmadi",
        "excused": "Sababli",
    }.get((status or "").strip().lower(), status or DEFAULT_VALUE)


def attendance_status_emoji(status: str | None) -> str:
    return {
        "present": "✅",
        "came": "✅",
        "late": "⏰",
        "absent": "❌",
        "excused": "🟡",
    }.get((status or "").strip().lower(), "ℹ️")


def payment_status_label(status: str | None) -> str:
    if not status:
        return DEFAULT_VALUE
    normalized = status.strip().lower()
    return {
        "paid": "To'langan",
        "partial": "Qisman to'langan",
        "pending": "Kutilmoqda",
        "unpaid": "To'lanmagan",
        "failed": "Muvaffaqiyatsiz",
    }.get(normalized, status)


def notification_emoji(notification_type: str | None) -> str:
    return NOTIFICATION_TYPE_EMOJIS.get((notification_type or "").strip().lower(), "📌")


def notification_type_label(notification_type: str | None) -> str:
    normalized = (notification_type or "").strip().lower()
    return NOTIFICATION_TYPE_LABELS.get(normalized, notification_type or DEFAULT_VALUE)


def _separator() -> str:
    return "━━━━━━━━━━━━"


def _html_note(note: str | None) -> str:
    if not note or not note.strip():
        return ""
    return f"\n📝 <b>Izoh:</b> {html_text(note)}"


def _student_lines(student_name: str, group_name: str | None = None, teacher_name: str | None = None) -> list[str]:
    lines = [
        f"👤 <b>Farzand:</b> {html_text(student_name)}",
        f"🏫 <b>Guruh:</b> {html_text(group_name)}",
    ]
    if teacher_name:
        lines.append(f"👨‍🏫 <b>O'qituvchi:</b> {html_text(teacher_name)}")
    return lines


def build_absent_message(
    *,
    student_name: str,
    group_name: str | None = None,
    teacher_name: str | None = None,
    attendance_date: date | datetime | str | None = None,
    note: str | None = None,
) -> str:
    lines = [
        "❌ <b>Farzandingiz bugun darsga kelmadi</b>",
        _separator(),
        *_student_lines(student_name, group_name, teacher_name),
        f"📅 <b>Sana:</b> {format_date(attendance_date)}",
        "",
        "Iltimos, holatni aniqlab ko'ring.",
    ]
    return "\n".join(lines) + _html_note(note)


def build_late_message(
    *,
    student_name: str,
    group_name: str | None = None,
    teacher_name: str | None = None,
    attendance_date: date | datetime | str | None = None,
    note: str | None = None,
) -> str:
    lines = [
        "⏰ <b>Farzandingiz darsga kechikdi</b>",
        _separator(),
        *_student_lines(student_name, group_name, teacher_name),
        f"📅 <b>Sana:</b> {format_date(attendance_date)}",
        "",
        "Iltimos, kechikish sababiga e'tibor qarating.",
    ]
    return "\n".join(lines) + _html_note(note)


def build_positive_attendance_message(
    *,
    student_name: str,
    group_name: str | None = None,
    teacher_name: str | None = None,
    attendance_date: date | datetime | str | None = None,
) -> str:
    lines = [
        "✅ <b>Farzandingiz darsda qatnashdi</b>",
        _separator(),
        *_student_lines(student_name, group_name, teacher_name),
        f"📅 <b>Sana:</b> {format_date(attendance_date)}",
    ]
    return "\n".join(lines)


def build_bad_grade_message(
    *,
    student_name: str,
    group_name: str | None = None,
    teacher_name: str | None = None,
    lesson_title: str | None = None,
    grade_value: int | float | str | None = None,
    max_score: int | float | str | None = None,
    created_at: date | datetime | str | None = None,
    note: str | None = None,
) -> str:
    grade_text = html_text(grade_value)
    if max_score is not None:
        grade_text = f"{grade_text}/{html_text(max_score)}"
    lines = [
        "⚠️ <b>Farzandingiz past baho oldi</b>",
        _separator(),
        *_student_lines(student_name, group_name, teacher_name),
        f"📝 <b>Mavzu:</b> {html_text(lesson_title, default='Dars')}",
        f"📊 <b>Baho:</b> {grade_text}",
        f"📅 <b>Sana:</b> {format_date(created_at)}",
    ]
    return "\n".join(lines) + _html_note(note)


def build_homework_message(
    *,
    student_name: str,
    group_name: str | None = None,
    homework_title: str | None = None,
    homework_date: date | datetime | str | None = None,
    note: str | None = None,
) -> str:
    lines = [
        "📚 <b>Vazifa bajarilmagan</b>",
        _separator(),
        f"👤 <b>Farzand:</b> {html_text(student_name)}",
        f"🏫 <b>Guruh:</b> {html_text(group_name)}",
        f"📘 <b>Vazifa:</b> {html_text(homework_title, default='Topshiriq')}",
        f"📅 <b>Muddat:</b> {format_date(homework_date)}",
        "",
        "Iltimos, vazifani vaqtida topshirishga yordam bering.",
    ]
    return "\n".join(lines) + _html_note(note)


def build_payment_message(
    *,
    student_name: str,
    group_name: str | None = None,
    month: date | datetime | str | None = None,
    debt_amount: Decimal | int | float | str | None = None,
    status_text: str = "To'lov mavjud emas",
    note: str | None = None,
) -> str:
    lines = [
        "💳 <b>To'lov eslatmasi</b>",
        _separator(),
        f"👤 <b>Farzand:</b> {html_text(student_name)}",
        f"🏫 <b>Guruh:</b> {html_text(group_name)}",
        f"📆 <b>Oy:</b> {format_month(month)}",
        f"📌 <b>Holat:</b> {html_text(status_text)}",
    ]
    if debt_amount is not None:
        lines.append(f"🔴 <b>Qarzdorlik:</b> {format_money(debt_amount)}")
    lines.append("")
    lines.append("Iltimos, to'lov holatini tekshirib ko'ring.")
    return "\n".join(lines) + _html_note(note)


def build_announcement_message(
    *,
    title: str,
    message: str,
    student_name: str | None = None,
    group_name: str | None = None,
) -> str:
    lines = [
        "📣 <b>Muhim bildirishnoma</b>",
        _separator(),
        f"📌 <b>Mavzu:</b> {html_text(title)}",
    ]
    if student_name:
        lines.append(f"👤 <b>Farzand:</b> {html_text(student_name)}")
    if group_name:
        lines.append(f"🏫 <b>Guruh:</b> {html_text(group_name)}")
    lines.extend(["", html_text(message)])
    return "\n".join(lines)


def build_link_success_message(*, student: StudentInfo) -> str:
    lines = [
        "✅ <b>Ulash muvaffaqiyatli yakunlandi</b>",
        _separator(),
        "Telegram profilingiz farzand profilinga bog'landi.",
        "",
        f"👤 <b>Farzand:</b> {html_text(student.full_name)}",
        f"🏫 <b>Guruh:</b> {html_text(student.group_name)}",
    ]
    if student.teacher_name:
        lines.append(f"👨‍🏫 <b>O'qituvchi:</b> {html_text(student.teacher_name)}")
    if student.relation_type:
        lines.append(f"👨‍👩‍👧 <b>Aloqa:</b> {html_text(relation_label(student.relation_type))}")
    lines.extend(
        [
            "",
            "Endi siz davomat, baholar, vazifalar va muhim bildirishnomalarni shu botdan kuzatib borasiz.",
        ]
    )
    return "\n".join(lines)


def build_welcome_message(academy_name: str = ACADEMY_NAME) -> str:
    return "\n".join(
        [
            "👋 <b>Assalomu alaykum!</b>",
            _separator(),
            f"{html_text(academy_name)} parent botiga xush kelibsiz.",
            "",
            "Bu bot orqali siz:",
            "• 📊 davomatni",
            "• 📝 baholarni",
            "• 📚 vazifalarni",
            "• 💳 to'lov holatini",
            "• 🔔 muhim bildirishnomalarni",
            "",
            "bir joyda ko'rishingiz mumkin.",
            "",
            "Boshlash uchun admin bergan ulash kodini yuboring.",
        ]
    )


def build_student_info_message(student: StudentInfo) -> str:
    lines = [
        "👨‍👩‍👧 <b>Farzand profili</b>",
        _separator(),
        f"👤 <b>F.I.Sh.:</b> {html_text(student.full_name)}",
        f"🏫 <b>Guruh:</b> {html_text(student.group_name)}",
    ]
    if student.teacher_name:
        lines.append(f"👨‍🏫 <b>O'qituvchi:</b> {html_text(student.teacher_name)}")
    if student.phone_number:
        lines.append(f"📞 <b>Telefon:</b> {html_text(student.phone_number)}")
    if student.relation_type:
        lines.append(f"👨‍👩‍👧 <b>Aloqa:</b> {html_text(relation_label(student.relation_type))}")
    if student.is_active is not None:
        lines.append(f"✅ <b>Holat:</b> {'Faol' if student.is_active else 'Nofaol'}")
    return "\n".join(lines)


def build_students_info_message(students: Iterable[StudentInfo]) -> str:
    items = list(students)
    if not items:
        return build_no_linked_students_message()
    if len(items) == 1:
        return build_student_info_message(items[0])
    lines = [
        "👨‍👩‍👧 <b>Ulangan farzandlar</b>",
        _separator(),
    ]
    for index, student in enumerate(items, start=1):
        lines.append(f"{index}. <b>{html_text(student.full_name)}</b>")
        lines.append(f"🏫 {html_text(student.group_name)}")
        if student.teacher_name:
            lines.append(f"👨‍🏫 {html_text(student.teacher_name)}")
        if student.relation_type:
            lines.append(f"👨‍👩‍👧 {html_text(relation_label(student.relation_type))}")
        if index != len(items):
            lines.append("")
    return "\n".join(lines)


def build_recent_notifications_message(items: Iterable[RecentNotificationInfo]) -> str:
    rows = list(items)
    if not rows:
        return build_no_notifications_message()

    lines = [
        "🔔 <b>So'nggi bildirishnomalar</b>",
        _separator(),
    ]
    for index, item in enumerate(rows, start=1):
        icon = notification_emoji(item.notification_type)
        lines.append(f"{index}. {icon} <b>{html_text(item.title)}</b>")
        if item.student_name:
            lines.append(f"👤 <b>Farzand:</b> {html_text(item.student_name)}")
        lines.append(f"🏷 <b>Turi:</b> {html_text(notification_type_label(item.notification_type))}")
        lines.append(f"🕒 <b>Vaqt:</b> {format_datetime(item.created_at)}")
        lines.append(f"📨 <b>Holat:</b> {'Yuborildi' if item.is_sent else 'Saqlangan'}")
        preview = _message_preview(item.message)
        if preview:
            lines.append(f"💬 {html_text(preview)}")
        if index != len(rows):
            lines.append("")
    return "\n".join(lines)


def build_ask_code_message() -> str:
    return "\n".join(
        [
            "🔗 <b>Ulash kodi</b>",
            _separator(),
            "Admin tomonidan berilgan kodni shu chatga yuboring.",
            "",
            "Masalan: <b>ABCD1234</b>",
        ]
    )


def build_invalid_code_message() -> str:
    return "\n".join(
        [
            "❌ <b>Kod noto'g'ri yoki muddati tugagan</b>",
            "",
            "Iltimos, kodni tekshirib qayta yuboring yoki yangi kod so'rang.",
        ]
    )


def build_code_too_short_message() -> str:
    return "\n".join(
        [
            "⚠️ <b>Kod juda qisqa</b>",
            "",
            "Iltimos, to'liq ulash kodini yuboring.",
        ]
    )


def build_already_linked_message() -> str:
    return "\n".join(
        [
            "ℹ️ <b>Telegram profilingiz allaqachon bog'langan</b>",
            "",
            "Yana bir farzandni ulash kerak bo'lsa, yangi kod yuborishingiz mumkin.",
        ]
    )


def build_no_notifications_message() -> str:
    return "\n".join(
        [
            "🔕 <b>Hozircha bildirishnomalar yo'q</b>",
            "",
            "Yangi absent, kechikish, baho, vazifa va to'lov xabarlari shu yerda ko'rinadi.",
        ]
    )


def build_no_linked_students_message() -> str:
    return "\n".join(
        [
            "ℹ️ <b>Farzand profili hali ulanmagan</b>",
            "",
            "Boshlash uchun admin bergan ulash kodini yuboring.",
        ]
    )


def build_profile_unavailable_message() -> str:
    return "\n".join(
        [
            "⚠️ <b>Telegram profilingiz aniqlanmadi</b>",
            "",
            "Iltimos, birozdan keyin qayta urinib ko'ring.",
        ]
    )


def _message_preview(message: str, max_length: int = 100) -> str:
    plain = re.sub(r"<[^>]+>", "", message or "")
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_length:
        return plain
    return plain[: max_length - 3].rstrip() + "..."
