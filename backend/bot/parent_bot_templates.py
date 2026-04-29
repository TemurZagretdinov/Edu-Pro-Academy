from __future__ import annotations

from html import escape
import re

from app.services.message_templates import (
    attendance_status_emoji,
    attendance_status_label,
    format_date,
    format_datetime,
    format_money,
    format_month,
    notification_emoji,
    notification_type_label,
    payment_status_label,
    relation_label,
)
from app.services.parent_bot_service import (
    AttendanceSummaryView,
    GradeSummaryView,
    HomeworkSummaryView,
    ParentLinkedChild,
    ParentNotificationItem,
    PaymentSummaryView,
)


def _html(value: str | None, default: str = "-") -> str:
    text = (value or "").strip()
    return escape(text or default, quote=False)


def _separator() -> str:
    return "━━━━━━━━━━━━━"


def build_parent_home_message(
    *,
    parent_name: str,
    children: list[ParentLinkedChild],
    active_child: ParentLinkedChild | None = None,
    attendance: AttendanceSummaryView | None = None,
    grades: GradeSummaryView | None = None,
    homework: HomeworkSummaryView | None = None,
    payment: PaymentSummaryView | None = None,
) -> str:
    lines = [
        "👋 <b>Xush kelibsiz!</b>",
        _separator(),
        f"Assalomu alaykum, <b>{_html(parent_name, default='Ota-ona')}</b>.",
    ]
    if not children:
        lines.extend(
            [
                "",
                "Bu bot orqali farzandingizning:",
                "📊 davomatini",
                "📝 baholarini",
                "📚 vazifalarini",
                "💳 to'lov holatini",
                "🔔 muhim bildirishnomalarini",
                "",
                "bir joyda kuzatishingiz mumkin.",
                "",
                "Boshlash uchun <b>🔗 Ulash kodi</b> tugmasini bosing yoki admin bergan kodni yuboring.",
            ]
        )
        return "\n".join(lines)

    lines.append(f"👨‍👩‍👧 <b>Ulangan farzandlar:</b> {len(children)} ta")
    lines.append("")
    if active_child is None:
        lines.append("Farzandlar ro'yxatini tanlang.")
        return "\n".join(lines)

    lines.extend(
        [
            "👤 <b>Faol farzand</b>",
            f"• <b>{_html(active_child.full_name)}</b>",
            f"🏫 {_html(active_child.group_name, default='Guruhsiz')}",
        ]
    )
    if active_child.teacher_name:
        lines.append(f"👨‍🏫 {_html(active_child.teacher_name)}")
    if len(children) > 1:
        lines.append("")
        lines.append("<b>Boshqa farzandlar:</b>")
        for child in children:
            if child.student_id == active_child.student_id:
                continue
            lines.append(f"• {_html(child.full_name)}")

    lines.append("")
    lines.append("📌 <b>Qisqa holat</b>")
    if attendance:
        today_status = attendance_status_label(attendance.today_status) if attendance.today_status else "Belgilanmagan"
        lines.append(f"📊 Davomat: {attendance.attendance_percent:.1f}% ({today_status})")
    if grades:
        latest_grade = grades.items[0].grade_value if grades.items else "-"
        average_grade = f"{grades.average_grade:.1f}" if grades.average_grade is not None else "-"
        lines.append(f"📝 Baholar: oxirgisi {latest_grade}, o'rtacha {average_grade}")
    if homework:
        lines.append(f"📚 Vazifalar: {homework.pending_count} ta kutilmoqda")
    if payment:
        if payment.items or payment.monthly_fee > 0 or payment.current_debt > 0:
            payment_status = "✅ To'langan" if payment.current_debt <= 0 else "⚠️ Qarzdorlik bor"
            lines.append(f"💳 To‘lovlar: {payment_status}")
        else:
            lines.append("💳 To‘lovlar: hozircha ma'lumot yo'q")
    lines.extend(
        [
            "",
            "Pastdagi menyu yoki tugmalar orqali kerakli bo'limni oching.",
        ]
    )
    return "\n".join(lines)


def build_children_list_message(children: list[ParentLinkedChild], active_child_id: int | None = None) -> str:
    if not children:
        return "ℹ️ <b>Farzand profili topilmadi</b>\n\nFarzandni ulash uchun admin bergan kodni yuboring."

    lines = [
        "👨‍👩‍👧 <b>Farzandlarim</b>",
        _separator(),
        "Kerakli farzandni tanlang:",
    ]
    for index, child in enumerate(children, start=1):
        prefix = "✅" if child.student_id == active_child_id else f"{index}."
        lines.append(f"{prefix} <b>{_html(child.full_name)}</b>")
        lines.append(f"🏫 {_html(child.group_name, default='Guruhsiz')}")
        if child.teacher_name:
            lines.append(f"👨‍🏫 {_html(child.teacher_name)}")
        if index != len(children):
            lines.append("")
    return "\n".join(lines)


def build_child_profile_message(child: ParentLinkedChild) -> str:
    status_text = "Faol" if child.is_active else "Nofaol"
    return "\n".join(
        [
            "👤 <b>Farzand profili</b>",
            _separator(),
            f"👤 <b>F.I.Sh.:</b> {_html(child.full_name)}",
            f"🏫 <b>Guruh:</b> {_html(child.group_name, default='Guruhsiz')}",
            f"👨‍🏫 <b>O'qituvchi:</b> {_html(child.teacher_name)}",
            f"📞 <b>Telefon:</b> {_html(child.phone_number)}",
            f"🔗 <b>Aloqa:</b> {_html(relation_label(child.relation_type))}",
            f"✅ <b>Holat:</b> {_html(status_text)}",
            "",
            "Pastdagi tugmalar orqali davomat, baholar, vazifalar va to'lovlar bo'limini oching.",
        ]
    )


def build_attendance_summary_message(child: ParentLinkedChild, summary: AttendanceSummaryView) -> str:
    lines = [
        "📊 <b>Davomat hisoboti</b>",
        _separator(),
        f"👤 <b>O'quvchi:</b> {_html(child.full_name)}",
        f"🏫 <b>Guruh:</b> {_html(child.group_name, default='Guruhsiz')}",
    ]
    if summary.today_status:
        lines.append(
            f"📍 <b>Bugungi holat:</b> {attendance_status_emoji(summary.today_status)} "
            f"{attendance_status_label(summary.today_status)}"
        )
    else:
        lines.append("📍 <b>Bugungi holat:</b> Hali belgilanmagan")
    lines.extend(
        [
            "",
            f"✅ <b>Keldi:</b> {summary.present_count}",
            f"⏰ <b>Kechikdi:</b> {summary.late_count}",
            f"❌ <b>Kelmadi:</b> {summary.absent_count}",
            f"📈 <b>Davomat:</b> {summary.attendance_percent:.1f}%",
            "",
        ]
    )
    if not summary.history:
        lines.append("Hozircha davomat ma'lumotlari mavjud emas.")
        return "\n".join(lines)

    lines.append("<b>So'nggi darslar:</b>")
    for index, item in enumerate(summary.history, start=1):
        row = (
            f"{index}) {attendance_status_emoji(item.status)} {format_date(item.attendance_date)} — "
            f"{attendance_status_label(item.status)}"
        )
        if item.lesson_title:
            row += f" ({_html(item.lesson_title)})"
        lines.append(row)
        if item.note:
            lines.append(f"💬 {_html(item.note)}")
    return "\n".join(lines)


def build_grade_summary_message(child: ParentLinkedChild, summary: GradeSummaryView) -> str:
    average_text = f"{summary.average_grade:.1f}" if summary.average_grade is not None else "-"
    lines = [
        "📝 <b>Baholar</b>",
        _separator(),
        f"👤 <b>O'quvchi:</b> {_html(child.full_name)}",
        f"🏫 <b>Guruh:</b> {_html(child.group_name, default='Guruhsiz')}",
        f"📈 <b>O'rtacha baho:</b> {average_text}",
        f"📚 <b>Jami baholar:</b> {summary.total_count}",
        f"⚠️ <b>Past baholar:</b> {summary.bad_count} ta (<= {summary.threshold})",
        "",
    ]
    if not summary.items:
        lines.append("Hozircha baholar mavjud emas.")
        return "\n".join(lines)

    lines.append("<b>Oxirgi baholar:</b>")
    for item in summary.items:
        badge = "⚠️" if item.is_bad else "✅"
        lines.append(
            f"{badge} <b>{item.grade_value}</b> — {_html(item.lesson_title, default='Dars')} ({format_date(item.attendance_date)})"
        )
        if item.teacher_name:
            lines.append(f"👨‍🏫 {_html(item.teacher_name)}")
        if item.note:
            lines.append(f"💬 {_html(item.note)}")
    return "\n".join(lines)


def build_homework_list_message(child: ParentLinkedChild, summary: HomeworkSummaryView) -> str:
    lines = [
        "📚 <b>Vazifalar</b>",
        _separator(),
        f"👤 <b>O'quvchi:</b> {_html(child.full_name)}",
        f"🏫 <b>Guruh:</b> {_html(child.group_name, default='Guruhsiz')}",
        f"📌 <b>Jami:</b> {summary.total_count}",
        f"✅ <b>Bajarilgan:</b> {summary.completed_count}",
        f"🕐 <b>Kutilmoqda:</b> {summary.pending_count}",
        f"❌ <b>Muddatdan o'tgan:</b> {summary.overdue_count}",
        "",
    ]
    if not summary.items:
        lines.append("Hozircha vazifalar mavjud emas.")
        return "\n".join(lines)

    lines.append("<b>So'nggi vazifalar:</b>")
    for item in summary.items:
        if item.is_completed:
            badge = "✅"
            status_text = "Bajarilgan"
        elif item.is_overdue:
            badge = "❌"
            status_text = "Bajarilmagan"
        else:
            badge = "🕐"
            status_text = "Kutilmoqda"
        lines.append(f"{badge} <b>{_html(item.title)}</b>")
        lines.append(f"⏳ <b>Muddat:</b> {format_date(item.due_date) if item.due_date else format_datetime(item.created_at)}")
        lines.append(f"📌 <b>Holat:</b> {status_text}")
        if item.teacher_name:
            lines.append(f"👨‍🏫 {_html(item.teacher_name)}")
        if item.note:
            lines.append(f"💬 {_html(item.note)}")
    return "\n".join(lines)


def build_payment_summary_message(child: ParentLinkedChild, summary: PaymentSummaryView) -> str:
    if not summary.items and summary.monthly_fee <= 0 and summary.current_debt <= 0:
        return "\n".join(
            [
                "💳 <b>To'lovlar</b>",
                _separator(),
                f"👤 <b>O'quvchi:</b> {_html(child.full_name)}",
                "",
                "💳 To'lov ma'lumotlari hozircha mavjud emas.",
            ]
        )

    debt_status = "✅ To'langan" if summary.current_debt <= 0 else "⚠️ Qarzdorlik bor"
    lines = [
        "💳 <b>To'lov holati</b>",
        _separator(),
        f"👤 <b>O'quvchi:</b> {_html(child.full_name)}",
        f"🏫 <b>Guruh:</b> {_html(child.group_name, default='Guruhsiz')}",
        f"📌 <b>Holat:</b> {debt_status}",
        f"💰 <b>Oylik to'lov:</b> {format_money(summary.monthly_fee)}",
        f"💵 <b>Jami to'langan:</b> {format_money(summary.total_paid)}",
        f"🔴 <b>Qarzdorlik:</b> {format_money(summary.current_debt)}",
        f"🕒 <b>Oxirgi to'lov:</b> {format_date(summary.last_payment_date)}",
    ]
    if summary.unpaid_months:
        lines.append(f"📅 <b>To'lanmagan oylar:</b> {', '.join(format_month(month) for month in summary.unpaid_months)}")
    lines.append("")
    if not summary.items:
        lines.append("To'lov tarixi topilmadi.")
        return "\n".join(lines)

    lines.append("<b>So'nggi to'lovlar:</b>")
    for item in summary.items:
        lines.append(
            f"💵 <b>{format_money(item.amount)}</b> — {payment_status_label(item.status)} ({format_date(item.payment_date)})"
        )
        lines.append(f"📅 <b>Oy:</b> {format_month(item.paid_for_month or item.payment_date)}")
        if item.note:
            lines.append(f"💬 {_html(item.note)}")
    return "\n".join(lines)


def build_notifications_message(
    items: list[ParentNotificationItem],
    *,
    selected_child_name: str | None = None,
) -> str:
    lines = [
        "🔔 <b>Bildirishnomalar</b>",
        _separator(),
    ]
    if selected_child_name:
        lines.append(f"👤 <b>Farzand:</b> {_html(selected_child_name)}")
        lines.append("")
    if not items:
        lines.append("Hozircha yangi bildirishnomalar yo'q.")
        return "\n".join(lines)

    for index, item in enumerate(items, start=1):
        lines.append(f"{index}. {notification_emoji(item.notification_type)} <b>{_html(item.title)}</b>")
        if item.student_name and not selected_child_name:
            lines.append(f"👤 <b>Farzand:</b> {_html(item.student_name)}")
        lines.append(f"🏷 <b>Turi:</b> {_html(notification_type_label(item.notification_type))}")
        lines.append(f"🕒 <b>Vaqt:</b> {format_datetime(item.created_at)}")
        lines.append(f"📨 <b>Holat:</b> {'Yuborildi' if item.is_sent else 'Saqlangan'}")
        preview = _message_preview(item.message)
        if preview:
            lines.append(f"💬 {_html(preview)}")
        if index != len(items):
            lines.append("")
    return "\n".join(lines)


def build_settings_message(
    active_child: ParentLinkedChild | None,
    child_count: int,
    *,
    parent_phone_number: str | None = None,
) -> str:
    active_name = active_child.full_name if active_child else "Tanlanmagan"
    return "\n".join(
        [
            "⚙️ <b>Sozlamalar</b>",
            _separator(),
            f"👨‍👩‍👧 <b>Ulangan farzandlar:</b> {child_count} ta",
            f"✅ <b>Faol farzand:</b> {_html(active_name)}",
            f"📱 <b>Telefon raqam:</b> {_html(parent_phone_number, default='Ulanmagan')}",
            "",
            "Bu bo'limda faol farzandni almashtirish, telefon raqamni ulash va yordamni ko'rish mumkin.",
        ]
    )


def build_help_message() -> str:
    return "\n".join(
        [
            "🆘 <b>Yordam</b>",
            _separator(),
            "1. Admin yoki o'quv markazidan ulash kodini oling.",
            "2. <b>🔗 Ulash kodi</b> tugmasini bosing.",
            "3. Kodni shu chatga yuboring.",
            "4. Menyudan davomat, baho, vazifa va to'lovlarni kuzating.",
            "",
            "Agar ma'lumot noto'g'ri bo'lsa, administrator yoki o'qituvchi bilan bog'laning.",
        ]
    )


def build_select_child_message(section_title: str) -> str:
    return "\n".join(
        [
            f"👨‍👩‍👧 <b>{_html(section_title)}</b>",
            _separator(),
            "Kerakli bo'limni ochish uchun farzandni tanlang.",
        ]
    )


def build_notification_settings_message() -> str:
    return "\n".join(
        [
            "🔔 <b>Bildirishnoma sozlamalari</b>",
            _separator(),
            "Hozircha quyidagi xabarlar avtomatik yuboriladi:",
            "• ❌ Kelmadi",
            "• ⏰ Kechikdi",
            "• ⚠️ Past baho",
            "• 📚 Vazifa bajarilmagan",
            "• 💳 To'lov eslatmasi",
            "• 📣 E'lonlar",
            "",
            "Alohida yoqish/o'chirish sozlamasi keyingi bosqichda qo'shiladi.",
        ]
    )


def build_contact_request_message(phone_number: str | None = None) -> str:
    lines = [
        "📱 <b>Telefon raqamni ulash</b>",
        _separator(),
        "Pastdagi tugma orqali telefon raqamingizni yuboring.",
        "Bu ma'lumot administrator bilan bog'lanish uchun kerak bo'lishi mumkin.",
    ]
    if phone_number:
        lines.extend(["", f"Hozirgi raqam: <b>{_html(phone_number)}</b>"])
    return "\n".join(lines)


def build_contact_saved_message(phone_number: str) -> str:
    return "\n".join(
        [
            "✅ <b>Telefon raqam saqlandi</b>",
            _separator(),
            f"📱 <b>Raqam:</b> {_html(phone_number)}",
            "",
            "Endi ushbu raqam parent profilingizga biriktirildi.",
        ]
    )


def build_contact_share_error_message() -> str:
    return "\n".join(
        [
            "⚠️ <b>Telefon raqamni saqlab bo'lmadi</b>",
            "",
            "Iltimos, tugma orqali o'zingizning raqamingizni yuboring.",
        ]
    )


def _message_preview(message: str, max_length: int = 90) -> str:
    plain = re.sub(r"<[^>]+>", "", message or "")
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_length:
        return plain
    return plain[: max_length - 3].rstrip() + "..."
