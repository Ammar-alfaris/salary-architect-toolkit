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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_contact_email: string | null
          blog_permalink_pattern: string
          branding: Json
          contact_form_routing: string | null
          default_currency: string
          default_locale: string
          default_plan_id: string | null
          default_sender_email: string | null
          default_trial_days: number
          id: string
          maintenance_mode: boolean
          notifications: Json
          platform_name: string
          security: Json
          support_email: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_contact_email?: string | null
          blog_permalink_pattern?: string
          branding?: Json
          contact_form_routing?: string | null
          default_currency?: string
          default_locale?: string
          default_plan_id?: string | null
          default_sender_email?: string | null
          default_trial_days?: number
          id?: string
          maintenance_mode?: boolean
          notifications?: Json
          platform_name?: string
          security?: Json
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_contact_email?: string | null
          blog_permalink_pattern?: string
          branding?: Json
          contact_form_routing?: string | null
          default_currency?: string
          default_locale?: string
          default_plan_id?: string | null
          default_sender_email?: string | null
          default_trial_days?: number
          id?: string
          maintenance_mode?: boolean
          notifications?: Json
          platform_name?: string
          security?: Json
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_default_plan_id_fkey"
            columns: ["default_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_policies: {
        Row: {
          country: string | null
          created_at: string
          custom_rules_json: Json
          education_amount: number
          hardship_percent: number
          housing_percent: number
          id: string
          mobile_amount: number
          name: string
          organization_id: string
          shift_percent: number
          transport_percent: number
        }
        Insert: {
          country?: string | null
          created_at?: string
          custom_rules_json?: Json
          education_amount?: number
          hardship_percent?: number
          housing_percent?: number
          id?: string
          mobile_amount?: number
          name: string
          organization_id: string
          shift_percent?: number
          transport_percent?: number
        }
        Update: {
          country?: string | null
          created_at?: string
          custom_rules_json?: Json
          education_amount?: number
          hardship_percent?: number
          housing_percent?: number
          id?: string
          mobile_amount?: number
          name?: string
          organization_id?: string
          shift_percent?: number
          transport_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "allowance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_link: string | null
          end_at: string | null
          id: string
          is_active: boolean
          start_at: string | null
          target_org_ids: string[]
          title: string
          type: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_link?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          start_at?: string | null
          target_org_ids?: string[]
          title: string
          type?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_link?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          start_at?: string | null
          target_org_ids?: string[]
          title?: string
          type?: string
        }
        Relationships: []
      }
      approval_chain_steps: {
        Row: {
          approver_email: string | null
          approver_label: string | null
          approver_role: string | null
          approver_user_id: string | null
          chain_id: string
          created_at: string
          id: string
          name: string | null
          step_order: number
        }
        Insert: {
          approver_email?: string | null
          approver_label?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          chain_id: string
          created_at?: string
          id?: string
          name?: string | null
          step_order: number
        }
        Update: {
          approver_email?: string | null
          approver_label?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          chain_id?: string
          created_at?: string
          id?: string
          name?: string | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_chain_steps_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "approval_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_chains: {
        Row: {
          applies_to: string[]
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string
        }
        Insert: {
          applies_to?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          chain_id: string | null
          created_at: string
          current_step: number
          decision_note: string | null
          entity_id: string
          entity_label: string | null
          entity_type: string
          final_payload: Json | null
          id: string
          organization_id: string
          payload: Json
          proposed_payload: Json
          reason: string | null
          requested_by: string
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_email: string | null
          status: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          chain_id?: string | null
          created_at?: string
          current_step?: number
          decision_note?: string | null
          entity_id: string
          entity_label?: string | null
          entity_type: string
          final_payload?: Json | null
          id?: string
          organization_id: string
          payload?: Json
          proposed_payload?: Json
          reason?: string | null
          requested_by: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          chain_id?: string | null
          created_at?: string
          current_step?: number
          decision_note?: string | null
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          final_payload?: Json | null
          id?: string
          organization_id?: string
          payload?: Json
          proposed_payload?: Json
          reason?: string | null
          requested_by?: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "approval_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_step_decisions: {
        Row: {
          created_at: string
          decided_by: string | null
          decided_by_email: string | null
          decision: string
          edits: Json
          id: string
          note: string | null
          request_id: string
          step_order: number
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decided_by_email?: string | null
          decision: string
          edits?: Json
          id?: string
          note?: string | null
          request_id: string
          step_order: number
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decided_by_email?: string | null
          decision?: string
          edits?: Json
          id?: string
          note?: string | null
          request_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_step_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image_alt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean
          publish_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          business_multiplier: number
          created_at: string
          default_target_bonus_percent: number
          final_payload: Json | null
          finalized_at: string | null
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["cycle_status"]
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          business_multiplier?: number
          created_at?: string
          default_target_bonus_percent?: number
          final_payload?: Json | null
          finalized_at?: string | null
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["cycle_status"]
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          business_multiplier?: number
          created_at?: string
          default_target_bonus_percent?: number
          final_payload?: Json | null
          finalized_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bonus_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_results: {
        Row: {
          base_salary: number
          bonus_cycle_id: string
          business_multiplier: number
          calculated_bonus: number
          created_at: string
          employee_id: string
          id: string
          individual_modifier: number
          performance_multiplier: number
          proration_factor: number
          target_bonus_percent: number
        }
        Insert: {
          base_salary: number
          bonus_cycle_id: string
          business_multiplier?: number
          calculated_bonus: number
          created_at?: string
          employee_id: string
          id?: string
          individual_modifier?: number
          performance_multiplier?: number
          proration_factor?: number
          target_bonus_percent: number
        }
        Update: {
          base_salary?: number
          bonus_cycle_id?: string
          business_multiplier?: number
          calculated_bonus?: number
          created_at?: string
          employee_id?: string
          id?: string
          individual_modifier?: number
          performance_multiplier?: number
          proration_factor?: number
          target_bonus_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "bonus_results_bonus_cycle_id_fkey"
            columns: ["bonus_cycle_id"]
            isOneToOne: false
            referencedRelation: "bonus_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_results_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_snapshots: {
        Row: {
          annual_allowances: number | null
          annual_bonus_estimate: number | null
          base_salary: number
          compa_ratio: number | null
          created_at: string
          employee_id: string
          id: string
          range_penetration: number | null
          snapshot_date: string
          total_cash_compensation: number | null
        }
        Insert: {
          annual_allowances?: number | null
          annual_bonus_estimate?: number | null
          base_salary: number
          compa_ratio?: number | null
          created_at?: string
          employee_id: string
          id?: string
          range_penetration?: number | null
          snapshot_date?: string
          total_cash_compensation?: number | null
        }
        Update: {
          annual_allowances?: number | null
          annual_bonus_estimate?: number | null
          base_salary?: number
          compa_ratio?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          range_penetration?: number | null
          snapshot_date?: string
          total_cash_compensation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string
          name: string
          priority: string
          source_form: string | null
          status: string
          subject: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message: string
          name: string
          priority?: string
          source_form?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string
          name?: string
          priority?: string
          source_form?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_filter: Json
          audience_type: string
          body_ar: string
          body_en: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          recipient_count: number
          status: string
          subject_ar: string
          subject_en: string
          template_key: string | null
        }
        Insert: {
          audience_filter?: Json
          audience_type?: string
          body_ar?: string
          body_en?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          recipient_count?: number
          status?: string
          subject_ar?: string
          subject_en?: string
          template_key?: string | null
        }
        Update: {
          audience_filter?: Json
          audience_type?: string
          body_ar?: string
          body_en?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          recipient_count?: number
          status?: string
          subject_ar?: string
          subject_en?: string
          template_key?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_ar: string
          body_en: string
          category: string
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          id: string
          is_system: boolean
          key: string
          subject_ar: string
          subject_en: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_ar?: string
          body_en?: string
          category?: string
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          key: string
          subject_ar?: string
          subject_en?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_ar?: string
          body_en?: string
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          key?: string
          subject_ar?: string
          subject_en?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_allowances: {
        Row: {
          allowance_policy_id: string | null
          created_at: string
          custom_amount: number
          education_amount: number
          employee_id: string
          food_amount: number
          hardship_amount: number
          housing_amount: number
          id: string
          mobile_amount: number
          shift_amount: number
          total_allowance_amount: number
          transport_amount: number
        }
        Insert: {
          allowance_policy_id?: string | null
          created_at?: string
          custom_amount?: number
          education_amount?: number
          employee_id: string
          food_amount?: number
          hardship_amount?: number
          housing_amount?: number
          id?: string
          mobile_amount?: number
          shift_amount?: number
          total_allowance_amount?: number
          transport_amount?: number
        }
        Update: {
          allowance_policy_id?: string | null
          created_at?: string
          custom_amount?: number
          education_amount?: number
          employee_id?: string
          food_amount?: number
          hardship_amount?: number
          housing_amount?: number
          id?: string
          mobile_amount?: number
          shift_amount?: number
          total_allowance_amount?: number
          transport_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_allowances_allowance_policy_id_fkey"
            columns: ["allowance_policy_id"]
            isOneToOne: false
            referencedRelation: "allowance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_allowances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_custom_allowances: {
        Row: {
          annual_amount: number
          created_at: string
          employee_id: string
          id: string
          name: string
        }
        Insert: {
          annual_amount?: number
          created_at?: string
          employee_id: string
          id?: string
          name: string
        }
        Update: {
          annual_amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_custom_allowances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_custom_field_values: {
        Row: {
          created_at: string
          employee_id: string
          field_def_id: string
          id: string
          value_text: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          field_def_id: string
          id?: string
          value_text?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          field_def_id?: string
          id?: string
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_custom_field_values_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_custom_field_values_field_def_id_fkey"
            columns: ["field_def_id"]
            isOneToOne: false
            referencedRelation: "org_custom_field_defs"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          archived: boolean
          base_salary: number
          business_unit: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          cost_center: string | null
          created_at: string
          currency: string | null
          date_of_birth: string | null
          department: string | null
          email: string | null
          employee_code: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          employment_type: string | null
          first_name: string
          full_name: string | null
          gender: string | null
          grade_id: string | null
          hire_date: string | null
          id: string
          job_family: string | null
          job_title: string | null
          last_name: string
          location: string | null
          manager_id: string | null
          manager_name: string | null
          nationality: string | null
          organization_id: string
          performance_rating: string | null
          phone_number: string | null
          salary_effective_date: string | null
          salary_structure_id: string | null
          target_bonus_percent: number
        }
        Insert: {
          archived?: boolean
          base_salary?: number
          business_unit?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_code: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          employment_type?: string | null
          first_name: string
          full_name?: string | null
          gender?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          job_family?: string | null
          job_title?: string | null
          last_name: string
          location?: string | null
          manager_id?: string | null
          manager_name?: string | null
          nationality?: string | null
          organization_id: string
          performance_rating?: string | null
          phone_number?: string | null
          salary_effective_date?: string | null
          salary_structure_id?: string | null
          target_bonus_percent?: number
        }
        Update: {
          archived?: boolean
          base_salary?: number
          business_unit?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          employment_type?: string | null
          first_name?: string
          full_name?: string | null
          gender?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          job_family?: string | null
          job_title?: string | null
          last_name?: string
          location?: string | null
          manager_id?: string | null
          manager_name?: string | null
          nationality?: string | null
          organization_id?: string
          performance_rating?: string | null
          phone_number?: string | null
          salary_effective_date?: string | null
          salary_structure_id?: string | null
          target_bonus_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "salary_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_salary_structure_id_fkey"
            columns: ["salary_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_review_flags: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          flag_type: string
          grade_id: string | null
          id: string
          job_family: string | null
          notes: string | null
          organization_id: string
          peer_median: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          variance_percent: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          flag_type: string
          grade_id?: string | null
          id?: string
          job_family?: string | null
          notes?: string | null
          organization_id: string
          peer_median?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          variance_percent?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          flag_type?: string
          grade_id?: string | null
          id?: string
          job_family?: string | null
          notes?: string | null
          organization_id?: string
          peer_median?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          variance_percent?: number
        }
        Relationships: []
      }
      merit_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          created_at: string
          effective_date: string
          final_payload: Json | null
          finalized_at: string | null
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["cycle_status"]
          total_budget_percent: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          created_at?: string
          effective_date?: string
          final_payload?: Json | null
          finalized_at?: string | null
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["cycle_status"]
          total_budget_percent?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          created_at?: string
          effective_date?: string
          final_payload?: Json | null
          finalized_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          total_budget_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "merit_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      merit_matrix_rules: {
        Row: {
          compa_ratio_band: string
          created_at: string
          id: string
          merit_cycle_id: string
          performance_rating: string
          recommended_increase_percent: number
        }
        Insert: {
          compa_ratio_band: string
          created_at?: string
          id?: string
          merit_cycle_id: string
          performance_rating: string
          recommended_increase_percent: number
        }
        Update: {
          compa_ratio_band?: string
          created_at?: string
          id?: string
          merit_cycle_id?: string
          performance_rating?: string
          recommended_increase_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "merit_matrix_rules_merit_cycle_id_fkey"
            columns: ["merit_cycle_id"]
            isOneToOne: false
            referencedRelation: "merit_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      merit_results: {
        Row: {
          created_at: string
          current_salary: number
          employee_id: string
          id: string
          increase_amount: number
          merit_cycle_id: string
          new_salary: number
          recommended_increase_percent: number
        }
        Insert: {
          created_at?: string
          current_salary: number
          employee_id: string
          id?: string
          increase_amount: number
          merit_cycle_id: string
          new_salary: number
          recommended_increase_percent: number
        }
        Update: {
          created_at?: string
          current_salary?: number
          employee_id?: string
          id?: string
          increase_amount?: number
          merit_cycle_id?: string
          new_salary?: number
          recommended_increase_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "merit_results_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merit_results_merit_cycle_id_fkey"
            columns: ["merit_cycle_id"]
            isOneToOne: false
            referencedRelation: "merit_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          invoice_issued_at: string | null
          invoice_number: string | null
          items: Json
          organization_id: string | null
          paid_amount: number | null
          paid_at: string | null
          paylink_card_brand: string | null
          paylink_card_last4: string | null
          paylink_card_token: string | null
          paylink_invoice_id: string | null
          paylink_payment_url: string | null
          paylink_transaction_no: string | null
          plan_id: string | null
          product_key: string | null
          raw_create_response: Json | null
          raw_verify_response: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal_amount: number | null
          updated_at: string
          user_id: string
          vat_amount: number | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          items?: Json
          organization_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paylink_card_brand?: string | null
          paylink_card_last4?: string | null
          paylink_card_token?: string | null
          paylink_invoice_id?: string | null
          paylink_payment_url?: string | null
          paylink_transaction_no?: string | null
          plan_id?: string | null
          product_key?: string | null
          raw_create_response?: Json | null
          raw_verify_response?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal_amount?: number | null
          updated_at?: string
          user_id: string
          vat_amount?: number | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          items?: Json
          organization_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paylink_card_brand?: string | null
          paylink_card_last4?: string | null
          paylink_card_token?: string | null
          paylink_invoice_id?: string | null
          paylink_payment_url?: string | null
          paylink_transaction_no?: string | null
          plan_id?: string | null
          product_key?: string | null
          raw_create_response?: Json | null
          raw_verify_response?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal_amount?: number | null
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_custom_field_defs: {
        Row: {
          created_at: string
          field_type: string
          id: string
          key: string
          label: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          key: string
          label: string
          organization_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_custom_field_defs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approval_settings: Json
          created_at: string
          created_by: string | null
          default_currency: string
          fiscal_year_start: string
          id: string
          locale: string
          name: string
          onboarding: Json
        }
        Insert: {
          approval_settings?: Json
          created_at?: string
          created_by?: string | null
          default_currency?: string
          fiscal_year_start?: string
          id?: string
          locale?: string
          name: string
          onboarding?: Json
        }
        Update: {
          approval_settings?: Json
          created_at?: string
          created_by?: string | null
          default_currency?: string
          fiscal_year_start?: string
          id?: string
          locale?: string
          name?: string
          onboarding?: Json
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          card_token: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          organization_id: string
          provider: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          card_token?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          organization_id: string
          provider?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          card_token?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          organization_id?: string
          provider?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          invited_by_email: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          invited_by_email?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          invited_by_email?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      plans: {
        Row: {
          annual_price: number
          created_at: string
          cta_label: string | null
          currency: string
          description: string | null
          features: Json
          id: string
          is_recommended: boolean
          is_visible: boolean
          max_employees: number
          max_users: number
          monthly_price: number
          name: string
          onboarding_type: string
          paddle_annual_price_id: string | null
          paddle_monthly_price_id: string | null
          slug: string
          sort_order: number
          status: string
          support_tier: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          annual_price?: number
          created_at?: string
          cta_label?: string | null
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_recommended?: boolean
          is_visible?: boolean
          max_employees?: number
          max_users?: number
          monthly_price?: number
          name: string
          onboarding_type?: string
          paddle_annual_price_id?: string | null
          paddle_monthly_price_id?: string | null
          slug: string
          sort_order?: number
          status?: string
          support_tier?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          cta_label?: string | null
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_recommended?: boolean
          is_visible?: boolean
          max_employees?: number
          max_users?: number
          monthly_price?: number
          name?: string
          onboarding_type?: string
          paddle_annual_price_id?: string | null
          paddle_monthly_price_id?: string | null
          slug?: string
          sort_order?: number
          status?: string
          support_tier?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          last_login_at: string | null
          role: Database["public"]["Enums"]["platform_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_grades: {
        Row: {
          created_at: string
          grade_code: string
          grade_name: string | null
          id: string
          maximum: number
          midpoint: number
          minimum: number
          progression_percent: number
          salary_structure_id: string
          sequence: number
          spread_percent: number
        }
        Insert: {
          created_at?: string
          grade_code: string
          grade_name?: string | null
          id?: string
          maximum: number
          midpoint: number
          minimum: number
          progression_percent?: number
          salary_structure_id: string
          sequence: number
          spread_percent: number
        }
        Update: {
          created_at?: string
          grade_code?: string
          grade_name?: string | null
          id?: string
          maximum?: number
          midpoint?: number
          minimum?: number
          progression_percent?: number
          salary_structure_id?: string
          sequence?: number
          spread_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_grades_salary_structure_id_fkey"
            columns: ["salary_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          change_amount: number | null
          change_percent: number | null
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          currency: string | null
          effective_date: string | null
          employee_id: string
          id: string
          new_salary: number
          note: string | null
          organization_id: string
          previous_salary: number | null
          reason: Database["public"]["Enums"]["salary_change_reason"]
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          change_amount?: number | null
          change_percent?: number | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          currency?: string | null
          effective_date?: string | null
          employee_id: string
          id?: string
          new_salary: number
          note?: string | null
          organization_id: string
          previous_salary?: number | null
          reason?: Database["public"]["Enums"]["salary_change_reason"]
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          change_amount?: number | null
          change_percent?: number | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          currency?: string | null
          effective_date?: string | null
          employee_id?: string
          id?: string
          new_salary?: number
          note?: string | null
          organization_id?: string
          previous_salary?: number | null
          reason?: Database["public"]["Enums"]["salary_change_reason"]
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          archived: boolean
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          default_progression_percent: number
          default_spread_percent: number
          effective_date: string
          grade_count: number
          id: string
          name: string
          notes: string | null
          organization_id: string
          progression_type: Database["public"]["Enums"]["progression_type"]
          rounding_rule: number
          spread_type: Database["public"]["Enums"]["spread_type"]
          starting_midpoint: number
        }
        Insert: {
          archived?: boolean
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_progression_percent?: number
          default_spread_percent?: number
          effective_date?: string
          grade_count?: number
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          progression_type?: Database["public"]["Enums"]["progression_type"]
          rounding_rule?: number
          spread_type?: Database["public"]["Enums"]["spread_type"]
          starting_midpoint?: number
        }
        Update: {
          archived?: boolean
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_progression_percent?: number
          default_spread_percent?: number
          effective_date?: string
          grade_count?: number
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          progression_type?: Database["public"]["Enums"]["progression_type"]
          rounding_rule?: number
          spread_type?: Database["public"]["Enums"]["spread_type"]
          starting_midpoint?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          dormant_at: string | null
          end_at: string | null
          environment: string
          grace_end_at: string | null
          id: string
          last_trial_email_at: string | null
          last_trial_email_stage: string | null
          notes: string | null
          organization_id: string
          paddle_customer_id: string | null
          paddle_price_id: string | null
          paddle_subscription_id: string | null
          payment_status: string
          plan_id: string | null
          renewal_at: string | null
          restricted_at: string | null
          start_at: string | null
          status: string
          trial_end_at: string | null
          trial_start_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          dormant_at?: string | null
          end_at?: string | null
          environment?: string
          grace_end_at?: string | null
          id?: string
          last_trial_email_at?: string | null
          last_trial_email_stage?: string | null
          notes?: string | null
          organization_id: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          payment_status?: string
          plan_id?: string | null
          renewal_at?: string | null
          restricted_at?: string | null
          start_at?: string | null
          status?: string
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          dormant_at?: string | null
          end_at?: string | null
          environment?: string
          grace_end_at?: string | null
          id?: string
          last_trial_email_at?: string | null
          last_trial_email_stage?: string | null
          notes?: string | null
          organization_id?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          payment_status?: string
          plan_id?: string | null
          renewal_at?: string | null
          restricted_at?: string | null
          start_at?: string | null
          status?: string
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_reply_at: string | null
          locale: string
          organization_id: string | null
          priority: string
          requester_email: string
          requester_name: string
          status: string
          subject: string
          tags: string[]
          ticket_number: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_reply_at?: string | null
          locale?: string
          organization_id?: string | null
          priority?: string
          requester_email: string
          requester_name: string
          status?: string
          subject: string
          tags?: string[]
          ticket_number?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_reply_at?: string | null
          locale?: string
          organization_id?: string | null
          priority?: string
          requester_email?: string
          requester_name?: string
          status?: string
          subject?: string
          tags?: string[]
          ticket_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      version_history: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          entity_id: string
          entity_type: string
          id: string
          label: string | null
          organization_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          entity_id: string
          entity_type: string
          id?: string
          label?: string | null
          organization_id: string
          snapshot: Json
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string | null
          organization_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_platform_role: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["platform_role"]
      }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _uid: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _uid: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_invoice_number: { Args: never; Returns: string }
      org_can_write: { Args: { _org: string }; Returns: boolean }
      org_lifecycle_status: { Args: { _org: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      share_org_with_user: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer" | "manager"
      cycle_status: "draft" | "in_review" | "approved" | "closed"
      employment_status: "active" | "on_leave" | "terminated"
      order_status: "pending" | "paid" | "failed" | "cancelled"
      platform_role:
        | "super_admin"
        | "platform_admin"
        | "content_manager"
        | "support_manager"
        | "billing_manager"
        | "viewer"
      progression_type: "fixed" | "custom"
      salary_change_reason:
        | "manual_edit"
        | "merit_cycle"
        | "bonus_adjustment"
        | "promotion"
        | "market_adjustment"
        | "correction"
        | "approval_applied"
        | "other"
      spread_type: "fixed" | "variable"
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
      app_role: ["admin", "analyst", "viewer", "manager"],
      cycle_status: ["draft", "in_review", "approved", "closed"],
      employment_status: ["active", "on_leave", "terminated"],
      order_status: ["pending", "paid", "failed", "cancelled"],
      platform_role: [
        "super_admin",
        "platform_admin",
        "content_manager",
        "support_manager",
        "billing_manager",
        "viewer",
      ],
      progression_type: ["fixed", "custom"],
      salary_change_reason: [
        "manual_edit",
        "merit_cycle",
        "bonus_adjustment",
        "promotion",
        "market_adjustment",
        "correction",
        "approval_applied",
        "other",
      ],
      spread_type: ["fixed", "variable"],
    },
  },
} as const
