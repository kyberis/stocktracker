"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Language } from "./types";

const translations = {
  en: {
    appTitle: "StockTracker",
    portfolio: "Portfolio",
    totalValue: "Total Value",
    totalCost: "Total Cost",
    totalGainLoss: "Gain / Loss",
    holdings: "Holdings",
    stock: "Stock",
    ticker: "Ticker",
    shares: "Shares",
    purchasePrice: "Purchase Price",
    currentPrice: "Current Price",
    value: "Value",
    gainLoss: "Gain/Loss",
    change: "Change",
    addStock: "Add Stock",
    removeStock: "Remove",
    search: "Search",
    searchPlaceholder: "Search by ticker or name...",
    noResults: "No results found",
    loading: "Loading...",
    error: "Error loading data",
    currency: "Currency",
    cancel: "Cancel",
    confirm: "Confirm",
    name: "Name",
    period1w: "1W",
    period1m: "1M",
    period3m: "3M",
    period6m: "6M",
    period1y: "1Y",
    periodAll: "All",
    priceHistory: "Price History",
    dayChange: "Day Change",
    week52High: "52W High",
    week52Low: "52W Low",
    marketCap: "Market Cap",
    purchaseLine: "Purchase Price",
    portfolioOverview: "Portfolio Overview",
    stockDetails: "Stock Details",
    close: "Close",
    addToPortfolio: "Add to Portfolio",
    enterShares: "Number of shares",
    enterPrice: "Purchase price per share",
    selectCurrency: "Select currency",
    importCSV: "Import CSV",
    exportCSV: "Export CSV",
    deleteConfirm: "Are you sure you want to remove this holding?",
    noHoldings: "No holdings yet. Add some stocks to get started!",
    refreshing: "Refreshing prices...",
    lastUpdated: "Last updated",
    returnPercent: "Return",
    settings: "Settings",
    dataProvider: "Data Provider",
    yahooDesc: "Free, no key needed",
    alphaVantageDesc: "Extended fundamentals",
    apiKey: "API Key",
    enterApiKey: "Enter your Alpha Vantage API key",
    apiKeyRequired: "API key is required for Alpha Vantage",
    alphaVantageInfo: "Alpha Vantage provides extra data:",
    avFeature1: "Company fundamentals (P/E, EPS, dividends)",
    avFeature2: "Analyst ratings & target prices",
    avFeature3: "Sector, industry, and financial ratios",
    avRateLimit: "Free tier: 25 requests/day, 1 req/sec",
    saveSettings: "Save",
    sector: "Sector",
    industry: "Industry",
    peRatio: "P/E Ratio",
    pegRatio: "PEG Ratio",
    eps: "EPS",
    dividendYield: "Div. Yield",
    dividendPerShare: "Div/Share",
    beta: "Beta",
    profitMargin: "Profit Margin",
    returnOnEquity: "ROE",
    analystTarget: "Analyst Target",
    analystRatings: "Analyst Ratings",
    forwardPE: "Forward P/E",
    fiftyDayMA: "50D MA",
    twoHundredDayMA: "200D MA",
    fundamentals: "Fundamentals",
    loadingOverview: "Loading fundamentals...",
    buy: "Buy",
    hold: "Hold",
    sell: "Sell",
    providerBadge: "Provider",
    apiUsageTooltip: "Alpha Vantage API calls used today (free: 25/day)",
    yahooFallback: "Using Yahoo data (AV quota reached)",
    login: "Login",
    signup: "Sign up",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm password",
    signIn: "Sign in",
    signOut: "Logout",
    createAccount: "Create account",
    admin: "Admin",
    userManagement: "User management",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    updatePassword: "Update password",
    createdAt: "Created at",
    actions: "Actions",
    resetPassword: "Reset password",
    resetDataSeed: "Reset data to seed",
    resetDataEmpty: "Reset data empty",
    deleteUser: "Delete user",
    mustChangePassword: "Must change password",
    startWithSeedData: "Start with sample portfolio data",
    noAccountYet: "No account yet?",
    alreadyHaveAccount: "Already have an account?",
  },
  es: {
    appTitle: "StockTracker",
    portfolio: "Portafolio",
    totalValue: "Valor Total",
    totalCost: "Costo Total",
    totalGainLoss: "Ganancia / Pérdida",
    holdings: "Posiciones",
    stock: "Acción",
    ticker: "Símbolo",
    shares: "Cantidad",
    purchasePrice: "Precio de Compra",
    currentPrice: "Precio Actual",
    value: "Valor",
    gainLoss: "Gan./Pérd.",
    change: "Cambio",
    addStock: "Agregar Acción",
    removeStock: "Eliminar",
    search: "Buscar",
    searchPlaceholder: "Buscar por símbolo o nombre...",
    noResults: "No se encontraron resultados",
    loading: "Cargando...",
    error: "Error al cargar datos",
    currency: "Moneda",
    cancel: "Cancelar",
    confirm: "Confirmar",
    name: "Nombre",
    period1w: "1S",
    period1m: "1M",
    period3m: "3M",
    period6m: "6M",
    period1y: "1A",
    periodAll: "Todo",
    priceHistory: "Historial de Precios",
    dayChange: "Cambio del Día",
    week52High: "Máx. 52S",
    week52Low: "Mín. 52S",
    marketCap: "Cap. de Mercado",
    purchaseLine: "Precio de Compra",
    portfolioOverview: "Resumen del Portafolio",
    stockDetails: "Detalles de la Acción",
    close: "Cerrar",
    addToPortfolio: "Agregar al Portafolio",
    enterShares: "Número de acciones",
    enterPrice: "Precio de compra por acción",
    selectCurrency: "Seleccionar moneda",
    importCSV: "Importar CSV",
    exportCSV: "Exportar CSV",
    deleteConfirm: "¿Estás seguro de que deseas eliminar esta posición?",
    noHoldings: "Aún no tienes posiciones. ¡Agrega algunas acciones para empezar!",
    refreshing: "Actualizando precios...",
    lastUpdated: "Última actualización",
    returnPercent: "Retorno",
    settings: "Configuración",
    dataProvider: "Proveedor de Datos",
    yahooDesc: "Gratis, sin clave",
    alphaVantageDesc: "Datos fundamentales",
    apiKey: "Clave API",
    enterApiKey: "Ingresa tu clave de Alpha Vantage",
    apiKeyRequired: "Se requiere clave API para Alpha Vantage",
    alphaVantageInfo: "Alpha Vantage ofrece datos adicionales:",
    avFeature1: "Fundamentales (P/E, BPA, dividendos)",
    avFeature2: "Calificaciones de analistas y precios objetivo",
    avFeature3: "Sector, industria y ratios financieros",
    avRateLimit: "Plan gratuito: 25 solicitudes/día, 1 sol./seg",
    saveSettings: "Guardar",
    sector: "Sector",
    industry: "Industria",
    peRatio: "Ratio P/E",
    pegRatio: "Ratio PEG",
    eps: "BPA",
    dividendYield: "Rend. Div.",
    dividendPerShare: "Div/Acción",
    beta: "Beta",
    profitMargin: "Margen",
    returnOnEquity: "ROE",
    analystTarget: "Objetivo Analistas",
    analystRatings: "Calificaciones",
    forwardPE: "P/E Futuro",
    fiftyDayMA: "MM 50D",
    twoHundredDayMA: "MM 200D",
    fundamentals: "Fundamentales",
    loadingOverview: "Cargando fundamentales...",
    buy: "Comprar",
    hold: "Mantener",
    sell: "Vender",
    providerBadge: "Proveedor",
    apiUsageTooltip: "Llamadas API de Alpha Vantage usadas hoy (gratis: 25/día)",
    yahooFallback: "Usando datos de Yahoo (cuota AV agotada)",
    login: "Iniciar sesión",
    signup: "Registrarse",
    username: "Usuario",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    signIn: "Entrar",
    signOut: "Cerrar sesión",
    createAccount: "Crear cuenta",
    admin: "Admin",
    userManagement: "Gestión de usuarios",
    changePassword: "Cambiar contraseña",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    updatePassword: "Actualizar contraseña",
    createdAt: "Creado",
    actions: "Acciones",
    resetPassword: "Restablecer contraseña",
    resetDataSeed: "Reiniciar datos con semilla",
    resetDataEmpty: "Reiniciar datos vacíos",
    deleteUser: "Eliminar usuario",
    mustChangePassword: "Debe cambiar contraseña",
    startWithSeedData: "Empezar con datos de ejemplo",
    noAccountYet: "¿Sin cuenta?",
    alreadyHaveAccount: "¿Ya tienes cuenta?",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const res = await fetch("/api/user-settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const next = data.language as Language | undefined;
        if (next === "en" || next === "es") {
          setLanguageState(next);
        }
      } catch {
        // Keep default language if request fails.
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    }).catch(() => {
      // Keep optimistic UI state.
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
