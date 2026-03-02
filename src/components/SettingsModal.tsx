"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import type { ApiProviderName } from "@/lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { provider, alphaVantageApiKey, setProvider, setAlphaVantageApiKey } = useSettings();
  const { t } = useI18n();

  const [localProvider, setLocalProvider] = useState<ApiProviderName>(provider);
  const [localApiKey, setLocalApiKey] = useState(alphaVantageApiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    if (localProvider === "alphavantage" && !localApiKey.trim()) return;
    setProvider(localProvider);
    setAlphaVantageApiKey(localApiKey.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-5">{t("settings")}</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">{t("dataProvider")}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLocalProvider("yahoo")}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  localProvider === "yahoo"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-white text-sm">Yahoo Finance</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("yahooDesc")}</p>
              </button>
              <button
                onClick={() => setLocalProvider("alphavantage")}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  localProvider === "alphavantage"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-white text-sm">Alpha Vantage</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("alphaVantageDesc")}</p>
              </button>
            </div>
          </div>

          {localProvider === "alphavantage" && (
            <div className="space-y-3 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">{t("apiKey")}</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder={t("enterApiKey")}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-300"
                  >
                    {showApiKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {!localApiKey.trim() && (
                <p className="text-xs text-amber-400">{t("apiKeyRequired")}</p>
              )}

              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-300 font-medium mb-1">{t("alphaVantageInfo")}</p>
                <ul className="text-xs text-slate-400 space-y-0.5 list-disc list-inside">
                  <li>{t("avFeature1")}</li>
                  <li>{t("avFeature2")}</li>
                  <li>{t("avFeature3")}</li>
                </ul>
                <p className="text-xs text-amber-400/80 mt-2">{t("avRateLimit")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={localProvider === "alphavantage" && !localApiKey.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("saveSettings")}
          </button>
        </div>
      </div>
    </div>
  );
}
