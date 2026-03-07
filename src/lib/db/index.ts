// Barrel re-export — all consumers import from "@/lib/db" unchanged.

export type { UserRole, UserPlan, AuthProvider, DbUser, PublicUser, UserSettings } from "./helpers";

export {
  findUserByUsername,
  findUserByEmail,
  findUserByGoogleId,
  findUserByAppleId,
  findUserById,
  listUsers,
  createUser,
  updateUserPassword,
  updateUserProfile,
  updateUserRole,
  updateUserSubscription,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  resetAiUsageWindow,
  getAiUsage,
  incrementAiUsage,
  getDailyAiUsage,
  incrementDailyAiUsage,
  countProSubscribers,
  deleteUser,
  toPublicUser,
  setEmailVerified,
  getPortfolioReviewUsage,
  incrementPortfolioReviewUsage,
  linkGoogleAccount,
  unlinkGoogleAccount,
  linkAppleAccount,
  unlinkAppleAccount,
  generateWidgetToken,
  revokeWidgetToken,
  findUserByWidgetToken,
  generateDevicePasskey,
  revokeDevicePasskey,
  findUserByDevicePasskey,
} from "./users";

export {
  listHoldings,
  addHolding,
  updateHolding,
  removeHolding,
  resetUserHoldings,
  rebuildHoldings,
  deleteAllHoldings,
} from "./holdings";

export {
  listTransactions,
  addTransaction,
  addTransactionsBulk,
  deleteTransaction,
  deleteTransactionsForPosition,
  deleteAllTransactions,
  listTransactionSourceRefs,
} from "./transactions";

export {
  listCashEntries,
  addCashEntry,
  updateCashEntry,
  removeCashEntry,
} from "./cash";

export type { PlatformFeature } from "./settings";
export {
  getUserSettings,
  updateUserSettings,
  getGlobalAlphaVantageApiKey,
  setGlobalAlphaVantageApiKey,
  getGlobalOpenAIApiKey,
  setGlobalOpenAIApiKey,
  getPlatformSetting,
  setPlatformSetting,
  isFeatureEnabled,
  setFeatureEnabled,
  getGlobalResendApiKey,
  setGlobalResendApiKey,
  getAllPlatformSettings,
} from "./settings";

export {
  listAccounts,
  addAccount,
  findAccountByBroker,
  findOrCreateBrokerAccount,
  deleteAccount,
} from "./accounts";

export {
  listWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from "./watchlist";

export {
  listRebalanceTargets,
  setRebalanceTarget,
  deleteRebalanceTarget,
} from "./rebalance";

export type { FunnelStage, LandingAnalytics, AnalyticsSummary } from "./analytics";
export {
  trackEvent,
  trackLandingEvent,
  getAnalyticsSummary,
  purgeOldAnalyticsEvents,
} from "./analytics";

export type { FeedbackEntry } from "./feedback";
export {
  createFeedback,
  getFeedbackByUser,
  getAllFeedback,
  replyToFeedback,
} from "./feedback";

export {
  listAlerts,
  countActiveAlerts,
  createAlert,
  deleteAlert,
  toggleAlert,
  markAlertTriggered,
  listActiveAlertsForCron,
} from "./alerts";

export {
  checkAndIncrementRateLimit,
  recordRateLimitUsage,
  getRateLimitStats,
} from "./rate-limits";

export type { MetricsSnapshot } from "./metrics-snapshot";
export { getMetricsSnapshot } from "./metrics-snapshot";

export type { IbkrConnection } from "./ibkr-connections";
export {
  getIbkrConnection,
  getIbkrConnectionToken,
  saveIbkrConnection,
  updateIbkrLastSynced,
  deleteIbkrConnection,
} from "./ibkr-connections";

export type { DbPasskey, PublicPasskey } from "./passkeys";
export {
  getPasskeysByUserId,
  getPasskeyById,
  createPasskey,
  updatePasskeyCounter,
  renamePasskey,
  deletePasskey,
  countPasskeysByUserId,
  mapPasskey,
} from "./passkeys";
