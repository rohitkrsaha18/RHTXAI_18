import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: any;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, preferences")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select("id, display_name, avatar_url, preferences")
      .single();
    if (data) setProfile(data);
  };

  return { profile, updateProfile };
}
