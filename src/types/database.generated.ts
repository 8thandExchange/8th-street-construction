export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      assistant_audit_events: {
        Row: {
          actor_id: string
          conversation_id: string | null
          created_at: string
          decision: string
          id: string
          org_id: string
          project_id: string | null
          record_url: string | null
          result_excerpt: string | null
          summary: string
          surface: string
          tool_name: string
        }
        Insert: {
          actor_id: string
          conversation_id?: string | null
          created_at?: string
          decision: string
          id?: string
          org_id: string
          project_id?: string | null
          record_url?: string | null
          result_excerpt?: string | null
          summary: string
          surface: string
          tool_name: string
        }
        Update: {
          actor_id?: string
          conversation_id?: string | null
          created_at?: string
          decision?: string
          id?: string
          org_id?: string
          project_id?: string | null
          record_url?: string | null
          result_excerpt?: string | null
          summary?: string
          surface?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_audit_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_items: Json
          id: string
          last_message_at: string
          model_messages: Json
          org_id: string
          project_id: string | null
          surface: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_items?: Json
          id?: string
          last_message_at?: string
          model_messages?: Json
          org_id: string
          project_id?: string | null
          surface: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_items?: Json
          id?: string
          last_message_at?: string
          model_messages?: Json
          org_id?: string
          project_id?: string | null
          surface?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_request_reviews: {
        Row: {
          analysis_json: Json
          bid_request_id: string
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          recommendation: string
          recommended_bid_id: string | null
          summary: string
        }
        Insert: {
          analysis_json?: Json
          bid_request_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          recommendation?: string
          recommended_bid_id?: string | null
          summary?: string
        }
        Update: {
          analysis_json?: Json
          bid_request_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          recommendation?: string
          recommended_bid_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_request_reviews_bid_request_id_fkey"
            columns: ["bid_request_id"]
            isOneToOne: false
            referencedRelation: "bid_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_request_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_request_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_request_reviews_recommended_bid_id_fkey"
            columns: ["recommended_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_requests: {
        Row: {
          attachments: Json | null
          bid_deadline: string | null
          created_at: string
          created_by: string | null
          estimate_line_id: string | null
          id: string
          org_id: string
          project_id: string
          scope_of_work: string
          scope_template_id: string | null
          status: string
          title: string
          trade: string
        }
        Insert: {
          attachments?: Json | null
          bid_deadline?: string | null
          created_at?: string
          created_by?: string | null
          estimate_line_id?: string | null
          id?: string
          org_id: string
          project_id: string
          scope_of_work: string
          scope_template_id?: string | null
          status?: string
          title: string
          trade: string
        }
        Update: {
          attachments?: Json | null
          bid_deadline?: string | null
          created_at?: string
          created_by?: string | null
          estimate_line_id?: string | null
          id?: string
          org_id?: string
          project_id?: string
          scope_of_work?: string
          scope_template_id?: string | null
          status?: string
          title?: string
          trade?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_scope_template_id_fkey"
            columns: ["scope_template_id"]
            isOneToOne: false
            referencedRelation: "scope_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          alternates: string | null
          amount: number | null
          attachments: Json | null
          bid_request_id: string
          created_at: string
          document_id: string | null
          exclusions: string | null
          id: string
          notes: string | null
          org_id: string
          qualifications: string | null
          source: string
          status: Database["public"]["Enums"]["bid_status"]
          subcontractor_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          alternates?: string | null
          amount?: number | null
          attachments?: Json | null
          bid_request_id: string
          created_at?: string
          document_id?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          org_id: string
          qualifications?: string | null
          source?: string
          status?: Database["public"]["Enums"]["bid_status"]
          subcontractor_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          alternates?: string | null
          amount?: number | null
          attachments?: Json | null
          bid_request_id?: string
          created_at?: string
          document_id?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          qualifications?: string | null
          source?: string
          status?: Database["public"]["Enums"]["bid_status"]
          subcontractor_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_bid_request_id_fkey"
            columns: ["bid_request_id"]
            isOneToOne: false
            referencedRelation: "bid_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_allocations: {
        Row: {
          amount: number
          change_order_id: string
          created_at: string
          estimate_line_id: string
          id: string
          notes: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          change_order_id: string
          created_at?: string
          estimate_line_id: string
          id?: string
          notes?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          change_order_id?: string
          created_at?: string
          estimate_line_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_allocations_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_allocations_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_allocations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          client_signed_at: string | null
          client_signed_by: string | null
          cost_impact: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          number: number
          org_id: string
          project_id: string
          schedule_impact_days: number | null
          status: Database["public"]["Enums"]["change_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_signed_at?: string | null
          client_signed_by?: string | null
          cost_impact?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          number: number
          org_id: string
          project_id: string
          schedule_impact_days?: number | null
          status?: Database["public"]["Enums"]["change_order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_signed_at?: string | null
          client_signed_by?: string | null
          cost_impact?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          number?: number
          org_id?: string
          project_id?: string
          schedule_impact_days?: number | null
          status?: Database["public"]["Enums"]["change_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_client_signed_by_fkey"
            columns: ["client_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      city_budget_lines: {
        Row: {
          budget_amount: number
          city_number: number
          created_at: string
          description: string
          display_order: number
          id: string
          org_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          city_number: number
          created_at?: string
          description: string
          display_order?: number
          id?: string
          org_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          city_number?: number
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          org_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_budget_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_compliance_items: {
        Row: {
          category: Database["public"]["Enums"]["compliance_category"]
          created_at: string
          description: string | null
          document_storage_path: string | null
          expires_at: string | null
          holder_name: string | null
          id: string
          issued_at: string | null
          jurisdiction: string | null
          notes: string | null
          org_id: string
          policy_or_license_number: string | null
          renewal_cycle: string | null
          renewal_lead_days: number
          renewal_urgent_days: number
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          description?: string | null
          document_storage_path?: string | null
          expires_at?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string | null
          jurisdiction?: string | null
          notes?: string | null
          org_id: string
          policy_or_license_number?: string | null
          renewal_cycle?: string | null
          renewal_lead_days?: number
          renewal_urgent_days?: number
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          description?: string | null
          document_storage_path?: string | null
          expires_at?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string | null
          jurisdiction?: string | null
          notes?: string | null
          org_id?: string
          policy_or_license_number?: string | null
          renewal_cycle?: string | null
          renewal_lead_days?: number
          renewal_urgent_days?: number
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_compliance_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reminder_log: {
        Row: {
          compliance_item_id: string
          days_until_expiry: number | null
          id: string
          org_id: string
          reminder_tier: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          compliance_item_id: string
          days_until_expiry?: number | null
          id?: string
          org_id: string
          reminder_tier: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          compliance_item_id?: string
          days_until_expiry?: number | null
          id?: string
          org_id?: string
          reminder_tier?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reminder_log_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "company_compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reminder_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          assigned_to: string | null
          confirmed_at: string | null
          confirmed_for: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          lead_id: string | null
          meeting_type: string
          notes: string | null
          org_id: string
          phone: string | null
          preferred_date: string | null
          preferred_time_window: string | null
          project_location: string | null
          project_type: Database["public"]["Enums"]["project_category"] | null
          status: Database["public"]["Enums"]["consultation_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          confirmed_at?: string | null
          confirmed_for?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          lead_id?: string | null
          meeting_type?: string
          notes?: string | null
          org_id: string
          phone?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_location?: string | null
          project_type?: Database["public"]["Enums"]["project_category"] | null
          status?: Database["public"]["Enums"]["consultation_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          confirmed_at?: string | null
          confirmed_for?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          lead_id?: string | null
          meeting_type?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_location?: string | null
          project_type?: Database["public"]["Enums"]["project_category"] | null
          status?: Database["public"]["Enums"]["consultation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_md: string
          created_at: string
          id: string
          name: string
          notes: string | null
          org_id: string
          project_type: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          project_type: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          project_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_template_lines: {
        Row: {
          code: string
          created_at: string
          default_amount: number | null
          display_order: number
          division_code: string | null
          formula: string | null
          id: string
          is_allowance: boolean
          label: string
          line_type: string
          org_id: string
          section: string
          template_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_amount?: number | null
          display_order?: number
          division_code?: string | null
          formula?: string | null
          id?: string
          is_allowance?: boolean
          label: string
          line_type?: string
          org_id: string
          section: string
          template_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_amount?: number | null
          display_order?: number
          division_code?: string | null
          formula?: string | null
          id?: string
          is_allowance?: boolean
          label?: string
          line_type?: string
          org_id?: string
          section?: string
          template_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_template_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_code_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_template_takeoff: {
        Row: {
          created_at: string
          default_value: number | null
          display_order: number
          formula: string | null
          id: string
          key: string
          label: string
          org_id: string
          section: string
          template_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: number | null
          display_order?: number
          formula?: string | null
          id?: string
          key: string
          label: string
          org_id: string
          section?: string
          template_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: number | null
          display_order?: number
          formula?: string | null
          id?: string
          key?: string
          label?: string
          org_id?: string
          section?: string
          template_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_template_takeoff_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_template_takeoff_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_code_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      house_base_plans: {
        Row: {
          active: boolean
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          designer: string
          display_order: number
          file_size_bytes: number | null
          file_type: string
          id: string
          name: string
          notes: string | null
          org_id: string
          plan_number: string
          sheet_count: number | null
          square_footage: number | null
          storage_path: string
          stories: number | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          designer?: string
          display_order?: number
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          plan_number: string
          sheet_count?: number | null
          square_footage?: number | null
          storage_path: string
          stories?: number | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          designer?: string
          display_order?: number
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          plan_number?: string
          sheet_count?: number | null
          square_footage?: number | null
          storage_path?: string
          stories?: number | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "house_base_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attachments: {
        Row: {
          created_at: string
          display_order: number
          file_name: string
          file_size: number | null
          id: string
          invoice_id: string
          line_item_id: string | null
          media_type: string
          org_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_name: string
          file_size?: number | null
          id?: string
          invoice_id: string
          line_item_id?: string | null
          media_type?: string
          org_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          file_name?: string
          file_size?: number | null
          id?: string
          invoice_id?: string
          line_item_id?: string | null
          media_type?: string
          org_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          change_order_id: string | null
          city_budget_line_id: string | null
          created_at: string
          description: string
          display_order: number
          estimate_line_id: string | null
          id: string
          invoice_id: string
          org_id: string
          quantity: number
          reference_number: string | null
          unit_amount: number
        }
        Insert: {
          amount: number
          change_order_id?: string | null
          city_budget_line_id?: string | null
          created_at?: string
          description: string
          display_order?: number
          estimate_line_id?: string | null
          id?: string
          invoice_id: string
          org_id: string
          quantity?: number
          reference_number?: string | null
          unit_amount: number
        }
        Update: {
          amount?: number
          change_order_id?: string | null
          city_budget_line_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          estimate_line_id?: string | null
          id?: string
          invoice_id?: string
          org_id?: string
          quantity?: number
          reference_number?: string | null
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_city_budget_line_id_fkey"
            columns: ["city_budget_line_id"]
            isOneToOne: false
            referencedRelation: "city_budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          mercury_invoice_id: string | null
          mercury_pay_slug: string | null
          mercury_status: string | null
          notes: string | null
          org_id: string
          paid_at: string | null
          project_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_hosted_invoice_url: string | null
          stripe_invoice_id: string | null
          subtotal: number
          tax_amount: number
          title: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          mercury_invoice_id?: string | null
          mercury_pay_slug?: string | null
          mercury_status?: string | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          project_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_hosted_invoice_url?: string | null
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number
          title?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          mercury_invoice_id?: string | null
          mercury_pay_slug?: string | null
          mercury_status?: string | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          project_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_hosted_invoice_url?: string | null
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number
          title?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contacted_at: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          ip_address: unknown
          last_name: string
          message: string
          notes: string | null
          org_id: string
          phone: string | null
          project_type: Database["public"]["Enums"]["project_category"] | null
          qualified_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contacted_at?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          ip_address?: unknown
          last_name: string
          message: string
          notes?: string | null
          org_id: string
          phone?: string | null
          project_type?: Database["public"]["Enums"]["project_category"] | null
          qualified_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contacted_at?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          ip_address?: unknown
          last_name?: string
          message?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          project_type?: Database["public"]["Enums"]["project_category"] | null
          qualified_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          agenda_item_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          due_date: string | null
          id: string
          is_external: boolean
          last_nudge_at: string | null
          meeting_id: string | null
          nudge_count: number
          nudge_enabled: boolean
          org_id: string
          owner_email: string | null
          owner_name: string | null
          owner_org: string | null
          owner_profile_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          project_task_id: string | null
          source: Database["public"]["Enums"]["action_item_source"]
          status: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          is_external?: boolean
          last_nudge_at?: string | null
          meeting_id?: string | null
          nudge_count?: number
          nudge_enabled?: boolean
          org_id: string
          owner_email?: string | null
          owner_name?: string | null
          owner_org?: string | null
          owner_profile_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          project_task_id?: string | null
          source?: Database["public"]["Enums"]["action_item_source"]
          status?: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          is_external?: boolean
          last_nudge_at?: string | null
          meeting_id?: string | null
          nudge_count?: number
          nudge_enabled?: boolean
          org_id?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_org?: string | null
          owner_profile_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          project_task_id?: string | null
          source?: Database["public"]["Enums"]["action_item_source"]
          status?: Database["public"]["Enums"]["action_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_task_id_fkey"
            columns: ["project_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_updates: {
        Row: {
          action_item_id: string
          author_name: string | null
          author_profile_id: string | null
          body: string
          created_at: string
          id: string
          org_id: string
          source: string
          status_after: Database["public"]["Enums"]["action_item_status"] | null
        }
        Insert: {
          action_item_id: string
          author_name?: string | null
          author_profile_id?: string | null
          body: string
          created_at?: string
          id?: string
          org_id: string
          source?: string
          status_after?:
            | Database["public"]["Enums"]["action_item_status"]
            | null
        }
        Update: {
          action_item_id?: string
          author_name?: string | null
          author_profile_id?: string | null
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          source?: string
          status_after?:
            | Database["public"]["Enums"]["action_item_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_updates_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_updates_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_updates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          carried_from_item_id: string | null
          created_at: string
          id: string
          meeting_id: string
          notes_md: string | null
          number: string | null
          org_id: string
          outcome: string | null
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          carried_from_item_id?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          notes_md?: string | null
          number?: string | null
          org_id: string
          outcome?: string | null
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          carried_from_item_id?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          notes_md?: string | null
          number?: string | null
          org_id?: string
          outcome?: string | null
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_carried_from_item_id_fkey"
            columns: ["carried_from_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          created_at: string
          email: string | null
          id: string
          meeting_id: string
          name: string
          org_id: string
          organization: string | null
          present: boolean
          profile_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          meeting_id: string
          name: string
          org_id: string
          organization?: string | null
          present?: boolean
          profile_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          meeting_id?: string
          name?: string
          org_id?: string
          organization?: string | null
          present?: boolean
          profile_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          decision: string
          id: string
          meeting_id: string
          moved_by: string | null
          org_id: string
          rationale: string | null
          seconded_by: string | null
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          decision: string
          id?: string
          meeting_id: string
          moved_by?: string | null
          org_id: string
          rationale?: string | null
          seconded_by?: string | null
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          decision?: string
          id?: string
          meeting_id?: string
          moved_by?: string | null
          org_id?: string
          rationale?: string | null
          seconded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_nudge_log: {
        Row: {
          action_item_id: string | null
          channel: string
          id: string
          org_id: string
          sent_at: string
          sent_to: string
          tier: string
        }
        Insert: {
          action_item_id?: string | null
          channel?: string
          id?: string
          org_id: string
          sent_at?: string
          sent_to: string
          tier: string
        }
        Update: {
          action_item_id?: string | null
          channel?: string
          id?: string
          org_id?: string
          sent_at?: string
          sent_to?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_nudge_log_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_nudge_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_series: {
        Row: {
          agenda_template: Json
          cadence: string | null
          created_at: string
          default_attendees: Json
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["meeting_kind"]
          name: string
          notes: string | null
          org_id: string
          partner_org: string | null
          project_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          agenda_template?: Json
          cadence?: string | null
          created_at?: string
          default_attendees?: Json
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["meeting_kind"]
          name: string
          notes?: string | null
          org_id: string
          partner_org?: string | null
          project_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          agenda_template?: Json
          cadence?: string | null
          created_at?: string
          default_attendees?: Json
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["meeting_kind"]
          name?: string
          notes?: string | null
          org_id?: string
          partner_org?: string | null
          project_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_series_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_series_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_snapshot: string | null
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["meeting_kind"]
          location: string | null
          meeting_date: string
          minutes_md: string | null
          next_meeting_date: string | null
          org_id: string
          prepared_by: string | null
          project_id: string | null
          purpose: string | null
          raw_notes: string | null
          reopen_reason: string | null
          reopened_at: string | null
          series_id: string | null
          source_reference: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["meeting_kind"]
          location?: string | null
          meeting_date: string
          minutes_md?: string | null
          next_meeting_date?: string | null
          org_id: string
          prepared_by?: string | null
          project_id?: string | null
          purpose?: string | null
          raw_notes?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          series_id?: string | null
          source_reference?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["meeting_kind"]
          location?: string | null
          meeting_date?: string
          minutes_md?: string | null
          next_meeting_date?: string | null
          org_id?: string
          prepared_by?: string | null
          project_id?: string | null
          purpose?: string | null
          raw_notes?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          series_id?: string | null
          source_reference?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "meeting_series"
            referencedColumns: ["id"]
          },
        ]
      }
      mercury_customers: {
        Row: {
          created_at: string
          email: string
          id: string
          mercury_customer_id: string
          name: string
          org_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mercury_customer_id: string
          name: string
          org_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mercury_customer_id?: string
          name?: string
          org_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercury_customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercury_customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mercury_webhook_events: {
        Row: {
          event_type: string
          id: string
          mercury_event_id: string
          payload: Json
          processed_at: string
        }
        Insert: {
          event_type: string
          id?: string
          mercury_event_id: string
          payload?: Json
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          mercury_event_id?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          staff_scope: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          staff_scope?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          staff_scope?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          created_at: string
          display_name: string
          id: string
          jurisdiction_default: string | null
          legal_name: string
          logo_path: string | null
          phone: string | null
          reply_to_email: string | null
          sending_domain: string | null
          slug: string
          theme: Json | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          display_name: string
          id?: string
          jurisdiction_default?: string | null
          legal_name: string
          logo_path?: string | null
          phone?: string | null
          reply_to_email?: string | null
          sending_domain?: string | null
          slug: string
          theme?: Json | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          display_name?: string
          id?: string
          jurisdiction_default?: string | null
          legal_name?: string
          logo_path?: string | null
          phone?: string | null
          reply_to_email?: string | null
          sending_domain?: string | null
          slug?: string
          theme?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_draws: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          draw_number: number
          id: string
          invoice_id: string | null
          milestone_id: string | null
          org_id: string
          paid_at: string | null
          percent_of_contract: number | null
          project_id: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["draw_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          draw_number: number
          id?: string
          invoice_id?: string | null
          milestone_id?: string | null
          org_id: string
          paid_at?: string | null
          percent_of_contract?: number | null
          project_id: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["draw_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          draw_number?: number
          id?: string
          invoice_id?: string | null
          milestone_id?: string | null
          org_id?: string
          paid_at?: string | null
          percent_of_contract?: number | null
          project_id?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["draw_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_draws_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_draws_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_draws_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_draws_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_requests: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          message: string | null
          org_id: string
          portal_path: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["access_request_status"]
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          org_id: string
          portal_path?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          org_id?: string
          portal_path?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean
          organization_name: string | null
          organization_slug: string | null
          phone: string | null
          portal_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          staff_scope: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean
          organization_name?: string | null
          organization_slug?: string | null
          phone?: string | null
          portal_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          staff_scope?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean
          organization_name?: string | null
          organization_slug?: string | null
          phone?: string | null
          portal_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          staff_scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_contracts: {
        Row: {
          body_md: string
          client_signature_text: string | null
          client_signed_at: string | null
          client_signed_by: string | null
          contract_price: number
          created_at: string
          created_by: string | null
          effective_date: string | null
          esign_envelope_id: string | null
          esign_provider: string | null
          esign_sent_at: string | null
          esign_status: string | null
          id: string
          number: number
          org_id: string
          owner_name: string
          project_id: string
          signed_document_id: string | null
          source_proposal_id: string | null
          status: string
          status_note: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          client_signature_text?: string | null
          client_signed_at?: string | null
          client_signed_by?: string | null
          contract_price: number
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          esign_envelope_id?: string | null
          esign_provider?: string | null
          esign_sent_at?: string | null
          esign_status?: string | null
          id?: string
          number: number
          org_id: string
          owner_name: string
          project_id: string
          signed_document_id?: string | null
          source_proposal_id?: string | null
          status?: string
          status_note?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          client_signature_text?: string | null
          client_signed_at?: string | null
          client_signed_by?: string | null
          contract_price?: number
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          esign_envelope_id?: string | null
          esign_provider?: string | null
          esign_sent_at?: string | null
          esign_status?: string | null
          id?: string
          number?: number
          org_id?: string
          owner_name?: string
          project_id?: string
          signed_document_id?: string | null
          source_proposal_id?: string | null
          status?: string
          status_note?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contracts_client_signed_by_fkey"
            columns: ["client_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_signed_document_id_fkey"
            columns: ["signed_document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "project_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_snapshots: {
        Row: {
          actual: number
          billed: number
          budget: number | null
          captured_at: string
          captured_by: string | null
          code: string | null
          committed: number
          estimate_line_id: string | null
          heated_square_footage: number | null
          id: string
          is_allowance: boolean
          line_type: string
          org_id: string
          project_id: string
          section: string | null
          square_footage: number | null
          trade_label: string
          unit: string | null
        }
        Insert: {
          actual?: number
          billed?: number
          budget?: number | null
          captured_at?: string
          captured_by?: string | null
          code?: string | null
          committed?: number
          estimate_line_id?: string | null
          heated_square_footage?: number | null
          id?: string
          is_allowance?: boolean
          line_type?: string
          org_id: string
          project_id: string
          section?: string | null
          square_footage?: number | null
          trade_label: string
          unit?: string | null
        }
        Update: {
          actual?: number
          billed?: number
          budget?: number | null
          captured_at?: string
          captured_by?: string | null
          code?: string | null
          committed?: number
          estimate_line_id?: string | null
          heated_square_footage?: number | null
          id?: string
          is_allowance?: boolean
          line_type?: string
          org_id?: string
          project_id?: string
          section?: string | null
          square_footage?: number | null
          trade_label?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_snapshots_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_snapshots_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_snapshots_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_crew_weeks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          org_id: string
          planned_crew: number
          project_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id: string
          planned_crew: number
          project_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          planned_crew?: number
          project_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_crew_weeks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crew_weeks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crew_weeks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_daily_log_images: {
        Row: {
          caption: string | null
          created_at: string
          daily_log_id: string
          display_order: number
          id: string
          org_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          daily_log_id: string
          display_order?: number
          id?: string
          org_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          daily_log_id?: string
          display_order?: number
          id?: string
          org_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_log_images_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "project_daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_log_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_daily_logs: {
        Row: {
          author_id: string | null
          created_at: string
          crew_count: number | null
          id: string
          issues: string | null
          log_date: string
          org_id: string
          project_id: string
          summary: string
          weather: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          crew_count?: number | null
          id?: string
          issues?: string | null
          log_date?: string
          org_id: string
          project_id: string
          summary: string
          weather?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          crew_count?: number | null
          id?: string
          issues?: string | null
          log_date?: string
          org_id?: string
          project_id?: string
          summary?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          org_id: string
          project_id: string
          storage_path: string
          title: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          org_id: string
          project_id: string
          storage_path: string
          title: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          org_id?: string
          project_id?: string
          storage_path?: string
          title?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_estimate_lines: {
        Row: {
          awarded_amount: number | null
          bid_request_id: string | null
          code: string | null
          created_at: string
          description: string | null
          display_order: number
          division_code: string
          estimated_amount: number
          formula: string | null
          id: string
          is_allowance: boolean
          line_type: string
          notes: string | null
          org_id: string
          project_id: string
          section: string | null
          template_line_id: string | null
          trade_label: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          awarded_amount?: number | null
          bid_request_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          division_code: string
          estimated_amount?: number
          formula?: string | null
          id?: string
          is_allowance?: boolean
          line_type?: string
          notes?: string | null
          org_id: string
          project_id: string
          section?: string | null
          template_line_id?: string | null
          trade_label: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          awarded_amount?: number | null
          bid_request_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          division_code?: string
          estimated_amount?: number
          formula?: string | null
          id?: string
          is_allowance?: boolean
          line_type?: string
          notes?: string | null
          org_id?: string
          project_id?: string
          section?: string | null
          template_line_id?: string | null
          trade_label?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_estimate_lines_bid_request_id_fkey"
            columns: ["bid_request_id"]
            isOneToOne: false
            referencedRelation: "bid_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_estimate_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_estimate_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_estimate_lines_template_line_id_fkey"
            columns: ["template_line_id"]
            isOneToOne: false
            referencedRelation: "cost_code_template_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      project_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          height: number | null
          id: string
          is_before_after_pair: string | null
          is_hero: boolean | null
          org_id: string
          project_id: string
          public_url: string
          storage_path: string
          visibility: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_before_after_pair?: string | null
          is_hero?: boolean | null
          org_id: string
          project_id: string
          public_url: string
          storage_path: string
          visibility?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_before_after_pair?: string | null
          is_hero?: boolean | null
          org_id?: string
          project_id?: string
          public_url?: string
          storage_path?: string
          visibility?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_images_is_before_after_pair_fkey"
            columns: ["is_before_after_pair"]
            isOneToOne: false
            referencedRelation: "project_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_inspections: {
        Row: {
          created_at: string
          id: string
          inspector: string | null
          org_id: string
          project_id: string
          reinspection_of: string | null
          result_notes: string | null
          resulted_at: string | null
          scheduled_date: string | null
          status: string
          title: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspector?: string | null
          org_id: string
          project_id: string
          reinspection_of?: string | null
          result_notes?: string | null
          resulted_at?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspector?: string | null
          org_id?: string
          project_id?: string
          reinspection_of?: string | null
          result_notes?: string | null
          resulted_at?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inspections_reinspection_of_fkey"
            columns: ["reinspection_of"]
            isOneToOne: false
            referencedRelation: "project_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      project_lot_fit_reviews: {
        Row: {
          base_plan_id: string | null
          created_at: string
          created_by: string | null
          critique_items: Json
          critique_summary: string | null
          id: string
          org_id: string
          plat_storage_path: string | null
          project_id: string
          status: Database["public"]["Enums"]["lot_fit_review_status"]
          updated_at: string
        }
        Insert: {
          base_plan_id?: string | null
          created_at?: string
          created_by?: string | null
          critique_items?: Json
          critique_summary?: string | null
          id?: string
          org_id: string
          plat_storage_path?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["lot_fit_review_status"]
          updated_at?: string
        }
        Update: {
          base_plan_id?: string | null
          created_at?: string
          created_by?: string | null
          critique_items?: Json
          critique_summary?: string | null
          id?: string
          org_id?: string
          plat_storage_path?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["lot_fit_review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_lot_fit_reviews_base_plan_id_fkey"
            columns: ["base_plan_id"]
            isOneToOne: false
            referencedRelation: "house_base_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lot_fit_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lot_fit_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lot_fit_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          attachments: Json | null
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          project_id: string
          read_by: Json | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          read_by?: Json | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          read_by?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          org_id: string
          phase_key: string | null
          predecessor_id: string | null
          project_id: string
          scheduled_end: string | null
          scheduled_start: string | null
          start_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
          volunteer_friendly: boolean
          volunteer_notes: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          org_id: string
          phase_key?: string | null
          predecessor_id?: string | null
          project_id: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          volunteer_friendly?: boolean
          volunteer_notes?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          org_id?: string
          phase_key?: string | null
          predecessor_id?: string | null
          project_id?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          volunteer_friendly?: boolean
          volunteer_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plan_files: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          file_size_bytes: number | null
          file_type: string | null
          id: string
          kind: Database["public"]["Enums"]["plan_file_kind"]
          org_id: string
          plan_set_id: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["plan_file_kind"]
          org_id: string
          plan_set_id: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["plan_file_kind"]
          org_id?: string
          plan_set_id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_files_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "project_plan_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plan_sets: {
        Row: {
          client_acknowledgment: string | null
          client_signature_text: string | null
          client_signed_at: string | null
          client_signed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          jurisdiction_key: string | null
          org_id: string
          project_id: string
          regulations_snapshot: Json | null
          revision_notes: string | null
          sent_to_client_at: string | null
          status: Database["public"]["Enums"]["plan_set_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          client_acknowledgment?: string | null
          client_signature_text?: string | null
          client_signed_at?: string | null
          client_signed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          jurisdiction_key?: string | null
          org_id: string
          project_id: string
          regulations_snapshot?: Json | null
          revision_notes?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["plan_set_status"]
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          client_acknowledgment?: string | null
          client_signature_text?: string | null
          client_signed_at?: string | null
          client_signed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          jurisdiction_key?: string | null
          org_id?: string
          project_id?: string
          regulations_snapshot?: Json | null
          revision_notes?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["plan_set_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_sets_client_signed_by_fkey"
            columns: ["client_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_portal_members: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          org_id: string
          portal_enabled: boolean
          profile_id: string
          project_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id: string
          portal_enabled?: boolean
          profile_id: string
          project_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id?: string
          portal_enabled?: boolean
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_portal_members_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_portal_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_portal_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_portal_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_proposals: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          number: number
          org_id: string
          project_id: string
          responded_at: string | null
          response_note: string | null
          scope_md: string
          sent_at: string | null
          status: string
          terms_md: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          number: number
          org_id: string
          project_id: string
          responded_at?: string | null
          response_note?: string | null
          scope_md: string
          sent_at?: string | null
          status?: string
          terms_md?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          number?: number
          org_id?: string
          project_id?: string
          responded_at?: string | null
          response_note?: string | null
          scope_md?: string
          sent_at?: string | null
          status?: string
          terms_md?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reminder_log: {
        Row: {
          entity_id: string | null
          entity_type: string
          id: string
          org_id: string
          project_id: string | null
          reminder_key: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          entity_id?: string | null
          entity_type: string
          id?: string
          org_id: string
          project_id?: string | null
          reminder_key: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          entity_id?: string | null
          entity_type?: string
          id?: string
          org_id?: string
          project_id?: string | null
          reminder_key?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reminder_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reminder_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_rfis: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          created_by: string | null
          days_impact: number | null
          id: string
          milestone_id: string | null
          number: number
          org_id: string
          plan_set_id: string | null
          project_id: string
          question: string
          schedule_impact: string
          status: string
          title: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          created_by?: string | null
          days_impact?: number | null
          id?: string
          milestone_id?: string | null
          number: number
          org_id: string
          plan_set_id?: string | null
          project_id: string
          question: string
          schedule_impact?: string
          status?: string
          title: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          created_by?: string | null
          days_impact?: number | null
          id?: string
          milestone_id?: string | null
          number?: number
          org_id?: string
          plan_set_id?: string | null
          project_id?: string
          question?: string
          schedule_impact?: string
          status?: string
          title?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rfis_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "project_plan_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_selections: {
        Row: {
          allowance_amount: number | null
          category: Database["public"]["Enums"]["selection_category"]
          client_visible: boolean
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          org_id: string
          product_spec: string | null
          project_id: string
          selected_amount: number | null
          selected_option_id: string | null
          status: Database["public"]["Enums"]["selection_status"]
          title: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          allowance_amount?: number | null
          category?: Database["public"]["Enums"]["selection_category"]
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          product_spec?: string | null
          project_id: string
          selected_amount?: number | null
          selected_option_id?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          title: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          allowance_amount?: number | null
          category?: Database["public"]["Enums"]["selection_category"]
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          product_spec?: string | null
          project_id?: string
          selected_amount?: number | null
          selected_option_id?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          title?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_selections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_selections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_selections_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "selection_options"
            referencedColumns: ["id"]
          },
        ]
      }
      project_service_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          org_id: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          org_id: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          request_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_service_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_images_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "project_service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_service_requests: {
        Row: {
          category: string
          closed_at: string | null
          closed_by: string | null
          closeout_note: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          location: string | null
          number: number
          org_id: string
          owner_id: string | null
          project_id: string
          sla_due: string | null
          status: string
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_note?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          location?: string | null
          number: number
          org_id: string
          owner_id?: string | null
          project_id: string
          sla_due?: string | null
          status?: string
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string | null
          number?: number
          org_id?: string
          owner_id?: string | null
          project_id?: string
          sla_due?: string | null
          status?: string
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_service_requests_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submittals: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          document_id: string | null
          due_date: string | null
          id: string
          notes: string | null
          number: number
          org_id: string
          plan_set_id: string | null
          project_id: string
          reviewer_notes: string | null
          spec_section: string | null
          status: string
          title: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          number: number
          org_id: string
          plan_set_id?: string | null
          project_id: string
          reviewer_notes?: string | null
          spec_section?: string | null
          status?: string
          title: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: number
          org_id?: string
          plan_set_id?: string | null
          project_id?: string
          reviewer_notes?: string | null
          spec_section?: string | null
          status?: string
          title?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "project_plan_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_takeoff_values: {
        Row: {
          created_at: string
          display_order: number
          formula: string | null
          id: string
          key: string
          label: string
          org_id: string
          project_id: string
          section: string
          template_takeoff_id: string | null
          unit: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          formula?: string | null
          id?: string
          key: string
          label: string
          org_id: string
          project_id: string
          section?: string
          template_takeoff_id?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number
          formula?: string | null
          id?: string
          key?: string
          label?: string
          org_id?: string
          project_id?: string
          section?: string
          template_takeoff_id?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_takeoff_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_takeoff_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_takeoff_values_template_takeoff_id_fkey"
            columns: ["template_takeoff_id"]
            isOneToOne: false
            referencedRelation: "cost_code_template_takeoff"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          due_date: string | null
          id: string
          is_custom: boolean
          milestone_id: string | null
          org_id: string
          phase_key: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          is_custom?: boolean
          milestone_id?: string | null
          org_id: string
          phase_key?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          is_custom?: boolean
          milestone_id?: string | null
          org_id?: string
          phase_key?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_update_images: {
        Row: {
          caption: string | null
          display_order: number
          id: string
          org_id: string
          public_url: string
          storage_path: string
          update_id: string
        }
        Insert: {
          caption?: string | null
          display_order?: number
          id?: string
          org_id: string
          public_url: string
          storage_path: string
          update_id: string
        }
        Update: {
          caption?: string | null
          display_order?: number
          id?: string
          org_id?: string
          public_url?: string
          storage_path?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_update_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_update_images_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          org_id: string
          project_id: string
          title: string
          visibility: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          title: string
          visibility?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_completion_date: string | null
          base_plan_id: string | null
          budget_range: string | null
          category: Database["public"]["Enums"]["project_category"]
          client_id: string | null
          client_portal_enabled: boolean
          contract_value: number | null
          created_at: string
          display_order: number | null
          estimate_notes: string | null
          estimate_updated_at: string | null
          estimated_cost: number | null
          excerpt: string | null
          featured: boolean | null
          funding_type: Database["public"]["Enums"]["project_funding_type"]
          heated_square_footage: number | null
          hero_image_url: string | null
          hud_grant_year: number | null
          hud_program_notes: string | null
          id: string
          internal_notes: string | null
          jurisdiction: string | null
          location: string | null
          lot_number: string | null
          meta_description: string | null
          narrative: string | null
          notice_to_proceed_at: string | null
          notice_to_proceed_document_id: string | null
          notice_to_proceed_note: string | null
          org_id: string
          planned_crew: number | null
          plat_storage_path: string | null
          playbook_applied_at: string | null
          playbook_id: string | null
          portal_features: Json
          project_manager_id: string | null
          published_at: string | null
          share_enabled: boolean
          share_password_hash: string | null
          share_token: string | null
          share_updated_at: string | null
          slug: string
          square_footage: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          street_address: string | null
          subdivision: string | null
          subtitle: string | null
          superintendent_id: string | null
          target_completion_date: string | null
          title: string
          updated_at: string
          year_completed: number | null
        }
        Insert: {
          actual_completion_date?: string | null
          base_plan_id?: string | null
          budget_range?: string | null
          category: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_portal_enabled?: boolean
          contract_value?: number | null
          created_at?: string
          display_order?: number | null
          estimate_notes?: string | null
          estimate_updated_at?: string | null
          estimated_cost?: number | null
          excerpt?: string | null
          featured?: boolean | null
          funding_type?: Database["public"]["Enums"]["project_funding_type"]
          heated_square_footage?: number | null
          hero_image_url?: string | null
          hud_grant_year?: number | null
          hud_program_notes?: string | null
          id?: string
          internal_notes?: string | null
          jurisdiction?: string | null
          location?: string | null
          lot_number?: string | null
          meta_description?: string | null
          narrative?: string | null
          notice_to_proceed_at?: string | null
          notice_to_proceed_document_id?: string | null
          notice_to_proceed_note?: string | null
          org_id: string
          planned_crew?: number | null
          plat_storage_path?: string | null
          playbook_applied_at?: string | null
          playbook_id?: string | null
          portal_features?: Json
          project_manager_id?: string | null
          published_at?: string | null
          share_enabled?: boolean
          share_password_hash?: string | null
          share_token?: string | null
          share_updated_at?: string | null
          slug: string
          square_footage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_address?: string | null
          subdivision?: string | null
          subtitle?: string | null
          superintendent_id?: string | null
          target_completion_date?: string | null
          title: string
          updated_at?: string
          year_completed?: number | null
        }
        Update: {
          actual_completion_date?: string | null
          base_plan_id?: string | null
          budget_range?: string | null
          category?: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_portal_enabled?: boolean
          contract_value?: number | null
          created_at?: string
          display_order?: number | null
          estimate_notes?: string | null
          estimate_updated_at?: string | null
          estimated_cost?: number | null
          excerpt?: string | null
          featured?: boolean | null
          funding_type?: Database["public"]["Enums"]["project_funding_type"]
          heated_square_footage?: number | null
          hero_image_url?: string | null
          hud_grant_year?: number | null
          hud_program_notes?: string | null
          id?: string
          internal_notes?: string | null
          jurisdiction?: string | null
          location?: string | null
          lot_number?: string | null
          meta_description?: string | null
          narrative?: string | null
          notice_to_proceed_at?: string | null
          notice_to_proceed_document_id?: string | null
          notice_to_proceed_note?: string | null
          org_id?: string
          planned_crew?: number | null
          plat_storage_path?: string | null
          playbook_applied_at?: string | null
          playbook_id?: string | null
          portal_features?: Json
          project_manager_id?: string | null
          published_at?: string | null
          share_enabled?: boolean
          share_password_hash?: string | null
          share_token?: string | null
          share_updated_at?: string | null
          slug?: string
          square_footage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_address?: string | null
          subdivision?: string | null
          subtitle?: string | null
          superintendent_id?: string | null
          target_completion_date?: string | null
          title?: string
          updated_at?: string
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_base_plan_id_fkey"
            columns: ["base_plan_id"]
            isOneToOne: false
            referencedRelation: "house_base_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_notice_to_proceed_document_id_fkey"
            columns: ["notice_to_proceed_document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_superintendent_id_fkey"
            columns: ["superintendent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          punch_item_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          punch_item_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          punch_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_comments_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          org_id: string
          punch_item_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          org_id: string
          punch_item_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          org_id?: string
          punch_item_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_images_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_items: {
        Row: {
          assigned_trade: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          org_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status: Database["public"]["Enums"]["punch_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_trade?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          org_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status?: Database["public"]["Enums"]["punch_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_trade?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          org_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["punch_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          amount: number
          cost_division: string | null
          description: string
          display_order: number
          estimate_line_id: string | null
          id: string
          org_id: string
          purchase_order_id: string
          quantity: number
          unit_amount: number
        }
        Insert: {
          amount?: number
          cost_division?: string | null
          description: string
          display_order?: number
          estimate_line_id?: string | null
          id?: string
          org_id: string
          purchase_order_id: string
          quantity?: number
          unit_amount?: number
        }
        Update: {
          amount?: number
          cost_division?: string | null
          description?: string
          display_order?: number
          estimate_line_id?: string | null
          id?: string
          org_id?: string
          purchase_order_id?: string
          quantity?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          acknowledged_at: string | null
          acknowledged_note: string | null
          bid_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_date: string | null
          issued_at: string | null
          needed_by: string | null
          notes: string | null
          org_id: string
          po_number: string
          project_id: string
          status: string
          subcontractor_id: string | null
          subtotal: number
          title: string
          total: number
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_note?: string | null
          bid_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_date?: string | null
          issued_at?: string | null
          needed_by?: string | null
          notes?: string | null
          org_id: string
          po_number: string
          project_id: string
          status?: string
          subcontractor_id?: string | null
          subtotal?: number
          title: string
          total?: number
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_note?: string | null
          bid_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_date?: string | null
          issued_at?: string | null
          needed_by?: string | null
          notes?: string | null
          org_id?: string
          po_number?: string
          project_id?: string
          status?: string
          subcontractor_id?: string | null
          subtotal?: number
          title?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          org_id: string
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          org_id: string
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          org_id?: string
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      scope_templates: {
        Row: {
          body_md: string
          created_at: string
          id: string
          last_variance_at: string | null
          last_variance_note: string | null
          org_id: string
          title: string
          trade: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          last_variance_at?: string | null
          last_variance_note?: string | null
          org_id: string
          title: string
          trade: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          last_variance_at?: string | null
          last_variance_note?: string | null
          org_id?: string
          title?: string
          trade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_options: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          org_id: string
          price: number | null
          selection_id: string
          title: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          org_id: string
          price?: number | null
          selection_id: string
          title: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          org_id?: string
          price?: number | null
          selection_id?: string
          title?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selection_options_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_options_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "project_selections"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          display_order: number
          full_description: string | null
          icon: string | null
          id: string
          name: string
          org_id: string
          published: boolean
          short_description: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          full_description?: string | null
          icon?: string | null
          id?: string
          name: string
          org_id: string
          published?: boolean
          short_description: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          full_description?: string | null
          icon?: string | null
          id?: string
          name?: string
          org_id?: string
          published?: boolean
          short_description?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          org_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          org_id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          org_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          profile_id: string
          stripe_customer_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          profile_id: string
          stripe_customer_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          profile_id?: string
          stripe_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload: Json
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subcontractors: {
        Row: {
          active: boolean | null
          company_name: string
          created_at: string
          id: string
          insurance_expires: string | null
          license_number: string | null
          notes: string | null
          org_id: string
          preferred: boolean | null
          profile_id: string | null
          rating: number | null
          trade: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          company_name: string
          created_at?: string
          id?: string
          insurance_expires?: string | null
          license_number?: string | null
          notes?: string | null
          org_id: string
          preferred?: boolean | null
          profile_id?: string | null
          rating?: number | null
          trade: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          company_name?: string
          created_at?: string
          id?: string
          insurance_expires?: string | null
          license_number?: string | null
          notes?: string | null
          org_id?: string
          preferred?: boolean | null
          profile_id?: string | null
          rating?: number | null
          trade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          display_order: number
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          label: string
          org_id: string
          photo_path: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label: string
          org_id: string
          photo_path?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label?: string
          org_id?: string
          photo_path?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          client_name: string
          client_title: string | null
          created_at: string
          display_order: number | null
          featured: boolean
          id: string
          org_id: string
          project_id: string | null
          published: boolean
          quote: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_name: string
          client_title?: string | null
          created_at?: string
          display_order?: number | null
          featured?: boolean
          id?: string
          org_id: string
          project_id?: string | null
          published?: boolean
          quote: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_name?: string
          client_title?: string | null
          created_at?: string
          display_order?: number | null
          featured?: boolean
          id?: string
          org_id?: string
          project_id?: string | null
          published?: boolean
          quote?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bill_allocations: {
        Row: {
          amount: number
          created_at: string
          estimate_line_id: string
          id: string
          notes: string | null
          org_id: string
          updated_at: string
          vendor_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          estimate_line_id: string
          id?: string
          notes?: string | null
          org_id: string
          updated_at?: string
          vendor_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          estimate_line_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_allocations_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_cost_line_rollup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_allocations_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "project_estimate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_allocations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_allocations_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          amount: number
          bill_number: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          file_path: string | null
          id: string
          issued_date: string | null
          line_items: Json
          mercury_transaction_id: string | null
          notes: string | null
          org_id: string
          paid_at: string | null
          payment_initiated_at: string | null
          project_id: string | null
          purchase_order_id: string | null
          status: string
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          bill_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_path?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          mercury_transaction_id?: string | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          payment_initiated_at?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          status?: string
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_path?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          mercury_transaction_id?: string | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          payment_initiated_at?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_compliance_items: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          kind: string
          label: string
          notes: string | null
          org_id: string
          received_on: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          kind: string
          label: string
          notes?: string | null
          org_id: string
          received_on?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          kind?: string
          label?: string
          notes?: string | null
          org_id?: string
          received_on?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_compliance_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_compliance_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invites: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          revoked_at: string | null
          token_hash: string
          vendor_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          org_id: string
          revoked_at?: string | null
          token_hash: string
          vendor_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          revoked_at?: string | null
          token_hash?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          legal_name: string | null
          logo_path: string | null
          mercury_recipient_id: string | null
          name: string
          notes: string | null
          onboarded_at: string | null
          org_id: string
          phone: string | null
          remit_account_last4: string | null
          remit_account_name: string | null
          remit_account_number: string | null
          remit_account_type: string
          remit_routing_number: string | null
          tax_classification: string | null
          tax_id: string | null
          tax_id_last4: string | null
          updated_at: string
          w9_path: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          mercury_recipient_id?: string | null
          name: string
          notes?: string | null
          onboarded_at?: string | null
          org_id: string
          phone?: string | null
          remit_account_last4?: string | null
          remit_account_name?: string | null
          remit_account_number?: string | null
          remit_account_type?: string
          remit_routing_number?: string | null
          tax_classification?: string | null
          tax_id?: string | null
          tax_id_last4?: string | null
          updated_at?: string
          w9_path?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          mercury_recipient_id?: string | null
          name?: string
          notes?: string | null
          onboarded_at?: string | null
          org_id?: string
          phone?: string | null
          remit_account_last4?: string | null
          remit_account_name?: string | null
          remit_account_number?: string | null
          remit_account_type?: string
          remit_routing_number?: string | null
          tax_classification?: string | null
          tax_id?: string | null
          tax_id_last4?: string | null
          updated_at?: string
          w9_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_events: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          end_time: string
          event_date: string
          external_signup_url: string | null
          id: string
          location: string | null
          org_id: string
          partner: string
          project_id: string | null
          published: boolean
          signup_deadline: string | null
          skills_needed: string | null
          start_time: string
          status: Database["public"]["Enums"]["volunteer_event_status"]
          title: string
          updated_at: string
          what_to_bring: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          end_time?: string
          event_date: string
          external_signup_url?: string | null
          id?: string
          location?: string | null
          org_id: string
          partner?: string
          project_id?: string | null
          published?: boolean
          signup_deadline?: string | null
          skills_needed?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["volunteer_event_status"]
          title: string
          updated_at?: string
          what_to_bring?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          end_time?: string
          event_date?: string
          external_signup_url?: string | null
          id?: string
          location?: string | null
          org_id?: string
          partner?: string
          project_id?: string | null
          published?: boolean
          signup_deadline?: string | null
          skills_needed?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["volunteer_event_status"]
          title?: string
          updated_at?: string
          what_to_bring?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_signups: {
        Row: {
          created_at: string
          email: string
          event_id: string
          experience_level: string | null
          first_name: string
          group_size: number
          id: string
          last_name: string
          notes: string | null
          org_id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          experience_level?: string | null
          first_name: string
          group_size?: number
          id?: string
          last_name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          experience_level?: string | null
          first_name?: string
          group_size?: number
          id?: string
          last_name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_signups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "volunteer_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_signups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          event: string
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          role: string | null
          workflow: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          event: string
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          role?: string | null
          workflow: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          event?: string
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          role?: string | null
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_cost_line_rollup: {
        Row: {
          actual: number | null
          bill_count: number | null
          billed: number | null
          budget: number | null
          co_approved: number | null
          code: string | null
          committed: number | null
          id: string | null
          invoice_count: number | null
          line_type: string | null
          po_count: number | null
          project_id: string | null
          remaining: number | null
          revised_budget: number | null
          section: string | null
          trade_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_estimate_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          retry_after: number
        }[]
      }
      client_has_project_portal_access: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      client_portal_is_active: { Args: never; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_org_admin: { Args: never; Returns: boolean }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "denied"
      action_item_source: "meeting" | "email" | "assistant" | "manual"
      action_item_status:
        | "open"
        | "in_progress"
        | "blocked"
        | "done"
        | "cancelled"
      bid_status:
        | "invited"
        | "viewed"
        | "submitted"
        | "shortlisted"
        | "awarded"
        | "declined"
        | "withdrawn"
      change_order_status: "draft" | "pending_client" | "approved" | "rejected"
      compliance_category:
        | "license"
        | "insurance"
        | "bond"
        | "registration"
        | "certification"
        | "tax"
        | "safety"
        | "other"
      compliance_status:
        | "active"
        | "expiring_soon"
        | "expired"
        | "pending"
        | "not_applicable"
      consultation_status:
        | "requested"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      draw_status: "scheduled" | "invoiced" | "paid" | "skipped" | "cancelled"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "paid"
        | "partial"
        | "overdue"
        | "void"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "won"
        | "lost"
        | "archived"
      lot_fit_review_status:
        | "pending"
        | "in_review"
        | "revisions_needed"
        | "approved"
      meeting_kind: "board" | "partner" | "client" | "internal" | "site"
      meeting_status:
        | "scheduled"
        | "in_progress"
        | "draft_minutes"
        | "approved"
        | "archived"
      milestone_status: "pending" | "in_progress" | "completed" | "blocked"
      plan_file_kind: "plan" | "rendering" | "elevation" | "site_plan" | "other"
      plan_set_status:
        | "draft"
        | "pending_client"
        | "approved"
        | "revision_requested"
      project_category:
        | "custom_home"
        | "residential_renovation"
        | "commercial_new_build"
        | "tenant_buildout"
        | "design_build"
        | "historic_restoration"
      project_funding_type: "private" | "habitat" | "hud_home"
      project_status:
        | "draft"
        | "pre_construction"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "archived"
      punch_status: "open" | "in_progress" | "complete" | "deferred"
      selection_category:
        | "exterior"
        | "flooring"
        | "cabinets"
        | "countertops"
        | "tile"
        | "plumbing_fixtures"
        | "lighting"
        | "appliances"
        | "hardware"
        | "paint"
        | "other"
      selection_status:
        | "pending"
        | "client_review"
        | "selected"
        | "ordered"
        | "installed"
        | "approved"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
      user_role: "admin" | "client" | "subcontractor"
      volunteer_event_status: "scheduled" | "full" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_request_status: ["pending", "approved", "denied"],
      action_item_source: ["meeting", "email", "assistant", "manual"],
      action_item_status: [
        "open",
        "in_progress",
        "blocked",
        "done",
        "cancelled",
      ],
      bid_status: [
        "invited",
        "viewed",
        "submitted",
        "shortlisted",
        "awarded",
        "declined",
        "withdrawn",
      ],
      change_order_status: ["draft", "pending_client", "approved", "rejected"],
      compliance_category: [
        "license",
        "insurance",
        "bond",
        "registration",
        "certification",
        "tax",
        "safety",
        "other",
      ],
      compliance_status: [
        "active",
        "expiring_soon",
        "expired",
        "pending",
        "not_applicable",
      ],
      consultation_status: [
        "requested",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      draw_status: ["scheduled", "invoiced", "paid", "skipped", "cancelled"],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "paid",
        "partial",
        "overdue",
        "void",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "won",
        "lost",
        "archived",
      ],
      lot_fit_review_status: [
        "pending",
        "in_review",
        "revisions_needed",
        "approved",
      ],
      meeting_kind: ["board", "partner", "client", "internal", "site"],
      meeting_status: [
        "scheduled",
        "in_progress",
        "draft_minutes",
        "approved",
        "archived",
      ],
      milestone_status: ["pending", "in_progress", "completed", "blocked"],
      plan_file_kind: ["plan", "rendering", "elevation", "site_plan", "other"],
      plan_set_status: [
        "draft",
        "pending_client",
        "approved",
        "revision_requested",
      ],
      project_category: [
        "custom_home",
        "residential_renovation",
        "commercial_new_build",
        "tenant_buildout",
        "design_build",
        "historic_restoration",
      ],
      project_funding_type: ["private", "habitat", "hud_home"],
      project_status: [
        "draft",
        "pre_construction",
        "in_progress",
        "completed",
        "on_hold",
        "archived",
      ],
      punch_status: ["open", "in_progress", "complete", "deferred"],
      selection_category: [
        "exterior",
        "flooring",
        "cabinets",
        "countertops",
        "tile",
        "plumbing_fixtures",
        "lighting",
        "appliances",
        "hardware",
        "paint",
        "other",
      ],
      selection_status: [
        "pending",
        "client_review",
        "selected",
        "ordered",
        "installed",
        "approved",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
      user_role: ["admin", "client", "subcontractor"],
      volunteer_event_status: ["scheduled", "full", "completed", "cancelled"],
    },
  },
} as const
