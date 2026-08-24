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
  mergePortfolioInto,
  consolidateUserToSinglePortfolio,
  ensureDefaultPortfolio,
  resolvePortfolioId,
  healEmptyPortfolioIds,
} from "./portfolios";
export type { MergePortfolioResult, ConsolidateSinglePortfolioResult } from "./portfolios";

export {
  findUserByUsername,
  findUserByEmail,
  findUserByGoogleId,
  findUserByAppleId,
  findUserById,
  findUserIdByIdpSub,
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
  listWidgetTokens,
  getLatestValidWidgetToken,
  userHasActiveWidgetToken,
  widgetTokenPrefix,
  generateDevicePasskey,
  revokeDevicePasskey,
  findUserByDevicePasskey,
  checkTrialToken,
  checkMembershipGrantToken,
  setPendingMembershipGrant,
  applyPendingMembershipGrant,
  computeMembershipGrantExpiry,
  clearMembershipGrantFields,
  MEMBERSHIP_GRANT_MIN_DAYS,
  MEMBERSHIP_GRANT_MAX_DAYS,
  markDeviceLinked,
  markDeviceProRedeemed,
  updateDeviceTemplate,
  getDeviceTemplate,
  updateLastActive,
  getLastActive,
  countVerifiedUsers,
  completeOnboarding,
  listUsersWithStats,
  listUsersWithStatsPaginated,
  getUserDetailData,
  getLatestCreatedUser,
} from "./users";
export type { AdminUserWithStats, ProdOpsLatestCreatedUser } from "./users";
export type { MembershipGrantTokenStatus } from "./users";

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
  listSnapTradeTickersForBroker,
  deleteAllHoldings,
  countHoldings,
  listDistinctHoldingTickers,
  listUserIdsWithHoldings,
  listRecommendationCronCandidates,
  listDistinctPortfolioIdsForUser,
  listDistinctHoldingTickersForUser,
  batchUpdateValueInEur,
  resolveStaleTickersViaFigi,
} from "./holdings";

export {
  getPortfolioAnomalyById,
  findOpenPortfolioAnomalyByFingerprint,
  listPortfolioAnomalies,
  countOpenPortfolioAnomaliesForUser,
  createPortfolioAnomaly,
  updatePortfolioAnomalyFindings,
  markPortfolioAnomalyNotified,
  setPortfolioAnomalyStatus,
} from "./portfolio-anomalies";

export {
  archivePortfolioLedgerBeforeReset,
  listRecentPortfolioResetArchives,
  listUserIdsWithEmptyLedgerSnapshotHistory,
} from "./portfolio-reset-archives";
export type { PortfolioResetArchive } from "./portfolio-reset-archives";

export {
  listDueUserReturnWatches,
  claimUserReturnWatch,
  claimDueWatchForUser,
  ensureUserReturnWatch,
} from "./user-return-watches";
export type { UserReturnWatch } from "./user-return-watches";

export {
  listTransactions,
  addTransaction,
  addTransactionsBulk,
  linkUnlinkedTransactionsToHoldings,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsForPosition,
  deleteAllTransactions,
  listTransactionSourceRefs,
  listTransactionTradeFingerprints,
  mapTransactionsToPortfolio,
  mapTransactionsBySourceRef,
  removeTransactionPortfolioMappings,
  listDistinctBuyTickers,
} from "./transactions";

export {
  listHoldingsRaw,
  listTransactionsRaw,
  listTransactionPortfolioMapRaw,
  listCashEntriesRaw,
  listCryptoHoldingsRaw,
} from "./admin-raw-export";

export {
  listCashEntries,
  addCashEntry,
  updateCashEntry,
  removeCashEntry,
  removeCashEntriesBySource,
  removeCashEntriesBySourceAndBrokers,
  moveCashToPortfolio,
  getManualAssetCount,
} from "./cash";

export type {
  PlatformFeature,
  TelegramQuota,
  StripePriceKey,
  PromoBannerConfig,
  AdConfig,
  AdSlotConfig,
  XKeyName,
  UtmTaxonomyConfig,
  FeatureFlagOverride,
  DigestSenderDomain,
  ScreeningCircuitProvider,
  ScreeningProviderCircuit,
} from "./settings";
export {
  getUserSettings,
  updateUserSettings,
  setTelegramLinkToken,
  completeTelegramLink,
  disconnectTelegram,
  getTelegramQuota,
  incrementTelegramCounter,
  getGlobalAlphaVantageApiKey,
  getGlobalFmpApiKey,
  hasPremiumMarketDataConfigured,
  getGlobalOpenAIApiKey,
  getPlatformSetting,
  setPlatformSetting,
  getScreeningProviderCircuit,
  setScreeningProviderCircuit,
  EMPTY_SCREENING_PROVIDER_CIRCUIT,
  ALL_PLATFORM_FEATURES,
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
  getGoogleAdsId,
  setGoogleAdsId,
  getUtmTaxonomyConfig,
  setUtmTaxonomyConfig,
  resetUtmTaxonomyConfig,
  getAdConfig,
  setAdConfig,
  getXKeys,
  setXKey,
  getAiModelConfig,
  setAiModelConfig,
  getAiModelForFlow,
  resolveAiModelForUserPlan,
  getDigestSenderDomains,
  setDigestSenderDomains,
  buildDigestGmailQuery,
  getProdOpsConfig,
  setProdOpsConfig,
  getProdOpsSharedSecret,
  getProdOpsSharedSecretMeta,
  setProdOpsSharedSecret,
  createProdOpsRecipientLink,
  completeProdOpsRecipientLink,
  redeemProdOpsRecipientLink,
  unlinkProdOpsRecipient,
  PRODOPS_EVENT_TYPES,
} from "./settings";

export type { CreateProdOpsEventInput } from "./ops-events";
export {
  getProdOpsEventById,
  getProdOpsEventByDedupeKey,
  createProdOpsEvent,
  listProdOpsEventsReady,
  markProdOpsEventSent,
  scheduleProdOpsEventRetry,
  markProdOpsEventDropped,
  listRecentProdOpsEvents,
} from "./ops-events";

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
  getLatestAnalyticsInteraction,
} from "./analytics";
export type { ProdOpsLatestAnalyticsInteraction } from "./analytics";

export type {
  Experiment,
  ExperimentAssignment,
  ExperimentAssignmentOverview,
  ExperimentAssignmentOverviewVariant,
  ExperimentStatus,
  ExperimentStats,
  ExperimentVariant,
  ExperimentVariantStats,
} from "./experiments";
export {
  listExperiments,
  listExperimentAssignmentOverview,
  getExperimentById,
  getExperimentByKey,
  createExperiment,
  updateExperiment,
  setExperimentStatus,
  resetExperimentAssignments,
  resolveExperimentVariant,
  getExperimentVariant,
  getExperimentStats,
  getAssignment,
  controlVariantKey,
  hashToBucket,
  pickVariant,
  validateVariants,
  validateMetrics,
} from "./experiments";

export type {
  ChannelSpendCap,
  ChannelSpendEntry,
  ChannelSpendSummary,
  ChannelPerformance,
  AcquisitionDecisionMemo,
} from "./channel-spend";
export {
  createSpendCap,
  listSpendCaps,
  addSpendEntry,
  listSpendEntries,
  getSpendSummaryByChannel,
  getChannelPerformance,
  createDecisionMemo,
  listDecisionMemos,
} from "./channel-spend";

export type {
  McpAnalyticsSummary,
  McpUserAnalyticsRow,
  McpAnalyticsEventType,
  McpScopeBreakdown,
  McpResourceBreakdown,
  McpRecentAccessRow,
  McpToolBreakdown,
} from "./mcp-analytics";
export { trackMcpAnalyticsEvent, getMcpAnalyticsSummary } from "./mcp-analytics";

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
  getFeedbackById,
  getAllFeedback,
  getAllFeedbackPaginated,
  getLatestFeedbackEntries,
  replyToFeedback,
} from "./feedback";
export type { ProdOpsFeedbackPreview } from "./feedback";

export type {
  CronAlert,
  HoldingForAlert,
  AlertDispatchStatus,
  InsertAlertDispatchLogParams,
  AlertDispatchLogRow,
  AlertDispatchSummary,
} from "./alerts";
export {
  listAlerts,
  listAlertedTickers,
  countActiveAlerts,
  createAlert,
  deleteAlert,
  toggleAlert,
  markAlertTriggered,
  claimAlertForOneShotDispatch,
  claimPortfolioWideTickerNotify,
  hasRecentFiredEmailDispatch,
  updateLastNotified,
  listActiveAlertsForCron,
  getUserHoldingsForAlerts,
  insertAlertDispatchLog,
  getAlertDispatchSummary,
  listAlertDispatchLogs,
} from "./alerts";

export type { UpsertInvestmentStrategyInput } from "./investment-strategies";
export {
  listInvestmentStrategies,
  getInvestmentStrategyByTickerExchange,
  upsertInvestmentStrategy,
  deleteInvestmentStrategy,
} from "./investment-strategies";

export {
  checkAndIncrementRateLimit,
  checkAndIncrementBurstCooldown,
  recordRateLimitUsage,
  getRateLimitStats,
} from "./rate-limits";

export type { OfficeMessageRow } from "./agent-office";
export {
  listActiveAgentMissions,
  getAgentMissionById,
  createAgentMission,
  updateAgentMissionSteps,
  listOfficeMessages,
  appendOfficeMessage,
  clearOfficeSession,
} from "./agent-office";

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
  ensureSnapTradeBrokerSyncPlaceholder,
  deleteSnapTradeBrokerSync,
  setSnapTradeNeedsAttention,
  getSnapTradeNeedsAttention,
  listActiveSnapTradeConnections,
  setAllDisabledSince,
  clearAllDisabledSince,
  claimFirstSyncNotification,
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
  BrokerIntegrationRequestGroup,
} from "./broker-integration-requests";
export {
  createBrokerIntegrationRequest,
  getBrokerIntegrationRequestById,
  listBrokerIntegrationRequestsForAdmin,
  listBrokerIntegrationRequestGroupsForAdmin,
  updateBrokerIntegrationRequestStatus,
  normalizeBrokerName,
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
  getScreenerCacheBySymbols,
  getScreenerCacheCount,
  listHotScreenerSymbols,
  listStaleOrMissingScreenerSymbols,
  getScreenerDistinctSectors,
  getScreenerDistinctCountries,
  getScreenerDistinctExchanges,
  getScreenerDistinctIndustries,
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
  hasEmailBeenSent,
  listEmailSendsForUser,
  listEmailSends,
  listEmailSendsByTemplateId,
  getEmailSendByResendId,
  updateEmailSendStatus,
  getTemplateStats,
  listEmailTemplatesBySlugs,
  getTemplateSendAggregatesBySlugs,
} from "./email-templates";
export type { TemplateSendWindowStats } from "./email-templates";

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

export type { MoatReport, MoatReportSummary } from "./moat-reports";
export {
  normalizeMoatReportTags,
  saveMoatReport,
  updateMoatReportAiNarrative,
  updateMoatReportTags,
  getMoatReport,
  listMoatReports,
  listDistinctMoatReportTags,
  deleteMoatReport,
} from "./moat-reports";

export type { MoatCacheEntry, MoatCacheRow, MoatScreenerFilters, MoatScreenerResponse } from "./moat-cache";
export {
  upsertMoatCache,
  getMoatCache,
  getMoatCacheForSymbols,
  queryMoatCache,
  getMoatCacheMeta,
  getStaleMoatSymbols,
  getMoatCacheStats,
} from "./moat-cache";

export type { MoatAutoTicker } from "./moat-auto-tickers";
export {
  listMoatAutoTickers,
  addMoatAutoTickers,
  removeMoatAutoTicker,
} from "./moat-auto-tickers";

export type {
  FundamentalsCacheType,
  FundamentalsCacheProvider,
  FundamentalsCacheRow,
} from "./fundamentals-cache";
export {
  getFundamentalsCache,
  upsertFundamentalsCache,
  deleteFundamentalsCache,
} from "./fundamentals-cache";

export {
  normalizePortfolioNewsSymbol,
  ingestNewsArticles,
  listPortfolioNewsForTickers,
  listSymbolsNeedingProviderFetch,
  touchSymbolFetchMeta,
} from "./portfolio-news";

export type { AidNewsCacheRow } from "@/lib/types";
export {
  getAidNewsCacheEntry,
  listAidNewsCacheForUser,
  upsertAidNewsCache,
  parseAidDigestSummary,
} from "./aid-news-cache";

export type { CompanyAnalysisCacheRow, CachedCompanyAnalysisTicker } from "./company-analysis-cache";
export {
  companyAnalysisReportCacheKey,
  companyAnalysisNarrativeCacheKey,
  getCompanyAnalysisDbCache,
  upsertCompanyAnalysisDbCache,
  deleteCompanyAnalysisDbCache,
  deleteCompanyAnalysisDbCacheForTicker,
  listCachedCompanyAnalysisTickers,
} from "./company-analysis-cache";

export {
  getLastAidVisitAt,
  setLastAidVisitAt,
  getAidWarrenNudgeDate,
  setAidWarrenNudgeDate,
} from "./aid-user-state";

export type { AidSocialPostRow } from "@/lib/types";
export {
  getAidSocialPost,
  listAidSocialPosts,
  listAidSocialPostsSince,
  upsertAidSocialPost,
  parseFinPulseSummary,
} from "./aid-social-posts";

export type { AiLogEntry, AiLogWithUser, InsertAiLogParams, GetAiLogsOptions } from "./ai-logs";
export {
  insertAiLog,
  updateAiLogResponse,
  updateAiLogError,
  getAiLogs,
} from "./ai-logs";

export type { ChecklistStep, ChecklistState } from "./checklist";
export {
  ALL_CHECKLIST_STEPS,
  getChecklistState,
  completeChecklistStep,
  dismissChecklist,
  autoDetectCompletedSteps,
} from "./checklist";

export type { SatisfactionSurvey, SatisfactionStatus, SatisfactionStats, SatisfactionEligibility } from "./satisfaction";
export {
  createOrUpdateDraft,
  getSurveyByUser,
  submitSurvey,
  dismissSurvey,
  checkEligibility,
  incrementInteractionCount,
  getAllSurveysPaginated,
} from "./satisfaction";

export type { WeeklyDigestRow, WeeklyDigestStats } from "./weekly-digest";
export {
  getLatestDigest,
  insertDigest,
  getDigestEligibleUsers,
  hasDigestForWeek,
  getDigestBaselineSnapshot,
} from "./weekly-digest";

export type { MarketDigest, MarketDigestListItem, MarketDigestWithTranslations, DigestTranslation, DigestStatus, MarketDigestSource } from "./market-digests";
export {
  digestExistsByGmailId,
  digestSourceExistsByGmailId,
  getDigestByDate,
  addDigestSource,
  getDigestSources,
  updateDigestContent,
  insertMarketDigest,
  listMarketDigests,
  getMarketDigestWithTranslations,
  updateTranslation,
  publishDigest,
  archiveDigest,
  markDigestEmailSent,
  getActiveUserLanguages,
  getDigestTranslation,
  getUsersForDigestEmail,
  markDigestXScheduled,
} from "./market-digests";

export type {
  PrivateChatRoom,
  PrivateChatRoomKind,
  PrivateChatMembershipStatus,
  PrivateChatRoomListItem,
  PrivateChatMessage,
  PrivateChatMessageType,
  PrivateChatParticipant,
  UserChatRoomSummary,
  ChatReaction,
  FindOrCreateDirectRoomResult,
} from "./private-chat";
export {
  createPrivateChatRoom,
  getPrivateChatRoom,
  deactivatePrivateChatRoom,
  listPrivateChatRooms,
  addPrivateChatMessage,
  editPrivateChatMessage,
  getPrivateChatMessages,
  joinPrivateChatRoom,
  updateTypingStatus,
  updateLastSeen,
  getPrivateChatParticipants,
  getParticipantMembership,
  acceptSocialChatInvite,
  declineSocialChatInvite,
  removeParticipantFromAdminLinkRoom,
  listUserChatRooms,
  clearChatForUser,
  purgeExpiredPrivateChatMessages,
  toggleReaction,
  getReactionsForRoom,
  findOrCreateDirectRoom,
} from "./private-chat";

export type { SocialVisibility, SocialProfile, PublicProfileData } from "./social-profiles";
export {
  isValidSlug,
  getSocialProfile,
  getPublicProfileBySlug,
  updateSocialProfile,
  isSlugAvailable,
} from "./social-profiles";

export type { PostType, PostVisibility, SocialPost, SocialPostWithAuthor, SocialPostImage, SocialPostComment } from "./social-posts";
export {
  createPost,
  updatePost,
  deletePost,
  getPostById,
  listPostsByUser,
  getFeed,
  addPostImage,
  listPostImages,
  addComment,
  updateComment,
  deleteComment,
  listComments,
  getCommentCount,
  getCommentCountsForPosts,
  isPostAuthorAllowingComments,
} from "./social-posts";

export type { ConnectionStatus, UserConnection, ConnectionWithUser } from "./social-connections";
export {
  getConnectionById,
  getConnectionBetween,
  requestConnection,
  acceptConnection,
  rejectConnection,
  withdrawConnection,
  removeConnection,
  blockUser,
  unblockUser,
  isConnected,
  listConnections,
  countConnections,
  searchPeople,
} from "./social-connections";

export {
  fanOutPost,
  removeFanOut,
  refanOutPost,
  backfillFeedForConnection,
  cleanupFeedForDisconnection,
  getFeedFromItems,
  seedFeedItems,
} from "./feed";

export type {
  TelegramLinkToken,
  TelegramChatLink,
  TelegramProposalStatus,
  TelegramProposalRecord,
  TelegramMessageRole,
  TelegramMessageRow,
} from "./telegram";
export {
  createLinkToken,
  consumeLinkToken,
  purgeExpiredLinkTokens,
  linkChat,
  unlinkChat,
  unlinkChatByUser,
  getChatLinkByChatId,
  getChatLinkByUserId,
  touchChatLastSeen,
  setChatActivePortfolio,
  setChatLanguage,
  savePendingProposal,
  getPendingProposal,
  updateProposalStatus,
  purgeExpiredProposals,
  appendChatMessage,
  loadChatMessages,
  clearChatHistory,
} from "./telegram";

export type {
  RecommendationStatus,
  PortfolioRecommendationStateRow,
  PortfolioRecommendationCacheRow,
} from "./portfolio-recommendations";
export {
  listRecommendationStates,
  upsertRecommendationState,
  clearSkippedRecommendationStates,
  clearAllRecommendationStates,
  getRecommendationCache,
  upsertRecommendationCache,
  currentRecommendationWeekKey,
  getManualRefreshAvailability,
  MANUAL_RECOMMENDATION_COOLDOWN_MS,
} from "./portfolio-recommendations";

export type {
  ScreeningRunStatus as ScreeningRunRowStatus,
  ScreeningRunIntent,
  ScreeningRunRow,
  ScreeningAgentOutputRow,
  CreateScreeningRunParams,
  InsertScreeningAgentOutputParams,
  ScreeningRunCostAdminRow,
  ScreeningAnalyzeAdminUserRow,
  ScreeningAnalyzeAdminRunRow,
} from "./screening";
export {
  createScreeningRun,
  updateScreeningRunStatus,
  updateScreeningRunCost,
  getScreeningRun,
  getScreeningRunUnscoped,
  listScreeningRunsByUser,
  listScreeningRunsByCostAdmin,
  listScreeningAnalyzeAdmin,
  insertScreeningAgentOutput,
  listScreeningAgentOutputsByUser,
  listScreeningAgentOutputsByRun,
  listScreeningAgentOutputsByRunAndKind,
  getLatestScreeningAgentOutputUnscoped,
  linkPendingAgentOutputToRun,
} from "./screening";

export {
  getScreeningResearchCache,
  hasFreshScreeningResearchCache,
  upsertScreeningResearchCache,
  screeningResearchCacheKey,
  SCREENING_RESEARCH_SCHEMA_VERSION,
  SCREENING_RESEARCH_TTL_MS,
} from "./screening-research-cache";
export type { ScreeningResearchCacheRow } from "./screening-research-cache";

export type {
  ScreeningStepStatus,
  ScreeningStepRow,
  ScreeningRunEventRow,
  InsertStepInput,
  AppendEventParams,
} from "./screening-steps";
export {
  MAX_STEP_ATTEMPTS,
  MAX_RUNNING_PER_RUN,
  insertSteps,
  leasePendingStep,
  completeStep,
  failStep,
  heartbeatStepLease,
  forceExpireRunningLeasesForRun,
  recoverExpiredLeases,
  listStepsForRun,
  getStepById,
  findStepByAgentKind,
  updateStepDependsOn,
  countPendingStepsForRun,
  countPendingSteps,
  appendEvent,
  listEventsForRun,
} from "./screening-steps";

export type {
  QaVerdict,
  QaIssueType,
  QaIssueRow,
  InsertQaIssueInput,
  InsertQaRoundInput,
} from "./screening-qa";
export {
  insertQaRoundIssues,
  listQaRoundsByRun,
  countQaRoundsForRun,
  getLatestQaVerdictForRun,
  getLatestQaIssuesForAgentTicker,
} from "./screening-qa";
