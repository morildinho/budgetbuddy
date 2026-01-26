"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Save,
  X,
  Calendar,
  Store,
  Tag,
  FileText,
  Loader2,
  AlertCircle,
  ShoppingCart,
  ImageIcon,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useReceipt } from "@/hooks/useReceipts";
import { useReceipts } from "@/hooks/useReceipts";
import { useCategories } from "@/hooks/useCategories";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { receipt, loading, error } = useReceipt(id);
  const { updateReceipt, deleteReceipt } = useReceipts();
  const { categories } = useCategories();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    merchant: "",
    receipt_date: "",
    total_amount: "",
    category_id: "",
    notes: "",
  });

  // Generate signed URL for receipt image
  useEffect(() => {
    async function getSignedUrl() {
      if (receipt?.image_url) {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from('receipts')
          .createSignedUrl(receipt.image_url, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
      }
    }
    getSignedUrl();
  }, [receipt?.image_url]);

  // Initialize edit form when receipt loads
  const startEditing = () => {
    if (receipt) {
      setEditForm({
        merchant: receipt.merchant,
        receipt_date: receipt.receipt_date,
        total_amount: String(receipt.total_amount),
        category_id: receipt.category_id || "",
        notes: receipt.notes || "",
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateReceipt(id, {
      merchant: editForm.merchant,
      receipt_date: editForm.receipt_date,
      total_amount: parseFloat(editForm.total_amount),
      category_id: editForm.category_id || null,
      notes: editForm.notes || null,
    });
    setIsSaving(false);

    if (result) {
      setIsEditing(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Er du sikker på at du vil slette denne kvitteringen? Denne handlingen kan ikke angres.")) {
      return;
    }

    setIsDeleting(true);
    const success = await deleteReceipt(id);

    if (success) {
      router.push("/receipts");
    } else {
      setIsDeleting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const categoryOptions = [
    { value: "", label: "Ingen kategori" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-[var(--accent-danger)] mb-4" />
        <p className="text-[var(--text-primary)] font-medium">Kvittering ikke funnet</p>
        <p className="text-[var(--text-muted)] text-sm mb-4">{error || "Denne kvitteringen kan ha blitt slettet"}</p>
        <Link href="/receipts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Tilbake til kvitteringer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/receipts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {isEditing ? "Rediger kvittering" : receipt.merchant}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {formatDate(receipt.receipt_date)}
            </p>
          </div>
        </div>

        {!isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="h-4 w-4" />
              Rediger
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              Slett
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode */
        <Card>
          <CardBody className="p-6">
            <div className="space-y-4">
              <Input
                label="Butikk"
                name="merchant"
                value={editForm.merchant}
                onChange={handleChange}
                required
              />

              <Input
                label="Dato"
                name="receipt_date"
                type="date"
                value={editForm.receipt_date}
                onChange={handleChange}
                required
              />

              <Input
                label="Totalbeløp (NOK)"
                name="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={editForm.total_amount}
                onChange={handleChange}
                required
              />

              <Select
                label="Kategori"
                name="category_id"
                value={editForm.category_id}
                onChange={handleChange}
                options={categoryOptions}
              />

              <Input
                label="Notater"
                name="notes"
                value={editForm.notes}
                onChange={handleChange}
                placeholder="Eventuelle tilleggsnotater..."
              />

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  isLoading={isSaving}
                >
                  <Save className="h-4 w-4" />
                  Lagre endringer
                </Button>
                <Button variant="outline" onClick={cancelEditing}>
                  <X className="h-4 w-4" />
                  Avbryt
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        /* View Mode */
        <div className="space-y-6">
          {/* Receipt Image */}
          {imageUrl && (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                      <ImageIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Kvitteringsbilde</p>
                      <p className="text-sm text-[var(--text-muted)]">Skannet original</p>
                    </div>
                  </div>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Åpne i ny fane
                  </a>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--border-primary)]">
                  <img
                    src={imageUrl}
                    alt="Kvittering"
                    className="w-full object-contain max-h-[500px] bg-[var(--bg-secondary)]"
                  />
                </div>
              </CardBody>
            </Card>
          )}

          {/* Receipt Details */}
          <Card>
            <CardBody className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <Store className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Butikk</p>
                    <p className="font-medium text-[var(--text-primary)]">{receipt.merchant}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Dato</p>
                    <p className="font-medium text-[var(--text-primary)]">{formatDate(receipt.receipt_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-success)]/10">
                    <span className="text-lg font-bold text-[var(--accent-success)]">kr</span>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Totalbeløp</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatCurrency(Number(receipt.total_amount))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <Tag className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Kategori</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {receipt.category?.name || "Ukategorisert"}
                    </p>
                  </div>
                </div>

                {receipt.notes && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                      <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Notater</p>
                      <p className="text-[var(--text-secondary)]">{receipt.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Receipt Items */}
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                  <ShoppingCart className="h-5 w-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Varer</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {receipt.items?.length || 0} varer
                  </p>
                </div>
              </div>

              {receipt.items && receipt.items.length > 0 ? (
                <div className="space-y-3">
                  {receipt.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.item_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {item.quantity} stk
                            </span>
                          )}
                          {item.unit_price && (
                            <span className="text-xs text-[var(--text-muted)]">
                              à {formatCurrency(Number(item.unit_price))}
                            </span>
                          )}
                          {item.category && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${item.category.color}20`,
                                color: item.category.color,
                              }}
                            >
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {formatCurrency(Number(item.total_price))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                  Ingen varer registrert for denne kvitteringen
                </p>
              )}
            </CardBody>
          </Card>

          {/* Metadata */}
          <Card>
            <CardBody className="p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Opprettet: {new Date(receipt.created_at).toLocaleString('no-NO')}
              </p>
              {receipt.updated_at !== receipt.created_at && (
                <p className="text-xs text-[var(--text-muted)]">
                  Oppdatert: {new Date(receipt.updated_at).toLocaleString('no-NO')}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
