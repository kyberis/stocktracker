// Barrel re-export — all consumers import from "@/lib/db" unchanged.

export type { UserRole, UserPlan, AuthProvider, DbUser, PublicUser, UserSettings, Portfolio, PortfolioCurrency } from "./helpers";
export { SUPPORTED_PORTFOLIO_CURRENCIES } from "./helpers";

export {
  listPortfolios,
  getDefaultPortfolio,
  createPortfolio,
  renamePortfolio,
  updatePortfolioCurrency,
  deletePortfolio,
  setDefaultPortfolio,
  countPortfolios,
  findPortfolioById,
  moveHoldingToPortfolio,
  ensureDefaultPortfolio,
  resolvePortfolioId,
} from "./portfolios";

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
  markDeviceLinked,
  markDeviceProRedeemed,
  updateDeviceTemplate,
  getDeviceTemplate,
  updateLastActive,
  getLastActive,
  completeOnboarding,
  listUsersWithStats,
  getUserDetailData,
} from "./users";
export type { AdminUserWithStats } from "./users";

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
  updateTransaction,
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
  removeCashEntriesBySource,
  getManualAssetCount,
} from "./cash";

export type { PlatformFeature, WhatsAppQuota, StripePriceKey, PromoBannerConfig, AdConfig, AdSlotConfig } from "./settings";
export {
  getUserSettings,
  updateUserSettings,
  markWhatsAppVerified,
  getWhatsAppQuota,
  incrementWhatsAppCounter,
  getGlobalAlphaVantageApiKey,
  getGlobalOpenAIApiKey,
  getPlatformSetting,
  setPlatformSetting,
  isFeatureEnabled,
  setFeatureEnabled,
  getGlobalResendApiKey,
  setGlobalResendApiKey,
  getStripePriceConfig,
  getAllStripePriceConfig,
  setStripePriceConfig,
  getAllPlatformSettings,
  getPromoBannerConfig,
  setPromoBannerConfig,
  getGaMeasurementId,
  setGaMeasurementId,
  getAdConfig,
  setAdConfig,
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

export type { FeedbackEntry, FeedbackType } from "./feedback";
export {
  createFeedback,
  getFeedbackByUser,
  getAllFeedback,
  replyToFeedback,
} from "./feedback";

export type { CronAlert, HoldingForAlert } from "./alerts";
export {
  listAlerts,
  listAlertedTickers,
  countActiveAlerts,
  createAlert,
  deleteAlert,
  toggleAlert,
  markAlertTriggered,
  updateLastNotified,
  listActiveAlertsForCron,
  getUserHoldingsForAlerts,
} from "./alerts";

export {
  checkAndIncrementRateLimit,
  recordRateLimitUsage,
  getRateLimitStats,
} from "./rate-limits";

export type { MetricsSnapshot } from "./metrics-snapshot";
export { getMetricsSnapshot } from "./metrics-snapshot";

export type { SnapTradeConnection, SnapTradeBrokerSync, PendingSnapTradeDeletion, ActiveSnapTradeUser } from "./snaptrade-connections";
export {
  getSnapTradeConnection,
  getSnapTradeConnectionSecret,
  saveSnapTradeConnection,
  updateSnapTradeLastSynced,
  deleteSnapTradeConnection,
  scheduleSnapTradeDeletion,
  clearSnapTradeDeletion,
  getSnapTradeConnectionsPendingDeletion,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
  deleteSnapTradeBrokerSync,
  setSnapTradeNeedsAttention,
  getSnapTradeNeedsAttention,
  listActiveSnapTradeConnections,
  setAllDisabledSince,
  clearAllDisabledSince,
  getConnectionsAllDisabledOver24h,
} from "./snaptrade-connections";

export type { DeviceInterestEntry } from "./device-interest";
export {
  addDeviceInterest,
  listDeviceInterest,
  countDeviceInterest,
} from "./device-interest";

export {
  savePushSubscription,
  deletePushSubscription,
  listPushSubscriptions,
} from "./push-subscriptions";

export {
  createDeviceNotification,
  listUnreadDeviceNotifications,
  markDeviceNotificationsRead,
  purgeOldDeviceNotifications,
} from "./device-notifications";

export type { CreateNotificationInput } from "./notifications";
export {
  createNotification,
  broadcastNotification,
  listNotifications,
  countUnreadNotifications,
  markNotificationsRead,
  purgeOldNotifications,
  listBroadcastHistory,
} from "./notifications";

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

export {
  listGoals,
  listGoalsForPortfolio,
  getGoalForPortfolio,
  getGoalById,
  createGoal,
  updateGoal,
  upsertGoal,
  deleteGoal,
} from "./goals";
export type { GoalInput } from "./goals";

export type { SupportChatStatus, ChatMessage, SupportChatConversation, SupportChatListItem, ListSupportChatOptions } from "./support-chat";
export {
  createSupportChatConversation,
  appendSupportChatMessages,
  updateSupportChatStatus,
  getSupportChatConversation,
  listSupportChatConversations,
  purgeSupportChatConversations,
} from "./support-chat";

export type { CalendarEvent } from "./calendar-events";
export {
  upsertCalendarEvent,
  upsertCalendarEventsBatch,
  deleteStaleEvents,
  listCalendarEvents,
  listCalendarEventsByType,
} from "./calendar-events";

export type { ScreenerCacheRow, ScreenerFilters, ScreenerResponse } from "./screener";
export {
  queryScreener,
  upsertScreenerCache,
  getScreenerCacheCount,
  getScreenerDistinctSectors,
  getScreenerDistinctCountries,
  getScreenerDistinctExchanges,
} from "./screener";
