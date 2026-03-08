#pragma once

#ifndef SIMULATOR

#include "stocks.h"

enum NetReqType : uint8_t {
    NET_NONE = 0,
    NET_PORTFOLIO,
    NET_AI_SUMMARY,
    NET_SPARKLINE,
    NET_DEVICE_CONFIG,
    NET_VALIDATE_TOKEN,
};

struct NetResult {
    NetReqType type;
    int status;
    bool success;
};

void net_task_init(PortfolioData *portfolio, DeviceConfig *config, SparklineData *sparkline);
void net_request(NetReqType type, const char *param = nullptr);
bool net_poll(NetResult &out);
bool net_busy();

#endif
