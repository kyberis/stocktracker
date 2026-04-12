"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";

const PortfolioPickerModal = dynamic(() => import("@/components/PortfolioPickerModal"), { ssr: false });
const AddStockModal = dynamic(() => import("@/components/AddStockModal"), { ssr: false });
const AddCryptoModal = dynamic(() => import("@/components/AddCryptoModal"), { ssr: false });
const AddManualAssetModal = dynamic(() => import("@/components/AddManualAssetModal"), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });
const ResetPortfolioModal = dynamic(() => import("@/components/ResetPortfolioModal"), { ssr: false });

export type PortfolioCommandContextValue = {
  gatedAdd: (action: "stock" | "crypto" | "asset") => void;
  openSettings: () => void;
  openResetPortfolio: () => void;
};

const PortfolioCommandContext = createContext<PortfolioCommandContextValue | null>(null);

export function usePortfolioCommand(): PortfolioCommandContextValue {
  const v = useContext(PortfolioCommandContext);
  if (!v) {
    throw new Error("usePortfolioCommand must be used within PortfolioCommandProvider");
  }
  return v;
}

/** Optional hook when the provider is not mounted (e.g. tests). */
export function usePortfolioCommandOptional(): PortfolioCommandContextValue | null {
  return useContext(PortfolioCommandContext);
}

export function PortfolioCommandProvider({ children }: { children: ReactNode }) {
  const { portfolios, activePortfolioId } = usePortfolio();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCrypto, setShowAddCrypto] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<"stock" | "crypto" | "asset" | null>(null);

  const needsPortfolioPick = !activePortfolioId && portfolios.length > 1;

  const gatedAdd = useCallback(
    (action: "stock" | "crypto" | "asset") => {
      if (needsPortfolioPick) {
        setPendingAction(action);
        setShowPortfolioPicker(true);
      } else if (action === "stock") {
        setShowAddModal(true);
      } else if (action === "crypto") {
        setShowAddCrypto(true);
      } else {
        setShowAddAsset(true);
      }
    },
    [needsPortfolioPick],
  );

  const openSettings = useCallback(() => setShowSettings(true), []);
  const openResetPortfolio = useCallback(() => setShowReset(true), []);

  const value = useMemo(
    () => ({ gatedAdd, openSettings, openResetPortfolio }),
    [gatedAdd, openSettings, openResetPortfolio],
  );

  return (
    <PortfolioCommandContext.Provider value={value}>
      {children}
      <PortfolioPickerModal
        isOpen={showPortfolioPicker}
        onClose={() => {
          setShowPortfolioPicker(false);
          setPendingAction(null);
        }}
        onSelect={() => {
          setShowPortfolioPicker(false);
          if (pendingAction === "stock") setShowAddModal(true);
          else if (pendingAction === "crypto") setShowAddCrypto(true);
          else if (pendingAction === "asset") setShowAddAsset(true);
          setPendingAction(null);
        }}
      />
      {showAddModal && <AddStockModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />}
      {showAddCrypto && <AddCryptoModal isOpen={showAddCrypto} onClose={() => setShowAddCrypto(false)} />}
      {showAddAsset && <AddManualAssetModal isOpen={showAddAsset} onClose={() => setShowAddAsset(false)} />}
      {showSettings && <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />}
      {showReset && <ResetPortfolioModal isOpen={showReset} onClose={() => setShowReset(false)} />}
    </PortfolioCommandContext.Provider>
  );
}
