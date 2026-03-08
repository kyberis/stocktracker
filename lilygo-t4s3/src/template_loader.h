#pragma once

#include "template_def.h"

// Load a template by ID. Falls back to classic-dark if not found.
void template_load(const char *id, TemplateConfig &cfg);
