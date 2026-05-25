export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
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
          gender: string | null;
          gender_visible_in_public: boolean | null;
          id: string;
          is_verified: boolean | null;
          languages: string[] | null;
          passport_country: string | null;
          passport_expires_at: string | null;
          passport_stamps: Json | null;
          preferences: Json | null;
          reminder_categories_muted: string[] | null;
          reputation_score: number | null;
          show_age_in_public: boolean | null;
          smart_reminders_enabled: boolean | null;
          socials: Json | null;
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
          gender?: string | null;
          gender_visible_in_public?: boolean | null;
          id: string;
          is_verified?: boolean | null;
          languages?: string[] | null;
          passport_country?: string | null;
          passport_expires_at?: string | null;
          passport_stamps?: Json | null;
          preferences?: Json | null;
          reminder_categories_muted?: string[] | null;
          reputation_score?: number | null;
          show_age_in_public?: boolean | null;
          smart_reminders_enabled?: boolean | null;
          socials?: Json | null;
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
          gender?: string | null;
          gender_visible_in_public?: boolean | null;
          id?: string;
          is_verified?: boolean | null;
          languages?: string[] | null;
          passport_country?: string | null;
          passport_expires_at?: string | null;
          passport_stamps?: Json | null;
          preferences?: Json | null;
          reminder_categories_muted?: string[] | null;
          reputation_score?: number | null;
          show_age_in_public?: boolean | null;
          smart_reminders_enabled?: boolean | null;
          socials?: Json | null;
          travel_style?: string[] | null;
          updated_at?: string | null;
          username?: string | null;
          verification_level?: number | null;
          visibility?: string | null;
        };
        Relationships: [];
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
      trip_members: {
        Row: {
          joined_at: string | null;
          location_sharing: string | null;
          role: string;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string | null;
          location_sharing?: string | null;
          role?: string;
          trip_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string | null;
          location_sharing?: string | null;
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
    };
    Views: { [_ in never]: never };
    Functions: {
      is_trip_editor: { Args: { trip: string; uid: string }; Returns: boolean };
      is_trip_member: { Args: { trip: string; uid: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
