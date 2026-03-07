#pragma once

#ifdef SIMULATOR
#include <cstdint>
#include <cstring>
#else
#include <Arduino.h>
#endif

constexpr int MAX_STOCKS  = 6;
constexpr int HISTORY_LEN = 30;

struct Stock {
    const char *symbol;
    const char *name;
    float price;
    float prevClose;
    float dayOpen;
    float dayHigh;
    float dayLow;
    float history[HISTORY_LEN];
    float volatilityMul;
};

void   stocks_init();
void   stocks_tick();
Stock &stocks_get(int index);
int    stocks_count();
