#pragma once

#include <cstdint>

struct TemplateColors {
    uint32_t bg;
    uint32_t surface;
    uint32_t header;
    uint32_t accent;
    uint32_t accent2;
    uint32_t green;
    uint32_t red;
    uint32_t textPrimary;
    uint32_t textSecondary;
    uint32_t dim;
    uint32_t border;
};

struct TemplateLayout {
    int leftPanelWidth;
    int headerHeight;
    int footerHeight;
    int cardRadius;
    int cardPadding;
    int holdingsCardHeight;
};

struct TemplateFonts {
    int totalValue;
    int sectionValue;
    int title;
    int body;
    int label;
};

struct TemplateConfig {
    char id[32];
    char name[48];
    TemplateColors colors;
    TemplateLayout layout;
    TemplateFonts fonts;
};

void template_config_default(TemplateConfig &cfg);

// Built-in templates
void template_classic_dark(TemplateConfig &cfg);
void template_minimal_light(TemplateConfig &cfg);
void template_midnight_green(TemplateConfig &cfg);
void template_wall_street(TemplateConfig &cfg);
