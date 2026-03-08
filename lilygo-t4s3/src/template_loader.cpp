#include "template_loader.h"
#include <cstring>

void template_config_default(TemplateConfig &cfg) {
    template_classic_dark(cfg);
}

void template_classic_dark(TemplateConfig &cfg) {
    memset(&cfg, 0, sizeof(cfg));
    strncpy(cfg.id, "classic-dark", sizeof(cfg.id) - 1);
    strncpy(cfg.name, "Classic Dark", sizeof(cfg.name) - 1);

    cfg.colors.bg            = 0x0f172a;
    cfg.colors.surface       = 0x1e293b;
    cfg.colors.header        = 0x0f172a;
    cfg.colors.accent        = 0x10b981;
    cfg.colors.accent2       = 0x8b5cf6;
    cfg.colors.green         = 0x34d399;
    cfg.colors.red           = 0xf87171;
    cfg.colors.textPrimary   = 0xf1f5f9;
    cfg.colors.textSecondary = 0x94a3b8;
    cfg.colors.dim           = 0x64748b;
    cfg.colors.border        = 0x334155;

    cfg.layout.leftPanelWidth    = 205;
    cfg.layout.headerHeight      = 42;
    cfg.layout.footerHeight      = 28;
    cfg.layout.cardRadius        = 16;
    cfg.layout.cardPadding       = 10;
    cfg.layout.holdingsCardHeight = 210;

    cfg.fonts.totalValue   = 30;
    cfg.fonts.sectionValue = 20;
    cfg.fonts.title        = 16;
    cfg.fonts.body         = 14;
    cfg.fonts.label        = 12;
}

void template_minimal_light(TemplateConfig &cfg) {
    memset(&cfg, 0, sizeof(cfg));
    strncpy(cfg.id, "minimal-light", sizeof(cfg.id) - 1);
    strncpy(cfg.name, "Minimal Light", sizeof(cfg.name) - 1);

    cfg.colors.bg            = 0xf8fafc;
    cfg.colors.surface       = 0xffffff;
    cfg.colors.header        = 0xf1f5f9;
    cfg.colors.accent        = 0x059669;
    cfg.colors.accent2       = 0x7c3aed;
    cfg.colors.green         = 0x059669;
    cfg.colors.red           = 0xdc2626;
    cfg.colors.textPrimary   = 0x0f172a;
    cfg.colors.textSecondary = 0x475569;
    cfg.colors.dim           = 0x94a3b8;
    cfg.colors.border        = 0xe2e8f0;

    cfg.layout.leftPanelWidth    = 210;
    cfg.layout.headerHeight      = 42;
    cfg.layout.footerHeight      = 28;
    cfg.layout.cardRadius        = 12;
    cfg.layout.cardPadding       = 10;
    cfg.layout.holdingsCardHeight = 210;

    cfg.fonts.totalValue   = 30;
    cfg.fonts.sectionValue = 20;
    cfg.fonts.title        = 16;
    cfg.fonts.body         = 14;
    cfg.fonts.label        = 12;
}

void template_midnight_green(TemplateConfig &cfg) {
    memset(&cfg, 0, sizeof(cfg));
    strncpy(cfg.id, "midnight-green", sizeof(cfg.id) - 1);
    strncpy(cfg.name, "Midnight Green", sizeof(cfg.name) - 1);

    cfg.colors.bg            = 0x042f2e;
    cfg.colors.surface       = 0x064e3b;
    cfg.colors.header        = 0x022c22;
    cfg.colors.accent        = 0x6ee7b7;
    cfg.colors.accent2       = 0xa78bfa;
    cfg.colors.green         = 0x6ee7b7;
    cfg.colors.red           = 0xfca5a5;
    cfg.colors.textPrimary   = 0xecfdf5;
    cfg.colors.textSecondary = 0xa7f3d0;
    cfg.colors.dim           = 0x6ee7b7;
    cfg.colors.border        = 0x065f46;

    cfg.layout.leftPanelWidth    = 205;
    cfg.layout.headerHeight      = 42;
    cfg.layout.footerHeight      = 28;
    cfg.layout.cardRadius        = 16;
    cfg.layout.cardPadding       = 10;
    cfg.layout.holdingsCardHeight = 210;

    cfg.fonts.totalValue   = 30;
    cfg.fonts.sectionValue = 20;
    cfg.fonts.title        = 16;
    cfg.fonts.body         = 14;
    cfg.fonts.label        = 12;
}

void template_wall_street(TemplateConfig &cfg) {
    memset(&cfg, 0, sizeof(cfg));
    strncpy(cfg.id, "wall-street", sizeof(cfg.id) - 1);
    strncpy(cfg.name, "Wall Street", sizeof(cfg.name) - 1);

    cfg.colors.bg            = 0x000000;
    cfg.colors.surface       = 0x111111;
    cfg.colors.header        = 0x0a0a0a;
    cfg.colors.accent        = 0xf59e0b;
    cfg.colors.accent2       = 0xeab308;
    cfg.colors.green         = 0x22c55e;
    cfg.colors.red           = 0xef4444;
    cfg.colors.textPrimary   = 0xfbbf24;
    cfg.colors.textSecondary = 0xa3a3a3;
    cfg.colors.dim           = 0x525252;
    cfg.colors.border        = 0x262626;

    cfg.layout.leftPanelWidth    = 205;
    cfg.layout.headerHeight      = 42;
    cfg.layout.footerHeight      = 28;
    cfg.layout.cardRadius        = 6;
    cfg.layout.cardPadding       = 8;
    cfg.layout.holdingsCardHeight = 210;

    cfg.fonts.totalValue   = 30;
    cfg.fonts.sectionValue = 20;
    cfg.fonts.title        = 16;
    cfg.fonts.body         = 14;
    cfg.fonts.label        = 12;
}

void template_load(const char *id, TemplateConfig &cfg) {
    if (strcmp(id, "minimal-light") == 0) {
        template_minimal_light(cfg);
    } else if (strcmp(id, "midnight-green") == 0) {
        template_midnight_green(cfg);
    } else if (strcmp(id, "wall-street") == 0) {
        template_wall_street(cfg);
    } else {
        template_classic_dark(cfg);
    }
}
