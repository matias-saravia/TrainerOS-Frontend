export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      client_routines: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          routine_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          routine_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          altura: number | null
          apellido: string
          consideraciones: string | null
          created_at: string
          email: string
          estado_pago: string
          experiencia: Database["public"]["Enums"]["exercise_difficulty"]
          fecha_inicio: string
          fecha_nacimiento: string | null
          grasa_corporal: number | null
          historial_medico: string | null
          id: string
          nombre: string
          objetivo: string | null
          peso_inicial: number | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          semana_actual: number
          status: Database["public"]["Enums"]["client_status"]
          telefono: string | null
          total_semanas: number
          trainer_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          altura?: number | null
          apellido?: string
          consideraciones?: string | null
          created_at?: string
          email: string
          estado_pago?: string
          experiencia?: Database["public"]["Enums"]["exercise_difficulty"]
          fecha_inicio?: string
          fecha_nacimiento?: string | null
          grasa_corporal?: number | null
          historial_medico?: string | null
          id?: string
          nombre: string
          objetivo?: string | null
          peso_inicial?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          semana_actual?: number
          status?: Database["public"]["Enums"]["client_status"]
          telefono?: string | null
          total_semanas?: number
          trainer_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          altura?: number | null
          apellido?: string
          consideraciones?: string | null
          created_at?: string
          email?: string
          estado_pago?: string
          experiencia?: Database["public"]["Enums"]["exercise_difficulty"]
          fecha_inicio?: string
          fecha_nacimiento?: string | null
          grasa_corporal?: number | null
          historial_medico?: string | null
          id?: string
          nombre?: string
          objetivo?: string | null
          peso_inicial?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          semana_actual?: number
          status?: Database["public"]["Enums"]["client_status"]
          telefono?: string | null
          total_semanas?: number
          trainer_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          dificultad: Database["public"]["Enums"]["exercise_difficulty"]
          duracion_estimada: number | null
          grupo_muscular: Database["public"]["Enums"]["muscle_group"]
          grupos_secundarios:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          id: string
          imagen_url: string | null
          instrucciones: string[]
          nombre: string
          series_default: number | null
          trainer_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          dificultad?: Database["public"]["Enums"]["exercise_difficulty"]
          duracion_estimada?: number | null
          grupo_muscular: Database["public"]["Enums"]["muscle_group"]
          grupos_secundarios?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          id?: string
          imagen_url?: string | null
          instrucciones?: string[]
          nombre: string
          series_default?: number | null
          trainer_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          dificultad?: Database["public"]["Enums"]["exercise_difficulty"]
          duracion_estimada?: number | null
          grupo_muscular?: Database["public"]["Enums"]["muscle_group"]
          grupos_secundarios?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          id?: string
          imagen_url?: string | null
          instrucciones?: string[]
          nombre?: string
          series_default?: number | null
          trainer_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellido: string
          avatar_url: string | null
          created_at: string
          id: string
          nombre: string
          role: Database["public"]["Enums"]["user_role"]
          slug: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          avatar_url?: string | null
          created_at?: string
          id: string
          nombre: string
          role?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre?: string
          role?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      routine_block_exercises: {
        Row: {
          block_id: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps: string
          rest_seconds: number | null
          sets: number
          tempo: string | null
        }
        Insert: {
          block_id: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string
          rest_seconds?: number | null
          sets?: number
          tempo?: string | null
        }
        Update: {
          block_id?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string
          rest_seconds?: number | null
          sets?: number
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_block_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "routine_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_blocks: {
        Row: {
          created_at: string
          id: string
          label: string
          order_index: number
          routine_id: string
          type: Database["public"]["Enums"]["block_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          order_index?: number
          routine_id: string
          type?: Database["public"]["Enums"]["block_type"]
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          order_index?: number
          routine_id?: string
          type?: Database["public"]["Enums"]["block_type"]
        }
        Relationships: [
          {
            foreignKeyName: "routine_blocks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          descripcion: string | null
          dia: string | null
          id: string
          nombre: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          dia?: string | null
          id?: string
          nombre: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          dia?: string | null
          id?: string
          nombre?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          categoria: string | null
          descanso: number
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          peso_objetivo: number | null
          peso_registrado: number | null
          reps: string
          series: number
          session_id: string
          sets_completados: number
        }
        Insert: {
          categoria?: string | null
          descanso?: number
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          peso_objetivo?: number | null
          peso_registrado?: number | null
          reps?: string
          series?: number
          session_id: string
          sets_completados?: number
        }
        Update: {
          categoria?: string | null
          descanso?: number
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          peso_objetivo?: number | null
          peso_registrado?: number | null
          reps?: string
          series?: number
          session_id?: string
          sets_completados?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_entries: {
        Row: {
          client_id: string
          created_at: string
          exercise_id: string
          fecha: string
          id: string
          kg: number
          reps: number | null
          rpe: number | null
          session_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          exercise_id: string
          fecha?: string
          id?: string
          kg: number
          reps?: number | null
          rpe?: number | null
          session_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          exercise_id?: string
          fecha?: string
          id?: string
          kg?: number
          reps?: number | null
          rpe?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          fecha: string
          id: string
          nombre: string
          notes: string | null
          routine_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          trainer_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          fecha?: string
          id?: string
          nombre: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          fecha?: string
          id?: string
          nombre?: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_client_access: { Args: { p_slug: string }; Returns: string }
      complete_workout_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      get_trainer_public: {
        Args: { p_slug: string }
        Returns: {
          apellido: string
          avatar_url: string
          nombre: string
        }[]
      }
      log_workout_set: {
        Args: { p_kg?: number; p_session_exercise_id: string }
        Returns: {
          categoria: string | null
          descanso: number
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          peso_objetivo: number | null
          peso_registrado: number | null
          reps: string
          series: number
          session_id: string
          sets_completados: number
        }
        SetofOptions: {
          from: "*"
          to: "session_exercises"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_routine: {
        Args: {
          p_blocks: Json
          p_descripcion: string
          p_nombre: string
          p_routine_id: string
        }
        Returns: string
      }
      start_workout_session: {
        Args: { p_fecha?: string; p_routine_id: string }
        Returns: string
      }
    }
    Enums: {
      block_type: "single" | "superset"
      client_status: "aldia" | "vence" | "pendiente"
      exercise_difficulty: "Principiante" | "Intermedio" | "Avanzado"
      muscle_group:
        | "Pecho"
        | "Espalda"
        | "Piernas"
        | "Hombros"
        | "Bíceps"
        | "Tríceps"
        | "Core"
        | "Glúteos"
      plan_tier: "basico" | "estandar" | "premium" | "personalizado"
      session_status: "pending" | "in-progress" | "completed"
      user_role: "trainer" | "client"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      block_type: ["single", "superset"],
      client_status: ["aldia", "vence", "pendiente"],
      exercise_difficulty: ["Principiante", "Intermedio", "Avanzado"],
      muscle_group: [
        "Pecho",
        "Espalda",
        "Piernas",
        "Hombros",
        "Bíceps",
        "Tríceps",
        "Core",
        "Glúteos",
      ],
      plan_tier: ["basico", "estandar", "premium", "personalizado"],
      session_status: ["pending", "in-progress", "completed"],
      user_role: ["trainer", "client"],
    },
  },
} as const

