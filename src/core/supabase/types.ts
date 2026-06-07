export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          created_at: string;
          description_key: string;
          id: string;
          is_active: boolean;
          name_key: string;
          rarity: string;
          sort_order: number;
          sprite_id: string;
          trigger_rule: Json;
        };
        Insert: {
          created_at?: string;
          description_key: string;
          id: string;
          is_active?: boolean;
          name_key: string;
          rarity: string;
          sort_order?: number;
          sprite_id: string;
          trigger_rule: Json;
        };
        Update: {
          created_at?: string;
          description_key?: string;
          id?: string;
          is_active?: boolean;
          name_key?: string;
          rarity?: string;
          sort_order?: number;
          sprite_id?: string;
          trigger_rule?: Json;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          checked_in_at: string | null;
          id: string;
          location_actual: unknown;
          milestone_id: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          checked_in_at?: string | null;
          id?: string;
          location_actual?: unknown;
          milestone_id: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          checked_in_at?: string | null;
          id?: string;
          location_actual?: unknown;
          milestone_id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_item_completions: {
        Row: {
          done_at: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          done_at?: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          done_at?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_item_completions_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_items';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_items: {
        Row: {
          assigned_to: string | null;
          category: string;
          checklist_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          document_id: string | null;
          done_at: string | null;
          done_by: string | null;
          due_date: string | null;
          id: string;
          is_done: boolean;
          label: string;
          order_index: number;
          scope: string;
          trip_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          category?: string;
          checklist_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          document_id?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          id?: string;
          is_done?: boolean;
          label: string;
          order_index?: number;
          scope?: string;
          trip_id: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          checklist_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          document_id?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          id?: string;
          is_done?: boolean;
          label?: string;
          order_index?: number;
          scope?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_items_checklist_id_fkey';
            columns: ['checklist_id'];
            isOneToOne: false;
            referencedRelation: 'trip_checklists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_items_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_items_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_suggestion_dismissals: {
        Row: {
          dismissed_at: string;
          dismissed_by: string;
          suggestion_key: string;
          trip_id: string;
        };
        Insert: {
          dismissed_at?: string;
          dismissed_by: string;
          suggestion_key: string;
          trip_id: string;
        };
        Update: {
          dismissed_at?: string;
          dismissed_by?: string;
          suggestion_key?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_suggestion_dismissals_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_template_items: {
        Row: {
          category: string;
          i18n_key: string | null;
          id: string;
          label: string | null;
          order_index: number;
          scope: string;
          template_id: string;
        };
        Insert: {
          category?: string;
          i18n_key?: string | null;
          id?: string;
          label?: string | null;
          order_index?: number;
          scope?: string;
          template_id: string;
        };
        Update: {
          category?: string;
          i18n_key?: string | null;
          id?: string;
          label?: string | null;
          order_index?: number;
          scope?: string;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_template_items_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_templates: {
        Row: {
          created_by: string | null;
          i18n_key: string;
          icon_sprite: string | null;
          id: string;
          is_system: boolean;
          sort_order: number;
        };
        Insert: {
          created_by?: string | null;
          i18n_key: string;
          icon_sprite?: string | null;
          id: string;
          is_system?: boolean;
          sort_order?: number;
        };
        Update: {
          created_by?: string | null;
          i18n_key?: string;
          icon_sprite?: string | null;
          id?: string;
          is_system?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      country_requirements: {
        Row: {
          action_url: string | null;
          applies_to_passport_countries: string[];
          created_at: string;
          destination_country: string | null;
          destination_regions: string[];
          estimated_cost_usd: number | null;
          estimated_processing_days: number | null;
          excluded_passport_countries: string[];
          followup_lead_times: number[];
          i18n_key: string;
          id: string;
          last_verified: string;
          passport_validity_required_months: number | null;
          required: boolean;
          requirement_type: string;
          severity: string;
          source_urls: string[];
          trip_duration_max_days: number | null;
          trip_duration_min_days: number | null;
          trip_purpose: string[];
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          action_url?: string | null;
          applies_to_passport_countries?: string[];
          created_at?: string;
          destination_country?: string | null;
          destination_regions?: string[];
          estimated_cost_usd?: number | null;
          estimated_processing_days?: number | null;
          excluded_passport_countries?: string[];
          followup_lead_times?: number[];
          i18n_key: string;
          id: string;
          last_verified: string;
          passport_validity_required_months?: number | null;
          required?: boolean;
          requirement_type: string;
          severity?: string;
          source_urls?: string[];
          trip_duration_max_days?: number | null;
          trip_duration_min_days?: number | null;
          trip_purpose?: string[];
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          action_url?: string | null;
          applies_to_passport_countries?: string[];
          created_at?: string;
          destination_country?: string | null;
          destination_regions?: string[];
          estimated_cost_usd?: number | null;
          estimated_processing_days?: number | null;
          excluded_passport_countries?: string[];
          followup_lead_times?: number[];
          i18n_key?: string;
          id?: string;
          last_verified?: string;
          passport_validity_required_months?: number | null;
          required?: boolean;
          requirement_type?: string;
          severity?: string;
          source_urls?: string[];
          trip_duration_max_days?: number | null;
          trip_duration_min_days?: number | null;
          trip_purpose?: string[];
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          category: string;
          expires_at: string | null;
          external_url: string | null;
          file_type: string;
          id: string;
          milestone_id: string | null;
          mime_type: string | null;
          name: string;
          size_bytes: number | null;
          storage_path: string | null;
          trip_id: string;
          uploaded_at: string;
          uploaded_by: string;
        };
        Insert: {
          category?: string;
          expires_at?: string | null;
          external_url?: string | null;
          file_type: string;
          id?: string;
          milestone_id?: string | null;
          mime_type?: string | null;
          name: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          trip_id: string;
          uploaded_at?: string;
          uploaded_by: string;
        };
        Update: {
          category?: string;
          expires_at?: string | null;
          external_url?: string | null;
          file_type?: string;
          id?: string;
          milestone_id?: string | null;
          mime_type?: string | null;
          name?: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          trip_id?: string;
          uploaded_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      encounter_cache: {
        Row: {
          cache_key: string;
          expires_at: string;
          fetched_at: string;
          results: Json;
        };
        Insert: {
          cache_key: string;
          expires_at: string;
          fetched_at?: string;
          results: Json;
        };
        Update: {
          cache_key?: string;
          expires_at?: string;
          fetched_at?: string;
          results?: Json;
        };
        Relationships: [];
      };
      milestone_legs: {
        Row: {
          computed_at: string;
          distance_m: number;
          duration_s: number;
          from_milestone_id: string;
          mode: string;
          to_milestone_id: string;
          trip_id: string;
        };
        Insert: {
          computed_at?: string;
          distance_m: number;
          duration_s: number;
          from_milestone_id: string;
          mode?: string;
          to_milestone_id: string;
          trip_id: string;
        };
        Update: {
          computed_at?: string;
          distance_m?: number;
          duration_s?: number;
          from_milestone_id?: string;
          mode?: string;
          to_milestone_id?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'milestone_legs_from_milestone_id_fkey';
            columns: ['from_milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestone_legs_to_milestone_id_fkey';
            columns: ['to_milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestone_legs_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          address: string | null;
          arrival_at: string | null;
          color: string | null;
          created_at: string | null;
          created_by: string;
          custom_type_label: string | null;
          departure_at: string | null;
          description: string | null;
          id: string;
          is_boss: boolean | null;
          lat: number | null;
          lng: number | null;
          location: unknown;
          metadata: Json | null;
          name: string;
          order_index: number;
          sprite_id: string | null;
          trip_id: string;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          arrival_at?: string | null;
          color?: string | null;
          created_at?: string | null;
          created_by: string;
          custom_type_label?: string | null;
          departure_at?: string | null;
          description?: string | null;
          id?: string;
          is_boss?: boolean | null;
          lat?: number | null;
          lng?: number | null;
          location?: unknown;
          metadata?: Json | null;
          name: string;
          order_index: number;
          sprite_id?: string | null;
          trip_id: string;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          arrival_at?: string | null;
          color?: string | null;
          created_at?: string | null;
          created_by?: string;
          custom_type_label?: string | null;
          departure_at?: string | null;
          description?: string | null;
          id?: string;
          is_boss?: boolean | null;
          lat?: number | null;
          lng?: number | null;
          location?: unknown;
          metadata?: Json | null;
          name?: string;
          order_index?: number;
          sprite_id?: string | null;
          trip_id?: string;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'milestones_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestones_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          data: Json;
          id: string;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          category: string;
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      personal_reminders: {
        Row: {
          body: string | null;
          created_at: string;
          fired_lead_times: number[];
          i18n_key: string | null;
          id: string;
          lead_times: number[];
          notifications_sent_at: string[];
          related_document_id: string | null;
          reminder_type: string;
          snooze_until: string | null;
          source: string;
          status: string;
          target_date: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          fired_lead_times?: number[];
          i18n_key?: string | null;
          id?: string;
          lead_times?: number[];
          notifications_sent_at?: string[];
          related_document_id?: string | null;
          reminder_type: string;
          snooze_until?: string | null;
          source?: string;
          status?: string;
          target_date: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          fired_lead_times?: number[];
          i18n_key?: string | null;
          id?: string;
          lead_times?: number[];
          notifications_sent_at?: string[];
          related_document_id?: string | null;
          reminder_type?: string;
          snooze_until?: string | null;
          source?: string;
          status?: string;
          target_date?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'personal_reminders_related_document_id_fkey';
            columns: ['related_document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      photos: {
        Row: {
          caption: string | null;
          created_at: string;
          height: number | null;
          id: string;
          milestone_id: string | null;
          size_bytes: number;
          storage_path: string;
          taken_at: string | null;
          trip_id: string;
          user_id: string;
          width: number | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          milestone_id?: string | null;
          size_bytes?: number;
          storage_path: string;
          taken_at?: string | null;
          trip_id: string;
          user_id: string;
          width?: number | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          milestone_id?: string | null;
          size_bytes?: number;
          storage_path?: string;
          taken_at?: string | null;
          trip_id?: string;
          user_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_votes: {
        Row: {
          option_id: string;
          poll_id: string;
          user_id: string;
          voted_at: string;
        };
        Insert: {
          option_id: string;
          poll_id: string;
          user_id: string;
          voted_at?: string;
        };
        Update: {
          option_id?: string;
          poll_id?: string;
          user_id?: string;
          voted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_votes_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'polls';
            referencedColumns: ['id'];
          },
        ];
      };
      polls: {
        Row: {
          closed_at: string | null;
          created_at: string;
          created_by: string;
          expires_at: string | null;
          id: string;
          milestone_id: string | null;
          options: Json;
          question: string;
          trip_id: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          milestone_id?: string | null;
          options: Json;
          question: string;
          trip_id: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          milestone_id?: string | null;
          options?: Json;
          question?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'polls_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'polls_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          age_range: string | null;
          avatar_color: string | null;
          avatar_sprite_id: string | null;
          badges: Json | null;
          bio: string | null;
          countries_visited: string[] | null;
          created_at: string | null;
          display_name: string | null;
          first_name: string | null;
          gender: string | null;
          gender_visible_in_public: boolean | null;
          id: string;
          identity_verified_at: string | null;
          is_verified: boolean | null;
          languages: string[] | null;
          last_name: string | null;
          passport_country: string | null;
          passport_expires_at: string | null;
          passport_stamps: Json | null;
          phone_number: string | null;
          preferences: Json | null;
          reminder_categories_muted: string[] | null;
          reputation_score: number | null;
          show_age_in_public: boolean | null;
          smart_reminders_enabled: boolean | null;
          socials: Json | null;
          stripe_identity_session_id: string | null;
          travel_style: string[] | null;
          updated_at: string | null;
          username: string | null;
          verification_level: number | null;
          visibility: string | null;
        };
        Insert: {
          age_range?: string | null;
          avatar_color?: string | null;
          avatar_sprite_id?: string | null;
          badges?: Json | null;
          bio?: string | null;
          countries_visited?: string[] | null;
          created_at?: string | null;
          display_name?: string | null;
          first_name?: string | null;
          gender?: string | null;
          gender_visible_in_public?: boolean | null;
          id: string;
          identity_verified_at?: string | null;
          is_verified?: boolean | null;
          languages?: string[] | null;
          last_name?: string | null;
          passport_country?: string | null;
          passport_expires_at?: string | null;
          passport_stamps?: Json | null;
          phone_number?: string | null;
          preferences?: Json | null;
          reminder_categories_muted?: string[] | null;
          reputation_score?: number | null;
          show_age_in_public?: boolean | null;
          smart_reminders_enabled?: boolean | null;
          socials?: Json | null;
          stripe_identity_session_id?: string | null;
          travel_style?: string[] | null;
          updated_at?: string | null;
          username?: string | null;
          verification_level?: number | null;
          visibility?: string | null;
        };
        Update: {
          age_range?: string | null;
          avatar_color?: string | null;
          avatar_sprite_id?: string | null;
          badges?: Json | null;
          bio?: string | null;
          countries_visited?: string[] | null;
          created_at?: string | null;
          display_name?: string | null;
          first_name?: string | null;
          gender?: string | null;
          gender_visible_in_public?: boolean | null;
          id?: string;
          identity_verified_at?: string | null;
          is_verified?: boolean | null;
          languages?: string[] | null;
          last_name?: string | null;
          passport_country?: string | null;
          passport_expires_at?: string | null;
          passport_stamps?: Json | null;
          phone_number?: string | null;
          preferences?: Json | null;
          reminder_categories_muted?: string[] | null;
          reputation_score?: number | null;
          show_age_in_public?: boolean | null;
          smart_reminders_enabled?: boolean | null;
          socials?: Json | null;
          stripe_identity_session_id?: string | null;
          travel_style?: string[] | null;
          updated_at?: string | null;
          username?: string | null;
          verification_level?: number | null;
          visibility?: string | null;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [];
      };
      scrapbooks: {
        Row: {
          generated_at: string;
          generated_by: string;
          id: string;
          pdf_path: string | null;
          png_path: string | null;
          stats: Json;
          trip_id: string;
        };
        Insert: {
          generated_at?: string;
          generated_by: string;
          id?: string;
          pdf_path?: string | null;
          png_path?: string | null;
          stats?: Json;
          trip_id: string;
        };
        Update: {
          generated_at?: string;
          generated_by?: string;
          id?: string;
          pdf_path?: string | null;
          png_path?: string | null;
          stats?: Json;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scrapbooks_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      time_capsules: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          message: string;
          milestone_id: string | null;
          notified_at: string | null;
          open_after: string | null;
          open_at_milestone: string | null;
          opened_at: string | null;
          recipient_id: string | null;
          trip_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          message: string;
          milestone_id?: string | null;
          notified_at?: string | null;
          open_after?: string | null;
          open_at_milestone?: string | null;
          opened_at?: string | null;
          recipient_id?: string | null;
          trip_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          message?: string;
          milestone_id?: string | null;
          notified_at?: string | null;
          open_after?: string | null;
          open_at_milestone?: string | null;
          opened_at?: string | null;
          recipient_id?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_capsules_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_capsules_open_at_milestone_fkey';
            columns: ['open_at_milestone'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_capsules_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_checklists: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_default: boolean;
          order_index: number;
          title: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          is_default?: boolean;
          order_index?: number;
          title: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_default?: boolean;
          order_index?: number;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_checklists_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_discovery_index: {
        Row: {
          countries: string[] | null;
          date_range: unknown;
          geo_bbox: unknown;
          trip_id: string;
        };
        Insert: {
          countries?: string[] | null;
          date_range?: unknown;
          geo_bbox?: unknown;
          trip_id: string;
        };
        Update: {
          countries?: string[] | null;
          date_range?: unknown;
          geo_bbox?: unknown;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_discovery_index_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string | null;
          email: string | null;
          expires_at: string;
          id: string;
          invited_by: string;
          role: string | null;
          token: string;
          trip_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          email?: string | null;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role?: string | null;
          token?: string;
          trip_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          email?: string | null;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: string | null;
          token?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_invitations_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_invitations_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_join_requests: {
        Row: {
          contact_exchanged_at: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          match_score: number | null;
          message: string | null;
          proposed_milestones: string[] | null;
          proposed_segment_end: string | null;
          proposed_segment_start: string | null;
          requester_id: string;
          responded_at: string | null;
          responded_by: string | null;
          response_message: string | null;
          status: string;
          trip_id: string;
        };
        Insert: {
          contact_exchanged_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          match_score?: number | null;
          message?: string | null;
          proposed_milestones?: string[] | null;
          proposed_segment_end?: string | null;
          proposed_segment_start?: string | null;
          requester_id: string;
          responded_at?: string | null;
          responded_by?: string | null;
          response_message?: string | null;
          status?: string;
          trip_id: string;
        };
        Update: {
          contact_exchanged_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          match_score?: number | null;
          message?: string | null;
          proposed_milestones?: string[] | null;
          proposed_segment_end?: string | null;
          proposed_segment_start?: string | null;
          requester_id?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          response_message?: string | null;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_join_requests_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_members: {
        Row: {
          joined_at: string | null;
          last_lat: number | null;
          last_lng: number | null;
          last_position_at: string | null;
          location_sharing: string | null;
          panic_until: string | null;
          role: string;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_position_at?: string | null;
          location_sharing?: string | null;
          panic_until?: string | null;
          role?: string;
          trip_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_position_at?: string | null;
          location_sharing?: string | null;
          panic_until?: string | null;
          role?: string;
          trip_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_members_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_smart_reminders: {
        Row: {
          added_to_checklist_item_id: string | null;
          created_at: string;
          fired_lead_times: number[];
          id: string;
          marked_done_at: string | null;
          notifications_sent_at: string[];
          requirement_id: string;
          snooze_until: string | null;
          status: string;
          trip_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          added_to_checklist_item_id?: string | null;
          created_at?: string;
          fired_lead_times?: number[];
          id?: string;
          marked_done_at?: string | null;
          notifications_sent_at?: string[];
          requirement_id: string;
          snooze_until?: string | null;
          status?: string;
          trip_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          added_to_checklist_item_id?: string | null;
          created_at?: string;
          fired_lead_times?: number[];
          id?: string;
          marked_done_at?: string | null;
          notifications_sent_at?: string[];
          requirement_id?: string;
          snooze_until?: string | null;
          status?: string;
          trip_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_smart_reminders_added_to_checklist_item_id_fkey';
            columns: ['added_to_checklist_item_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_smart_reminders_requirement_id_fkey';
            columns: ['requirement_id'];
            isOneToOne: false;
            referencedRelation: 'country_requirements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_smart_reminders_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trips: {
        Row: {
          cover_image_url: string | null;
          created_at: string | null;
          current_joiners_count: number | null;
          description: string | null;
          destination_countries: string[] | null;
          destination_country: string | null;
          end_date: string | null;
          id: string;
          is_women_only: boolean | null;
          joinable_segments: Json | null;
          joiner_note: string | null;
          max_joiners: number | null;
          name: string;
          open_age_max: number | null;
          open_age_min: number | null;
          open_budget_level: string | null;
          open_languages: string[] | null;
          open_to_genders: string[] | null;
          open_vibes: string[] | null;
          owner_id: string;
          requires_verified_joiners: boolean | null;
          share_token: string | null;
          start_date: string | null;
          status: string | null;
          updated_at: string | null;
          visibility: string | null;
          world_theme: string | null;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string | null;
          current_joiners_count?: number | null;
          description?: string | null;
          destination_countries?: string[] | null;
          destination_country?: string | null;
          end_date?: string | null;
          id?: string;
          is_women_only?: boolean | null;
          joinable_segments?: Json | null;
          joiner_note?: string | null;
          max_joiners?: number | null;
          name: string;
          open_age_max?: number | null;
          open_age_min?: number | null;
          open_budget_level?: string | null;
          open_languages?: string[] | null;
          open_to_genders?: string[] | null;
          open_vibes?: string[] | null;
          owner_id: string;
          requires_verified_joiners?: boolean | null;
          share_token?: string | null;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          visibility?: string | null;
          world_theme?: string | null;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string | null;
          current_joiners_count?: number | null;
          description?: string | null;
          destination_countries?: string[] | null;
          destination_country?: string | null;
          end_date?: string | null;
          id?: string;
          is_women_only?: boolean | null;
          joinable_segments?: Json | null;
          joiner_note?: string | null;
          max_joiners?: number | null;
          name?: string;
          open_age_max?: number | null;
          open_age_min?: number | null;
          open_budget_level?: string | null;
          open_languages?: string[] | null;
          open_to_genders?: string[] | null;
          open_vibes?: string[] | null;
          owner_id?: string;
          requires_verified_joiners?: boolean | null;
          share_token?: string | null;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          visibility?: string | null;
          world_theme?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          trip_id: string | null;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          trip_id?: string | null;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          trip_id?: string | null;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievement_definitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          reason: string | null;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          reason?: string | null;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      user_push_tokens: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
          platform: string;
          timezone: string | null;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          id?: string;
          platform: string;
          timezone?: string | null;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
          platform?: string;
          timezone?: string | null;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weather_cache: {
        Row: {
          expires_at: string;
          fetched_at: string;
          milestone_id: string;
          payload: Json;
        };
        Insert: {
          expires_at: string;
          fetched_at?: string;
          milestone_id: string;
          payload: Json;
        };
        Update: {
          expires_at?: string;
          fetched_at?: string;
          milestone_id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'weather_cache_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: true;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _capsule_is_open: {
        Args: { p_open_after: string; p_open_at_milestone: string };
        Returns: boolean;
      };
      _evaluate_achievements: {
        Args: { p_uid: string };
        Returns: {
          achievement_id: string;
          trip_id: string | null;
          unlocked_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'user_achievements';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _rebuild_passport: { Args: { p_uid: string }; Returns: undefined };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      evaluate_achievements: {
        Args: never;
        Returns: {
          achievement_id: string;
          trip_id: string | null;
          unlocked_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'user_achievements';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
      get_public_profile: {
        Args: { p_user_id: string };
        Returns: {
          age_range: string;
          avatar_color: string;
          avatar_sprite_id: string;
          badges: Json;
          bio: string;
          countries_visited: string[];
          display_name: string;
          gender: string;
          id: string;
          is_verified: boolean;
          username: string;
          verification_level: number;
        }[];
      };
      get_trip_member_profiles: {
        Args: { p_trip_id: string };
        Returns: {
          avatar_color: string;
          avatar_sprite_id: string;
          display_name: string;
          id: string;
        }[];
      };
      gettransactionid: { Args: never; Returns: unknown };
      is_trip_editor: { Args: { trip: string; uid: string }; Returns: boolean };
      is_trip_member: { Args: { trip: string; uid: string }; Returns: boolean };
      list_trip_capsules: {
        Args: { p_trip_id: string };
        Returns: {
          author_id: string;
          created_at: string;
          id: string;
          is_open: boolean;
          message: string;
          open_after: string;
          open_at_milestone: string;
          opened_at: string;
          recipient_id: string;
        }[];
      };
      longtransactionsenabled: { Args: never; Returns: boolean };
      open_time_capsule: { Args: { p_capsule_id: string }; Returns: string };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      purge_account_data: { Args: { p_uid: string }; Returns: undefined };
      reaction_target_trip: {
        Args: { p_id: string; p_type: string };
        Returns: string;
      };
      rebuild_my_passport: { Args: never; Returns: undefined };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      unlockrows: { Args: { '': string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
      verify_webhook_secret: { Args: { candidate: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
