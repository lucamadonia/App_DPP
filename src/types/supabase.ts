/**
 * Supabase Database Types
 *
 * Auto-generierbar via: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 * Diese Datei definiert das komplette Schema für Type-Safety
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ============================================
      // MASTER-DATEN (ohne RLS)
      // ============================================

      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          description: string | null;
          icon: string | null;
          regulations: string[] | null;
          sort_order: number | null;
          subcategories: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          icon?: string | null;
          regulations?: string[] | null;
          sort_order?: number | null;
          subcategories?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          name?: string;
          description?: string | null;
          icon?: string | null;
          regulations?: string[] | null;
          sort_order?: number | null;
          subcategories?: string[] | null;
          created_at?: string;
        };
      };

      countries: {
        Row: {
          id: string;
          code: string;
          name: string;
          flag: string;
          regulations: number;
          checklists: number;
          authorities: string[];
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          flag: string;
          regulations?: number;
          checklists?: number;
          authorities?: string[];
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          flag?: string;
          regulations?: number;
          checklists?: number;
          authorities?: string[];
          description?: string;
          created_at?: string;
        };
      };

      eu_regulations: {
        Row: {
          id: string;
          name: string;
          full_name: string;
          description: string;
          category: 'environment' | 'chemicals' | 'recycling' | 'safety' | 'energy';
          status: 'active' | 'upcoming';
          effective_date: string;
          application_date: string;
          key_requirements: string[];
          affected_products: string[];
          dpp_deadlines: Json;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          full_name: string;
          description: string;
          category: 'environment' | 'chemicals' | 'recycling' | 'safety' | 'energy';
          status?: 'active' | 'upcoming';
          effective_date: string;
          application_date: string;
          key_requirements?: string[];
          affected_products?: string[];
          dpp_deadlines?: Json;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          full_name?: string;
          description?: string;
          category?: 'environment' | 'chemicals' | 'recycling' | 'safety' | 'energy';
          status?: 'active' | 'upcoming';
          effective_date?: string;
          application_date?: string;
          key_requirements?: string[];
          affected_products?: string[];
          dpp_deadlines?: Json;
          link?: string | null;
          created_at?: string;
        };
      };

      national_regulations: {
        Row: {
          id: string;
          country_code: string;
          name: string;
          description: string;
          category: string;
          mandatory: boolean;
          effective_date: string;
          authority: string;
          penalties: string;
          products: string[];
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          country_code: string;
          name: string;
          description: string;
          category: string;
          mandatory?: boolean;
          effective_date: string;
          authority: string;
          penalties?: string;
          products?: string[];
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          country_code?: string;
          name?: string;
          description?: string;
          category?: string;
          mandatory?: boolean;
          effective_date?: string;
          authority?: string;
          penalties?: string;
          products?: string[];
          link?: string | null;
          created_at?: string;
        };
      };

      pictograms: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          description: string;
          mandatory: boolean;
          countries: string[];
          category: 'safety' | 'recycling' | 'chemicals' | 'energy' | 'durability';
          dimensions: string;
          placement: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          description: string;
          mandatory?: boolean;
          countries?: string[];
          category: 'safety' | 'recycling' | 'chemicals' | 'energy' | 'durability';
          dimensions?: string;
          placement?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string;
          description?: string;
          mandatory?: boolean;
          countries?: string[];
          category?: 'safety' | 'recycling' | 'chemicals' | 'energy' | 'durability';
          dimensions?: string;
          placement?: string;
          created_at?: string;
        };
      };

      recycling_codes: {
        Row: {
          id: string;
          code: string;
          symbol: string;
          name: string;
          full_name: string;
          examples: string;
          recyclable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          symbol: string;
          name: string;
          full_name: string;
          examples?: string;
          recyclable?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          symbol?: string;
          name?: string;
          full_name?: string;
          examples?: string;
          recyclable?: boolean;
          created_at?: string;
        };
      };

      checklist_templates: {
        Row: {
          id: string;
          country_code: string;
          category_key: string;
          title: string;
          description: string;
          detailed_description: string | null;
          mandatory: boolean;
          category: string;
          subcategory: string | null;
          document_required: boolean;
          document_types: string[] | null;
          legal_basis: string | null;
          authority: string | null;
          deadline: string | null;
          penalties: string | null;
          tips: string[] | null;
          links: Json | null;
          applicable_products: string[] | null;
          priority: 'critical' | 'high' | 'medium' | 'low';
          sort_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          country_code: string;
          category_key: string;
          title: string;
          description: string;
          detailed_description?: string | null;
          mandatory?: boolean;
          category: string;
          subcategory?: string | null;
          document_required?: boolean;
          document_types?: string[] | null;
          legal_basis?: string | null;
          authority?: string | null;
          deadline?: string | null;
          penalties?: string | null;
          tips?: string[] | null;
          links?: Json | null;
          applicable_products?: string[] | null;
          priority?: 'critical' | 'high' | 'medium' | 'low';
          sort_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          country_code?: string;
          category_key?: string;
          title?: string;
          description?: string;
          detailed_description?: string | null;
          mandatory?: boolean;
          category?: string;
          subcategory?: string | null;
          document_required?: boolean;
          document_types?: string[] | null;
          legal_basis?: string | null;
          authority?: string | null;
          deadline?: string | null;
          penalties?: string | null;
          tips?: string[] | null;
          links?: Json | null;
          applicable_products?: string[] | null;
          priority?: 'critical' | 'high' | 'medium' | 'low';
          sort_order?: number | null;
          created_at?: string;
        };
      };

      news_items: {
        Row: {
          id: string;
          title: string;
          summary: string;
          content: string;
          category: 'regulation' | 'deadline' | 'update' | 'warning';
          countries: string[];
          published_at: string;
          effective_date: string | null;
          priority: 'high' | 'medium' | 'low';
          tags: string[];
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary: string;
          content: string;
          category: 'regulation' | 'deadline' | 'update' | 'warning';
          countries?: string[];
          published_at?: string;
          effective_date?: string | null;
          priority?: 'high' | 'medium' | 'low';
          tags?: string[];
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string;
          content?: string;
          category?: 'regulation' | 'deadline' | 'update' | 'warning';
          countries?: string[];
          published_at?: string;
          effective_date?: string | null;
          priority?: 'high' | 'medium' | 'low';
          tags?: string[];
          link?: string | null;
          created_at?: string;
        };
      };

      // ============================================
      // TENANT-DATEN (mit RLS)
      // ============================================

      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo: string | null;
          address: string | null;
          country: string | null;
          eori: string | null;
          vat: string | null;
          settings: Json | null;
          plan: 'free' | 'pro' | 'enterprise';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo?: string | null;
          address?: string | null;
          country?: string | null;
          eori?: string | null;
          vat?: string | null;
          settings?: Json | null;
          plan?: 'free' | 'pro' | 'enterprise';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo?: string | null;
          address?: string | null;
          country?: string | null;
          eori?: string | null;
          vat?: string | null;
          settings?: Json | null;
          plan?: 'free' | 'pro' | 'enterprise';
          created_at?: string;
        };
      };

      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'editor' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
      };

      products: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          manufacturer: string;
          gtin: string;
          serial_number: string;
          production_date: string;
          expiration_date: string | null;
          category: string;
          description: string;
          materials: Json;
          certifications: Json;
          carbon_footprint: Json | null;
          recyclability: Json;
          image_url: string | null;
          hs_code: string | null;
          batch_number: string | null;
          country_of_origin: string | null;
          net_weight: number | null;
          gross_weight: number | null;
          manufacturer_address: string | null;
          manufacturer_eori: string | null;
          manufacturer_vat: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          manufacturer: string;
          gtin: string;
          serial_number: string;
          production_date: string;
          expiration_date?: string | null;
          category: string;
          description: string;
          materials?: Json;
          certifications?: Json;
          carbon_footprint?: Json | null;
          recyclability?: Json;
          image_url?: string | null;
          hs_code?: string | null;
          batch_number?: string | null;
          country_of_origin?: string | null;
          net_weight?: number | null;
          gross_weight?: number | null;
          manufacturer_address?: string | null;
          manufacturer_eori?: string | null;
          manufacturer_vat?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          manufacturer?: string;
          gtin?: string;
          serial_number?: string;
          production_date?: string;
          expiration_date?: string | null;
          category?: string;
          description?: string;
          materials?: Json;
          certifications?: Json;
          carbon_footprint?: Json | null;
          recyclability?: Json;
          image_url?: string | null;
          hs_code?: string | null;
          batch_number?: string | null;
          country_of_origin?: string | null;
          net_weight?: number | null;
          gross_weight?: number | null;
          manufacturer_address?: string | null;
          manufacturer_eori?: string | null;
          manufacturer_vat?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      documents: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string | null;
          name: string;
          type: 'pdf' | 'image' | 'other';
          category: string;
          storage_path: string | null;
          url: string | null;
          size: string | null;
          valid_until: string | null;
          uploaded_at: string;
          uploaded_by: string | null;
          status: 'valid' | 'expiring' | 'expired';
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id?: string | null;
          name: string;
          type: 'pdf' | 'image' | 'other';
          category: string;
          storage_path?: string | null;
          url?: string | null;
          size?: string | null;
          valid_until?: string | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
          status?: 'valid' | 'expiring' | 'expired';
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string | null;
          name?: string;
          type?: 'pdf' | 'image' | 'other';
          category?: string;
          storage_path?: string | null;
          url?: string | null;
          size?: string | null;
          valid_until?: string | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
          status?: 'valid' | 'expiring' | 'expired';
        };
      };

      supply_chain_entries: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          step: number;
          location: string;
          country: string;
          date: string;
          description: string;
          supplier: string | null;
          supplier_id: string | null;
          risk_level: 'low' | 'medium' | 'high' | null;
          verified: boolean;
          coordinates: string | null;
          process_type: string | null;
          transport_mode: string | null;
          status: string;
          document_ids: string[] | null;
          emissions_kg: number | null;
          duration_days: number | null;
          notes: string | null;
          cost: number | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          step: number;
          location: string;
          country: string;
          date: string;
          description: string;
          supplier?: string | null;
          supplier_id?: string | null;
          risk_level?: 'low' | 'medium' | 'high' | null;
          verified?: boolean;
          coordinates?: string | null;
          process_type?: string | null;
          transport_mode?: string | null;
          status?: string;
          document_ids?: string[] | null;
          emissions_kg?: number | null;
          duration_days?: number | null;
          notes?: string | null;
          cost?: number | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          step?: number;
          location?: string;
          country?: string;
          date?: string;
          description?: string;
          supplier?: string | null;
          supplier_id?: string | null;
          risk_level?: 'low' | 'medium' | 'high' | null;
          verified?: boolean;
          coordinates?: string | null;
          process_type?: string | null;
          transport_mode?: string | null;
          status?: string;
          document_ids?: string[] | null;
          emissions_kg?: number | null;
          duration_days?: number | null;
          notes?: string | null;
          cost?: number | null;
          currency?: string;
          created_at?: string;
        };
      };

      checklist_progress: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string | null;
          checklist_item_id: string;
          checked: boolean;
          status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
          notes: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id?: string | null;
          checklist_item_id: string;
          checked?: boolean;
          status?: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string | null;
          checklist_item_id?: string;
          checked?: boolean;
          status?: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };

      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          code: string | null;
          legal_form: string | null;
          contact_person: string | null;
          contact_position: string | null;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          fax: string | null;
          additional_contacts: Json | null;
          website: string | null;
          linkedin: string | null;
          address: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          country: string;
          postal_code: string | null;
          shipping_address: string | null;
          shipping_city: string | null;
          shipping_country: string | null;
          shipping_postal_code: string | null;
          tax_id: string | null;
          vat_id: string | null;
          duns_number: string | null;
          registration_number: string | null;
          bank_name: string | null;
          iban: string | null;
          bic: string | null;
          payment_terms: string | null;
          risk_level: 'low' | 'medium' | 'high';
          quality_rating: number | null;
          delivery_rating: number | null;
          verified: boolean;
          verification_date: string | null;
          verified_by: string | null;
          certifications: string[] | null;
          audit_date: string | null;
          next_audit_date: string | null;
          compliance_status: 'compliant' | 'pending' | 'non_compliant' | null;
          supplier_type: 'manufacturer' | 'wholesaler' | 'distributor' | 'service_provider' | null;
          industry: string | null;
          product_categories: string[] | null;
          contract_start: string | null;
          contract_end: string | null;
          min_order_value: number | null;
          currency: string | null;
          notes: string | null;
          internal_notes: string | null;
          tags: string[] | null;
          status: 'active' | 'inactive' | 'blocked' | 'pending_approval';
          created_at: string;
          updated_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          code?: string | null;
          legal_form?: string | null;
          contact_person?: string | null;
          contact_position?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          fax?: string | null;
          additional_contacts?: Json | null;
          website?: string | null;
          linkedin?: string | null;
          address?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          country: string;
          postal_code?: string | null;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_postal_code?: string | null;
          tax_id?: string | null;
          vat_id?: string | null;
          duns_number?: string | null;
          registration_number?: string | null;
          bank_name?: string | null;
          iban?: string | null;
          bic?: string | null;
          payment_terms?: string | null;
          risk_level?: 'low' | 'medium' | 'high';
          quality_rating?: number | null;
          delivery_rating?: number | null;
          verified?: boolean;
          verification_date?: string | null;
          verified_by?: string | null;
          certifications?: string[] | null;
          audit_date?: string | null;
          next_audit_date?: string | null;
          compliance_status?: 'compliant' | 'pending' | 'non_compliant' | null;
          supplier_type?: 'manufacturer' | 'wholesaler' | 'distributor' | 'service_provider' | null;
          industry?: string | null;
          product_categories?: string[] | null;
          contract_start?: string | null;
          contract_end?: string | null;
          min_order_value?: number | null;
          currency?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          tags?: string[] | null;
          status?: 'active' | 'inactive' | 'blocked' | 'pending_approval';
          created_at?: string;
          updated_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          code?: string | null;
          legal_form?: string | null;
          contact_person?: string | null;
          contact_position?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          fax?: string | null;
          additional_contacts?: Json | null;
          website?: string | null;
          linkedin?: string | null;
          address?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          postal_code?: string | null;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_postal_code?: string | null;
          tax_id?: string | null;
          vat_id?: string | null;
          duns_number?: string | null;
          registration_number?: string | null;
          bank_name?: string | null;
          iban?: string | null;
          bic?: string | null;
          payment_terms?: string | null;
          risk_level?: 'low' | 'medium' | 'high';
          quality_rating?: number | null;
          delivery_rating?: number | null;
          verified?: boolean;
          verification_date?: string | null;
          verified_by?: string | null;
          certifications?: string[] | null;
          audit_date?: string | null;
          next_audit_date?: string | null;
          compliance_status?: 'compliant' | 'pending' | 'non_compliant' | null;
          supplier_type?: 'manufacturer' | 'wholesaler' | 'distributor' | 'service_provider' | null;
          industry?: string | null;
          product_categories?: string[] | null;
          contract_start?: string | null;
          contract_end?: string | null;
          min_order_value?: number | null;
          currency?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          tags?: string[] | null;
          status?: 'active' | 'inactive' | 'blocked' | 'pending_approval';
          created_at?: string;
          updated_at?: string | null;
          created_by?: string | null;
        };
      };

      supplier_products: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string;
          product_id: string;
          role: 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics';
          is_primary: boolean;
          lead_time_days: number | null;
          price_per_unit: number | null;
          currency: string | null;
          min_order_quantity: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id: string;
          product_id: string;
          role: 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics';
          is_primary?: boolean;
          lead_time_days?: number | null;
          price_per_unit?: number | null;
          currency?: string | null;
          min_order_quantity?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          supplier_id?: string;
          product_id?: string;
          role?: 'manufacturer' | 'component' | 'raw_material' | 'packaging' | 'logistics';
          is_primary?: boolean;
          lead_time_days?: number | null;
          price_per_unit?: number | null;
          currency?: string | null;
          min_order_quantity?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };

      visibility_settings: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string | null;
          version: number;
          fields: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id?: string | null;
          version?: number;
          fields: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string | null;
          version?: number;
          fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
