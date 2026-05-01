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
    PostgrestVersion: "14.1"
  }
  xayma_app: {
    Tables: {
      control_nodes: {
        Row: {
          authorizationtoken: string | null
          created: string
          createdby: string | null
          hostname: string
          id: number
          ipaddress: string | null
          modified: string | null
          modifiedby: string | null
          name: string
          status: Database["xayma_app"]["Enums"]["record_status"] | null
        }
        Insert: {
          authorizationtoken?: string | null
          created?: string
          createdby?: string | null
          hostname: string
          id?: number
          ipaddress?: string | null
          modified?: string | null
          modifiedby?: string | null
          name: string
          status?: Database["xayma_app"]["Enums"]["record_status"] | null
        }
        Update: {
          authorizationtoken?: string | null
          created?: string
          createdby?: string | null
          hostname?: string
          id?: number
          ipaddress?: string | null
          modified?: string | null
          modifiedby?: string | null
          name?: string
          status?: Database["xayma_app"]["Enums"]["record_status"] | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amountPaid: number | null
          created: string
          createdby: string | null
          creditsPurchased: number | null
          creditsRemaining: number | null
          creditsUsed: number | null
          customerPhone: string | null
          id: number
          modified: string | null
          modifiedby: string | null
          partner_current_status: string | null
          partner_id: number
          paymentMethod: string | null
          status:
            | Database["xayma_app"]["Enums"]["credit_transaction_status"]
            | null
          transactionType:
            | Database["xayma_app"]["Enums"]["credit_transaction_type"]
            | null
        }
        Insert: {
          amountPaid?: number | null
          created?: string
          createdby?: string | null
          creditsPurchased?: number | null
          creditsRemaining?: number | null
          creditsUsed?: number | null
          customerPhone?: string | null
          id?: number
          modified?: string | null
          modifiedby?: string | null
          partner_current_status?: string | null
          partner_id: number
          paymentMethod?: string | null
          status?:
            | Database["xayma_app"]["Enums"]["credit_transaction_status"]
            | null
          transactionType?:
            | Database["xayma_app"]["Enums"]["credit_transaction_type"]
            | null
        }
        Update: {
          amountPaid?: number | null
          created?: string
          createdby?: string | null
          creditsPurchased?: number | null
          creditsRemaining?: number | null
          creditsUsed?: number | null
          customerPhone?: string | null
          id?: number
          modified?: string | null
          modifiedby?: string | null
          partner_current_status?: string | null
          partner_id?: number
          paymentMethod?: string | null
          status?:
            | Database["xayma_app"]["Enums"]["credit_transaction_status"]
            | null
          transactionType?:
            | Database["xayma_app"]["Enums"]["credit_transaction_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created: string
          createdby: string | null
          deploymentPlan: string | null
          domainNames: string[]
          id: number
          label: string
          modified: string | null
          modifiedby: string | null
          partner_id: number
          plan_slug: string
          service_id: number
          serviceVersion: string | null
          slug: string
          status: Database["xayma_app"]["Enums"]["deployment_status"] | null
        }
        Insert: {
          created?: string
          createdby?: string | null
          deploymentPlan?: string | null
          domainNames: string[]
          id?: number
          label: string
          modified?: string | null
          modifiedby?: string | null
          partner_id: number
          plan_slug: string
          service_id: number
          serviceVersion?: string | null
          slug: string
          status?: Database["xayma_app"]["Enums"]["deployment_status"] | null
        }
        Update: {
          created?: string
          createdby?: string | null
          deploymentPlan?: string | null
          domainNames?: string[]
          id?: number
          label?: string
          modified?: string | null
          modifiedby?: string | null
          partner_id?: number
          plan_slug?: string
          service_id?: number
          serviceVersion?: string | null
          slug?: string
          status?: Database["xayma_app"]["Enums"]["deployment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      general_audit: {
        Row: {
          action: string | null
          audit_id: number
          company_id: number | null
          created: string | null
          description: string | null
          email: string | null
          firstname: string | null
          lastname: string | null
          modified: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
          user_role: Database["xayma_app"]["Enums"]["user_role"] | null
        }
        Insert: {
          action?: string | null
          audit_id?: number
          company_id?: number | null
          created?: string | null
          description?: string | null
          email?: string | null
          firstname?: string | null
          lastname?: string | null
          modified?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_role?: Database["xayma_app"]["Enums"]["user_role"] | null
        }
        Update: {
          action?: string | null
          audit_id?: number
          company_id?: number | null
          created?: string | null
          description?: string | null
          email?: string | null
          firstname?: string | null
          lastname?: string | null
          modified?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_role?: Database["xayma_app"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created: string
          id: number
          message: string | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created?: string
          id?: number
          message?: string | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created?: string
          id?: number
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_credit_purchase_options: {
        Row: {
          created: string | null
          createdby: string | null
          id: number
          max_credit_debt_allowed: number | null
          modified: string | null
          modifiedby: string | null
          partner_type: Database["xayma_app"]["Enums"]["partner_type"] | null
          threshold_discount_percent: number | null
          threshold_type:
            | Database["xayma_app"]["Enums"]["credit_purchase_threshold_type"]
            | null
          threshold_value: number | null
        }
        Insert: {
          created?: string | null
          createdby?: string | null
          id?: number
          max_credit_debt_allowed?: number | null
          modified?: string | null
          modifiedby?: string | null
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"] | null
          threshold_discount_percent?: number | null
          threshold_type?:
            | Database["xayma_app"]["Enums"]["credit_purchase_threshold_type"]
            | null
          threshold_value?: number | null
        }
        Update: {
          created?: string | null
          createdby?: string | null
          id?: number
          max_credit_debt_allowed?: number | null
          modified?: string | null
          modifiedby?: string | null
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"] | null
          threshold_discount_percent?: number | null
          threshold_type?:
            | Database["xayma_app"]["Enums"]["credit_purchase_threshold_type"]
            | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          activity_area: string[] | null
          address: string | null
          allowCreditDebt: boolean | null
          created: string
          createdby: string | null
          creditDebtThreshold: number | null
          description: string | null
          email: string | null
          id: number
          modified: string | null
          modifiedby: string | null
          name: string
          partner_type: Database["xayma_app"]["Enums"]["partner_type"] | null
          phone: string | null
          remainingCredits: number
          slug: string
          status: Database["xayma_app"]["Enums"]["partner_status"] | null
        }
        Insert: {
          activity_area?: string[] | null
          address?: string | null
          allowCreditDebt?: boolean | null
          created?: string
          createdby?: string | null
          creditDebtThreshold?: number | null
          description?: string | null
          email?: string | null
          id?: number
          modified?: string | null
          modifiedby?: string | null
          name: string
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"] | null
          phone?: string | null
          remainingCredits?: number
          slug: string
          status?: Database["xayma_app"]["Enums"]["partner_status"] | null
        }
        Update: {
          activity_area?: string[] | null
          address?: string | null
          allowCreditDebt?: boolean | null
          created?: string
          createdby?: string | null
          creditDebtThreshold?: number | null
          description?: string | null
          email?: string | null
          id?: number
          modified?: string | null
          modifiedby?: string | null
          name?: string
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"] | null
          phone?: string | null
          remainingCredits?: number
          slug?: string
          status?: Database["xayma_app"]["Enums"]["partner_status"] | null
        }
        Relationships: []
      }
      services: {
        Row: {
          controlNodeId: number | null
          created: string
          createdby: string | null
          deployment_template: Json | null
          description: string | null
          dockerimage: string | null
          id: number
          isPubliclyAvailable: boolean | null
          lifecycle_commands: Json
          logo_url: string | null
          modified: string | null
          modifiedby: string | null
          name: string
          plans: Json
          slug: string
        }
        Insert: {
          controlNodeId?: number | null
          created?: string
          createdby?: string | null
          deployment_template?: Json | null
          description?: string | null
          dockerimage?: string | null
          id?: number
          isPubliclyAvailable?: boolean | null
          lifecycle_commands?: Json
          logo_url?: string | null
          modified?: string | null
          modifiedby?: string | null
          name: string
          plans?: Json
          slug: string
        }
        Update: {
          controlNodeId?: number | null
          created?: string
          createdby?: string | null
          deployment_template?: Json | null
          description?: string | null
          dockerimage?: string | null
          id?: number
          isPubliclyAvailable?: boolean | null
          lifecycle_commands?: Json
          logo_url?: string | null
          modified?: string | null
          modifiedby?: string | null
          name?: string
          plans?: Json
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_controlNodeId_fkey"
            columns: ["controlNodeId"]
            isOneToOne: false
            referencedRelation: "control_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created: string | null
          id: number
          key: string
          modified: string | null
          value: string | null
        }
        Insert: {
          created?: string | null
          id?: number
          key: string
          modified?: string | null
          value?: string | null
        }
        Update: {
          created?: string | null
          id?: number
          key?: string
          modified?: string | null
          value?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          company_id: number
          created: string
          email: string | null
          firstname: string
          id: string
          lastname: string | null
          modified: string | null
          user_role: Database["xayma_app"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: number
          created?: string
          email?: string | null
          firstname: string
          id: string
          lastname?: string | null
          modified?: string | null
          user_role: Database["xayma_app"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: number
          created?: string
          email?: string | null
          firstname?: string
          id?: string
          lastname?: string | null
          modified?: string | null
          user_role?: Database["xayma_app"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_redemptions: {
        Row: {
          credit_transaction_id: number
          id: number
          partner_id: number
          redeemed_at: string
          redeemed_by: string | null
          voucher_id: number
        }
        Insert: {
          credit_transaction_id: number
          id?: number
          partner_id: number
          redeemed_at: string
          redeemed_by?: string | null
          voucher_id: number
        }
        Update: {
          credit_transaction_id?: number
          id?: number
          partner_id?: number
          redeemed_at?: string
          redeemed_by?: string | null
          voucher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created: string
          createdby: string | null
          credits: number
          expires_at: string | null
          id: number
          max_uses: number
          modified: string | null
          modifiedby: string | null
          partner_id: number | null
          partner_type: Database["xayma_app"]["Enums"]["partner_type"][] | null
          status: Database["xayma_app"]["Enums"]["voucher_status"] | null
          uses_count: number
        }
        Insert: {
          code: string
          created?: string
          createdby?: string | null
          credits: number
          expires_at?: string | null
          id?: number
          max_uses?: number
          modified?: string | null
          modifiedby?: string | null
          partner_id?: number | null
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"][] | null
          status?: Database["xayma_app"]["Enums"]["voucher_status"] | null
          uses_count?: number
        }
        Update: {
          code?: string
          created?: string
          createdby?: string | null
          credits?: number
          expires_at?: string | null
          id?: number
          max_uses?: number
          modified?: string | null
          modifiedby?: string | null
          partner_id?: number | null
          partner_type?: Database["xayma_app"]["Enums"]["partner_type"][] | null
          status?: Database["xayma_app"]["Enums"]["voucher_status"] | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_company_id: { Args: never; Returns: number }
      current_user_role: {
        Args: never
        Returns: Database["xayma_app"]["Enums"]["user_role"]
      }
      valid_domain_array: { Args: { domains: string[] }; Returns: boolean }
    }
    Enums: {
      credit_purchase_threshold_type: "minimal" | "middle" | "maximum"
      credit_transaction_status: "pending" | "completed" | "failed"
      credit_transaction_type: "credit" | "debit"
      deployment_status:
        | "pending_deployment"
        | "deploying"
        | "failed"
        | "active"
        | "stopped"
        | "suspended"
        | "archived"
        | "pending_deletion"
      partner_status:
        | "active"
        | "disabled"
        | "low_credit"
        | "no_credit"
        | "on_debt"
        | "suspended"
        | "archived"
        | "pending_deletion"
      partner_type: "customer" | "affiliate" | "reseller" | "pro_reseller"
      record_status: "active" | "inactive" | "archived"
      user_role:
        | "ANONYMOUS"
        | "CUSTOMER"
        | "SUPPORT"
        | "ADMIN"
        | "RESELLER"
        | "SALES"
      voucher_status: "active" | "inactive" | "fully_redeemed" | "expired"
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
  xayma_app: {
    Enums: {
      credit_purchase_threshold_type: ["minimal", "middle", "maximum"],
      credit_transaction_status: ["pending", "completed", "failed"],
      credit_transaction_type: ["credit", "debit"],
      deployment_status: [
        "pending_deployment",
        "deploying",
        "failed",
        "active",
        "stopped",
        "suspended",
        "archived",
        "pending_deletion",
      ],
      partner_status: [
        "active",
        "disabled",
        "low_credit",
        "no_credit",
        "on_debt",
        "suspended",
        "archived",
        "pending_deletion",
      ],
      partner_type: ["customer", "affiliate", "reseller", "pro_reseller"],
      record_status: ["active", "inactive", "archived"],
      user_role: [
        "ANONYMOUS",
        "CUSTOMER",
        "SUPPORT",
        "ADMIN",
        "RESELLER",
        "SALES",
      ],
      voucher_status: ["active", "inactive", "fully_redeemed", "expired"],
    },
  },
} as const
