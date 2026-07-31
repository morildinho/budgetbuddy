import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("portfolio_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ assets: data || [] });
  } catch (error) {
    console.error("Error fetching portfolio assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const normalizedSymbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
    const normalizedName = typeof body.name === "string" ? body.name.trim() : "";
    const normalizedType = typeof body.asset_type === "string" ? body.asset_type.trim().toLowerCase() : "";
    const normalizedCurrency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "USD";
    const quantity = Number(body.quantity);
    const purchasePrice = body.purchase_price == null || body.purchase_price === ""
      ? null
      : Number(body.purchase_price);
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

    if (!normalizedSymbol || !normalizedName) {
      return NextResponse.json({ error: "Symbol and name are required" }, { status: 400 });
    }

    if (!["stock", "crypto", "cash"].includes(normalizedType)) {
      return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 });
    }

    if (purchasePrice != null && (!Number.isFinite(purchasePrice) || purchasePrice < 0)) {
      return NextResponse.json({ error: "Invalid purchase price" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("add_or_merge_portfolio_asset", {
      p_symbol: normalizedSymbol,
      p_name: normalizedName,
      p_asset_type: normalizedType,
      p_quantity: quantity,
      p_purchase_price: purchasePrice,
      p_currency: normalizedType === "cash" ? "NOK" : normalizedCurrency,
      p_notes: notes,
    });

    if (error) {
      if (error.message.includes("different currency")) {
        return NextResponse.json(
          { error: "Denne beholdningen finnes allerede med en annen valuta. Oppdater eksisterende holding i stedet." },
          { status: 409 }
        );
      }
      throw error;
    }

    const result = data as { asset: Record<string, unknown>; merged: boolean };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating or merging portfolio asset:", error);
    return NextResponse.json({ error: "Failed to create or merge asset" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { id, notes, quantity, name, purchase_price, currency } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data: existingAsset, error: existingError } = await supabase
      .from("portfolio_assets")
      .select("id, asset_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingError || !existingAsset) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    const updates: Record<string, string | number | null> = {};

    if (notes !== undefined) {
      updates.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
    }

    if (name !== undefined) {
      const normalizedName = typeof name === "string" ? name.trim() : "";
      if (!normalizedName) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      updates.name = normalizedName;
    }

    if (quantity !== undefined) {
      const normalizedQuantity = Number(quantity);
      if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 });
      }
      updates.quantity = normalizedQuantity;
    }

    if (existingAsset.asset_type === "cash") {
      updates.purchase_price = null;
      updates.currency = "NOK";
    } else {
      if (purchase_price !== undefined) {
        const normalizedPurchasePrice = purchase_price == null || purchase_price === ""
          ? null
          : Number(purchase_price);
        if (normalizedPurchasePrice != null && (!Number.isFinite(normalizedPurchasePrice) || normalizedPurchasePrice < 0)) {
          return NextResponse.json({ error: "Invalid purchase price" }, { status: 400 });
        }
        updates.purchase_price = normalizedPurchasePrice;
      }

      if (currency !== undefined) {
        const normalizedCurrency = typeof currency === "string" ? currency.trim().toUpperCase() : "";
        if (!["USD", "NOK", "EUR"].includes(normalizedCurrency)) {
          return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
        }
        updates.currency = normalizedCurrency;
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("portfolio_assets")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ asset: data });
  } catch (error) {
    console.error("Error updating portfolio asset:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("portfolio_assets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting portfolio asset:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
