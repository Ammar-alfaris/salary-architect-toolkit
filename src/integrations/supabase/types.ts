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
      approval_requests: {
        Row: {
          created_at: string
          decision_note: string | null
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          organization_id: string
          payload: Json
          reason: string | null
          requested_by: string
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_email: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decision_note?: string | null
          entity_id: string
          entity_label?: string | null
          entity_type: string
          id?: string
          organization_id: string
          payload?: Json
          reason?: string | null
          requested_by: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decision_note?: string | null
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          reason?: string | null
          requested_by?: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: string
        }
        Relationships: []
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
      bonus_cycles: {
        Row: {
          business_multiplier: number
          created_at: string
          default_target_bonus_percent: number
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["cycle_status"]
          year: number
        }
        Insert: {
          business_multiplier?: number
          created_at?: string
          default_target_bonus_percent?: number
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["cycle_status"]
          year: number
        }
        Update: {
          business_multiplier?: number
          created_at?: string
          default_target_bonus_percent?: number
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
      employee_allowances: {
        Row: {
          allowance_policy_id: string | null
          created_at: string
          custom_amount: number
          education_amount: number
          employee_id: string
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
      employees: {
        Row: {
          archived: boolean
          base_salary: number
          created_at: string
          department: string | null
          email: string | null
          employee_code: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          full_name: string | null
          grade_id: string | null
          hire_date: string | null
          id: string
          job_family: string | null
          job_title: string | null
          last_name: string
          location: string | null
          manager_name: string | null
          organization_id: string
          performance_rating: string | null
          salary_structure_id: string | null
          target_bonus_percent: number
        }
        Insert: {
          archived?: boolean
          base_salary?: number
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          full_name?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          job_family?: string | null
          job_title?: string | null
          last_name: string
          location?: string | null
          manager_name?: string | null
          organization_id: string
          performance_rating?: string | null
          salary_structure_id?: string | null
          target_bonus_percent?: number
        }
        Update: {
          archived?: boolean
          base_salary?: number
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          full_name?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          job_family?: string | null
          job_title?: string | null
          last_name?: string
          location?: string | null
          manager_name?: string | null
          organization_id?: string
          performance_rating?: string | null
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
          created_at: string
          effective_date: string
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["cycle_status"]
          total_budget_percent: number
        }
        Insert: {
          created_at?: string
          effective_date?: string
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["cycle_status"]
          total_budget_percent?: number
        }
        Update: {
          created_at?: string
          effective_date?: string
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
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer" | "manager"
      cycle_status: "draft" | "in_review" | "approved" | "closed"
      employment_status: "active" | "on_leave" | "terminated"
      progression_type: "fixed" | "custom"
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
      progression_type: ["fixed", "custom"],
      spread_type: ["fixed", "variable"],
    },
  },
} as const
