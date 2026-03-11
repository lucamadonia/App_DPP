export interface TransparencyProductEntry {
  product_id: string;
  enabled: boolean;
}

export interface TransparencyPageConfig {
  id?: string;
  tenantId: string;
  pageTitle: string | null;
  pageDescription: string | null;
  heroImageUrl: string | null;
  products: TransparencyProductEntry[];
  updatedAt?: string;
}
