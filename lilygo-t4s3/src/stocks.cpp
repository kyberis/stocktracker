#include "stocks.h"

#ifdef SIMULATOR
#include <cstdlib>
#include <ctime>
static void   platform_seed()                   { srand((unsigned)time(nullptr)); }
static long   platform_random(long lo, long hi)  { return lo + rand() % (hi - lo); }
#else
static void   platform_seed()                   { randomSeed(esp_random()); }
static long   platform_random(long lo, long hi)  { return random(lo, hi); }
#endif

static Stock stocks[MAX_STOCKS] = {
    {"AAPL",  "Apple Inc.",       189.84f, 188.50f, 189.00f, 0, 9999, {}, 1.0f},
    {"GOOGL", "Alphabet Inc.",    141.80f, 140.20f, 141.00f, 0, 9999, {}, 1.0f},
    {"MSFT",  "Microsoft Corp.",  378.91f, 376.50f, 377.00f, 0, 9999, {}, 1.0f},
    {"AMZN",  "Amazon.com Inc.",  178.25f, 177.00f, 177.50f, 0, 9999, {}, 1.0f},
    {"TSLA",  "Tesla Inc.",       248.42f, 245.80f, 246.00f, 0, 9999, {}, 1.5f},
    {"NVDA",  "NVIDIA Corp.",     875.35f, 870.00f, 872.00f, 0, 9999, {}, 1.5f},
};

static float sim_step(float price, float prevClose, float volMul) {
    float volatility = price * 0.0015f * volMul;
    float meanRev    = (prevClose - price) * 0.01f;
    float noise      = ((float)platform_random(-1000, 1001)) / 1000.0f;
    return price + noise * volatility + meanRev;
}

void stocks_init() {
    platform_seed();
    for (int i = 0; i < MAX_STOCKS; i++) {
        Stock &s  = stocks[i];
        s.dayHigh = s.price;
        s.dayLow  = s.price;

        // Walk backward from starting price to fill history
        float p = s.prevClose;
        for (int j = 0; j < HISTORY_LEN - 1; j++) {
            s.history[j] = p;
            p = sim_step(p, s.prevClose, s.volatilityMul);
        }
        s.history[HISTORY_LEN - 1] = s.price;
    }
}

void stocks_tick() {
    for (int i = 0; i < MAX_STOCKS; i++) {
        Stock &s = stocks[i];

        // Shift history left, append new price
        memmove(s.history, s.history + 1, (HISTORY_LEN - 1) * sizeof(float));
        s.price = sim_step(s.price, s.prevClose, s.volatilityMul);
        s.history[HISTORY_LEN - 1] = s.price;

        if (s.price > s.dayHigh) s.dayHigh = s.price;
        if (s.price < s.dayLow)  s.dayLow  = s.price;
    }
}

Stock &stocks_get(int index) { return stocks[index]; }
int    stocks_count()        { return MAX_STOCKS; }
