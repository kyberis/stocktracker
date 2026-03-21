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
  getAiTokenUsage,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
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
  listUsersWithStatsPaginated,
  getUserDetailData,
} from "./users";
export type { AdminUserWithStats } from "./users";

export type { DistinctHoldingTicker } from "./holdings";
export {
  listHoldings,
  addHolding,
  updateHolding,
  removeHolding,
  resetUserHoldings,
  rebuildHoldings,
  upsertHoldingsFromPositions,
  detachSnapTradeHoldings,
  deleteAllHoldings,
  countHoldings,
  listDistinctHoldingTickers,
  listUserIdsWithHoldings,
  listDistinctPortfolioIdsForUser,
  listDistinctHoldingTickersForUser,
  batchUpdateValueInEur,
  resolveStaleTickersViaFigi,
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
  mapTransactionsToPortfolio,
  mapTransactionsBySourceRef,
  removeTransactionPortfolioMappings,
} from "./transactions";

export {
  listCashEntries,
  addCashEntry,
  updateCashEntry,
  removeCashEntry,
  removeCashEntriesBySource,
  removeCashEntriesBySourceAndBrokers,
  getManualAssetCount,
} from "./cash";

export type { PlatformFeature, WhatsAppQuota, StripePriceKey, PromoBannerConfig, AdConfig, AdSlotConfig, XKeyName, UtmTaxonomyConfig, FeatureFlagOverride } from "./settings";
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
  isFeatureEnabledForUser,
  resolveAllFlagsForUser,
  getFeatureFlagOverrides,
  getFeatureFlagOverrideCounts,
  setFeatureFlagOverride,
  removeFeatureFlagOverride,
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
  getUtmTaxonomyConfig,
  setUtmTaxonomyConfig,
  resetUtmTaxonomyConfig,
  getAdConfig,
  setAdConfig,
  getXKeys,
  setXKey,
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

export type { ReferralStatus, Referral, ReferralStats, ReferralFunnelStats } from "./referrals";
export {
  generateReferralCode,
  ensureReferralCode,
  findUserByReferralCode,
  createReferral,
  acceptReferral,
  getReferralStats,
  getReferralFunnelStats,
} from "./referrals";

export type { FeedbackEntry, FeedbackType } from "./feedback";
export {
  createFeedback,
  getFeedbackByUser,
  getAllFeedback,
  getAllFeedbackPaginated,
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
  addBrokerPortfolioMapping,
  getBrokerPortfolioIds,
  getAllBrokerPortfolioMappings,
  removeBrokerPortfolioMappings,
  removeAllBrokerPortfolioMappings,
} from "./snaptrade-connections";

export type { DeviceInterestEntry } from "./device-interest";
export {
  addDeviceInterest,
  listDeviceInterest,
  listDeviceInterestPaginated,
  countDeviceInterest,
} from "./device-interest";

export type {
  BrokerIntegrationRequest,
  BrokerIntegrationRequestStatus,
  BrokerIntegrationRequestWithUser,
} from "./broker-integration-requests";
export {
  createBrokerIntegrationRequest,
  getBrokerIntegrationRequestById,
  listBrokerIntegrationRequestsForAdmin,
  updateBrokerIntegrationRequestStatus,
} from "./broker-integration-requests";

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

export type { ScheduledXPost, XPostStatus, CreateXPostInput } from "./x-posts";
export {
  getXPostById,
  listXPosts,
  listDueXPosts,
  createXPost,
  updateXPostStatus,
  updateXPost,
  deleteXPost,
} from "./x-posts";

export type { SnapTradeLogEntry, InsertSnapTradeLogParams, GetSnapTradeLogsOptions } from "./snaptrade-logs";
export {
  insertSnapTradeLog,
  getRecentSnapTradeLogs,
  pruneOldSnapTradeLogs,
} from "./snaptrade-logs";

export type { EmailTemplate, EmailSend } from "./email-templates";
export {
  listEmailTemplates,
  getEmailTemplate,
  getEmailTemplateBySlug,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  logEmailSend,
  listEmailSendsForUser,
  listEmailSends,
  getEmailSendByResendId,
  updateEmailSendStatus,
  getTemplateStats,
} from "./email-templates";

export type {
  RefundRequest,
  RefundRequestStatus,
  RefundRequestWithUser,
} from "./refund-requests";
export {
  createRefundRequest,
  getRefundRequestById,
  getActiveRefundRequestForUser,
  listRefundRequestsForAdmin,
  updateRefundRequestStatus,
} from "./refund-requests";

export type { UnsubscribeEvent } from "./unsubscribe-tokens";
export {
  generateUnsubscribeToken,
  consumeUnsubscribeToken,
  purgeExpiredUnsubscribeTokens,
  listUnsubscribeEvents,
} from "./unsubscribe-tokens";

export type { CachedPortfolioScore } from "./portfolio-scores";
export {
  getCachedPortfolioScore,
  getPortfolioScoreHistory,
  savePortfolioScore,
  deleteExpiredPortfolioScores,
} from "./portfolio-scores";
