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
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          criticality: Database["public"]["Enums"]["criticality_level"]
          description: string | null
          id: string
          name: string
          system_id: string
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          description?: string | null
          id?: string
          name: string
          system_id: string
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          description?: string | null
          id?: string
          name?: string
          system_id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          orden: number
          report_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          orden?: number
          report_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          orden?: number
          report_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          equipment_id: string
          fecha_inspeccion: string
          hallazgos: string | null
          id: string
          recomendacion: string | null
          status_resultante: Database["public"]["Enums"]["equipment_status"]
          tecnico: string | null
          tipo: string
          updated_at: string
          week_number: number
          weekly_report_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          equipment_id: string
          fecha_inspeccion?: string
          hallazgos?: string | null
          id?: string
          recomendacion?: string | null
          status_resultante?: Database["public"]["Enums"]["equipment_status"]
          tecnico?: string | null
          tipo: string
          updated_at?: string
          week_number: number
          weekly_report_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          equipment_id?: string
          fecha_inspeccion?: string
          hallazgos?: string | null
          id?: string
          recomendacion?: string | null
          status_resultante?: Database["public"]["Enums"]["equipment_status"]
          tecnico?: string | null
          tipo?: string
          updated_at?: string
          week_number?: number
          weekly_report_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_weekly_report_id_fkey"
            columns: ["weekly_report_id"]
            isOneToOne: false
            referencedRelation: "weekly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      stc_spools: {
        Row: {
          branch: Database["public"]["Enums"]["stc_branch"]
          created_at: string
          id: string
          order_index: number
          spool_number: number | null
          station_id: string
          tag: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["stc_branch"]
          created_at?: string
          id?: string
          order_index?: number
          spool_number?: number | null
          station_id: string
          tag: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["stc_branch"]
          created_at?: string
          id?: string
          order_index?: number
          spool_number?: number | null
          station_id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stc_spools_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stc_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stc_stations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      stc_temperature_readings: {
        Row: {
          created_at: string
          delta_t: number | null
          id: string
          measured_at: string | null
          spool_id: string
          t_max: number | null
          t_min: number | null
          updated_at: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          delta_t?: number | null
          id?: string
          measured_at?: string | null
          spool_id: string
          t_max?: number | null
          t_min?: number | null
          updated_at?: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          delta_t?: number | null
          id?: string
          measured_at?: string | null
          spool_id?: string
          t_max?: number | null
          t_min?: number | null
          updated_at?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "stc_temperature_readings_spool_id_fkey"
            columns: ["spool_id"]
            isOneToOne: false
            referencedRelation: "stc_spools"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "systems_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          planned_date: string | null
          sap_notification: string | null
          sap_order: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          technical_description: string | null
          updated_at: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          planned_date?: string | null
          sap_notification?: string | null
          sap_order?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          technical_description?: string | null
          updated_at?: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          planned_date?: string | null
          sap_notification?: string | null
          sap_order?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          technical_description?: string | null
          updated_at?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      criticality_level: "Alta" | "Media" | "Baja"
      equipment_status:
        | "Satisfactorio"
        | "Seguimiento"
        | "Crítico"
        | "Alerta"
        | "Sin medición"
      stc_branch: "principal" | "variable_emergencia"
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
      criticality_level: ["Alta", "Media", "Baja"],
      equipment_status: [
        "Satisfactorio",
        "Seguimiento",
        "Crítico",
        "Alerta",
        "Sin medición",
      ],
      stc_branch: ["principal", "variable_emergencia"],
    },
  },
} as const
