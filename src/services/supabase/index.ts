/**
 * Supabase Services - Central Export
 *
 * Alle Supabase-bezogenen Services an einem Ort
 */

// Auth
export * from './auth';

// Products
export {
  getProducts,
  getProductById,
  getProductByGtinSerial,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  type ProductListItem,
} from './products';

// Product Batches
export {
  getBatches,
  getBatchById,
  getBatchByProductAndSerial,
  createBatch,
  updateBatch,
  deleteBatch,
  duplicateBatch,
  getBatchCount,
  getBatchStats,
  getAllBatches,
} from './batches';

// Documents
export {
  getDocuments,
  getDocument,
  getDocumentDownloadUrl,
  uploadDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  getSupplierDocuments,
  getDocumentContextCounts,
  uploadProductImage,
  type Document,
} from './documents';

// Document Folders
export {
  getDocumentFolders,
  createDocumentFolder,
  renameDocumentFolder,
  deleteDocumentFolder,
  moveDocumentToFolder,
  removeDocumentFromFolder,
} from './document-folders';

// Suppliers
export {
  getSuppliers,
  getPendingSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  getProductSuppliers,
  getProductSuppliersWithDetails,
  assignProductToSupplier,
  removeProductFromSupplier,
  updateSupplierProduct,
  getSupplierSpendAnalysis,
  getSupplierSpendForSupplier,
  type SupplierSpendSummary,
  type SupplierSpendDetail,
} from './suppliers';

// Supplier Portal
export {
  getSupplierInvitations,
  createSupplierInvitation,
  cancelSupplierInvitation,
  getSupplierInvitationByCode,
  publicSubmitSupplierRegistration,
  approveSupplier,
  rejectSupplier,
} from './supplier-portal';

// Supply Chain
export {
  getSupplyChain,
  getSupplyChainByTenant,
  createSupplyChainEntry,
  updateSupplyChainEntry,
  deleteSupplyChainEntry,
  reorderSupplyChain,
  getSupplyChainStats,
} from './supply-chain';

// Checklists
export {
  getChecklistProgress,
  updateChecklistProgress,
  getChecklistStats,
  bulkUpdateChecklistProgress,
  resetChecklistProgress,
} from './checklists';

// Master Data
export {
  getCategories,
  getCountries,
  getEURegulations,
  getNationalRegulations,
  getPictograms,
  getRecyclingCodes,
  getChecklistTemplates,
  getNews,
  invalidateCache,
  preloadMasterData,
  // Write operations
  createCountry,
  updateCountry,
  deleteCountry,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategoryToCategory,
  createPictogram,
  updatePictogram,
  deletePictogram,
  createRecyclingCode,
  updateRecyclingCode,
  deleteRecyclingCode,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  createEURegulation,
  updateEURegulation,
  deleteEURegulation,
} from './master-data';

// Tenants
export {
  getTenant,
  getCurrentTenant,
  updateTenant,
  updateCurrentTenant,
  updateTenantSettings,
  getTenantBranding,
  updateTenantBranding,
  getQRCodeSettings,
  updateQRCodeSettings,
  uploadBrandingAsset,
  getPublicTenantBranding,
  getPublicBrandingByProduct,
  getDPPDesignSettings,
  updateDPPDesignSettings,
  getPublicTenantDPPDesign,
  uploadHeroImage,
} from './tenants';

// Profiles
export {
  getProfile,
  getCurrentProfile,
  getProfiles,
  updateProfile,
  updateCurrentProfile,
  updateProfileRole,
  deactivateUser,
  reactivateUser,
  getAdminCount,
  inviteUser,
  removeUserFromTenant,
  type Profile,
} from './profiles';

// Product Components (Sets / Bundles)
export {
  getProductComponents,
  getProductComponentsPublic,
  addProductComponent,
  updateProductComponent,
  removeProductComponent,
  reorderProductComponents,
  getProductsContaining,
  getComponentCount,
} from './product-components';

// Product Images
export {
  getProductImages,
  uploadProductImages,
  deleteProductImage,
  reorderProductImages,
  setPrimaryImage,
  updateImageCaption,
} from './product-images';

// Product Packaging (multiple layers)
export {
  getProductPackaging,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging,
  reorderPackaging,
  duplicateProductPackaging,
} from './product-packaging';

// Invitations
export {
  getInvitations,
  createInvitation,
  cancelInvitation,
  resendInvitation,
  deleteInvitation,
} from './invitations';

// Activity Log
export {
  getActivityLog,
  logActivity,
} from './activity-log';

// Compliance
export {
  getComplianceOverview,
  getComplianceScores,
  type ComplianceOverview,
  type ComplianceScore,
  type ComplianceWarning,
} from './compliance';

// Visibility
export {
  getVisibilitySettings,
  saveVisibilitySettings,
  deleteProductVisibilitySettings,
  copyVisibilitySettingsToProduct,
  getPublicVisibilitySettings,
} from './visibility';

// Returns Hub - Returns
export {
  getReturns,
  getReturn,
  getReturnByNumber,
  createReturn,
  updateReturn,
  updateReturnStatus,
  approveReturn,
  rejectReturn,
  getReturnStats,
  publicCreateReturn,
  publicTrackReturn,
  publicGetTenantName,
  publicGetTenantBranding,
  publicUploadReturnPhoto,
  publicGetReturnItems,
  publicGetTenantProducts,
} from './returns';

// Returns Hub - Return Items
export {
  getReturnItems,
  addReturnItem,
  updateReturnItem,
  removeReturnItem,
} from './return-items';

// Returns Hub - Return Timeline
export {
  getReturnTimeline,
  addTimelineEntry,
} from './return-timeline';

// Returns Hub - Customers
export {
  getRhCustomers,
  getRhCustomer,
  createRhCustomer,
  updateRhCustomer,
  getRhCustomerReturns,
} from './rh-customers';

// Returns Hub - Tickets
export {
  getRhTickets,
  getRhTicket,
  createRhTicket,
  updateRhTicket,
  getRhTicketMessages,
  addRhTicketMessage,
  assignRhTicket,
  deleteRhTicket,
  getTicketStats,
  bulkUpdateTickets,
  getTicketActivity,
  logTicketActivity,
  mergeTickets,
} from './rh-tickets';

// Returns Hub - Ticket Attachments
export {
  uploadTicketAttachment,
  getTicketAttachmentUrl,
} from './rh-ticket-attachments';

// Returns Hub - Canned Responses
export {
  getCannedResponses,
  saveCannedResponses,
} from './rh-canned-responses';

// Returns Hub - Settings
export {
  getReturnsHubSettings,
  updateReturnsHubSettings,
  updatePortalDomainSettings,
  removePortalDomain,
  getReturnReasons,
  createReturnReason,
  updateReturnReason,
  deleteReturnReason,
  getPublicReturnReasons,
} from './rh-settings';

// Returns Hub - Workflows
export {
  getRhWorkflowRules,
  createRhWorkflowRule,
  updateRhWorkflowRule,
  deleteRhWorkflowRule,
  serializeWorkflowGraph,
  deserializeWorkflowGraph,
  buildGraphFromLegacy,
} from './rh-workflows';

// Returns Hub - Workflow Engine
export {
  executeWorkflowsForEvent,
  type WorkflowEventContext,
} from './rh-workflow-engine';

// Returns Hub - Notifications
export {
  getRhNotifications,
  createRhNotification,
  markRhNotificationSent,
} from './rh-notifications';

// Returns Hub - Email Templates
export {
  getRhEmailTemplates,
  getRhEmailTemplate,
  upsertRhEmailTemplate,
  seedDefaultEmailTemplates,
  resetRhEmailTemplateToDefault,
} from './rh-email-templates';

// Returns Hub - Notification Triggers
export {
  triggerEmailNotification,
  triggerPublicEmailNotification,
} from './rh-notification-trigger';

// Returns Hub - Photos
export {
  uploadReturnPhoto,
  getReturnPhotoUrl,
} from './return-photos';

// Domain Resolution
export {
  resolveTenantByDomain,
  isDomainAvailable,
  type DomainResolutionResult,
} from './domain-resolution';

// Vercel Domain Management
export {
  addDomainToVercel,
  removeDomainFromVercel,
} from './vercel-domain';

// AI Compliance Checks
export {
  saveComplianceCheck,
  getComplianceChecks,
  getComplianceCheck,
  deleteComplianceCheck,
} from './ai-compliance-checks';

// Billing
export {
  getTenantEntitlements,
  checkQuota,
  consumeCredits,
  refundCredits,
  hasModule,
  hasAnyReturnsHubModule,
  canUseFeature,
  getCreditBalance,
  getCreditTransactions,
  getInvoices,
  getUsageSummary,
  createCheckoutSession,
  createPortalSession,
  invalidateEntitlementCache,
} from './billing';

// Customer Portal
export {
  getCustomerContext,
  isCustomerUser,
  customerSignUp,
  customerSendMagicLink,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerReturns,
  getCustomerReturn,
  createCustomerReturn,
  getCustomerTickets,
  getCustomerTicket,
  createCustomerTicket,
  getCustomerTicketMessages,
  sendCustomerMessage,
  getCustomerDashboardStats,
  getCustomerReturnReasons,
  getCustomerPortalBranding,
  isPublicTicketCreationEnabled,
  createPublicProductTicket,
  createPublicReturnTicket,
} from './customer-portal';
