#include "ui.h"
#include "stocks.h"
#include <cstdio>

// ── Color palette (AMOLED-optimized dark theme) ─────────────────────
static const lv_color_t COL_BG       = lv_color_hex(0x000000);
static const lv_color_t COL_SURFACE  = lv_color_hex(0x1C1C1E);
static const lv_color_t COL_HEADER   = lv_color_hex(0x0A0A14);
static const lv_color_t COL_ACCENT   = lv_color_hex(0x0A84FF);
static const lv_color_t COL_GREEN    = lv_color_hex(0x30D158);
static const lv_color_t COL_RED      = lv_color_hex(0xFF453A);
static const lv_color_t COL_TEXT     = lv_color_hex(0xFFFFFF);
static const lv_color_t COL_TEXT_SEC = lv_color_hex(0x8E8E93);
static const lv_color_t COL_SEP      = lv_color_hex(0x38383A);

// ── Screens & persistent widgets ────────────────────────────────────
static lv_obj_t *scr_watchlist = nullptr;
static lv_obj_t *scr_detail    = nullptr;
static int        detail_idx   = -1;

struct RowWidgets {
    lv_obj_t *price;
    lv_obj_t *change;
};
static RowWidgets rows[MAX_STOCKS];

static lv_obj_t *det_symbol  = nullptr;
static lv_obj_t *det_name    = nullptr;
static lv_obj_t *det_price   = nullptr;
static lv_obj_t *det_change  = nullptr;
static lv_obj_t *det_chart   = nullptr;
static lv_chart_series_t *det_series = nullptr;
static lv_obj_t *det_open    = nullptr;
static lv_obj_t *det_high    = nullptr;
static lv_obj_t *det_low     = nullptr;

// ── Helpers ─────────────────────────────────────────────────────────
static inline bool is_positive(const Stock &s) {
    return s.price >= s.prevClose;
}

static void fmt_price(char *buf, size_t len, float price) {
    snprintf(buf, len, "$%.2f", price);
}

static void fmt_change(char *buf, size_t len, const Stock &s) {
    float diff = s.price - s.prevClose;
    float pct  = (diff / s.prevClose) * 100.0f;
    snprintf(buf, len, "%s$%.2f  (%s%.2f%%)",
             diff >= 0 ? "+" : "", diff,
             pct  >= 0 ? "+" : "", pct);
}

static void style_black_bg(lv_obj_t *obj) {
    lv_obj_set_style_bg_color(obj, COL_BG, 0);
    lv_obj_set_style_bg_opa(obj, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(obj, 0, 0);
    lv_obj_set_style_pad_all(obj, 0, 0);
}

// ── Row click → detail view ─────────────────────────────────────────
static void on_row_click(lv_event_t *e) {
    int idx = (int)(intptr_t)lv_event_get_user_data(e);
    ui_show_detail(idx);
}

// ── Back button → watchlist ─────────────────────────────────────────
static void on_back_click(lv_event_t *e) {
    (void)e;
    ui_show_watchlist();
}

// ── Build watchlist screen ──────────────────────────────────────────
static void build_watchlist() {
    scr_watchlist = lv_obj_create(nullptr);
    style_black_bg(scr_watchlist);

    lv_coord_t sw = lv_disp_get_hor_res(nullptr);

    // Header
    lv_obj_t *hdr = lv_obj_create(scr_watchlist);
    lv_obj_set_size(hdr, sw, 52);
    lv_obj_align(hdr, LV_ALIGN_TOP_LEFT, 0, 0);
    lv_obj_set_style_bg_color(hdr, COL_HEADER, 0);
    lv_obj_set_style_bg_opa(hdr, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(hdr, 0, 0);
    lv_obj_set_style_pad_left(hdr, 16, 0);
    lv_obj_set_scrollbar_mode(hdr, LV_SCROLLBAR_MODE_OFF);

    lv_obj_t *title = lv_label_create(hdr);
    lv_label_set_text(title, LV_SYMBOL_LIST "  STOCKTRACKER");
    lv_obj_set_style_text_font(title, &lv_font_montserrat_22, 0);
    lv_obj_set_style_text_color(title, COL_ACCENT, 0);
    lv_obj_align(title, LV_ALIGN_LEFT_MID, 0, 0);

    lv_obj_t *subtitle = lv_label_create(hdr);
    lv_label_set_text(subtitle, "LIVE");
    lv_obj_set_style_text_font(subtitle, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(subtitle, COL_GREEN, 0);
    lv_obj_align(subtitle, LV_ALIGN_RIGHT_MID, -16, 0);

    // Separator under header
    lv_obj_t *sep = lv_obj_create(scr_watchlist);
    lv_obj_set_size(sep, sw, 1);
    lv_obj_align(sep, LV_ALIGN_TOP_LEFT, 0, 52);
    lv_obj_set_style_bg_color(sep, COL_SEP, 0);
    lv_obj_set_style_bg_opa(sep, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep, 0, 0);
    lv_obj_set_style_pad_all(sep, 0, 0);

    // Stock list container (scrollable)
    lv_obj_t *list = lv_obj_create(scr_watchlist);
    lv_obj_set_size(list, sw, lv_disp_get_ver_res(nullptr) - 53);
    lv_obj_align(list, LV_ALIGN_TOP_LEFT, 0, 53);
    style_black_bg(list);
    lv_obj_set_flex_flow(list, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_style_pad_row(list, 2, 0);
    lv_obj_set_style_pad_top(list, 6, 0);
    lv_obj_set_style_pad_bottom(list, 12, 0);
    lv_obj_set_scrollbar_mode(list, LV_SCROLLBAR_MODE_OFF);

    for (int i = 0; i < stocks_count(); i++) {
        Stock &s = stocks_get(i);

        lv_obj_t *row = lv_obj_create(list);
        lv_obj_set_size(row, sw - 8, 62);
        lv_obj_set_style_bg_color(row, COL_SURFACE, 0);
        lv_obj_set_style_bg_opa(row, LV_OPA_COVER, 0);
        lv_obj_set_style_border_width(row, 0, 0);
        lv_obj_set_style_radius(row, 10, 0);
        lv_obj_set_style_pad_left(row, 14, 0);
        lv_obj_set_style_pad_right(row, 14, 0);
        lv_obj_set_style_pad_top(row, 8, 0);
        lv_obj_set_scrollbar_mode(row, LV_SCROLLBAR_MODE_OFF);
        lv_obj_add_flag(row, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_event_cb(row, on_row_click, LV_EVENT_CLICKED, (void *)(intptr_t)i);

        // Symbol (top-left)
        lv_obj_t *sym = lv_label_create(row);
        lv_label_set_text(sym, s.symbol);
        lv_obj_set_style_text_font(sym, &lv_font_montserrat_22, 0);
        lv_obj_set_style_text_color(sym, COL_TEXT, 0);
        lv_obj_align(sym, LV_ALIGN_TOP_LEFT, 0, 0);

        // Company name (bottom-left)
        lv_obj_t *nm = lv_label_create(row);
        lv_label_set_text(nm, s.name);
        lv_obj_set_style_text_font(nm, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(nm, COL_TEXT_SEC, 0);
        lv_obj_align(nm, LV_ALIGN_BOTTOM_LEFT, 0, -2);

        // Price (top-right)
        char buf[24];
        lv_obj_t *pr = lv_label_create(row);
        fmt_price(buf, sizeof(buf), s.price);
        lv_label_set_text(pr, buf);
        lv_obj_set_style_text_font(pr, &lv_font_montserrat_22, 0);
        lv_obj_set_style_text_color(pr, COL_TEXT, 0);
        lv_obj_align(pr, LV_ALIGN_TOP_RIGHT, 0, 0);
        rows[i].price = pr;

        // Change (bottom-right)
        lv_obj_t *ch = lv_label_create(row);
        fmt_change(buf, sizeof(buf), s);
        lv_label_set_text(ch, buf);
        lv_obj_set_style_text_font(ch, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(ch, is_positive(s) ? COL_GREEN : COL_RED, 0);
        lv_obj_align(ch, LV_ALIGN_BOTTOM_RIGHT, 0, -2);
        rows[i].change = ch;
    }
}

// ── Build detail screen ─────────────────────────────────────────────
static void build_detail() {
    scr_detail = lv_obj_create(nullptr);
    style_black_bg(scr_detail);

    lv_coord_t sw = lv_disp_get_hor_res(nullptr);
    lv_coord_t sh = lv_disp_get_ver_res(nullptr);

    // Back button + symbol header
    lv_obj_t *back = lv_btn_create(scr_detail);
    lv_obj_set_size(back, 48, 40);
    lv_obj_align(back, LV_ALIGN_TOP_LEFT, 8, 6);
    lv_obj_set_style_bg_color(back, COL_SURFACE, 0);
    lv_obj_set_style_radius(back, 8, 0);
    lv_obj_add_event_cb(back, on_back_click, LV_EVENT_CLICKED, nullptr);
    lv_obj_t *arrow = lv_label_create(back);
    lv_label_set_text(arrow, LV_SYMBOL_LEFT);
    lv_obj_set_style_text_color(arrow, COL_ACCENT, 0);
    lv_obj_center(arrow);

    det_symbol = lv_label_create(scr_detail);
    lv_obj_set_style_text_font(det_symbol, &lv_font_montserrat_28, 0);
    lv_obj_set_style_text_color(det_symbol, COL_TEXT, 0);
    lv_obj_align(det_symbol, LV_ALIGN_TOP_LEFT, 66, 8);

    det_name = lv_label_create(scr_detail);
    lv_obj_set_style_text_font(det_name, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(det_name, COL_TEXT_SEC, 0);
    lv_obj_align(det_name, LV_ALIGN_TOP_LEFT, 66, 36);

    // Separator
    lv_obj_t *sep = lv_obj_create(scr_detail);
    lv_obj_set_size(sep, sw - 16, 1);
    lv_obj_align(sep, LV_ALIGN_TOP_MID, 0, 54);
    lv_obj_set_style_bg_color(sep, COL_SEP, 0);
    lv_obj_set_style_bg_opa(sep, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(sep, 0, 0);
    lv_obj_set_style_pad_all(sep, 0, 0);

    // Price
    det_price = lv_label_create(scr_detail);
    lv_obj_set_style_text_font(det_price, &lv_font_montserrat_40, 0);
    lv_obj_set_style_text_color(det_price, COL_TEXT, 0);
    lv_obj_align(det_price, LV_ALIGN_TOP_LEFT, 16, 62);

    // Change
    det_change = lv_label_create(scr_detail);
    lv_obj_set_style_text_font(det_change, &lv_font_montserrat_16, 0);
    lv_obj_align(det_change, LV_ALIGN_TOP_LEFT, 16, 106);

    // Chart
    lv_coord_t chart_h = sh - 210;
    if (chart_h < 100) chart_h = 100;

    det_chart = lv_chart_create(scr_detail);
    lv_obj_set_size(det_chart, sw - 32, chart_h);
    lv_obj_align(det_chart, LV_ALIGN_TOP_MID, 0, 132);
    lv_chart_set_type(det_chart, LV_CHART_TYPE_LINE);
    lv_chart_set_point_count(det_chart, HISTORY_LEN);
    lv_chart_set_div_line_count(det_chart, 3, 0);
    lv_obj_set_style_bg_color(det_chart, COL_SURFACE, 0);
    lv_obj_set_style_bg_opa(det_chart, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(det_chart, COL_SEP, 0);
    lv_obj_set_style_border_width(det_chart, 1, 0);
    lv_obj_set_style_radius(det_chart, 10, 0);
    lv_obj_set_style_pad_all(det_chart, 8, 0);
    lv_obj_set_style_line_color(det_chart, COL_SEP, LV_PART_MAIN);
    lv_obj_set_style_size(det_chart, 0, LV_PART_INDICATOR);
    lv_obj_set_style_line_width(det_chart, 2, LV_PART_ITEMS);

    det_series = lv_chart_add_series(det_chart, COL_ACCENT, LV_CHART_AXIS_PRIMARY_Y);

    // Stats row (Open / High / Low)
    lv_coord_t stats_y = 132 + chart_h + 8;
    lv_coord_t col_w   = (sw - 32) / 3;

    auto make_stat = [&](const char *label_text, lv_coord_t x) -> lv_obj_t * {
        lv_obj_t *box = lv_obj_create(scr_detail);
        lv_obj_set_size(box, col_w, 46);
        lv_obj_align(box, LV_ALIGN_TOP_LEFT, x, stats_y);
        lv_obj_set_style_bg_color(box, COL_SURFACE, 0);
        lv_obj_set_style_bg_opa(box, LV_OPA_COVER, 0);
        lv_obj_set_style_border_width(box, 0, 0);
        lv_obj_set_style_radius(box, 8, 0);
        lv_obj_set_style_pad_left(box, 8, 0);
        lv_obj_set_style_pad_top(box, 4, 0);
        lv_obj_set_scrollbar_mode(box, LV_SCROLLBAR_MODE_OFF);

        lv_obj_t *lbl = lv_label_create(box);
        lv_label_set_text(lbl, label_text);
        lv_obj_set_style_text_font(lbl, &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(lbl, COL_TEXT_SEC, 0);
        lv_obj_align(lbl, LV_ALIGN_TOP_LEFT, 0, 0);

        lv_obj_t *val = lv_label_create(box);
        lv_obj_set_style_text_font(val, &lv_font_montserrat_16, 0);
        lv_obj_set_style_text_color(val, COL_TEXT, 0);
        lv_obj_align(val, LV_ALIGN_BOTTOM_LEFT, 0, -2);
        return val;
    };

    det_open = make_stat("OPEN",  16);
    det_high = make_stat("HIGH",  16 + col_w + 4);
    det_low  = make_stat("LOW",   16 + (col_w + 4) * 2);
}

// ── Public API ──────────────────────────────────────────────────────
void ui_init() {
    // Apply dark theme globally
    lv_theme_t *th = lv_theme_default_init(
        lv_disp_get_default(),
        COL_ACCENT, COL_GREEN,
        true,   // dark mode
        &lv_font_montserrat_14
    );
    lv_disp_set_theme(lv_disp_get_default(), th);

    build_watchlist();
    build_detail();
    lv_scr_load(scr_watchlist);
}

void ui_update() {
    char buf[32];

    // Update watchlist rows
    for (int i = 0; i < stocks_count(); i++) {
        Stock &s = stocks_get(i);
        fmt_price(buf, sizeof(buf), s.price);
        lv_label_set_text(rows[i].price, buf);

        fmt_change(buf, sizeof(buf), s);
        lv_label_set_text(rows[i].change, buf);
        lv_obj_set_style_text_color(rows[i].change,
                                    is_positive(s) ? COL_GREEN : COL_RED, 0);
    }

    // Update detail view if visible
    if (detail_idx < 0) return;
    Stock &s = stocks_get(detail_idx);

    fmt_price(buf, sizeof(buf), s.price);
    lv_label_set_text(det_price, buf);

    fmt_change(buf, sizeof(buf), s);
    lv_label_set_text(det_change, buf);
    lv_obj_set_style_text_color(det_change,
                                is_positive(s) ? COL_GREEN : COL_RED, 0);

    // Recompute chart range and data
    float mn = s.history[0], mx = s.history[0];
    for (int j = 1; j < HISTORY_LEN; j++) {
        if (s.history[j] < mn) mn = s.history[j];
        if (s.history[j] > mx) mx = s.history[j];
    }
    float pad = (mx - mn) * 0.15f;
    if (pad < 0.5f) pad = 0.5f;
    lv_chart_set_range(det_chart, LV_CHART_AXIS_PRIMARY_Y,
                       (lv_coord_t)((mn - pad) * 100),
                       (lv_coord_t)((mx + pad) * 100));

    lv_chart_set_all_value(det_chart, det_series, LV_CHART_POINT_NONE);
    for (int j = 0; j < HISTORY_LEN; j++) {
        lv_chart_set_next_value(det_chart, det_series,
                                (lv_coord_t)(s.history[j] * 100));
    }
    lv_chart_refresh(det_chart);

    // Stats
    lv_label_set_text_fmt(det_open, "$%.2f", s.dayOpen);
    lv_label_set_text_fmt(det_high, "$%.2f", s.dayHigh);
    lv_label_set_text_fmt(det_low,  "$%.2f", s.dayLow);
}

void ui_show_detail(int stockIdx) {
    detail_idx = stockIdx;
    Stock &s   = stocks_get(stockIdx);

    lv_label_set_text(det_symbol, s.symbol);
    lv_label_set_text(det_name,   s.name);

    // Set chart line color based on direction
    lv_color_t lineCol = is_positive(s) ? COL_GREEN : COL_RED;
    lv_chart_set_series_color(det_chart, det_series, lineCol);

    ui_update();
    lv_scr_load_anim(scr_detail, LV_SCR_LOAD_ANIM_MOVE_LEFT, 250, 0, false);
}

void ui_show_watchlist() {
    detail_idx = -1;
    lv_scr_load_anim(scr_watchlist, LV_SCR_LOAD_ANIM_MOVE_RIGHT, 250, 0, false);
}
