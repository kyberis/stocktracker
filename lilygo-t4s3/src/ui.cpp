#include "ui.h"
#include "stocks.h"
#include <cstdio>
#include <cstring>

// ── Color palette (matches trefolio web app dark theme) ─────────────
static const lv_color_t COL_BG       = lv_color_hex(0x0f172a); // slate-900
static const lv_color_t COL_SURFACE  = lv_color_hex(0x1e293b); // slate-800 (cards)
static const lv_color_t COL_CARD     = lv_color_hex(0x1e293b); // slate-800
static const lv_color_t COL_HEADER   = lv_color_hex(0x0f172a); // nav-bg
static const lv_color_t COL_ACCENT   = lv_color_hex(0x10b981); // emerald-500
static const lv_color_t COL_ACCENT2  = lv_color_hex(0x8b5cf6); // violet-500 (AI)
static const lv_color_t COL_GREEN    = lv_color_hex(0x34d399); // emerald-400
static const lv_color_t COL_RED      = lv_color_hex(0xf87171); // red-400
static const lv_color_t COL_TEXT     = lv_color_hex(0xf1f5f9); // slate-100
static const lv_color_t COL_TEXT_SEC = lv_color_hex(0x94a3b8); // slate-400
static const lv_color_t COL_DIM      = lv_color_hex(0x64748b); // slate-500
static const lv_color_t COL_SEP      = lv_color_hex(0x334155); // slate-700
static const lv_color_t COL_BORDER   = lv_color_hex(0x334155); // slate-700

// ── Screens ─────────────────────────────────────────────────────────
static lv_obj_t *scr_loading  = nullptr;
static lv_obj_t *scr_error    = nullptr;
static lv_obj_t *scr_token    = nullptr;
static lv_obj_t *scr_dash     = nullptr;

// ── Loading screen widgets ──────────────────────────────────────────
static lv_obj_t *loading_label   = nullptr;
static lv_obj_t *loading_spinner = nullptr;

// ── Error screen widgets ────────────────────────────────────────────
static lv_obj_t *error_label = nullptr;
static RetryCb s_retry_cb = nullptr;

// ── Token screen widgets ────────────────────────────────────────────
static TokenSubmitCb s_token_cb = nullptr;

// ── Dashboard widgets ───────────────────────────────────────────────
static lv_obj_t *dash_total_val  = nullptr;
static lv_obj_t *dash_day_change = nullptr;
static lv_obj_t *dash_day_pct    = nullptr;
static lv_obj_t *dash_pl_val     = nullptr;
static lv_obj_t *dash_pl_pct     = nullptr;
static lv_obj_t *dash_count_lbl  = nullptr;
static lv_obj_t *dash_status_lbl = nullptr;
static lv_obj_t *dash_ai_text    = nullptr;
static lv_obj_t *dash_ai_btn     = nullptr;
static AiRequestCb s_ai_cb       = nullptr;

struct HoldingRow {
    lv_obj_t *row;
    lv_obj_t *ticker;
    lv_obj_t *name;
    lv_obj_t *weight;
    lv_obj_t *dot;
    lv_obj_t *change;
};
static HoldingRow hold_rows[MAX_TOP_HOLDINGS];

// ── Helpers ─────────────────────────────────────────────────────────
static void style_black_bg(lv_obj_t *obj) {
    lv_obj_set_style_bg_color(obj, COL_BG, 0);
    lv_obj_set_style_bg_opa(obj, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(obj, 0, 0);
    lv_obj_set_style_pad_all(obj, 0, 0);
}

static lv_obj_t *make_screen() {
    lv_obj_t *scr = lv_obj_create(nullptr);
    style_black_bg(scr);
    lv_obj_set_scrollbar_mode(scr, LV_SCROLLBAR_MODE_OFF);
    return scr;
}

static lv_obj_t *make_card(lv_obj_t *parent, lv_coord_t w, lv_coord_t h) {
    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_set_size(card, w, h);
    lv_obj_set_style_bg_color(card, COL_SURFACE, 0);
    lv_obj_set_style_bg_opa(card, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(card, COL_BORDER, 0);
    lv_obj_set_style_border_width(card, 1, 0);
    lv_obj_set_style_radius(card, 16, 0); // rounded-2xl
    lv_obj_set_style_pad_all(card, 0, 0);
    lv_obj_set_scrollbar_mode(card, LV_SCROLLBAR_MODE_OFF);
    return card;
}

// ── Build: loading screen ───────────────────────────────────────────
static void build_loading() {
    scr_loading = make_screen();

    loading_spinner = lv_spinner_create(scr_loading, 1200, 60);
    lv_obj_set_size(loading_spinner, 48, 48);
    lv_obj_align(loading_spinner, LV_ALIGN_CENTER, 0, -30);
    lv_obj_set_style_arc_color(loading_spinner, COL_ACCENT, LV_PART_INDICATOR);
    lv_obj_set_style_arc_color(loading_spinner, COL_SEP, LV_PART_MAIN);
    lv_obj_set_style_arc_width(loading_spinner, 4, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(loading_spinner, 4, LV_PART_MAIN);

    loading_label = lv_label_create(scr_loading);
    lv_label_set_text(loading_label, "Loading...");
    lv_obj_set_style_text_font(loading_label, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(loading_label, COL_TEXT_SEC, 0);
    lv_obj_align(loading_label, LV_ALIGN_CENTER, 0, 20);
}

// ── Build: error screen ─────────────────────────────────────────────
static void on_retry_click(lv_event_t *) {
    if (s_retry_cb) s_retry_cb();
}

static void build_error() {
    scr_error = make_screen();

    lv_obj_t *card = make_card(scr_error, 340, 220);
    lv_obj_align(card, LV_ALIGN_CENTER, 0, 0);
    lv_obj_set_style_pad_all(card, 28, 0);

    // Circular icon with red-tinted background
    lv_obj_t *icon_bg = lv_obj_create(card);
    lv_obj_set_size(icon_bg, 48, 48);
    lv_obj_align(icon_bg, LV_ALIGN_TOP_MID, 0, 4);
    lv_obj_set_style_bg_color(icon_bg, COL_RED, 0);
    lv_obj_set_style_bg_opa(icon_bg, 25, 0);
    lv_obj_set_style_radius(icon_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(icon_bg, 0, 0);
    lv_obj_set_style_pad_all(icon_bg, 0, 0);
    lv_obj_set_scrollbar_mode(icon_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *icon = lv_label_create(icon_bg);
    lv_label_set_text(icon, LV_SYMBOL_WARNING);
    lv_obj_set_style_text_font(icon, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(icon, COL_RED, 0);
    lv_obj_center(icon);

    lv_obj_t *err_title = lv_label_create(card);
    lv_label_set_text(err_title, "Connection Error");
    lv_obj_set_style_text_font(err_title, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(err_title, COL_TEXT, 0);
    lv_obj_set_style_text_align(err_title, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_width(err_title, 300);
    lv_obj_align(err_title, LV_ALIGN_TOP_MID, 0, 62);

    error_label = lv_label_create(card);
    lv_label_set_text(error_label, "Could not reach trefolio.com");
    lv_obj_set_style_text_font(error_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(error_label, COL_TEXT_SEC, 0);
    lv_obj_set_style_text_align(error_label, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_width(error_label, 300);
    lv_obj_align(error_label, LV_ALIGN_TOP_MID, 0, 86);

    lv_obj_t *btn = lv_btn_create(card);
    lv_obj_set_size(btn, 180, 44);
    lv_obj_align(btn, LV_ALIGN_BOTTOM_MID, 0, -4);
    lv_obj_set_style_bg_color(btn, COL_ACCENT, 0);
    lv_obj_set_style_radius(btn, 10, 0);
    lv_obj_set_style_shadow_width(btn, 16, 0);
    lv_obj_set_style_shadow_color(btn, COL_ACCENT, 0);
    lv_obj_set_style_shadow_opa(btn, 60, 0);
    lv_obj_add_event_cb(btn, on_retry_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *btn_lbl = lv_label_create(btn);
    lv_label_set_text(btn_lbl, "Try Again");
    lv_obj_set_style_text_font(btn_lbl, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(btn_lbl, lv_color_white(), 0);
    lv_obj_center(btn_lbl);
}

// ── Build: token entry screen (numeric XXXX-XXXX pad) ───────────────
static lv_obj_t *token_display = nullptr;
static char passkey_digits[9];
static int passkey_len = 0;
static lv_obj_t *connect_btn = nullptr;

static void update_passkey_display() {
    char display[12];
    for (int i = 0; i < 4; i++)
        display[i] = i < passkey_len ? passkey_digits[i] : '_';
    display[4] = ' ';
    display[5] = '-';
    display[6] = ' ';
    for (int i = 0; i < 4; i++)
        display[7 + i] = (i + 4) < passkey_len ? passkey_digits[i + 4] : '_';
    display[11] = '\0';
    lv_label_set_text(token_display, display);

    if (connect_btn) {
        if (passkey_len == 8) {
            lv_obj_set_style_bg_color(connect_btn, COL_ACCENT, 0);
            lv_obj_set_style_shadow_width(connect_btn, 16, 0);
            lv_obj_set_style_shadow_color(connect_btn, COL_ACCENT, 0);
            lv_obj_set_style_shadow_opa(connect_btn, 80, 0);
        } else {
            lv_obj_set_style_bg_color(connect_btn, COL_DIM, 0);
            lv_obj_set_style_shadow_width(connect_btn, 0, 0);
        }
    }
}

static void on_numpad_digit(lv_event_t *e) {
    if (passkey_len >= 8) return;
    const char *digit = (const char *)lv_event_get_user_data(e);
    passkey_digits[passkey_len++] = digit[0];
    passkey_digits[passkey_len] = '\0';
    update_passkey_display();
}

static void on_numpad_backspace(lv_event_t *) {
    if (passkey_len <= 0) return;
    passkey_digits[--passkey_len] = '\0';
    update_passkey_display();
}

static void on_token_submit(lv_event_t *) {
    if (!s_token_cb || passkey_len != 8) return;
    char formatted[10];
    snprintf(formatted, sizeof(formatted), "%.4s-%.4s", passkey_digits, passkey_digits + 4);
    s_token_cb(formatted);
}

static const char *digit_chars[] = {"1","2","3","4","5","6","7","8","9","0"};

static lv_obj_t *make_numpad_btn(lv_obj_t *parent, lv_coord_t x, lv_coord_t y,
                                  lv_coord_t w, lv_coord_t h) {
    lv_obj_t *btn = lv_btn_create(parent);
    lv_obj_set_size(btn, w, h);
    lv_obj_set_pos(btn, x, y);
    lv_obj_set_style_bg_color(btn, COL_CARD, 0);
    lv_obj_set_style_radius(btn, 12, 0);
    lv_obj_set_style_border_color(btn, COL_SEP, 0);
    lv_obj_set_style_border_width(btn, 1, 0);
    lv_obj_set_style_shadow_width(btn, 0, 0);
    return btn;
}

static void build_token() {
    scr_token = make_screen();
    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t sh = lv_disp_get_ver_res(nullptr);

    passkey_len = 0;
    memset(passkey_digits, 0, sizeof(passkey_digits));

    // Left panel — branding + passkey display
    lv_coord_t left_w = 240;
    lv_obj_t *lpanel = lv_obj_create(scr_token);
    lv_obj_set_size(lpanel, left_w, sh);
    lv_obj_set_pos(lpanel, 0, 0);
    style_black_bg(lpanel);
    lv_obj_set_scrollbar_mode(lpanel, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *logo = lv_label_create(lpanel);
    lv_label_set_text(logo, LV_SYMBOL_LIST " trefolio");
    lv_obj_set_style_text_font(logo, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(logo, COL_ACCENT, 0);
    lv_obj_align(logo, LV_ALIGN_TOP_LEFT, 20, 20);

    lv_obj_t *icon_circle = lv_obj_create(lpanel);
    lv_obj_set_size(icon_circle, 48, 48);
    lv_obj_align(icon_circle, LV_ALIGN_TOP_LEFT, 20, 70);
    lv_obj_set_style_bg_color(icon_circle, COL_ACCENT2, 0);
    lv_obj_set_style_bg_opa(icon_circle, 40, 0);
    lv_obj_set_style_radius(icon_circle, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(icon_circle, 0, 0);
    lv_obj_set_scrollbar_mode(icon_circle, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *icon = lv_label_create(icon_circle);
    lv_label_set_text(icon, LV_SYMBOL_EYE_OPEN);
    lv_obj_set_style_text_font(icon, &lv_font_montserrat_20, 0);
    lv_obj_set_style_text_color(icon, COL_ACCENT, 0);
    lv_obj_center(icon);

    lv_obj_t *title = lv_label_create(lpanel);
    lv_label_set_text(title, "Device Passkey");
    lv_obj_set_style_text_font(title, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(title, COL_TEXT, 0);
    lv_obj_align(title, LV_ALIGN_TOP_LEFT, 20, 140);

    lv_obj_t *hint = lv_label_create(lpanel);
    lv_label_set_text(hint, "Generate a passkey in your\nprofile at trefolio.com");
    lv_obj_set_style_text_font(hint, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(hint, COL_TEXT_SEC, 0);
    lv_obj_set_style_text_line_space(hint, 4, 0);
    lv_obj_align(hint, LV_ALIGN_TOP_LEFT, 20, 172);

    // Passkey display inside a card
    lv_obj_t *display_card = make_card(lpanel, left_w - 40, 64);
    lv_obj_align(display_card, LV_ALIGN_TOP_LEFT, 20, 240);
    lv_obj_set_style_bg_color(display_card, COL_CARD, 0);
    lv_obj_set_style_border_color(display_card, COL_ACCENT, 0);
    lv_obj_set_style_border_width(display_card, 1, 0);

    token_display = lv_label_create(display_card);
    lv_obj_set_style_text_font(token_display, &lv_font_montserrat_28, 0);
    lv_obj_set_style_text_color(token_display, COL_TEXT, 0);
    lv_obj_set_style_text_letter_space(token_display, 4, 0);
    lv_obj_center(token_display);
    update_passkey_display();

    // Bottom hint
    lv_obj_t *stored_hint = lv_label_create(lpanel);
    lv_label_set_text(stored_hint, "Stored locally on device");
    lv_obj_set_style_text_font(stored_hint, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(stored_hint, COL_DIM, 0);
    lv_obj_align(stored_hint, LV_ALIGN_BOTTOM_LEFT, 20, -16);

    // Right panel — numpad
    lv_coord_t pad_x_off = left_w + 20;
    lv_coord_t rw = sw - left_w;
    lv_coord_t btn_w = 86;
    lv_coord_t btn_h = 56;
    lv_coord_t gap = 8;
    lv_coord_t grid_w = 3 * btn_w + 2 * gap;
    lv_coord_t pad_x = left_w + (rw - grid_w) / 2;
    lv_coord_t pad_y = 24;

    for (int i = 0; i < 9; i++) {
        int row = i / 3;
        int col = i % 3;
        lv_coord_t x = pad_x + col * (btn_w + gap);
        lv_coord_t y = pad_y + row * (btn_h + gap);
        lv_obj_t *btn = make_numpad_btn(scr_token, x, y, btn_w, btn_h);
        lv_obj_add_event_cb(btn, on_numpad_digit, LV_EVENT_CLICKED,
                            (void *)digit_chars[i]);

        lv_obj_t *lbl = lv_label_create(btn);
        lv_label_set_text(lbl, digit_chars[i]);
        lv_obj_set_style_text_font(lbl, &lv_font_montserrat_24, 0);
        lv_obj_set_style_text_color(lbl, COL_TEXT, 0);
        lv_obj_center(lbl);
    }

    lv_coord_t bottom_y = pad_y + 3 * (btn_h + gap);

    // "0" center
    lv_obj_t *btn0 = make_numpad_btn(scr_token, pad_x + btn_w + gap, bottom_y, btn_w, btn_h);
    lv_obj_add_event_cb(btn0, on_numpad_digit, LV_EVENT_CLICKED, (void *)digit_chars[9]);
    lv_obj_t *lbl0 = lv_label_create(btn0);
    lv_label_set_text(lbl0, "0");
    lv_obj_set_style_text_font(lbl0, &lv_font_montserrat_24, 0);
    lv_obj_set_style_text_color(lbl0, COL_TEXT, 0);
    lv_obj_center(lbl0);

    // Backspace right
    lv_obj_t *bksp = make_numpad_btn(scr_token, pad_x + 2 * (btn_w + gap), bottom_y, btn_w, btn_h);
    lv_obj_set_style_bg_color(bksp, COL_SURFACE, 0);
    lv_obj_add_event_cb(bksp, on_numpad_backspace, LV_EVENT_CLICKED, nullptr);
    lv_obj_t *bksp_lbl = lv_label_create(bksp);
    lv_label_set_text(bksp_lbl, LV_SYMBOL_BACKSPACE);
    lv_obj_set_style_text_font(bksp_lbl, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(bksp_lbl, COL_RED, 0);
    lv_obj_center(bksp_lbl);

    // Connect button
    lv_coord_t conn_y = bottom_y + btn_h + gap + 6;
    connect_btn = lv_btn_create(scr_token);
    lv_obj_set_size(connect_btn, grid_w, 50);
    lv_obj_set_pos(connect_btn, pad_x, conn_y);
    lv_obj_set_style_bg_color(connect_btn, COL_DIM, 0);
    lv_obj_set_style_radius(connect_btn, 10, 0);
    lv_obj_add_event_cb(connect_btn, on_token_submit, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *conn_lbl = lv_label_create(connect_btn);
    lv_label_set_text(conn_lbl, "Connect");
    lv_obj_set_style_text_font(conn_lbl, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(conn_lbl, lv_color_white(), 0);
    lv_obj_center(conn_lbl);
}

// ── Build: dashboard screen ─────────────────────────────────────────
static void on_ai_click(lv_event_t *) {
    if (s_ai_cb) s_ai_cb();
}

static void build_dashboard() {
    scr_dash = make_screen();
    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t sh = lv_disp_get_ver_res(nullptr);
    lv_coord_t left_w = 205;
    lv_coord_t hdr_h  = 42;
    lv_coord_t ftr_h  = 28;

    // ── Header bar ──────────────────────────────────────────────────
    lv_obj_t *hdr = lv_obj_create(scr_dash);
    lv_obj_set_size(hdr, sw, hdr_h);
    lv_obj_align(hdr, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(hdr, COL_HEADER, 0);
    lv_obj_set_style_bg_opa(hdr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(hdr, COL_BORDER, 0);
    lv_obj_set_style_border_width(hdr, 1, 0);
    lv_obj_set_style_border_side(hdr, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_pad_left(hdr, 16, 0);
    lv_obj_set_scrollbar_mode(hdr, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *logo = lv_label_create(hdr);
    lv_label_set_text(logo, LV_SYMBOL_LIST " trefolio");
    lv_obj_set_style_text_font(logo, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(logo, COL_ACCENT, 0);
    lv_obj_set_style_text_letter_space(logo, 0, 0);
    lv_obj_align(logo, LV_ALIGN_LEFT_MID, 0, 0);

    // Live indicator with green dot
    lv_obj_t *dot = lv_obj_create(hdr);
    lv_obj_set_size(dot, 8, 8);
    lv_obj_set_style_bg_color(dot, COL_GREEN, 0);
    lv_obj_set_style_bg_opa(dot, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(dot, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(dot, 0, 0);
    lv_obj_align(dot, LV_ALIGN_RIGHT_MID, -52, 0);

    lv_obj_t *live_lbl = lv_label_create(hdr);
    lv_label_set_text(live_lbl, "LIVE");
    lv_obj_set_style_text_font(live_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(live_lbl, COL_GREEN, 0);
    lv_obj_set_style_text_letter_space(live_lbl, 1, 0);
    lv_obj_align(live_lbl, LV_ALIGN_RIGHT_MID, -14, 0);

    // ── Footer bar ──────────────────────────────────────────────────
    lv_obj_t *ftr = lv_obj_create(scr_dash);
    lv_obj_set_size(ftr, sw, ftr_h);
    lv_obj_align(ftr, LV_ALIGN_BOTTOM_LEFT, 0, 0);
    lv_obj_set_style_bg_color(ftr, COL_HEADER, 0);
    lv_obj_set_style_bg_opa(ftr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(ftr, 0, 0);
    lv_obj_set_style_pad_left(ftr, 16, 0);
    lv_obj_set_scrollbar_mode(ftr, LV_SCROLLBAR_MODE_OFF);

    dash_status_lbl = lv_label_create(ftr);
    lv_label_set_text(dash_status_lbl, "Connecting...");
    lv_obj_set_style_text_font(dash_status_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_status_lbl, COL_DIM, 0);
    lv_obj_align(dash_status_lbl, LV_ALIGN_LEFT_MID, 0, 0);

    lv_obj_t *brand = lv_label_create(ftr);
    lv_label_set_text(brand, "trefolio.com");
    lv_obj_set_style_text_font(brand, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(brand, COL_DIM, 0);
    lv_obj_align(brand, LV_ALIGN_RIGHT_MID, -14, 0);

    // ── Left panel: portfolio summary card ──────────────────────────
    lv_coord_t panel_h = sh - hdr_h - ftr_h;
    lv_coord_t card_m = 10;

    lv_obj_t *lcard = make_card(scr_dash, left_w - card_m * 2, panel_h - card_m * 2);
    lv_obj_set_pos(lcard, card_m, hdr_h + card_m);
    lv_obj_set_style_pad_left(lcard, 16, 0);
    lv_obj_set_style_pad_top(lcard, 16, 0);
    lv_obj_set_style_pad_right(lcard, 16, 0);
    lv_obj_set_style_pad_bottom(lcard, 12, 0);

    lv_obj_t *tv_lbl = lv_label_create(lcard);
    lv_label_set_text(tv_lbl, "TOTAL VALUE");
    lv_obj_set_style_text_font(tv_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(tv_lbl, COL_TEXT_SEC, 0);
    lv_obj_set_style_text_letter_space(tv_lbl, 1, 0);
    lv_obj_align(tv_lbl, LV_ALIGN_TOP_LEFT, 0, 0);

    dash_total_val = lv_label_create(lcard);
    lv_label_set_text(dash_total_val, "---");
    lv_obj_set_style_text_font(dash_total_val, &lv_font_montserrat_30, 0);
    lv_obj_set_style_text_color(dash_total_val, COL_TEXT, 0);
    lv_obj_align(dash_total_val, LV_ALIGN_TOP_LEFT, 0, 16);

    // Day change pill badge
    dash_day_change = lv_label_create(lcard);
    lv_label_set_text(dash_day_change, "---");
    lv_obj_set_style_text_font(dash_day_change, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_day_change, COL_GREEN, 0);
    lv_obj_set_style_bg_color(dash_day_change, COL_GREEN, 0);
    lv_obj_set_style_bg_opa(dash_day_change, 25, 0);
    lv_obj_set_style_radius(dash_day_change, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_pad_left(dash_day_change, 10, 0);
    lv_obj_set_style_pad_right(dash_day_change, 10, 0);
    lv_obj_set_style_pad_top(dash_day_change, 3, 0);
    lv_obj_set_style_pad_bottom(dash_day_change, 3, 0);
    lv_obj_align(dash_day_change, LV_ALIGN_TOP_LEFT, 0, 54);

    // Cost label
    dash_day_pct = lv_label_create(lcard);
    lv_label_set_text(dash_day_pct, "");
    lv_obj_set_style_text_font(dash_day_pct, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_day_pct, COL_DIM, 0);
    lv_obj_align(dash_day_pct, LV_ALIGN_TOP_LEFT, 0, 80);

    // Separator line
    lv_obj_t *sep1 = lv_obj_create(lcard);
    lv_obj_set_size(sep1, left_w - card_m * 2 - 32, 1);
    lv_obj_align(sep1, LV_ALIGN_TOP_LEFT, 0, 102);
    lv_obj_set_style_bg_color(sep1, COL_SEP, 0);
    lv_obj_set_style_bg_opa(sep1, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep1, 0, 0);
    lv_obj_set_style_pad_all(sep1, 0, 0);

    lv_obj_t *pl_lbl = lv_label_create(lcard);
    lv_label_set_text(pl_lbl, "GAIN / LOSS");
    lv_obj_set_style_text_font(pl_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(pl_lbl, COL_TEXT_SEC, 0);
    lv_obj_set_style_text_letter_space(pl_lbl, 1, 0);
    lv_obj_align(pl_lbl, LV_ALIGN_TOP_LEFT, 0, 110);

    dash_pl_val = lv_label_create(lcard);
    lv_label_set_text(dash_pl_val, "---");
    lv_obj_set_style_text_font(dash_pl_val, &lv_font_montserrat_20, 0);
    lv_obj_set_style_text_color(dash_pl_val, COL_TEXT_SEC, 0);
    lv_obj_align(dash_pl_val, LV_ALIGN_TOP_LEFT, 0, 126);

    dash_pl_pct = lv_label_create(lcard);
    lv_label_set_text(dash_pl_pct, "");
    lv_obj_set_style_text_font(dash_pl_pct, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(dash_pl_pct, COL_TEXT_SEC, 0);
    lv_obj_align(dash_pl_pct, LV_ALIGN_TOP_LEFT, 0, 152);

    dash_count_lbl = lv_label_create(lcard);
    lv_label_set_text(dash_count_lbl, "");
    lv_obj_set_style_text_font(dash_count_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_count_lbl, COL_DIM, 0);
    lv_obj_align(dash_count_lbl, LV_ALIGN_BOTTOM_LEFT, 0, 0);

    // ── Right panel: holdings table + AI card ───────────────────────
    lv_coord_t right_x = left_w;
    lv_coord_t right_w = sw - right_x;

    // Holdings card
    lv_coord_t hold_card_h = 210;
    lv_obj_t *hcard = make_card(scr_dash, right_w - card_m * 2, hold_card_h);
    lv_obj_set_pos(hcard, right_x + card_m, hdr_h + card_m);

    // Holdings header inside card
    lv_obj_t *hh_t = lv_label_create(hcard);
    lv_label_set_text(hh_t, "Top Holdings");
    lv_obj_set_style_text_font(hh_t, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(hh_t, COL_TEXT_SEC, 0);
    lv_obj_set_style_text_letter_space(hh_t, 0, 0);
    lv_obj_align(hh_t, LV_ALIGN_TOP_LEFT, 14, 10);

    lv_obj_t *hh_d = lv_label_create(hcard);
    lv_label_set_text(hh_d, "Day");
    lv_obj_set_style_text_font(hh_d, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(hh_d, COL_TEXT_SEC, 0);
    lv_obj_align(hh_d, LV_ALIGN_TOP_RIGHT, -14, 10);

    lv_coord_t row_h = 36;
    lv_coord_t rows_start = 30;
    lv_coord_t card_inner_w = right_w - card_m * 2;

    for (int i = 0; i < MAX_TOP_HOLDINGS; i++) {
        lv_coord_t y = rows_start + i * row_h;
        lv_obj_t *row = lv_obj_create(hcard);
        lv_obj_set_size(row, card_inner_w, row_h);
        lv_obj_set_pos(row, 0, y);
        lv_obj_set_style_bg_opa(row, LV_OPA_TRANSP, 0);
        lv_obj_set_style_border_width(row, 0, 0);
        lv_obj_set_style_pad_left(row, 14, 0);
        lv_obj_set_style_pad_right(row, 14, 0);
        lv_obj_set_scrollbar_mode(row, LV_SCROLLBAR_MODE_OFF);

        // Subtle separator between rows
        if (i > 0) {
            lv_obj_t *rsep = lv_obj_create(hcard);
            lv_obj_set_size(rsep, card_inner_w - 28, 1);
            lv_obj_set_pos(rsep, 14, y);
            lv_obj_set_style_bg_color(rsep, COL_SEP, 0);
            lv_obj_set_style_bg_opa(rsep, LV_OPA_COVER, 0);
            lv_obj_set_style_border_width(rsep, 0, 0);
            lv_obj_set_style_pad_all(rsep, 0, 0);
        }

        hold_rows[i].row = row;

        hold_rows[i].ticker = lv_label_create(row);
        lv_label_set_text(hold_rows[i].ticker, "---");
        lv_obj_set_style_text_font(hold_rows[i].ticker, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_color(hold_rows[i].ticker, COL_TEXT, 0);
        lv_obj_align(hold_rows[i].ticker, LV_ALIGN_LEFT_MID, 0, -7);

        hold_rows[i].name = lv_label_create(row);
        lv_label_set_text(hold_rows[i].name, "");
        lv_obj_set_style_text_font(hold_rows[i].name, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].name, COL_DIM, 0);
        lv_obj_align(hold_rows[i].name, LV_ALIGN_LEFT_MID, 0, 9);
        lv_obj_set_width(hold_rows[i].name, card_inner_w - 180);
        lv_label_set_long_mode(hold_rows[i].name, LV_LABEL_LONG_DOT);

        hold_rows[i].weight = lv_label_create(row);
        lv_label_set_text(hold_rows[i].weight, "");
        lv_obj_set_style_text_font(hold_rows[i].weight, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].weight, COL_TEXT_SEC, 0);
        lv_obj_align(hold_rows[i].weight, LV_ALIGN_RIGHT_MID, -80, 0);

        // Colored dot indicator
        hold_rows[i].dot = lv_obj_create(row);
        lv_obj_set_size(hold_rows[i].dot, 5, 5);
        lv_obj_set_style_bg_color(hold_rows[i].dot, COL_DIM, 0);
        lv_obj_set_style_bg_opa(hold_rows[i].dot, LV_OPA_COVER, 0);
        lv_obj_set_style_radius(hold_rows[i].dot, LV_RADIUS_CIRCLE, 0);
        lv_obj_set_style_border_width(hold_rows[i].dot, 0, 0);
        lv_obj_align(hold_rows[i].dot, LV_ALIGN_RIGHT_MID, -62, 0);

        hold_rows[i].change = lv_label_create(row);
        lv_label_set_text(hold_rows[i].change, "");
        lv_obj_set_style_text_font(hold_rows[i].change, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].change, COL_TEXT_SEC, 0);
        lv_obj_align(hold_rows[i].change, LV_ALIGN_RIGHT_MID, 0, 0);
    }

    // AI Insight card
    lv_coord_t ai_y = hdr_h + card_m + hold_card_h + 8;
    lv_coord_t ai_h = sh - ai_y - ftr_h - card_m;
    if (ai_h < 70) ai_h = 70;

    lv_obj_t *ai_card = make_card(scr_dash, right_w - card_m * 2, ai_h);
    lv_obj_set_pos(ai_card, right_x + card_m, ai_y);
    lv_obj_set_style_pad_all(ai_card, 12, 0);
    lv_obj_set_style_border_color(ai_card, COL_ACCENT2, 0);
    lv_obj_set_style_border_opa(ai_card, 100, 0);

    // AI icon circle (violet-to-emerald feel)
    lv_obj_t *ai_icon_bg = lv_obj_create(ai_card);
    lv_obj_set_size(ai_icon_bg, 24, 24);
    lv_obj_align(ai_icon_bg, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(ai_icon_bg, COL_ACCENT2, 0);
    lv_obj_set_style_bg_opa(ai_icon_bg, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(ai_icon_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(ai_icon_bg, 0, 0);
    lv_obj_set_style_pad_all(ai_icon_bg, 0, 0);
    lv_obj_set_scrollbar_mode(ai_icon_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *ai_icon = lv_label_create(ai_icon_bg);
    lv_label_set_text(ai_icon, LV_SYMBOL_REFRESH);
    lv_obj_set_style_text_font(ai_icon, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ai_icon, lv_color_white(), 0);
    lv_obj_center(ai_icon);

    lv_obj_t *ai_title = lv_label_create(ai_card);
    lv_label_set_text(ai_title, "AI Portfolio Review");
    lv_obj_set_style_text_font(ai_title, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(ai_title, COL_TEXT, 0);
    lv_obj_align(ai_title, LV_ALIGN_TOP_LEFT, 30, 2);

    // Pro badge (gradient-feel bg)
    lv_obj_t *pro_bg = lv_obj_create(ai_card);
    lv_obj_set_size(pro_bg, 36, 18);
    lv_obj_align(pro_bg, LV_ALIGN_TOP_RIGHT, 0, 2);
    lv_obj_set_style_bg_color(pro_bg, COL_ACCENT2, 0);
    lv_obj_set_style_bg_opa(pro_bg, 40, 0);
    lv_obj_set_style_radius(pro_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(pro_bg, 0, 0);
    lv_obj_set_style_pad_all(pro_bg, 0, 0);
    lv_obj_set_scrollbar_mode(pro_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *pro_lbl = lv_label_create(pro_bg);
    lv_label_set_text(pro_lbl, "Pro");
    lv_obj_set_style_text_font(pro_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(pro_lbl, COL_GREEN, 0);
    lv_obj_center(pro_lbl);

    dash_ai_text = lv_label_create(ai_card);
    lv_label_set_text(dash_ai_text, "Tap to request AI summary");
    lv_obj_set_style_text_font(dash_ai_text, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_ai_text, COL_TEXT_SEC, 0);
    lv_obj_set_width(dash_ai_text, right_w - card_m * 2 - 28);
    lv_label_set_long_mode(dash_ai_text, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_line_space(dash_ai_text, 3, 0);
    lv_obj_align(dash_ai_text, LV_ALIGN_TOP_LEFT, 0, 22);

    dash_ai_btn = lv_btn_create(ai_card);
    lv_obj_set_size(dash_ai_btn, 80, 28);
    lv_obj_align(dash_ai_btn, LV_ALIGN_BOTTOM_RIGHT, 0, 0);
    lv_obj_set_style_bg_color(dash_ai_btn, COL_ACCENT, 0);
    lv_obj_set_style_radius(dash_ai_btn, 8, 0);
    lv_obj_set_style_shadow_width(dash_ai_btn, 14, 0);
    lv_obj_set_style_shadow_color(dash_ai_btn, COL_ACCENT, 0);
    lv_obj_set_style_shadow_opa(dash_ai_btn, 50, 0);
    lv_obj_add_event_cb(dash_ai_btn, on_ai_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *ai_btn_lbl = lv_label_create(dash_ai_btn);
    lv_label_set_text(ai_btn_lbl, "Ask AI");
    lv_obj_set_style_text_font(ai_btn_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ai_btn_lbl, lv_color_white(), 0);
    lv_obj_center(ai_btn_lbl);
}

// ── Public API ──────────────────────────────────────────────────────
void ui_init() {
    lv_theme_t *th = lv_theme_default_init(
        lv_disp_get_default(), COL_ACCENT, COL_GREEN,
        true, &lv_font_montserrat_14);
    lv_disp_set_theme(lv_disp_get_default(), th);

    build_loading();
    build_error();
    build_token();
    build_dashboard();
}

void ui_show_loading(const char *msg) {
    lv_label_set_text(loading_label, msg);
    lv_scr_load(scr_loading);
}

void ui_show_error(const char *msg) {
    lv_label_set_text(error_label, msg);
    lv_scr_load(scr_error);
}

void ui_set_retry_callback(RetryCb cb) {
    s_retry_cb = cb;
}

void ui_show_token_entry(TokenSubmitCb onSubmit) {
    s_token_cb = onSubmit;
    passkey_len = 0;
    memset(passkey_digits, 0, sizeof(passkey_digits));
    update_passkey_display();
    lv_scr_load_anim(scr_token, LV_SCR_LOAD_ANIM_FADE_ON, 300, 0, false);
}

void ui_show_dashboard() {
    lv_scr_load_anim(scr_dash, LV_SCR_LOAD_ANIM_MOVE_LEFT, 250, 0, false);
}

void ui_update_portfolio(const PortfolioData &d) {
    char buf[64];

    snprintf(buf, sizeof(buf), "\xE2\x82\xAC%.0f", d.totalValueEUR);
    lv_label_set_text(dash_total_val, buf);

    // Day change pill badge: "+€66.45 (+0.12%)"
    bool dayPos = d.dayChangeEUR >= 0;
    lv_color_t dayCol = dayPos ? COL_GREEN : COL_RED;
    snprintf(buf, sizeof(buf), "%s\xE2\x82\xAC%.2f (%s%.2f%%)",
             dayPos ? "+" : "", d.dayChangeEUR,
             d.dayChangePercent >= 0 ? "+" : "", d.dayChangePercent);
    lv_label_set_text(dash_day_change, buf);
    lv_obj_set_style_text_color(dash_day_change, dayCol, 0);
    lv_obj_set_style_bg_color(dash_day_change, dayCol, 0);

    // Cost line (reusing dash_day_pct label)
    snprintf(buf, sizeof(buf), "Cost: \xE2\x82\xAC%.0f", d.costBasis);
    lv_label_set_text(dash_day_pct, buf);

    // Gain / Loss
    bool plPos = d.totalGainLoss >= 0;
    lv_color_t plCol = plPos ? COL_GREEN : COL_RED;
    snprintf(buf, sizeof(buf), "%s%.2f%%",
             d.totalGainLossPercent >= 0 ? "+" : "", d.totalGainLossPercent);
    lv_label_set_text(dash_pl_val, buf);
    lv_obj_set_style_text_color(dash_pl_val, plCol, 0);

    snprintf(buf, sizeof(buf), "%s\xE2\x82\xAC%.0f",
             plPos ? "+" : "", d.totalGainLoss);
    lv_label_set_text(dash_pl_pct, buf);
    lv_obj_set_style_text_color(dash_pl_pct, plCol, 0);

    snprintf(buf, sizeof(buf), "%d holdings", d.holdingsCount);
    lv_label_set_text(dash_count_lbl, buf);

    for (int i = 0; i < MAX_TOP_HOLDINGS; i++) {
        if (i < d.topCount) {
            lv_label_set_text(hold_rows[i].ticker, d.top[i].ticker);
            lv_label_set_text(hold_rows[i].name, d.top[i].name);
            snprintf(buf, sizeof(buf), "%.1f%%", d.top[i].weight);
            lv_label_set_text(hold_rows[i].weight, buf);
            snprintf(buf, sizeof(buf), "%s%.2f%%",
                     d.top[i].dayChange >= 0 ? "+" : "", d.top[i].dayChange);
            lv_label_set_text(hold_rows[i].change, buf);
            lv_color_t chgCol = d.top[i].dayChange >= 0 ? COL_GREEN : COL_RED;
            lv_obj_set_style_text_color(hold_rows[i].change, chgCol, 0);
            lv_obj_set_style_bg_color(hold_rows[i].dot, chgCol, 0);
        } else {
            lv_label_set_text(hold_rows[i].ticker, "");
            lv_label_set_text(hold_rows[i].name, "");
            lv_label_set_text(hold_rows[i].weight, "");
            lv_label_set_text(hold_rows[i].change, "");
            lv_obj_set_style_bg_opa(hold_rows[i].dot, LV_OPA_TRANSP, 0);
        }
    }
}

void ui_update_ai_summary(const char *text) {
    lv_label_set_text(dash_ai_text, text);
}

void ui_set_ai_callback(AiRequestCb cb) {
    s_ai_cb = cb;
}

void ui_set_status(const char *text) {
    lv_label_set_text(dash_status_lbl, text);
}
