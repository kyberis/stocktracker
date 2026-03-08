#include "net_task.h"

#ifndef SIMULATOR

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <cstring>
#include "api_client.h"

struct NetRequest {
    NetReqType type;
    char param[12];
};

static QueueHandle_t s_req_queue;
static QueueHandle_t s_res_queue;

static PortfolioData  *s_portfolio;
static DeviceConfig   *s_config;
static SparklineData  *s_sparkline;
static volatile bool   s_processing = false;

static void net_task_fn(void *) {
    NetRequest req;
    for (;;) {
        if (xQueueReceive(s_req_queue, &req, portMAX_DELAY) != pdTRUE)
            continue;

        s_processing = true;
        NetResult res = { req.type, -1, false };

        switch (req.type) {
        case NET_PORTFOLIO:
            res.status  = api_fetch_portfolio(*s_portfolio);
            res.success = (res.status == 200);
            break;
        case NET_AI_SUMMARY:
            res.success = api_fetch_ai_summary(*s_portfolio);
            res.status  = res.success ? 200 : -1;
            break;
        case NET_SPARKLINE:
            res.success = api_fetch_sparkline(req.param, *s_sparkline);
            res.status  = res.success ? 200 : -1;
            break;
        case NET_DEVICE_CONFIG:
            res.success = api_fetch_device_config(*s_config);
            res.status  = res.success ? 200 : -1;
            break;
        case NET_VALIDATE_TOKEN:
            res.success = api_validate_token();
            res.status  = res.success ? 200 : 401;
            break;
        default:
            break;
        }

        s_processing = false;
        xQueueSend(s_res_queue, &res, portMAX_DELAY);
    }
}

void net_task_init(PortfolioData *portfolio, DeviceConfig *config, SparklineData *sparkline) {
    s_portfolio = portfolio;
    s_config    = config;
    s_sparkline = sparkline;
    s_req_queue = xQueueCreate(4, sizeof(NetRequest));
    s_res_queue = xQueueCreate(4, sizeof(NetResult));
    xTaskCreatePinnedToCore(net_task_fn, "net", 16384, nullptr, 1, nullptr, 0);
}

void net_request(NetReqType type, const char *param) {
    NetRequest req = {};
    req.type = type;
    if (param) strncpy(req.param, param, sizeof(req.param) - 1);
    xQueueSend(s_req_queue, &req, portMAX_DELAY);
}

bool net_poll(NetResult &out) {
    return xQueueReceive(s_res_queue, &out, 0) == pdTRUE;
}

bool net_busy() {
    return s_processing || uxQueueMessagesWaiting(s_req_queue) > 0;
}

#endif
