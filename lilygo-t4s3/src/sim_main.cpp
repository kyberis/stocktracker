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
    strncpy(portfolio.top[0].ticker, "AAPL", 11);
    strncpy(portfolio.top[0].name,   "Apple Inc.", 39);
    portfolio.top[0].weight    = 28.5;
    portfolio.top[0].dayChange = 1.82;
    strncpy(portfolio.top[1].ticker, "MSFT", 11);
    strncpy(portfolio.top[1].name,   "Microsoft Corp", 39);
    portfolio.top[1].weight    = 22.0;
    portfolio.top[1].dayChange = -0.45;
    strncpy(portfolio.top[2].ticker, "GOOGL", 11);
    strncpy(portfolio.top[2].name,   "Alphabet Inc.", 39);
    portfolio.top[2].weight    = 18.3;
    portfolio.top[2].dayChange = 0.92;
    strncpy(portfolio.top[3].ticker, "AMZN", 11);
    strncpy(portfolio.top[3].name,   "Amazon.com", 39);
    portfolio.top[3].weight    = 16.7;
    portfolio.top[3].dayChange = -1.23;
    strncpy(portfolio.top[4].ticker, "NVDA", 11);
    strncpy(portfolio.top[4].name,   "NVIDIA Corp", 39);
    portfolio.top[4].weight    = 14.5;
    portfolio.top[4].dayChange = 3.15;
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

static void fetch_and_show() {
    ui_set_status("Syncing...");
    printf("[SIM] Fetching portfolio data...\n");
    bool ok = api_fetch_portfolio(portfolio);
    last_fetch_ms = SDL_GetTicks();
    ui_update_countdown((int)(refresh_ms / 1000));
    if (ok) {
        printf("[SIM] Portfolio: %.2f EUR, %d holdings\n",
               portfolio.totalValueEUR, portfolio.holdingsCount);
        ui_update_portfolio(portfolio);
        char status[64];
        snprintf(status, sizeof(status), "%d holdings   Synced", portfolio.holdingsCount);
        ui_set_status(status);
        ui_set_live_state(true);
    } else {
        printf("[SIM] Portfolio fetch FAILED.\n");
        ui_set_status("Sync failed");
        ui_set_live_state(false);
    }
}

static void load_device_config() {
    if (api_fetch_device_config(device_cfg)) {
        refresh_ms = (uint32_t)device_cfg.refreshIntervalSec * 1000;
        ui_set_ai_visible(device_cfg.aiSummaryEnabled);
        printf("Config: plan=%s ai=%d refresh=%ds\n",
               device_cfg.plan, device_cfg.aiSummaryEnabled,
               device_cfg.refreshIntervalSec);
    }
}

static void on_manual_refresh() {
    printf("[SIM] Manual refresh requested.\n");
    if (mock_mode) {
        last_fetch_ms = SDL_GetTicks();
        ui_update_countdown((int)(refresh_ms / 1000));
        ui_update_portfolio(portfolio);
        ui_set_live_state(true);
        ui_set_status("5 holdings   Synced (mock)");
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

static void on_token_submit(const char *entered_token);

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
    window   = SDL_CreateWindow("trefolio T4-S3",
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
        ui_update_countdown((int)(refresh_ms / 1000));
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
                int remaining = (int)((refresh_ms - elapsed) / 1000);
                ui_update_countdown(remaining);
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
