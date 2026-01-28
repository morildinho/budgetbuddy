import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUser() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    is_admin: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, is_admin")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        setLoading(false);
        return;
      }

      setUser(data);
      setLoading(false);
    }

    fetchUser();
  }, []);

  return { user, loading, isAdmin: user?.is_admin || false };
}
