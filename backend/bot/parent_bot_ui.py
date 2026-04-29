from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup

from app.services.parent_bot_service import ParentLinkedChild


CHILDREN_TEXT = "👨‍👩‍👧 Farzandlarim"
ATTENDANCE_TEXT = "📊 Davomat"
GRADES_TEXT = "📝 Baholar"
HOMEWORK_TEXT = "📚 Vazifalar"
PAYMENTS_TEXT = "💳 To‘lovlar"
NOTIFICATIONS_TEXT = "🔔 Xabarlar"
SEND_CODE_TEXT = "🔗 Ulash kodi"
SETTINGS_TEXT = "⚙️ Sozlamalar"
HELP_TEXT = "🆘 Yordam"
HOME_TEXT = "🏠 Bosh sahifa"
SHARE_CONTACT_TEXT = "📱 Telefon raqamni yuborish"
BACK_TEXT = "🔙 Orqaga"

LEGACY_MY_CHILD_TEXT = "👤 Farzandim"
LEGACY_NOTIFICATIONS_TEXT = "🔔 So'nggi xabarlar"

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text=CHILDREN_TEXT), KeyboardButton(text=ATTENDANCE_TEXT)],
        [KeyboardButton(text=GRADES_TEXT), KeyboardButton(text=HOMEWORK_TEXT)],
        [KeyboardButton(text=PAYMENTS_TEXT), KeyboardButton(text=NOTIFICATIONS_TEXT)],
        [KeyboardButton(text=SEND_CODE_TEXT), KeyboardButton(text=HELP_TEXT)],
        [KeyboardButton(text=HOME_TEXT)],
        [KeyboardButton(text=SETTINGS_TEXT)],
    ],
    resize_keyboard=True,
)

CONTACT_REQUEST_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text=SHARE_CONTACT_TEXT, request_contact=True)],
        [KeyboardButton(text=BACK_TEXT), KeyboardButton(text=HOME_TEXT)],
    ],
    resize_keyboard=True,
    one_time_keyboard=True,
)


def build_child_selection_keyboard(
    children: list[ParentLinkedChild],
    *,
    section: str = "profile",
    active_child_id: int | None = None,
    back_callback: str = "home",
    portal_url: str | None = None,
) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    for child in children:
        prefix = "✅ " if active_child_id == child.student_id else ""
        callback = f"child:{child.student_id}" if section == "profile" else f"child:{child.student_id}:{section}"
        rows.append([InlineKeyboardButton(text=f"{prefix}{child.full_name}", callback_data=callback)])

    rows.append(
        [
            InlineKeyboardButton(text="🔄 Yangilash", callback_data="children"),
            InlineKeyboardButton(text="🏠 Bosh sahifa", callback_data=back_callback),
        ]
    )
    if portal_url:
        rows.append([InlineKeyboardButton(text="🌐 Portalni ochish", url=portal_url)])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def build_child_section_keyboard(
    student_id: int,
    *,
    current_section: str,
    show_switch_child: bool,
    portal_url: str | None = None,
) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                text="✅ Profil" if current_section == "profile" else "👤 Profil",
                callback_data=f"child:{student_id}",
            ),
            InlineKeyboardButton(
                text="✅ Davomat" if current_section == "attendance" else "📊 Davomat",
                callback_data=f"child:{student_id}:attendance",
            ),
        ],
        [
            InlineKeyboardButton(
                text="✅ Baholar" if current_section == "grades" else "📝 Baholar",
                callback_data=f"child:{student_id}:grades",
            ),
            InlineKeyboardButton(
                text="✅ Vazifalar" if current_section == "homework" else "📚 Vazifalar",
                callback_data=f"child:{student_id}:homework",
            ),
        ],
        [
            InlineKeyboardButton(
                text="✅ To‘lovlar" if current_section == "payments" else "💳 To‘lovlar",
                callback_data=f"child:{student_id}:payments",
            ),
            InlineKeyboardButton(
                text="✅ Xabarlar" if current_section == "notifications" else "🔔 Xabarlar",
                callback_data=f"child:{student_id}:notifications",
            ),
        ],
        [
            InlineKeyboardButton(text="🔄 Yangilash", callback_data=f"refresh:{current_section}:{student_id}"),
            InlineKeyboardButton(text="👨‍👩‍👧 Farzandlar", callback_data="children"),
        ],
    ]
    if show_switch_child:
        rows.append([InlineKeyboardButton(text="👨‍👩‍👧 Farzand tanlash", callback_data=f"choose:{current_section}")])
    if portal_url:
        rows.append([InlineKeyboardButton(text="🌐 Portalni ochish", url=portal_url)])
    rows.append([InlineKeyboardButton(text="🏠 Bosh sahifa", callback_data="home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def build_notifications_keyboard(
    children: list[ParentLinkedChild],
    *,
    selected_child_id: int | None = None,
    portal_url: str | None = None,
) -> InlineKeyboardMarkup:
    refresh_target = str(selected_child_id) if selected_child_id is not None else "all"
    rows: list[list[InlineKeyboardButton]] = [
        [
            InlineKeyboardButton(text="📋 Barchasi", callback_data="notifications:all"),
            InlineKeyboardButton(text="🔄 Yangilash", callback_data=f"refresh:notifications:{refresh_target}"),
        ]
    ]
    for child in children:
        prefix = "✅ " if child.student_id == selected_child_id else ""
        rows.append(
            [InlineKeyboardButton(text=f"{prefix}{child.full_name}", callback_data=f"child:{child.student_id}:notifications")]
        )
    rows.append(
        [
            InlineKeyboardButton(text="👨‍👩‍👧 Farzandlar", callback_data="children"),
            InlineKeyboardButton(text="🏠 Bosh sahifa", callback_data="home"),
        ]
    )
    if portal_url:
        rows.append([InlineKeyboardButton(text="🌐 Portalni ochish", url=portal_url)])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def build_settings_keyboard(
    *,
    has_multiple_children: bool,
    portal_url: str | None = None,
) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    if has_multiple_children:
        rows.append([InlineKeyboardButton(text="👨‍👩‍👧 Faol farzand", callback_data="settings:child")])
    rows.extend(
        [
            [InlineKeyboardButton(text="🔔 Bildirishnoma sozlamalari", callback_data="settings:notifications")],
            [InlineKeyboardButton(text="📱 Telefon raqamini ulash", callback_data="settings:contact")],
            [InlineKeyboardButton(text="🆘 Yordam", callback_data="settings:help")],
        ]
    )
    if portal_url:
        rows.append([InlineKeyboardButton(text="🌐 Portalni ochish", url=portal_url)])
    rows.append([InlineKeyboardButton(text="🏠 Bosh sahifa", callback_data="home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)
