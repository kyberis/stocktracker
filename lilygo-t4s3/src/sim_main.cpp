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
static bool dashboard_active = false;

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
    if (api_fetch_portfolio(portfolio)) {
        ui_update_portfolio(portfolio);
        char status[64];
        snprintf(status, sizeof(status), "%d holdings   Synced", portfolio.holdingsCount);
        ui_set_status(status);
    } else {
        ui_set_status("Sync failed");
    }
}

static void on_ai_request() {
    ui_update_ai_summary("Loading AI summary...");
    if (api_fetch_ai_summary(portfolio)) {
        ui_update_ai_summary(portfolio.aiSummary);
    } else {
        ui_update_ai_summary("AI summary unavailable.");
    }
}

static void on_token_submit(const char *entered_token);

static void on_retry() {
    ui_show_token_entry(on_token_submit);
}

static void on_token_submit(const char *entered_token) {
    ui_show_loading("Validating passkey...");
    config_save_token(entered_token);
    api_init(API_BASE_URL, entered_token);

    if (api_validate_token()) {
        printf("Passkey valid, loading dashboard.\n");
        dashboard_active = true;
        ui_show_dashboard();
        fetch_and_show();
    } else {
        printf("Passkey invalid.\n");
        config_clear_token();
        ui_show_error("Invalid passkey. Check and try again.");
    }
}

int main(int, char **) {
    srand((unsigned)time(nullptr));

    SDL_Init(SDL_INIT_VIDEO);
    window   = SDL_CreateWindow("StockTracker T4-S3",
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
    ui_init();
    ui_set_ai_callback(on_ai_request);
    ui_set_retry_callback(on_retry);

    if (config_has_token()) {
        char token[TOKEN_MAX_LEN];
        config_load_token(token, sizeof(token));
        api_init(API_BASE_URL, token);
        ui_show_loading("Loading portfolio...");
        lv_timer_handler();

        if (api_validate_token()) {
            dashboard_active = true;
            ui_show_dashboard();
            fetch_and_show();
        } else {
            printf("Stored passkey invalid, clearing.\n");
            config_clear_token();
            ui_show_token_entry(on_token_submit);
        }
    } else {
        ui_show_token_entry(on_token_submit);
    }

    printf("Simulator running — close window or Ctrl-C to quit.\n");

    uint32_t tick_ms       = SDL_GetTicks();
    uint32_t last_fetch_ms = tick_ms;
    const uint32_t REFRESH_MS = 60000;

    while (poll_events()) {
        uint32_t now = SDL_GetTicks();
        lv_tick_inc(now - tick_ms);
        tick_ms = now;

        if (dashboard_active && (now - last_fetch_ms >= REFRESH_MS)) {
            last_fetch_ms = now;
            fetch_and_show();
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
