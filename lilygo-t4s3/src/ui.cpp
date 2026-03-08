#include "ui.h"
#include "stocks.h"
#include "template_def.h"
#include "template_loader.h"
#include "view_model.h"
#include "config.h"
#include <cstdio>
#include <cstring>
#include <cmath>
#include <cstdlib>
#include "icon_48.h"
#include "icon_28.h"

// European-style thousand separator: 90619 -> "90.619", 1234.56 -> "1.234,56"
static void fmt_eur(char *out, size_t len, double val, int decimals) {
    bool neg = val < 0;
    double av = fabs(val);

    char raw[48];
    snprintf(raw, sizeof(raw), "%.*f", decimals, av);

    // Split on '.'
    char *dot = strchr(raw, '.');
    char int_part[32];
    char dec_part[16] = "";
    if (dot) {
        size_t il = (size_t)(dot - raw);
        memcpy(int_part, raw, il);
        int_part[il] = '\0';
        strncpy(dec_part, dot + 1, sizeof(dec_part) - 1);
    } else {
        strncpy(int_part, raw, sizeof(int_part) - 1);
        int_part[sizeof(int_part) - 1] = '\0';
    }

    // Insert '.' thousand separators into int_part
    char grouped[48];
    int slen = (int)strlen(int_part);
    int gi = 0;
    for (int i = 0; i < slen; i++) {
        if (i > 0 && (slen - i) % 3 == 0) grouped[gi++] = '.';
        grouped[gi++] = int_part[i];
    }
    grouped[gi] = '\0';

    if (decimals > 0)
        snprintf(out, len, "%s%s,%s", neg ? "-" : "", grouped, dec_part);
    else
        snprintf(out, len, "%s%s", neg ? "-" : "", grouped);
}

// ── Active template (defaults to classic-dark, can be swapped at runtime) ──
static TemplateConfig s_tmpl;

// Convenience accessors from the active template
static lv_color_t COL_BG()       { return lv_color_hex(s_tmpl.colors.bg); }
static lv_color_t COL_SURFACE()  { return lv_color_hex(s_tmpl.colors.surface); }
static lv_color_t COL_CARD()     { return lv_color_hex(s_tmpl.colors.surface); }
static lv_color_t COL_HEADER()   { return lv_color_hex(s_tmpl.colors.header); }
static lv_color_t COL_ACCENT()   { return lv_color_hex(s_tmpl.colors.accent); }
static lv_color_t COL_ACCENT2()  { return lv_color_hex(s_tmpl.colors.accent2); }
static lv_color_t COL_GREEN()    { return lv_color_hex(s_tmpl.colors.green); }
static lv_color_t COL_RED()      { return lv_color_hex(s_tmpl.colors.red); }
static lv_color_t COL_TEXT()     { return lv_color_hex(s_tmpl.colors.textPrimary); }
static lv_color_t COL_TEXT_SEC() { return lv_color_hex(s_tmpl.colors.textSecondary); }
static lv_color_t COL_DIM()      { return lv_color_hex(s_tmpl.colors.dim); }
static lv_color_t COL_SEP()      { return lv_color_hex(s_tmpl.colors.border); }
static lv_color_t COL_BORDER()   { return lv_color_hex(s_tmpl.colors.border); }

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
static lv_obj_t *dash_ai_card    = nullptr;
static lv_obj_t *dash_ai_usage   = nullptr;
static lv_obj_t *dash_live_dot   = nullptr;
static lv_obj_t *dash_live_lbl   = nullptr;
static lv_anim_t live_pulse_anim;
static bool      live_anim_active = false;
static AiRequestCb s_ai_cb       = nullptr;
static RefreshCb s_refresh_cb    = nullptr;

struct HoldingRow {
    lv_obj_t *row;
    lv_obj_t *ticker;
    lv_obj_t *name;
    lv_obj_t *weight;
    lv_obj_t *arrow;
    lv_obj_t *change;
};
static HoldingRow hold_rows[MAX_DASH_HOLDINGS];

// ── All Holdings screen widgets ──────────────────────────────────────
static lv_obj_t *scr_holdings       = nullptr;
static lv_obj_t *hl_list_container  = nullptr;
static RefreshCb  s_view_all_cb     = nullptr;
static HoldingTapCb s_holding_tap_cb = nullptr;
static const PortfolioData *s_cached_portfolio = nullptr;

struct HoldingListRow {
    lv_obj_t *row;
    lv_obj_t *ticker;
    lv_obj_t *name;
    lv_obj_t *shares_lbl;
    lv_obj_t *price_lbl;
    lv_obj_t *change;
};
static HoldingListRow hl_rows[MAX_ALL_HOLDINGS];
static int hl_row_count = 0;

// ── Stock Detail screen widgets ──────────────────────────────────────
static lv_obj_t *scr_detail         = nullptr;
static lv_obj_t *det_ticker_lbl     = nullptr;
static lv_obj_t *det_name_lbl       = nullptr;
static lv_obj_t *det_shares_lbl     = nullptr;
static lv_obj_t *det_price_lbl      = nullptr;
static lv_obj_t *det_value_lbl      = nullptr;
static lv_obj_t *det_daychange_lbl  = nullptr;
static lv_obj_t *det_weight_lbl     = nullptr;
static lv_obj_t *det_chart          = nullptr;
static lv_chart_series_t *det_series = nullptr;
static lv_obj_t *det_chart_spinner  = nullptr;
static lv_obj_t *det_chart_card     = nullptr;
static lv_obj_t *det_min_lbl        = nullptr;
static lv_obj_t *det_max_lbl        = nullptr;
static SparklineRequestCb s_sparkline_cb = nullptr;
static int s_detail_holding_idx     = -1;

// ── Trefolio logo (four-petal clover mark) ──────────────────────────
static lv_obj_t *make_logo(lv_obj_t *parent, lv_coord_t size) {
    lv_obj_t *box = lv_obj_create(parent);
    lv_obj_set_size(box, size, size);
    lv_obj_set_style_bg_color(box, lv_color_hex(0x0f172a), 0);
    lv_obj_set_style_bg_opa(box, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(box, size / 4, 0);
    lv_obj_set_style_border_width(box, 0, 0);
    lv_obj_set_style_pad_all(box, 0, 0);
    lv_obj_set_scrollbar_mode(box, LV_SCROLLBAR_MODE_OFF);

    lv_coord_t r = size * 22 / 100;
    lv_coord_t off = size * 18 / 100;

    struct { lv_coord_t dx, dy; uint32_t col; } petals[] = {
        {  0, (lv_coord_t)-off, 0x6ee7b7 },
        {  off,  0,             0x34d399 },
        {  0,  off,             0x10b981 },
        { (lv_coord_t)-off,  0, 0xa7f3d0 },
    };
    lv_coord_t cx = size / 2;
    lv_coord_t cy = size / 2;

    for (auto &p : petals) {
        lv_obj_t *dot = lv_obj_create(box);
        lv_obj_set_size(dot, r * 2, r * 2);
        lv_obj_set_pos(dot, cx + p.dx - r, cy + p.dy - r);
        lv_obj_set_style_bg_color(dot, lv_color_hex(p.col), 0);
        lv_obj_set_style_bg_opa(dot, LV_OPA_COVER, 0);
        lv_obj_set_style_radius(dot, LV_RADIUS_CIRCLE, 0);
        lv_obj_set_style_border_width(dot, 0, 0);
        lv_obj_set_style_pad_all(dot, 0, 0);
        lv_obj_set_scrollbar_mode(dot, LV_SCROLLBAR_MODE_OFF);
    }

    lv_coord_t cr = size * 8 / 100;
    lv_obj_t *center = lv_obj_create(box);
    lv_obj_set_size(center, cr * 2, cr * 2);
    lv_obj_set_pos(center, cx - cr, cy - cr);
    lv_obj_set_style_bg_color(center, lv_color_hex(0x0f172a), 0);
    lv_obj_set_style_bg_opa(center, 90, 0);
    lv_obj_set_style_radius(center, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(center, 0, 0);
    lv_obj_set_style_pad_all(center, 0, 0);
    lv_obj_set_scrollbar_mode(center, LV_SCROLLBAR_MODE_OFF);

    return box;
}

// ── Helpers ─────────────────────────────────────────────────────────
static void style_black_bg(lv_obj_t *obj) {
    lv_obj_set_style_bg_color(obj, COL_BG(), 0);
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
    lv_obj_set_style_bg_color(card, COL_SURFACE(), 0);
    lv_obj_set_style_bg_opa(card, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(card, COL_BORDER(), 0);
    lv_obj_set_style_border_width(card, 1, 0);
    lv_obj_set_style_radius(card, 16, 0); // rounded-2xl
    lv_obj_set_style_pad_all(card, 0, 0);
    lv_obj_set_scrollbar_mode(card, LV_SCROLLBAR_MODE_OFF);
    return card;
}

// ── Build: loading screen ───────────────────────────────────────────
static void build_loading() {
    scr_loading = make_screen();

    lv_obj_t *load_logo = make_logo(scr_loading, 48);
    lv_obj_align(load_logo, LV_ALIGN_CENTER, 0, -50);

    loading_spinner = lv_spinner_create(scr_loading, 1200, 60);
    lv_obj_set_size(loading_spinner, 40, 40);
    lv_obj_align(loading_spinner, LV_ALIGN_CENTER, 0, 10);
    lv_obj_set_style_arc_color(loading_spinner, COL_ACCENT(), LV_PART_INDICATOR);
    lv_obj_set_style_arc_color(loading_spinner, COL_SEP(), LV_PART_MAIN);
    lv_obj_set_style_arc_width(loading_spinner, 3, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(loading_spinner, 3, LV_PART_MAIN);

    loading_label = lv_label_create(scr_loading);
    lv_label_set_text(loading_label, "Loading...");
    lv_obj_set_style_text_font(loading_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(loading_label, COL_TEXT_SEC(), 0);
    lv_obj_align(loading_label, LV_ALIGN_CENTER, 0, 42);
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
    lv_obj_set_style_bg_color(icon_bg, COL_RED(), 0);
    lv_obj_set_style_bg_opa(icon_bg, 25, 0);
    lv_obj_set_style_radius(icon_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(icon_bg, 0, 0);
    lv_obj_set_style_pad_all(icon_bg, 0, 0);
    lv_obj_set_scrollbar_mode(icon_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *icon = lv_label_create(icon_bg);
    lv_label_set_text(icon, LV_SYMBOL_WARNING);
    lv_obj_set_style_text_font(icon, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(icon, COL_RED(), 0);
    lv_obj_center(icon);

    lv_obj_t *err_title = lv_label_create(card);
    lv_label_set_text(err_title, "Connection Error");
    lv_obj_set_style_text_font(err_title, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(err_title, COL_TEXT(), 0);
    lv_obj_set_style_text_align(err_title, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_width(err_title, 300);
    lv_obj_align(err_title, LV_ALIGN_TOP_MID, 0, 62);

    error_label = lv_label_create(card);
    lv_label_set_text(error_label, "Could not reach trefolio.com");
    lv_obj_set_style_text_font(error_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(error_label, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_align(error_label, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_width(error_label, 300);
    lv_obj_align(error_label, LV_ALIGN_TOP_MID, 0, 86);

    lv_obj_t *btn = lv_btn_create(card);
    lv_obj_set_size(btn, 180, 44);
    lv_obj_align(btn, LV_ALIGN_BOTTOM_MID, 0, -4);
    lv_obj_set_style_bg_color(btn, COL_ACCENT(), 0);
    lv_obj_set_style_radius(btn, 10, 0);
    lv_obj_set_style_shadow_width(btn, 16, 0);
    lv_obj_set_style_shadow_color(btn, COL_ACCENT(), 0);
    lv_obj_set_style_shadow_opa(btn, 60, 0);
    lv_obj_add_event_cb(btn, on_retry_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *btn_lbl = lv_label_create(btn);
    lv_label_set_text(btn_lbl, "Try Again");
    lv_obj_set_style_text_font(btn_lbl, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(btn_lbl, lv_color_white(), 0);
    lv_obj_center(btn_lbl);
}

// ── Build: token entry screen (numeric XXXX-XXXX-XXXX pad) ──────────
static lv_obj_t *token_display = nullptr;
static constexpr int PASSKEY_TOTAL = 12;
static char passkey_digits[PASSKEY_TOTAL + 1];
static int passkey_len = 0;
static lv_obj_t *connect_btn = nullptr;

static void update_passkey_display() {
    char display[20]; // "XXXX - XXXX - XXXX" + NUL
    int d = 0;
    for (int g = 0; g < 3; g++) {
        if (g > 0) { display[d++] = ' '; display[d++] = '-'; display[d++] = ' '; }
        for (int i = 0; i < 4; i++) {
            int idx = g * 4 + i;
            display[d++] = idx < passkey_len ? passkey_digits[idx] : '_';
        }
    }
    display[d] = '\0';
    lv_label_set_text(token_display, display);

    if (connect_btn) {
        if (passkey_len == PASSKEY_TOTAL) {
            lv_obj_set_style_bg_color(connect_btn, COL_ACCENT(), 0);
            lv_obj_set_style_shadow_width(connect_btn, 16, 0);
            lv_obj_set_style_shadow_color(connect_btn, COL_ACCENT(), 0);
            lv_obj_set_style_shadow_opa(connect_btn, 80, 0);
        } else {
            lv_obj_set_style_bg_color(connect_btn, COL_DIM(), 0);
            lv_obj_set_style_shadow_width(connect_btn, 0, 0);
        }
    }
}

static void on_numpad_digit(lv_event_t *e) {
    if (passkey_len >= PASSKEY_TOTAL) return;
    int digit = (int)(intptr_t)lv_event_get_user_data(e);
    passkey_digits[passkey_len++] = '0' + digit;
    passkey_digits[passkey_len] = '\0';
    update_passkey_display();
}

static void on_numpad_backspace(lv_event_t *) {
    if (passkey_len <= 0) return;
    passkey_digits[--passkey_len] = '\0';
    update_passkey_display();
}

static void on_token_submit(lv_event_t *) {
    if (!s_token_cb || passkey_len != PASSKEY_TOTAL) return;
    char formatted[TOKEN_MAX_LEN];
    snprintf(formatted, sizeof(formatted), "%.4s-%.4s-%.4s",
             passkey_digits, passkey_digits + 4, passkey_digits + 8);
    s_token_cb(formatted);
}

static lv_obj_t *make_numpad_btn(lv_obj_t *parent, lv_coord_t x, lv_coord_t y,
                                  lv_coord_t w, lv_coord_t h) {
    lv_obj_t *btn = lv_btn_create(parent);
    lv_obj_set_size(btn, w, h);
    lv_obj_set_pos(btn, x, y);
    lv_obj_set_style_bg_color(btn, COL_CARD(), 0);
    lv_obj_set_style_radius(btn, 12, 0);
    lv_obj_set_style_border_color(btn, COL_SEP(), 0);
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
    lv_coord_t left_w = 220;
    lv_obj_t *lpanel = lv_obj_create(scr_token);
    lv_obj_set_size(lpanel, left_w, sh);
    lv_obj_set_pos(lpanel, 0, 0);
    style_black_bg(lpanel);
    lv_obj_set_scrollbar_mode(lpanel, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *token_logo = make_logo(lpanel, 28);
    lv_obj_align(token_logo, LV_ALIGN_TOP_LEFT, 16, 18);

    lv_obj_t *token_logo_text = lv_label_create(lpanel);
    lv_label_set_text(token_logo_text, "trefolio");
    lv_obj_set_style_text_font(token_logo_text, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(token_logo_text, COL_TEXT(), 0);
    lv_obj_align_to(token_logo_text, token_logo, LV_ALIGN_OUT_RIGHT_MID, 8, 0);

    lv_obj_t *icon_circle = lv_obj_create(lpanel);
    lv_obj_set_size(icon_circle, 44, 44);
    lv_obj_align(icon_circle, LV_ALIGN_TOP_LEFT, 16, 64);
    lv_obj_set_style_bg_color(icon_circle, COL_ACCENT2(), 0);
    lv_obj_set_style_bg_opa(icon_circle, 40, 0);
    lv_obj_set_style_radius(icon_circle, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(icon_circle, 0, 0);
    lv_obj_set_scrollbar_mode(icon_circle, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *icon = lv_label_create(icon_circle);
    lv_label_set_text(icon, LV_SYMBOL_EYE_OPEN);
    lv_obj_set_style_text_font(icon, &lv_font_montserrat_20, 0);
    lv_obj_set_style_text_color(icon, COL_ACCENT(), 0);
    lv_obj_center(icon);

    lv_obj_t *title = lv_label_create(lpanel);
    lv_label_set_text(title, "Device Passkey");
    lv_obj_set_style_text_font(title, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(title, COL_TEXT(), 0);
    lv_obj_align(title, LV_ALIGN_TOP_LEFT, 16, 126);

    lv_obj_t *hint = lv_label_create(lpanel);
    lv_label_set_text(hint, "Generate a passkey in\nyour profile at\ntrefolio.com");
    lv_obj_set_style_text_font(hint, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(hint, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_line_space(hint, 4, 0);
    lv_obj_align(hint, LV_ALIGN_TOP_LEFT, 16, 158);

    // Passkey display card
    lv_obj_t *display_card = make_card(lpanel, left_w - 32, 56);
    lv_obj_align(display_card, LV_ALIGN_TOP_LEFT, 16, 236);
    lv_obj_set_style_bg_color(display_card, COL_CARD(), 0);
    lv_obj_set_style_border_color(display_card, COL_ACCENT(), 0);
    lv_obj_set_style_border_width(display_card, 1, 0);

    token_display = lv_label_create(display_card);
    lv_obj_set_style_text_font(token_display, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(token_display, COL_TEXT(), 0);
    lv_obj_set_style_text_letter_space(token_display, 2, 0);
    lv_obj_center(token_display);
    update_passkey_display();

    lv_obj_t *stored_hint = lv_label_create(lpanel);
    lv_label_set_text(stored_hint, "Stored locally on device");
    lv_obj_set_style_text_font(stored_hint, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(stored_hint, COL_DIM(), 0);
    lv_obj_align(stored_hint, LV_ALIGN_BOTTOM_LEFT, 16, -16);

    // Right panel — 3-column numeric keypad (phone-style)
    lv_coord_t rw = sw - left_w;
    lv_coord_t cols = 3;
    lv_coord_t btn_w = 80;
    lv_coord_t btn_h = 56;
    lv_coord_t gap = 8;
    lv_coord_t grid_w = cols * btn_w + (cols - 1) * gap;
    lv_coord_t pad_x = left_w + (rw - grid_w) / 2;
    lv_coord_t pad_y = 20;

    // Rows: [1 2 3] [4 5 6] [7 8 9] [bksp 0 —]
    static const int numpad_layout[4][3] = {
        {1, 2, 3}, {4, 5, 6}, {7, 8, 9}, {-1, 0, -2}
    };
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 3; c++) {
            int val = numpad_layout[r][c];
            lv_coord_t x = pad_x + c * (btn_w + gap);
            lv_coord_t y = pad_y + r * (btn_h + gap);

            if (val == -2) continue; // empty cell

            lv_obj_t *btn = make_numpad_btn(scr_token, x, y, btn_w, btn_h);
            if (val == -1) {
                lv_obj_set_style_bg_color(btn, COL_SURFACE(), 0);
                lv_obj_add_event_cb(btn, on_numpad_backspace, LV_EVENT_CLICKED, nullptr);
                lv_obj_t *lbl = lv_label_create(btn);
                lv_label_set_text(lbl, LV_SYMBOL_BACKSPACE);
                lv_obj_set_style_text_font(lbl, &lv_font_montserrat_20, 0);
                lv_obj_set_style_text_color(lbl, COL_RED(), 0);
                lv_obj_center(lbl);
            } else {
                lv_obj_add_event_cb(btn, on_numpad_digit, LV_EVENT_CLICKED,
                                    (void *)(intptr_t)val);
                lv_obj_t *lbl = lv_label_create(btn);
                char digit_str[2] = { (char)('0' + val), '\0' };
                lv_label_set_text(lbl, digit_str);
                lv_obj_set_style_text_font(lbl, &lv_font_montserrat_24, 0);
                lv_obj_set_style_text_color(lbl, COL_TEXT(), 0);
                lv_obj_center(lbl);
            }
        }
    }

    // Connect button below the keypad
    lv_coord_t conn_y = pad_y + 4 * (btn_h + gap) + 4;
    connect_btn = lv_btn_create(scr_token);
    lv_obj_set_size(connect_btn, grid_w, 46);
    lv_obj_set_pos(connect_btn, pad_x, conn_y);
    lv_obj_set_style_bg_color(connect_btn, COL_DIM(), 0);
    lv_obj_set_style_radius(connect_btn, 10, 0);
    lv_obj_add_event_cb(connect_btn, on_token_submit, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *conn_lbl = lv_label_create(connect_btn);
    lv_label_set_text(conn_lbl, "Connect");
    lv_obj_set_style_text_font(conn_lbl, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(conn_lbl, lv_color_white(), 0);
    lv_obj_center(conn_lbl);
}

// ── Build: dashboard screen ─────────────────────────────────────────
static void on_holding_row_click(lv_event_t *e);

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
    lv_obj_set_style_bg_color(hdr, COL_HEADER(), 0);
    lv_obj_set_style_bg_opa(hdr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(hdr, COL_BORDER(), 0);
    lv_obj_set_style_border_width(hdr, 1, 0);
    lv_obj_set_style_border_side(hdr, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_pad_left(hdr, 16, 0);
    lv_obj_set_scrollbar_mode(hdr, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *logo_icon = make_logo(hdr, 26);
    lv_obj_align(logo_icon, LV_ALIGN_LEFT_MID, 0, 0);

    lv_obj_t *logo_text = lv_label_create(hdr);
    lv_label_set_text(logo_text, "trefolio");
    lv_obj_set_style_text_font(logo_text, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(logo_text, COL_ACCENT(), 0);
    lv_obj_set_style_text_letter_space(logo_text, 0, 0);
    lv_obj_align_to(logo_text, logo_icon, LV_ALIGN_OUT_RIGHT_MID, 8, 0);

    // Live indicator with green dot (pulsing)
    dash_live_dot = lv_obj_create(hdr);
    lv_obj_set_size(dash_live_dot, 8, 8);
    lv_obj_set_style_bg_color(dash_live_dot, COL_GREEN(), 0);
    lv_obj_set_style_bg_opa(dash_live_dot, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(dash_live_dot, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(dash_live_dot, 0, 0);
    lv_obj_align(dash_live_dot, LV_ALIGN_RIGHT_MID, -52, 0);

    dash_live_lbl = lv_label_create(hdr);
    lv_label_set_text(dash_live_lbl, "LIVE");
    lv_obj_set_style_text_font(dash_live_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_live_lbl, COL_GREEN(), 0);
    lv_obj_set_style_text_letter_space(dash_live_lbl, 1, 0);
    lv_obj_align(dash_live_lbl, LV_ALIGN_RIGHT_MID, -14, 0);

    // ── Footer bar ──────────────────────────────────────────────────
    lv_obj_t *ftr = lv_obj_create(scr_dash);
    lv_obj_set_size(ftr, sw, ftr_h);
    lv_obj_align(ftr, LV_ALIGN_BOTTOM_LEFT, 0, 0);
    lv_obj_set_style_bg_color(ftr, COL_HEADER(), 0);
    lv_obj_set_style_bg_opa(ftr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(ftr, 0, 0);
    lv_obj_set_style_pad_left(ftr, 16, 0);
    lv_obj_set_scrollbar_mode(ftr, LV_SCROLLBAR_MODE_OFF);

    dash_status_lbl = lv_label_create(ftr);
    lv_label_set_text(dash_status_lbl, "Connecting...");
    lv_obj_set_style_text_font(dash_status_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_status_lbl, COL_DIM(), 0);
    lv_obj_align(dash_status_lbl, LV_ALIGN_LEFT_MID, 0, 0);

    lv_obj_t *ftr_brand = lv_label_create(ftr);
    lv_label_set_text(ftr_brand, "trefolio.com");
    lv_obj_set_style_text_font(ftr_brand, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ftr_brand, COL_DIM(), 0);
    lv_obj_align(ftr_brand, LV_ALIGN_RIGHT_MID, -16, 0);

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
    lv_label_set_text(tv_lbl, "Total Value");
    lv_obj_set_style_text_font(tv_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(tv_lbl, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_letter_space(tv_lbl, 0, 0);
    lv_obj_align(tv_lbl, LV_ALIGN_TOP_LEFT, 0, 0);

    dash_total_val = lv_label_create(lcard);
    lv_label_set_text(dash_total_val, "---");
    lv_obj_set_style_text_font(dash_total_val, &lv_font_montserrat_30, 0);
    lv_obj_set_style_text_color(dash_total_val, COL_TEXT(), 0);
    lv_obj_align(dash_total_val, LV_ALIGN_TOP_LEFT, 0, 16);

    // Day change pill badge
    dash_day_change = lv_label_create(lcard);
    lv_label_set_text(dash_day_change, "---");
    lv_obj_set_style_text_font(dash_day_change, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_day_change, COL_GREEN(), 0);
    lv_obj_set_style_bg_color(dash_day_change, COL_GREEN(), 0);
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
    lv_obj_set_style_text_color(dash_day_pct, COL_DIM(), 0);
    lv_obj_align(dash_day_pct, LV_ALIGN_TOP_LEFT, 0, 80);

    // Separator line
    lv_obj_t *sep1 = lv_obj_create(lcard);
    lv_obj_set_size(sep1, left_w - card_m * 2 - 32, 1);
    lv_obj_align(sep1, LV_ALIGN_TOP_LEFT, 0, 102);
    lv_obj_set_style_bg_color(sep1, COL_SEP(), 0);
    lv_obj_set_style_bg_opa(sep1, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep1, 0, 0);
    lv_obj_set_style_pad_all(sep1, 0, 0);

    lv_obj_t *pl_lbl = lv_label_create(lcard);
    lv_label_set_text(pl_lbl, "Gain / Loss");
    lv_obj_set_style_text_font(pl_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(pl_lbl, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_letter_space(pl_lbl, 0, 0);
    lv_obj_align(pl_lbl, LV_ALIGN_TOP_LEFT, 0, 110);

    dash_pl_val = lv_label_create(lcard);
    lv_label_set_text(dash_pl_val, "---");
    lv_obj_set_style_text_font(dash_pl_val, &lv_font_montserrat_20, 0);
    lv_obj_set_style_text_color(dash_pl_val, COL_TEXT_SEC(), 0);
    lv_obj_align(dash_pl_val, LV_ALIGN_TOP_LEFT, 0, 126);

    dash_pl_pct = lv_label_create(lcard);
    lv_label_set_text(dash_pl_pct, "");
    lv_obj_set_style_text_font(dash_pl_pct, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(dash_pl_pct, COL_TEXT_SEC(), 0);
    lv_obj_align(dash_pl_pct, LV_ALIGN_TOP_LEFT, 0, 152);

    dash_count_lbl = lv_label_create(lcard);
    lv_label_set_text(dash_count_lbl, "");
    lv_obj_set_style_text_font(dash_count_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_count_lbl, COL_DIM(), 0);
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
    lv_obj_set_style_text_color(hh_t, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_letter_space(hh_t, 0, 0);
    lv_obj_align(hh_t, LV_ALIGN_TOP_LEFT, 14, 10);

    lv_obj_t *hh_d = lv_label_create(hcard);
    lv_label_set_text(hh_d, "Day");
    lv_obj_set_style_text_font(hh_d, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(hh_d, COL_TEXT_SEC(), 0);
    lv_obj_align(hh_d, LV_ALIGN_TOP_RIGHT, -14, 10);

    lv_coord_t row_h = 40;
    lv_coord_t rows_start = 30;
    lv_coord_t card_inner_w = right_w - card_m * 2;

    for (int i = 0; i < MAX_DASH_HOLDINGS; i++) {
        lv_coord_t y = rows_start + i * row_h;
        lv_obj_t *row = lv_obj_create(hcard);
        lv_obj_set_size(row, card_inner_w, row_h);
        lv_obj_set_pos(row, 0, y);
        lv_obj_set_style_bg_opa(row, LV_OPA_TRANSP, 0);
        lv_obj_set_style_border_width(row, 0, 0);
        lv_obj_set_style_pad_left(row, 14, 0);
        lv_obj_set_style_pad_right(row, 14, 0);
        lv_obj_set_scrollbar_mode(row, LV_SCROLLBAR_MODE_OFF);
        lv_obj_clear_flag(row, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_add_flag(row, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_set_style_bg_color(row, COL_SURFACE(), LV_STATE_PRESSED);
        lv_obj_set_style_bg_opa(row, 80, LV_STATE_PRESSED);
        lv_obj_add_event_cb(row, on_holding_row_click, LV_EVENT_CLICKED,
                            (void *)(intptr_t)i);

        // Subtle separator between rows
        if (i > 0) {
            lv_obj_t *rsep = lv_obj_create(hcard);
            lv_obj_set_size(rsep, card_inner_w - 28, 1);
            lv_obj_set_pos(rsep, 14, y);
            lv_obj_set_style_bg_color(rsep, COL_SEP(), 0);
            lv_obj_set_style_bg_opa(rsep, LV_OPA_COVER, 0);
            lv_obj_set_style_border_width(rsep, 0, 0);
            lv_obj_set_style_pad_all(rsep, 0, 0);
        }

        hold_rows[i].row = row;

        hold_rows[i].ticker = lv_label_create(row);
        lv_label_set_text(hold_rows[i].ticker, "---");
        lv_obj_set_style_text_font(hold_rows[i].ticker, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_color(hold_rows[i].ticker, COL_TEXT(), 0);
        lv_obj_align(hold_rows[i].ticker, LV_ALIGN_LEFT_MID, 0, -9);

        hold_rows[i].name = lv_label_create(row);
        lv_label_set_text(hold_rows[i].name, "");
        lv_obj_set_style_text_font(hold_rows[i].name, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].name, COL_DIM(), 0);
        lv_obj_align(hold_rows[i].name, LV_ALIGN_LEFT_MID, 0, 9);
        lv_obj_set_width(hold_rows[i].name, card_inner_w - 160);
        lv_label_set_long_mode(hold_rows[i].name, LV_LABEL_LONG_DOT);

        hold_rows[i].weight = lv_label_create(row);
        lv_label_set_text(hold_rows[i].weight, "");
        lv_obj_set_style_text_font(hold_rows[i].weight, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].weight, COL_TEXT_SEC(), 0);
        lv_obj_align(hold_rows[i].weight, LV_ALIGN_RIGHT_MID, -80, 0);

        hold_rows[i].arrow = lv_label_create(row);
        lv_label_set_text(hold_rows[i].arrow, LV_SYMBOL_UP);
        lv_obj_set_style_text_font(hold_rows[i].arrow, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].arrow, COL_DIM(), 0);
        lv_obj_align(hold_rows[i].arrow, LV_ALIGN_RIGHT_MID, -62, 0);

        hold_rows[i].change = lv_label_create(row);
        lv_label_set_text(hold_rows[i].change, "");
        lv_obj_set_style_text_font(hold_rows[i].change, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hold_rows[i].change, COL_TEXT_SEC(), 0);
        lv_obj_align(hold_rows[i].change, LV_ALIGN_RIGHT_MID, 0, 0);
    }

    // AI Insight card
    lv_coord_t ai_y = hdr_h + card_m + hold_card_h + 8;
    lv_coord_t ai_h = sh - ai_y - ftr_h - card_m;
    if (ai_h < 70) ai_h = 70;

    dash_ai_card = make_card(scr_dash, right_w - card_m * 2, ai_h);
    lv_obj_t *ai_card = dash_ai_card;
    lv_obj_set_pos(ai_card, right_x + card_m, ai_y);
    lv_obj_set_style_pad_all(ai_card, 12, 0);
    lv_obj_set_style_border_color(ai_card, COL_ACCENT2(), 0);
    lv_obj_set_style_border_opa(ai_card, 100, 0);
    lv_obj_add_flag(ai_card, LV_OBJ_FLAG_HIDDEN);

    // AI icon circle (violet-to-emerald feel)
    lv_obj_t *ai_icon_bg = lv_obj_create(ai_card);
    lv_obj_set_size(ai_icon_bg, 24, 24);
    lv_obj_align(ai_icon_bg, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(ai_icon_bg, COL_ACCENT2(), 0);
    lv_obj_set_style_bg_opa(ai_icon_bg, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(ai_icon_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(ai_icon_bg, 0, 0);
    lv_obj_set_style_pad_all(ai_icon_bg, 0, 0);
    lv_obj_set_scrollbar_mode(ai_icon_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *ai_icon = lv_label_create(ai_icon_bg);
    lv_label_set_text(ai_icon, "*");
    lv_obj_set_style_text_font(ai_icon, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(ai_icon, lv_color_white(), 0);
    lv_obj_center(ai_icon);

    lv_obj_t *ai_title = lv_label_create(ai_card);
    lv_label_set_text(ai_title, "AI Portfolio Review");
    lv_obj_set_style_text_font(ai_title, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(ai_title, COL_TEXT(), 0);
    lv_obj_align(ai_title, LV_ALIGN_TOP_LEFT, 30, 2);

    // Usage counter (e.g. "2/5")
    dash_ai_usage = lv_label_create(ai_card);
    lv_label_set_text(dash_ai_usage, "");
    lv_obj_set_style_text_font(dash_ai_usage, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_ai_usage, COL_DIM(), 0);
    lv_obj_align(dash_ai_usage, LV_ALIGN_TOP_RIGHT, -42, 5);

    // Pro badge (gradient-feel bg)
    lv_obj_t *pro_bg = lv_obj_create(ai_card);
    lv_obj_set_size(pro_bg, 36, 18);
    lv_obj_align(pro_bg, LV_ALIGN_TOP_RIGHT, 0, 2);
    lv_obj_set_style_bg_color(pro_bg, COL_ACCENT2(), 0);
    lv_obj_set_style_bg_opa(pro_bg, 40, 0);
    lv_obj_set_style_radius(pro_bg, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_border_width(pro_bg, 0, 0);
    lv_obj_set_style_pad_all(pro_bg, 0, 0);
    lv_obj_set_scrollbar_mode(pro_bg, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *pro_lbl = lv_label_create(pro_bg);
    lv_label_set_text(pro_lbl, "Pro");
    lv_obj_set_style_text_font(pro_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(pro_lbl, COL_GREEN(), 0);
    lv_obj_center(pro_lbl);

    dash_ai_text = lv_label_create(ai_card);
    lv_label_set_text(dash_ai_text, "Tap to request AI summary");
    lv_obj_set_style_text_font(dash_ai_text, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(dash_ai_text, COL_TEXT_SEC(), 0);
    lv_obj_set_width(dash_ai_text, right_w - card_m * 2 - 28);
    lv_label_set_long_mode(dash_ai_text, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_line_space(dash_ai_text, 3, 0);
    lv_obj_align(dash_ai_text, LV_ALIGN_TOP_LEFT, 0, 22);

    dash_ai_btn = lv_btn_create(ai_card);
    lv_obj_set_size(dash_ai_btn, 80, 28);
    lv_obj_align(dash_ai_btn, LV_ALIGN_BOTTOM_RIGHT, 0, 0);
    lv_obj_set_style_bg_color(dash_ai_btn, COL_ACCENT(), 0);
    lv_obj_set_style_radius(dash_ai_btn, 8, 0);
    lv_obj_set_style_shadow_width(dash_ai_btn, 14, 0);
    lv_obj_set_style_shadow_color(dash_ai_btn, COL_ACCENT(), 0);
    lv_obj_set_style_shadow_opa(dash_ai_btn, 50, 0);
    lv_obj_add_event_cb(dash_ai_btn, on_ai_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *ai_btn_lbl = lv_label_create(dash_ai_btn);
    lv_label_set_text(ai_btn_lbl, "Ask AI");
    lv_obj_set_style_text_font(ai_btn_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ai_btn_lbl, lv_color_white(), 0);
    lv_obj_center(ai_btn_lbl);
}

// ── Build: All Holdings list screen ─────────────────────────────────
static void on_hl_back_click(lv_event_t *) {
    lv_scr_load_anim(scr_dash, LV_SCR_LOAD_ANIM_MOVE_RIGHT, 250, 0, false);
}

static void on_holding_row_click(lv_event_t *e) {
    int idx = (int)(intptr_t)lv_event_get_user_data(e);
    if (s_holding_tap_cb) s_holding_tap_cb(idx);
}

static void build_holdings_list() {
    scr_holdings = make_screen();
    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t sh = lv_disp_get_ver_res(nullptr);
    lv_coord_t hdr_h = 42;

    // Header
    lv_obj_t *hdr = lv_obj_create(scr_holdings);
    lv_obj_set_size(hdr, sw, hdr_h);
    lv_obj_align(hdr, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(hdr, COL_HEADER(), 0);
    lv_obj_set_style_bg_opa(hdr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(hdr, COL_BORDER(), 0);
    lv_obj_set_style_border_width(hdr, 1, 0);
    lv_obj_set_style_border_side(hdr, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_pad_left(hdr, 8, 0);
    lv_obj_set_scrollbar_mode(hdr, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *back_btn = lv_btn_create(hdr);
    lv_obj_set_size(back_btn, 32, 32);
    lv_obj_align(back_btn, LV_ALIGN_LEFT_MID, 0, 0);
    lv_obj_set_style_bg_opa(back_btn, LV_OPA_TRANSP, 0);
    lv_obj_set_style_shadow_width(back_btn, 0, 0);
    lv_obj_set_style_border_width(back_btn, 0, 0);
    lv_obj_add_event_cb(back_btn, on_hl_back_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *back_icon = lv_label_create(back_btn);
    lv_label_set_text(back_icon, LV_SYMBOL_LEFT);
    lv_obj_set_style_text_font(back_icon, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(back_icon, COL_ACCENT(), 0);
    lv_obj_center(back_icon);

    lv_obj_t *title = lv_label_create(hdr);
    lv_label_set_text(title, "All Holdings");
    lv_obj_set_style_text_font(title, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(title, COL_TEXT(), 0);
    lv_obj_align(title, LV_ALIGN_LEFT_MID, 38, 0);

    // Column headers
    lv_coord_t col_hdr_y = hdr_h + 2;
    lv_obj_t *col_bar = lv_obj_create(scr_holdings);
    lv_obj_set_size(col_bar, sw, 22);
    lv_obj_set_pos(col_bar, 0, col_hdr_y);
    lv_obj_set_style_bg_color(col_bar, COL_BG(), 0);
    lv_obj_set_style_bg_opa(col_bar, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(col_bar, 0, 0);
    lv_obj_set_style_pad_all(col_bar, 0, 0);
    lv_obj_set_scrollbar_mode(col_bar, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *ch1 = lv_label_create(col_bar);
    lv_label_set_text(ch1, "Stock");
    lv_obj_set_style_text_font(ch1, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ch1, COL_DIM(), 0);
    lv_obj_align(ch1, LV_ALIGN_LEFT_MID, 14, 0);

    lv_obj_t *ch2 = lv_label_create(col_bar);
    lv_label_set_text(ch2, "Shares");
    lv_obj_set_style_text_font(ch2, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ch2, COL_DIM(), 0);
    lv_obj_align(ch2, LV_ALIGN_LEFT_MID, 220, 0);

    lv_obj_t *ch3 = lv_label_create(col_bar);
    lv_label_set_text(ch3, "Price");
    lv_obj_set_style_text_font(ch3, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ch3, COL_DIM(), 0);
    lv_obj_align(ch3, LV_ALIGN_LEFT_MID, 360, 0);

    lv_obj_t *ch4 = lv_label_create(col_bar);
    lv_label_set_text(ch4, "Day");
    lv_obj_set_style_text_font(ch4, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(ch4, COL_DIM(), 0);
    lv_obj_align(ch4, LV_ALIGN_RIGHT_MID, -14, 0);

    // Scrollable list container
    lv_coord_t list_y = col_hdr_y + 22;
    hl_list_container = lv_obj_create(scr_holdings);
    lv_obj_set_size(hl_list_container, sw, sh - list_y);
    lv_obj_set_pos(hl_list_container, 0, list_y);
    lv_obj_set_style_bg_opa(hl_list_container, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(hl_list_container, 0, 0);
    lv_obj_set_style_pad_all(hl_list_container, 0, 0);
    lv_obj_set_flex_flow(hl_list_container, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_scrollbar_mode(hl_list_container, LV_SCROLLBAR_MODE_AUTO);
    lv_obj_set_scroll_dir(hl_list_container, LV_DIR_VER);

    hl_row_count = 0;
}

// ── Build: Stock Detail screen ──────────────────────────────────────
static void on_det_back_click(lv_event_t *) {
    lv_scr_load_anim(scr_holdings, LV_SCR_LOAD_ANIM_MOVE_RIGHT, 250, 0, false);
}

static void build_stock_detail() {
    scr_detail = make_screen();
    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t sh = lv_disp_get_ver_res(nullptr);
    lv_coord_t hdr_h = 42;

    // Header
    lv_obj_t *hdr = lv_obj_create(scr_detail);
    lv_obj_set_size(hdr, sw, hdr_h);
    lv_obj_align(hdr, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(hdr, COL_HEADER(), 0);
    lv_obj_set_style_bg_opa(hdr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(hdr, COL_BORDER(), 0);
    lv_obj_set_style_border_width(hdr, 1, 0);
    lv_obj_set_style_border_side(hdr, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_pad_left(hdr, 8, 0);
    lv_obj_set_scrollbar_mode(hdr, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *back_btn = lv_btn_create(hdr);
    lv_obj_set_size(back_btn, 32, 32);
    lv_obj_align(back_btn, LV_ALIGN_LEFT_MID, 0, 0);
    lv_obj_set_style_bg_opa(back_btn, LV_OPA_TRANSP, 0);
    lv_obj_set_style_shadow_width(back_btn, 0, 0);
    lv_obj_set_style_border_width(back_btn, 0, 0);
    lv_obj_add_event_cb(back_btn, on_det_back_click, LV_EVENT_CLICKED, nullptr);

    lv_obj_t *back_icon = lv_label_create(back_btn);
    lv_label_set_text(back_icon, LV_SYMBOL_LEFT);
    lv_obj_set_style_text_font(back_icon, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(back_icon, COL_ACCENT(), 0);
    lv_obj_center(back_icon);

    det_ticker_lbl = lv_label_create(hdr);
    lv_label_set_text(det_ticker_lbl, "");
    lv_obj_set_style_text_font(det_ticker_lbl, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(det_ticker_lbl, COL_TEXT(), 0);
    lv_obj_align(det_ticker_lbl, LV_ALIGN_LEFT_MID, 38, 0);

    det_name_lbl = lv_label_create(hdr);
    lv_label_set_text(det_name_lbl, "");
    lv_obj_set_style_text_font(det_name_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(det_name_lbl, COL_DIM(), 0);
    lv_obj_set_width(det_name_lbl, sw - 200);
    lv_label_set_long_mode(det_name_lbl, LV_LABEL_LONG_DOT);
    lv_obj_align(det_name_lbl, LV_ALIGN_LEFT_MID, 160, 0);

    // Body area
    lv_coord_t body_y = hdr_h + 10;
    lv_coord_t card_m = 10;
    lv_coord_t left_w = 280;

    // Left: metrics card
    lv_obj_t *metrics_card = make_card(scr_detail, left_w - card_m, sh - body_y - card_m);
    lv_obj_set_pos(metrics_card, card_m, body_y);
    lv_obj_set_style_pad_all(metrics_card, 16, 0);

    auto make_metric_pair = [&](lv_obj_t *parent, const char *label_text, lv_coord_t y,
                                const lv_font_t *val_font, lv_obj_t **val_out) {
        lv_obj_t *lbl = lv_label_create(parent);
        lv_label_set_text(lbl, label_text);
        lv_obj_set_style_text_font(lbl, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(lbl, COL_TEXT_SEC(), 0);
        lv_obj_set_style_text_letter_space(lbl, 1, 0);
        lv_obj_align(lbl, LV_ALIGN_TOP_LEFT, 0, y);

        *val_out = lv_label_create(parent);
        lv_label_set_text(*val_out, "---");
        lv_obj_set_style_text_font(*val_out, val_font, 0);
        lv_obj_set_style_text_color(*val_out, COL_TEXT(), 0);
        lv_obj_align(*val_out, LV_ALIGN_TOP_LEFT, 0, y + 16);
    };

    make_metric_pair(metrics_card, "SHARES", 0, &lv_font_montserrat_24, &det_shares_lbl);
    make_metric_pair(metrics_card, "CURRENT PRICE", 54, &lv_font_montserrat_20, &det_price_lbl);

    // Separator
    lv_obj_t *sep = lv_obj_create(metrics_card);
    lv_obj_set_size(sep, left_w - card_m - 32, 1);
    lv_obj_align(sep, LV_ALIGN_TOP_LEFT, 0, 102);
    lv_obj_set_style_bg_color(sep, COL_SEP(), 0);
    lv_obj_set_style_bg_opa(sep, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep, 0, 0);
    lv_obj_set_style_pad_all(sep, 0, 0);

    make_metric_pair(metrics_card, "TOTAL VALUE", 112, &lv_font_montserrat_20, &det_value_lbl);
    make_metric_pair(metrics_card, "DAY CHANGE", 168, &lv_font_montserrat_16, &det_daychange_lbl);

    // Separator 2
    lv_obj_t *sep2 = lv_obj_create(metrics_card);
    lv_obj_set_size(sep2, left_w - card_m - 32, 1);
    lv_obj_align(sep2, LV_ALIGN_TOP_LEFT, 0, 210);
    lv_obj_set_style_bg_color(sep2, COL_SEP(), 0);
    lv_obj_set_style_bg_opa(sep2, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep2, 0, 0);
    lv_obj_set_style_pad_all(sep2, 0, 0);

    make_metric_pair(metrics_card, "WEIGHT", 220, &lv_font_montserrat_16, &det_weight_lbl);

    // Right: sparkline chart card
    lv_coord_t chart_x = card_m + left_w;
    lv_coord_t chart_w = sw - chart_x - card_m;
    lv_coord_t chart_card_h = sh - body_y - card_m;

    det_chart_card = make_card(scr_detail, chart_w, chart_card_h);
    lv_obj_set_pos(det_chart_card, chart_x, body_y);
    lv_obj_set_style_pad_all(det_chart_card, 12, 0);

    lv_obj_t *chart_title = lv_label_create(det_chart_card);
    lv_label_set_text(chart_title, "1 MONTH TREND");
    lv_obj_set_style_text_font(chart_title, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(chart_title, COL_TEXT_SEC(), 0);
    lv_obj_set_style_text_letter_space(chart_title, 1, 0);
    lv_obj_align(chart_title, LV_ALIGN_TOP_LEFT, 0, 0);

    det_max_lbl = lv_label_create(det_chart_card);
    lv_label_set_text(det_max_lbl, "");
    lv_obj_set_style_text_font(det_max_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(det_max_lbl, COL_DIM(), 0);
    lv_obj_align(det_max_lbl, LV_ALIGN_TOP_RIGHT, 0, 0);

    // Chart widget
    det_chart = lv_chart_create(det_chart_card);
    lv_obj_set_size(det_chart, chart_w - 24, chart_card_h - 70);
    lv_obj_align(det_chart, LV_ALIGN_TOP_LEFT, 0, 22);
    lv_chart_set_type(det_chart, LV_CHART_TYPE_LINE);
    lv_chart_set_point_count(det_chart, MAX_SPARKLINE_PTS);
    lv_chart_set_div_line_count(det_chart, 3, 0);
    lv_obj_set_style_bg_opa(det_chart, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(det_chart, 0, 0);
    lv_obj_set_style_line_color(det_chart, COL_SEP(), LV_PART_MAIN);
    lv_obj_set_style_line_opa(det_chart, 50, LV_PART_MAIN);

    det_series = lv_chart_add_series(det_chart, COL_ACCENT(), LV_CHART_AXIS_PRIMARY_Y);
    lv_obj_set_style_line_width(det_chart, 2, LV_PART_ITEMS);
    lv_obj_set_style_size(det_chart, 0, LV_PART_INDICATOR);

    det_min_lbl = lv_label_create(det_chart_card);
    lv_label_set_text(det_min_lbl, "");
    lv_obj_set_style_text_font(det_min_lbl, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(det_min_lbl, COL_DIM(), 0);
    lv_obj_align(det_min_lbl, LV_ALIGN_BOTTOM_LEFT, 0, 0);

    // Loading spinner (hidden by default)
    det_chart_spinner = lv_spinner_create(det_chart_card, 1200, 60);
    lv_obj_set_size(det_chart_spinner, 36, 36);
    lv_obj_center(det_chart_spinner);
    lv_obj_set_style_arc_color(det_chart_spinner, COL_ACCENT(), LV_PART_INDICATOR);
    lv_obj_set_style_arc_color(det_chart_spinner, COL_SEP(), LV_PART_MAIN);
    lv_obj_set_style_arc_width(det_chart_spinner, 3, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(det_chart_spinner, 3, LV_PART_MAIN);
    lv_obj_add_flag(det_chart_spinner, LV_OBJ_FLAG_HIDDEN);
}

// ── Public API ──────────────────────────────────────────────────────
void ui_init() {
    // Load default template (can be overridden later via ui_apply_template)
    char tmpl_id[32];
    config_load_template(tmpl_id, sizeof(tmpl_id));
    template_load(tmpl_id, s_tmpl);

    lv_theme_t *th = lv_theme_default_init(
        lv_disp_get_default(), COL_ACCENT(), COL_GREEN(),
        true, &lv_font_montserrat_14);
    lv_disp_set_theme(lv_disp_get_default(), th);

    build_loading();
    build_error();
    build_token();
    build_dashboard();
    build_holdings_list();
    build_stock_detail();
}

void ui_apply_template(const char *template_id) {
    template_load(template_id, s_tmpl);
    config_save_template(template_id);
    // Rebuild screens with new template colors/layout
    // For a full rebuild, we'd need to destroy and recreate screens.
    // For now, the template takes effect on next reboot.
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
    char num[48];

    s_cached_portfolio = &d;

    fmt_eur(num, sizeof(num), d.totalValueEUR, 0);
    snprintf(buf, sizeof(buf), "%s EUR", num);
    lv_label_set_text(dash_total_val, buf);

    bool dayPos = d.dayChangeEUR >= 0;
    lv_color_t dayCol = dayPos ? COL_GREEN() : COL_RED();
    fmt_eur(num, sizeof(num), fabs(d.dayChangeEUR), 2);
    snprintf(buf, sizeof(buf), "%s %s%s (%s%.2f%%)",
             dayPos ? LV_SYMBOL_UP : LV_SYMBOL_DOWN,
             dayPos ? "+" : "-", num,
             d.dayChangePercent >= 0 ? "+" : "", d.dayChangePercent);
    lv_label_set_text(dash_day_change, buf);
    lv_obj_set_style_text_color(dash_day_change, dayCol, 0);
    lv_obj_set_style_bg_color(dash_day_change, dayCol, 0);

    fmt_eur(num, sizeof(num), d.costBasis, 0);
    snprintf(buf, sizeof(buf), "Cost Basis %s EUR", num);
    lv_label_set_text(dash_day_pct, buf);

    // Gain / Loss
    bool plPos = d.totalGainLoss >= 0;
    lv_color_t plCol = plPos ? COL_GREEN() : COL_RED();
    snprintf(buf, sizeof(buf), "%s %s%.2f%%",
             plPos ? LV_SYMBOL_UP : LV_SYMBOL_DOWN,
             d.totalGainLossPercent >= 0 ? "+" : "", d.totalGainLossPercent);
    lv_label_set_text(dash_pl_val, buf);
    lv_obj_set_style_text_color(dash_pl_val, plCol, 0);

    fmt_eur(num, sizeof(num), fabs(d.totalGainLoss), 0);
    snprintf(buf, sizeof(buf), "%s%s EUR", plPos ? "+" : "-", num);
    lv_label_set_text(dash_pl_pct, buf);
    lv_obj_set_style_text_color(dash_pl_pct, plCol, 0);

    snprintf(buf, sizeof(buf), "%d holdings", d.holdingsCount);
    lv_label_set_text(dash_count_lbl, buf);

    for (int i = 0; i < MAX_DASH_HOLDINGS; i++) {
        if (i < d.topCount) {
            lv_label_set_text(hold_rows[i].ticker, d.top[i].ticker);
            lv_label_set_text(hold_rows[i].name, d.top[i].name);
            snprintf(buf, sizeof(buf), "%.1f%%", d.top[i].weight);
            lv_label_set_text(hold_rows[i].weight, buf);
            snprintf(buf, sizeof(buf), "%s%.2f%%",
                     d.top[i].dayChange >= 0 ? "+" : "", d.top[i].dayChange);
            lv_label_set_text(hold_rows[i].change, buf);
            bool rowPos = d.top[i].dayChange >= 0;
            lv_color_t chgCol = rowPos ? COL_GREEN() : COL_RED();
            lv_obj_set_style_text_color(hold_rows[i].change, chgCol, 0);
            lv_label_set_text(hold_rows[i].arrow, rowPos ? LV_SYMBOL_UP : LV_SYMBOL_DOWN);
            lv_obj_set_style_text_color(hold_rows[i].arrow, chgCol, 0);
            lv_obj_clear_flag(hold_rows[i].arrow, LV_OBJ_FLAG_HIDDEN);
        } else {
            lv_label_set_text(hold_rows[i].ticker, "");
            lv_label_set_text(hold_rows[i].name, "");
            lv_label_set_text(hold_rows[i].weight, "");
            lv_label_set_text(hold_rows[i].change, "");
            lv_obj_add_flag(hold_rows[i].arrow, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

void ui_update_ai_summary(const char *text) {
    lv_label_set_text(dash_ai_text, text);
}

void ui_update_ai_usage(int used, int limit) {
    if (!dash_ai_usage) return;
    if (limit <= 0) {
        lv_label_set_text(dash_ai_usage, "");
        return;
    }
    char buf[16];
    snprintf(buf, sizeof(buf), "%d/%d", used, limit);
    lv_label_set_text(dash_ai_usage, buf);
}

void ui_set_ai_callback(AiRequestCb cb) {
    s_ai_cb = cb;
}

void ui_set_ai_visible(bool visible) {
    if (dash_ai_card) {
        if (visible) {
            lv_obj_clear_flag(dash_ai_card, LV_OBJ_FLAG_HIDDEN);
        } else {
            lv_obj_add_flag(dash_ai_card, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

void ui_set_status(const char *text) {
    lv_label_set_text(dash_status_lbl, text);
}

void ui_set_refresh_callback(RefreshCb cb) {
    s_refresh_cb = cb;
}

void ui_update_countdown(int seconds_elapsed) {
    if (!dash_status_lbl) return;
    char buf[48];
    if (seconds_elapsed < 60) {
        lv_label_set_text(dash_status_lbl, "Updated just now");
    } else {
        int m = seconds_elapsed / 60;
        snprintf(buf, sizeof(buf), "Updated %d min ago", m);
        lv_label_set_text(dash_status_lbl, buf);
    }
}

static void live_pulse_cb(void *obj, int32_t v) {
    lv_obj_set_style_bg_opa((lv_obj_t *)obj, (lv_opa_t)v, 0);
}

void ui_set_live_state(bool ok) {
    if (!dash_live_dot || !dash_live_lbl) return;

    if (live_anim_active) {
        lv_anim_del(dash_live_dot, (lv_anim_exec_xcb_t)live_pulse_cb);
        live_anim_active = false;
    }

    if (ok) {
        lv_obj_set_style_bg_color(dash_live_dot, COL_GREEN(), 0);
        lv_obj_set_style_text_color(dash_live_lbl, COL_GREEN(), 0);

        lv_anim_init(&live_pulse_anim);
        lv_anim_set_var(&live_pulse_anim, dash_live_dot);
        lv_anim_set_values(&live_pulse_anim, LV_OPA_COVER, LV_OPA_40);
        lv_anim_set_time(&live_pulse_anim, 800);
        lv_anim_set_playback_time(&live_pulse_anim, 800);
        lv_anim_set_repeat_count(&live_pulse_anim, LV_ANIM_REPEAT_INFINITE);
        lv_anim_set_exec_cb(&live_pulse_anim, (lv_anim_exec_xcb_t)live_pulse_cb);
        lv_anim_start(&live_pulse_anim);
        live_anim_active = true;
    } else {
        lv_obj_set_style_bg_color(dash_live_dot, COL_RED(), 0);
        lv_obj_set_style_bg_opa(dash_live_dot, LV_OPA_COVER, 0);
        lv_obj_set_style_text_color(dash_live_lbl, COL_RED(), 0);
    }
}

// ── All Holdings list ───────────────────────────────────────────────
void ui_set_view_all_callback(RefreshCb cb) {
    s_view_all_cb = cb;
}

void ui_set_holding_tap_callback(HoldingTapCb cb) {
    s_holding_tap_cb = cb;
}

void ui_show_holdings_list() {
    lv_scr_load_anim(scr_holdings, LV_SCR_LOAD_ANIM_MOVE_LEFT, 250, 0, false);
}

void ui_update_holdings_list(const PortfolioData &d) {
    s_cached_portfolio = &d;
    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t row_h = 46;

    // Remove existing dynamic rows
    for (int i = 0; i < hl_row_count; i++) {
        if (hl_rows[i].row) {
            lv_obj_del(hl_rows[i].row);
            hl_rows[i].row = nullptr;
        }
    }
    hl_row_count = 0;

    int count = d.topCount;
    if (count > MAX_ALL_HOLDINGS) count = MAX_ALL_HOLDINGS;

    char buf[64];

    for (int i = 0; i < count; i++) {
        lv_obj_t *row = lv_obj_create(hl_list_container);
        lv_obj_set_size(row, sw, row_h);
        lv_obj_set_style_bg_opa(row, LV_OPA_TRANSP, 0);
        lv_obj_set_style_bg_color(row, COL_SURFACE(), LV_STATE_PRESSED);
        lv_obj_set_style_bg_opa(row, 80, LV_STATE_PRESSED);
        lv_obj_set_style_border_color(row, COL_SEP(), 0);
        lv_obj_set_style_border_width(row, 1, 0);
        lv_obj_set_style_border_side(row, LV_BORDER_SIDE_BOTTOM, 0);
        lv_obj_set_style_pad_left(row, 14, 0);
        lv_obj_set_style_pad_right(row, 14, 0);
        lv_obj_set_scrollbar_mode(row, LV_SCROLLBAR_MODE_OFF);
        lv_obj_clear_flag(row, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_add_flag(row, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_event_cb(row, on_holding_row_click, LV_EVENT_CLICKED,
                            (void *)(intptr_t)i);

        hl_rows[i].row = row;

        // Ticker
        hl_rows[i].ticker = lv_label_create(row);
        lv_label_set_text(hl_rows[i].ticker, d.top[i].ticker);
        lv_obj_set_style_text_font(hl_rows[i].ticker, &lv_font_montserrat_14, 0);
        lv_obj_set_style_text_color(hl_rows[i].ticker, COL_TEXT(), 0);
        lv_obj_align(hl_rows[i].ticker, LV_ALIGN_LEFT_MID, 0, -8);

        // Name
        hl_rows[i].name = lv_label_create(row);
        lv_label_set_text(hl_rows[i].name, d.top[i].name);
        lv_obj_set_style_text_font(hl_rows[i].name, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hl_rows[i].name, COL_DIM(), 0);
        lv_obj_set_width(hl_rows[i].name, 190);
        lv_label_set_long_mode(hl_rows[i].name, LV_LABEL_LONG_DOT);
        lv_obj_align(hl_rows[i].name, LV_ALIGN_LEFT_MID, 0, 8);

        // Shares
        hl_rows[i].shares_lbl = lv_label_create(row);
        if (d.top[i].shares >= 1.0f)
            snprintf(buf, sizeof(buf), "%.0f", d.top[i].shares);
        else if (d.top[i].shares > 0.0f)
            snprintf(buf, sizeof(buf), "%.3f", d.top[i].shares);
        else
            snprintf(buf, sizeof(buf), "-");
        lv_label_set_text(hl_rows[i].shares_lbl, buf);
        lv_obj_set_style_text_font(hl_rows[i].shares_lbl, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hl_rows[i].shares_lbl, COL_TEXT_SEC(), 0);
        lv_obj_align(hl_rows[i].shares_lbl, LV_ALIGN_LEFT_MID, 210, 0);

        // Price
        hl_rows[i].price_lbl = lv_label_create(row);
        if (d.top[i].price > 0.0f) {
            fmt_eur(buf, sizeof(buf), d.top[i].price, 2);
        } else {
            snprintf(buf, sizeof(buf), "-");
        }
        lv_label_set_text(hl_rows[i].price_lbl, buf);
        lv_obj_set_style_text_font(hl_rows[i].price_lbl, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hl_rows[i].price_lbl, COL_TEXT_SEC(), 0);
        lv_obj_align(hl_rows[i].price_lbl, LV_ALIGN_LEFT_MID, 350, 0);

        // Day change
        hl_rows[i].change = lv_label_create(row);
        bool pos = d.top[i].dayChange >= 0;
        snprintf(buf, sizeof(buf), "%s%.2f%%",
                 pos ? "+" : "", d.top[i].dayChange);
        lv_label_set_text(hl_rows[i].change, buf);
        lv_obj_set_style_text_font(hl_rows[i].change, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(hl_rows[i].change, pos ? COL_GREEN() : COL_RED(), 0);
        lv_obj_align(hl_rows[i].change, LV_ALIGN_RIGHT_MID, 0, 0);

        hl_row_count++;
    }
}

// ── Stock Detail ────────────────────────────────────────────────────
void ui_set_sparkline_callback(SparklineRequestCb cb) {
    s_sparkline_cb = cb;
}

void ui_show_stock_detail(int holdingIndex) {
    if (!s_cached_portfolio || holdingIndex < 0 || holdingIndex >= s_cached_portfolio->topCount)
        return;

    s_detail_holding_idx = holdingIndex;
    const TopHolding &h = s_cached_portfolio->top[holdingIndex];

    lv_label_set_text(det_ticker_lbl, h.ticker);
    lv_label_set_text(det_name_lbl, h.name);

    char buf[64];

    // Shares
    if (h.shares >= 1.0f)
        snprintf(buf, sizeof(buf), "%.0f", h.shares);
    else if (h.shares > 0.0f)
        snprintf(buf, sizeof(buf), "%.3f", h.shares);
    else
        snprintf(buf, sizeof(buf), "-");
    lv_label_set_text(det_shares_lbl, buf);

    // Price
    if (h.price > 0.0f) {
        char num[32];
        fmt_eur(num, sizeof(num), h.price, 2);
        snprintf(buf, sizeof(buf), "%s %s", num, h.currency);
    } else {
        snprintf(buf, sizeof(buf), "-");
    }
    lv_label_set_text(det_price_lbl, buf);

    // Total value (shares * price)
    if (h.shares > 0 && h.price > 0) {
        char num[32];
        fmt_eur(num, sizeof(num), h.shares * h.price, 2);
        snprintf(buf, sizeof(buf), "%s %s", num, h.currency);
    } else {
        snprintf(buf, sizeof(buf), "-");
    }
    lv_label_set_text(det_value_lbl, buf);

    // Day change
    bool pos = h.dayChange >= 0;
    snprintf(buf, sizeof(buf), "%s%.2f%%", pos ? "+" : "", h.dayChange);
    lv_label_set_text(det_daychange_lbl, buf);
    lv_obj_set_style_text_color(det_daychange_lbl, pos ? COL_GREEN() : COL_RED(), 0);

    // Weight
    snprintf(buf, sizeof(buf), "%.1f%%", h.weight);
    lv_label_set_text(det_weight_lbl, buf);

    // Reset chart to loading state
    lv_chart_set_all_value(det_chart, det_series, 0);
    lv_label_set_text(det_min_lbl, "");
    lv_label_set_text(det_max_lbl, "");
    lv_obj_clear_flag(det_chart_spinner, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(det_chart, LV_OBJ_FLAG_HIDDEN);

    lv_scr_load_anim(scr_detail, LV_SCR_LOAD_ANIM_MOVE_LEFT, 250, 0, false);

    // Request sparkline data
    if (s_sparkline_cb) s_sparkline_cb(h.ticker);
}

void ui_update_sparkline(const SparklineData &data) {
    if (!det_chart || !det_series) return;

    lv_obj_add_flag(det_chart_spinner, LV_OBJ_FLAG_HIDDEN);
    lv_obj_clear_flag(det_chart, LV_OBJ_FLAG_HIDDEN);

    if (data.count == 0) {
        lv_label_set_text(det_min_lbl, "No data");
        return;
    }

    float mn = data.close[0], mx = data.close[0];
    for (int i = 1; i < data.count; i++) {
        if (data.close[i] < mn) mn = data.close[i];
        if (data.close[i] > mx) mx = data.close[i];
    }

    float margin = (mx - mn) * 0.1f;
    if (margin < 0.01f) margin = mx * 0.05f;
    lv_coord_t y_min = (lv_coord_t)((mn - margin) * 100);
    lv_coord_t y_max = (lv_coord_t)((mx + margin) * 100);
    if (y_min == y_max) y_max = y_min + 100;
    lv_chart_set_range(det_chart, LV_CHART_AXIS_PRIMARY_Y, y_min, y_max);

    lv_chart_set_point_count(det_chart, data.count);
    for (int i = 0; i < data.count; i++) {
        lv_chart_set_value_by_id(det_chart, det_series, i,
                                 (lv_coord_t)(data.close[i] * 100));
    }
    lv_chart_refresh(det_chart);

    char buf[16];
    fmt_eur(buf, sizeof(buf), mx, 2);
    lv_label_set_text(det_max_lbl, buf);
    fmt_eur(buf, sizeof(buf), mn, 2);
    lv_label_set_text(det_min_lbl, buf);
}
