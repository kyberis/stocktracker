#ifdef SIMULATOR

#include <SDL.h>
#include <lvgl.h>
#include <cstdlib>
#include <cstdio>
#include <ctime>
#include <unistd.h>

#include "config.h"
#include "stocks.h"
#include "api_client.h"
#include "ui.h"
#include "ota_updater.h"

static const int DISP_HOR_RES = 600;
static const int DISP_VER_RES = 450;

static SDL_Window   *window;
static SDL_Renderer *renderer;
static SDL_Texture  *texture;

static lv_disp_draw_buf_t draw_buf;
static lv_color_t buf1[DISP_HOR_RES * 10];

static int16_t mouse_x, mouse_y;
static bool    mouse_pressed;

static PortfolioData portfolio;
static DeviceConfig device_cfg;
static bool dashboard_active = false;
static uint32_t refresh_ms = 60000;
static uint32_t last_fetch_ms = 0;
static bool mock_mode = false;

static SparklineData sparkline_buf;

static void fill_mock_portfolio() {
    portfolio_clear(portfolio);
    portfolio.totalValueEUR     = 42850.75;
    portfolio.costBasis         = 38200.00;
    portfolio.totalGainLoss     = 4650.75;
    portfolio.totalGainLossPercent = 12.17;
    portfolio.dayChangeEUR      = 312.40;
    portfolio.dayChangePercent  = 0.73;
    portfolio.holdingsCount     = 5;
    portfolio.topCount          = 5;

    struct { const char *t; const char *n; float w; float d; float s; float p; const char *c; } mocks[] = {
        {"AAPL",  "Apple Inc.",      28.5f,  1.82f, 45.0f,  227.50f, "USD"},
        {"MSFT",  "Microsoft Corp",  22.0f, -0.45f, 30.0f,  415.20f, "USD"},
        {"GOOGL", "Alphabet Inc.",   18.3f,  0.92f, 25.0f,  175.80f, "USD"},
        {"AMZN",  "Amazon.com",      16.7f, -1.23f, 20.0f,  198.40f, "USD"},
        {"NVDA",  "NVIDIA Corp",     14.5f,  3.15f, 15.0f,  880.00f, "USD"},
    };
    for (int i = 0; i < 5; i++) {
        strncpy(portfolio.top[i].ticker, mocks[i].t, sizeof(portfolio.top[i].ticker) - 1);
        strncpy(portfolio.top[i].name, mocks[i].n, sizeof(portfolio.top[i].name) - 1);
        portfolio.top[i].weight    = mocks[i].w;
        portfolio.top[i].dayChange = mocks[i].d;
        portfolio.top[i].shares    = mocks[i].s;
        portfolio.top[i].price     = mocks[i].p;
        strncpy(portfolio.top[i].currency, mocks[i].c, sizeof(portfolio.top[i].currency) - 1);
    }

    portfolio.aiLoaded = true;
    portfolio.aiUsed   = 2;
    portfolio.aiLimit  = 5;
    strncpy(portfolio.aiSummary,
        "Portfolio up +2.4% today. NVDA leads with strong AI demand. "
        "AMZN dips on profit-taking. Overall trend bullish.",
        AI_SUMMARY_MAX - 1);
}

static void flush_cb(lv_disp_drv_t *, const lv_area_t *area, lv_color_t *px) {
    int w = area->x2 - area->x1 + 1;
    SDL_Rect rect = { area->x1, area->y1, w, area->y2 - area->y1 + 1 };
    SDL_UpdateTexture(texture, &rect, px, w * (int)sizeof(lv_color_t));
    SDL_RenderClear(renderer);
    SDL_RenderCopy(renderer, texture, nullptr, nullptr);
    SDL_RenderPresent(renderer);
    lv_disp_flush_ready(lv_disp_get_default()->driver);
}

static void mouse_read_cb(lv_indev_drv_t *, lv_indev_data_t *data) {
    data->point.x = mouse_x;
    data->point.y = mouse_y;
    data->state   = mouse_pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

static bool poll_events() {
    SDL_Event ev;
    while (SDL_PollEvent(&ev)) {
        switch (ev.type) {
        case SDL_QUIT:            return false;
        case SDL_MOUSEMOTION:     mouse_x = ev.motion.x; mouse_y = ev.motion.y; break;
        case SDL_MOUSEBUTTONDOWN: mouse_pressed = true;  break;
        case SDL_MOUSEBUTTONUP:   mouse_pressed = false; break;
        }
    }
    return true;
}

static void on_token_submit(const char *entered_token);

static void handle_passkey_revoked() {
    printf("[SIM] Passkey revoked — returning to setup.\n");
    config_clear_token();
    dashboard_active = false;
    ui_show_token_entry(on_token_submit);
}

static void fetch_and_show() {
    ui_set_status("Syncing...");
    printf("[SIM] Fetching portfolio data...\n");
    int status = api_fetch_portfolio(portfolio);
    last_fetch_ms = SDL_GetTicks();
    ui_update_countdown(0);
    if (status == 200) {
        printf("[SIM] Portfolio: %.2f EUR, %d holdings\n",
               portfolio.totalValueEUR, portfolio.holdingsCount);
        ui_update_portfolio(portfolio);
        ui_set_live_state(true);
    } else if (status == 401) {
        handle_passkey_revoked();
    } else {
        printf("[SIM] Portfolio fetch FAILED (status=%d).\n", status);
        ui_set_status("Sync failed");
        ui_set_live_state(false);
    }
}

static void load_device_config() {
    if (api_fetch_device_config(device_cfg)) {
        refresh_ms = (uint32_t)device_cfg.refreshIntervalSec * 1000;
        ui_set_ai_visible(device_cfg.aiSummaryEnabled);
        ui_settings_set_plan(device_cfg.plan);
        printf("Config: plan=%s ai=%d refresh=%ds\n",
               device_cfg.plan, device_cfg.aiSummaryEnabled,
               device_cfg.refreshIntervalSec);
    }
}

static void on_manual_refresh() {
    printf("[SIM] Manual refresh requested.\n");
    if (mock_mode) {
        last_fetch_ms = SDL_GetTicks();
        ui_update_countdown(0);
        ui_update_portfolio(portfolio);
        ui_set_live_state(true);
    } else {
        fetch_and_show();
    }
}

static void on_ai_request() {
    ui_update_ai_summary("Analyzing your portfolio...");
    lv_timer_handler();
    printf("[AI] Requesting AI summary...\n");
    if (api_fetch_ai_summary(portfolio)) {
        printf("[AI] Summary received.\n");
        ui_update_ai_summary(portfolio.aiSummary);
    } else {
        printf("[AI] Summary request failed.\n");
        if (portfolio.aiSummary[0] != '\0') {
            ui_update_ai_summary(portfolio.aiSummary);
        } else {
            ui_update_ai_summary("Unable to load AI summary.\nPlease try again later.");
        }
    }
    ui_update_ai_usage(portfolio.aiUsed, portfolio.aiLimit);
}

static void on_view_all() {
    ui_update_holdings_list(portfolio);
    ui_show_holdings_list();
}

static void on_holding_tap(int idx) {
    ui_show_stock_detail(idx);
}

static void on_sparkline_request(const char *ticker) {
    printf("[SIM] Fetching sparkline for %s...\n", ticker);
    lv_timer_handler();
    if (mock_mode) {
        sparkline_clear(sparkline_buf);
        strncpy(sparkline_buf.ticker, ticker, sizeof(sparkline_buf.ticker) - 1);
        sparkline_buf.count = MAX_SPARKLINE_PTS;
        float base = 150.0f + (float)(rand() % 100);
        for (int i = 0; i < MAX_SPARKLINE_PTS; i++)
            sparkline_buf.close[i] = base + (float)(rand() % 20 - 10);
        ui_update_sparkline(sparkline_buf);
    } else if (api_fetch_sparkline(ticker, sparkline_buf)) {
        printf("[SIM] Sparkline loaded: %d points\n", sparkline_buf.count);
        ui_update_sparkline(sparkline_buf);
    } else {
        SparklineData empty;
        sparkline_clear(empty);
        ui_update_sparkline(empty);
        printf("[SIM] Sparkline fetch failed.\n");
    }
}

static void on_brightness_change(uint8_t val) {
    config_save_brightness(val);
    printf("[SIM] Brightness: %d (no-op in simulator)\n", val);
}

static void on_timeout_change(uint16_t idle_dim_sec, uint16_t auto_sleep_sec) {
    config_save_idle_dim_sec(idle_dim_sec);
    config_save_auto_sleep_sec(auto_sleep_sec);
    printf("[SIM] Timeouts: dim=%ds, sleep=%ds\n", idle_dim_sec, auto_sleep_sec);
}

static void on_theme_change(const char *template_id) {
    ui_apply_template(template_id);
    printf("[SIM] Theme: %s (takes effect on reboot)\n", template_id);
}

static void on_unlink() {
    printf("[SIM] Unlinking device — returning to token entry.\n");
    config_clear_token();
    dashboard_active = false;
    ui_show_token_entry(on_token_submit);
}

static void on_retry() {
    ui_show_token_entry(on_token_submit);
}

static void on_token_submit(const char *entered_token) {
    printf("[SIM] Token entered: %s\n", entered_token);
    ui_show_loading("Validating passkey...");
    lv_timer_handler();
    config_save_token(entered_token);
    api_init(API_BASE_URL, entered_token);

    printf("[SIM] Validating against %s ...\n", API_BASE_URL);
    if (api_validate_token()) {
        printf("[SIM] Passkey valid — loading dashboard.\n");
        dashboard_active = true;
        load_device_config();
        ui_show_dashboard();
        lv_timer_handler();
        fetch_and_show();
    } else {
        printf("[SIM] Passkey invalid or server unreachable.\n");
        config_clear_token();
        ui_show_error("Invalid passkey. Check and try again.");
    }
}

int main(int argc, char **argv) {
    srand((unsigned)time(nullptr));

    const char *cli_token = nullptr;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--mock") == 0) {
            mock_mode = true;
            printf("[SIM] Mock mode enabled — using fake portfolio data.\n");
        } else if (strcmp(argv[i], "--token") == 0 && i + 1 < argc) {
            cli_token = argv[++i];
            printf("[SIM] CLI token provided: %s\n", cli_token);
        }
    }

    SDL_Init(SDL_INIT_VIDEO);
    window   = SDL_CreateWindow("trefolio Leaf",
                                SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
                                DISP_HOR_RES, DISP_VER_RES, 0);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    texture  = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888,
                                 SDL_TEXTUREACCESS_STREAMING,
                                 DISP_HOR_RES, DISP_VER_RES);

    lv_init();
    lv_disp_draw_buf_init(&draw_buf, buf1, nullptr, DISP_HOR_RES * 10);

    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res  = DISP_HOR_RES;
    disp_drv.ver_res  = DISP_VER_RES;
    disp_drv.flush_cb = flush_cb;
    disp_drv.draw_buf = &draw_buf;
    lv_disp_drv_register(&disp_drv);

    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type    = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = mouse_read_cb;
    lv_indev_drv_register(&indev_drv);

    config_init();
    api_set_firmware_version(FW_VERSION);
    ui_init();
    ui_set_ai_callback(on_ai_request);
    ui_set_retry_callback(on_retry);
    ui_set_refresh_callback(on_manual_refresh);
    ui_set_view_all_callback(on_view_all);
    ui_set_holding_tap_callback(on_holding_tap);
    ui_set_sparkline_callback(on_sparkline_request);
    ui_set_settings_callbacks(on_brightness_change, on_timeout_change,
                              on_theme_change, on_unlink);

    // Restore saved settings
    ui_settings_set_brightness(config_load_brightness());
    ui_settings_set_timeouts(config_load_idle_dim_sec(), config_load_auto_sleep_sec());
    // Simulator: show mock battery data
    ui_update_settings_battery(75, false, 0.0f, false);

    if (mock_mode) {
        fill_mock_portfolio();
        dashboard_active = true;
        ui_show_dashboard();
        lv_timer_handler();
        ui_update_portfolio(portfolio);
        ui_update_ai_summary(portfolio.aiSummary);
        ui_update_ai_usage(portfolio.aiUsed, portfolio.aiLimit);
        ui_set_ai_visible(true);
        ui_set_live_state(true);
        ui_update_countdown(0);
        ui_settings_set_plan("pro");
    } else if (cli_token) {
        config_save_token(cli_token);
        api_init(API_BASE_URL, cli_token);
        ui_show_loading("Validating passkey...");
        lv_timer_handler();
        if (api_validate_token()) {
            printf("[SIM] CLI passkey valid — loading dashboard.\n");
            dashboard_active = true;
            load_device_config();
            ui_show_dashboard();
            lv_timer_handler();
            fetch_and_show();
        } else {
            printf("[SIM] CLI passkey invalid.\n");
            config_clear_token();
            ui_show_error("Invalid passkey. Check and try again.");
        }
    } else if (config_has_token()) {
        char token[TOKEN_MAX_LEN];
        config_load_token(token, sizeof(token));
        printf("[SIM] Stored passkey: %s\n", token);
        api_init(API_BASE_URL, token);
        ui_show_loading("Loading portfolio...");
        lv_timer_handler();

        if (api_validate_token()) {
            printf("[SIM] Stored passkey valid — loading dashboard.\n");
            dashboard_active = true;
            load_device_config();
            ui_show_dashboard();
            lv_timer_handler();
            fetch_and_show();
        } else {
            printf("[SIM] Stored passkey invalid, clearing.\n");
            config_clear_token();
            ui_show_token_entry(on_token_submit);
        }
    } else {
        printf("[SIM] No stored passkey — showing entry screen.\n");
        ui_show_token_entry(on_token_submit);
    }

    printf("Simulator running — close window or Ctrl-C to quit.\n");

    uint32_t tick_ms = SDL_GetTicks();
    if (last_fetch_ms == 0) last_fetch_ms = tick_ms;

    while (poll_events()) {
        uint32_t now = SDL_GetTicks();
        lv_tick_inc(now - tick_ms);
        tick_ms = now;

        if (dashboard_active) {
            uint32_t elapsed = now - last_fetch_ms;
            if (elapsed >= refresh_ms) {
                fetch_and_show();
            } else {
                int secs_ago = (int)(elapsed / 1000);
                ui_update_countdown(secs_ago);
            }
        }

        lv_timer_handler();
        SDL_Delay(5);
    }

    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}

#endif // SIMULATOR
