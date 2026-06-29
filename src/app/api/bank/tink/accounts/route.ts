import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch bank accounts:", error);
      return NextResponse.json({ error: "Kunne ikke hente kontoer" }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (err) {
    console.error("Bank accounts error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
