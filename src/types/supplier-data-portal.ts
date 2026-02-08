export type SupplierDataRequestStatus = 'pending' | 'in_progress' | 'submitted' | 'expired' | 'cancelled';

export interface SupplierDataRequest {
  id: string;
  tenantId: string;
  supplierId?: string | null;
  productId: string | null;
  productIds: string[];
  accessCode: string;
  passwordHash: string;
  allowedProductFields: string[];
  allowedBatchFields: string[];
  allowBatchCreate: boolean;
  allowBatchEdit: boolean;
  status: SupplierDataRequestStatus;
  message?: string | null;
  expiresAt: string;
  submittedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields (from list queries)
  productName?: string;
  productNames?: string[];
  supplierName?: string;
}

export interface CreateSupplierDataRequestParams {
  productIds: string[];
  supplierId?: string | null;
  passwordHash: string;
  allowedProductFields: string[];
  allowedBatchFields: string[];
  allowBatchCreate: boolean;
  allowBatchEdit: boolean;
  message?: string;
  expiresAt?: string;
}

export interface PublicSupplierDataRequestResult {
  dataRequest: SupplierDataRequest;
  tenant: { id: string; name: string; slug: string };
  products: Array<{ id: string; name: string }>;
  branding: { logoUrl?: string; primaryColor?: string };
}

export interface FieldDefinition {
  key: string;
  labelKey: string; // i18n translation key
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'jsonb-array' | 'jsonb-object' | 'textarea';
  category: string;
}

export interface FieldGroup {
  category: string;
  labelKey: string; // i18n translation key for category heading
  fields: FieldDefinition[];
}
