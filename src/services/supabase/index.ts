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
  uploadDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  uploadProductImage,
  type Document,
} from './documents';

// Suppliers
export {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  getProductSuppliers,
  getProductSuppliersWithDetails,
  assignProductToSupplier,
  removeProductFromSupplier,
} from './suppliers';

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

// Product Images
export {
  getProductImages,
  uploadProductImages,
  deleteProductImage,
  reorderProductImages,
  setPrimaryImage,
  updateImageCaption,
} from './product-images';

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
