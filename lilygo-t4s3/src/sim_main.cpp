#ifdef SIMULATOR

#include <SDL.h>
#include <lvgl.h>
#include <cstdlib>
#include <cstdio>
#include <ctime>
#include <unistd.h>

#include "stocks.h"
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

static void flush_cb(lv_disp_drv_t *drv, const lv_area_t *area, lv_color_t *px) {
    int w = area->x2 - area->x1 + 1;
    SDL_Rect rect = { area->x1, area->y1, w, area->y2 - area->y1 + 1 };
    SDL_UpdateTexture(texture, &rect, px, w * (int)sizeof(lv_color_t));
    SDL_RenderClear(renderer);
    SDL_RenderCopy(renderer, texture, nullptr, nullptr);
    SDL_RenderPresent(renderer);
    lv_disp_flush_ready(drv);
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
        case SDL_QUIT:          return false;
        case SDL_MOUSEMOTION:   mouse_x = ev.motion.x; mouse_y = ev.motion.y; break;
        case SDL_MOUSEBUTTONDOWN: mouse_pressed = true;  break;
        case SDL_MOUSEBUTTONUP:   mouse_pressed = false; break;
        }
    }
    return true;
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

    stocks_init();
    ui_init();
    ui_update();
    printf("Simulator running — close window or Ctrl-C to quit.\n");

    uint32_t tick_ms       = SDL_GetTicks();
    uint32_t last_stock_ms = tick_ms;

    while (poll_events()) {
        uint32_t now = SDL_GetTicks();
        lv_tick_inc(now - tick_ms);
        tick_ms = now;

        if (now - last_stock_ms >= 2000) {
            last_stock_ms = now;
            stocks_tick();
            ui_update();
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
