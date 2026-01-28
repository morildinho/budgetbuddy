"use client";

export const dynamic = 'force-dynamic';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Edit2,
  Check,
  Trash2,
} from "lucide-react";
import { useReceipts } from "@/hooks/useReceipts";
import { useCategories } from "@/hooks/useCategories";
import { useLearnedCategories } from "@/hooks/useLearnedCategories";
import { createClient } from "@/lib/supabase/client";
import type { OCRResult, OCRItem } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

interface ExtractedItem extends OCRItem {
  category_id: string | null;
  isEditing?: boolean;
  userCorrected?: boolean;
}

export default function AddReceiptPage() {
  const router = useRouter();
  const { createReceipt } = useReceipts();
  const { categories, loading: categoriesLoading, createCategory } = useCategories();
  const { findBestCategory, learnCategory } = useLearnedCategories();

  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [form, setForm] = useState({
    merchant: "",
    date: new Date().toISOString().split("T")[0],
    total: "",
    category_id: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Build category options from database
  const categoryOptions = [
    { value: "", label: "Velg kategori" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
    { value: "__new__", label: "+ Legg til ny kategori" },
  ];

  const handleCreateNewCategory = async (itemIndex: number) => {
    if (!newCategoryName.trim()) return;

    const newCategory = await createCategory(newCategoryName.trim());
    if (newCategory) {
      handleItemCategoryChange(itemIndex, newCategory.id);
      setShowNewCategoryInput(null);
      setNewCategoryName("");
    }
  };

  const handleCategorySelectChange = (index: number, value: string) => {
    if (value === "__new__") {
      setShowNewCategoryInput(index);
      setNewCategoryName("");
    } else {
      handleItemCategoryChange(index, value);
      setShowNewCategoryInput(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Vennligst velg en bildefil");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Bildet må være mindre enn 10MB");
        return;
      }

      // Store file for later upload
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        setImagePreview(base64Image);
        setError(null);

        // Auto-scan the receipt
        await scanReceipt(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const scanReceipt = async (imageData: string) => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke skanne kvitteringen");
      }

      setOcrResult(data);

      // Update form with extracted data
      setForm((prev) => ({
        ...prev,
        merchant: data.merchant || prev.merchant,
        date: data.date || prev.date,
        total: data.total?.toString() || prev.total,
      }));

      // Process extracted items with category matching
      const itemsWithCategories: ExtractedItem[] = data.items.map((item: OCRItem) => {
        const categoryId = findBestCategory(item.name, item.suggested_category, categories);
        return {
          ...item,
          category_id: categoryId,
          isEditing: false,
          userCorrected: false,
        };
      });

      setExtractedItems(itemsWithCategories);

      // Find items that need user confirmation (low confidence or no category match)
      const uncertainItems = itemsWithCategories.filter(
        (item) => item.confidence < 0.7 || !item.category_id
      );

      if (uncertainItems.length > 0) {
        setError(`${uncertainItems.length} vare(r) trenger gjennomgang - sjekk kategoriene nedenfor`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke skanne kvitteringen";
      setError(message);
      console.error("OCR error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setOcrResult(null);
    setExtractedItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleItemCategoryChange = (index: number, categoryId: string) => {
    setExtractedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, category_id: categoryId, userCorrected: true }
          : item
      )
    );
  };

  const handleItemEdit = (index: number, field: keyof ExtractedItem, value: string | number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const toggleItemEdit = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  };

  const handleItemDelete = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Du må være logget inn");
      }

      // Upload image to storage if available
      let imageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          // Don't fail the whole operation, just log it
        } else {
          // Store the file path - we'll generate signed URLs when viewing
          imageUrl = fileName;
        }
      }

      // Learn from user corrections
      for (const item of extractedItems) {
        if (item.userCorrected && item.category_id) {
          await learnCategory(item.name, item.category_id);
        }
      }

      // Create the receipt
      const result = await createReceipt({
        merchant: form.merchant,
        receipt_date: form.date,
        total_amount: parseFloat(form.total),
        category_id: form.category_id || null,
        notes: form.notes || null,
        image_url: imageUrl,
        ocr_method: ocrResult ? "gpt-4-vision" : null,
        raw_ocr_text: ocrResult?.raw_text || null,
        confidence_score: ocrResult?.confidence || null,
      });

      if (result) {
        // Save extracted items to receipt_items table
        if (extractedItems.length > 0) {
          const itemsToInsert = extractedItems.map((item, index) => ({
            receipt_id: result.id,
            item_name: item.name,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category_id: item.category_id || null,
            line_number: index + 1,
          }));

          const { error: itemsError } = await supabase
            .from("receipt_items")
            .insert(itemsToInsert);

          if (itemsError) {
            console.error("Error saving receipt items:", itemsError);
            // Don't fail the whole operation, just log the error
          }
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/receipts");
        }, 1500);
      } else {
        throw new Error("Kunne ikke lagre kvitteringen");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke lagre kvitteringen";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-success)]/20">
          <CheckCircle className="h-10 w-10 text-[var(--accent-success)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Kvittering lagt til!</h2>
        <p className="text-sm text-[var(--text-muted)]">Omdirigerer til kvitteringer...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Legg til kvittering</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {ocrResult ? "Se gjennom utpakkede data" : "Ta bilde eller last opp kvitteringen"}
        </p>
      </div>

      {/* Error/Warning Message */}
      {error && (
        <Card className="mb-6 border-[var(--accent-warning)]/30">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-[var(--accent-warning)]" />
              <p className="text-sm text-[var(--accent-warning)]">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Upload */}
      <Card className="mb-6">
        <CardBody className="p-6">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Forhåndsvisning av kvittering"
                className="w-full rounded-lg object-contain max-h-48"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 rounded-full bg-[var(--bg-primary)]/80 text-[var(--text-primary)] hover:bg-[var(--accent-danger)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/80 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                    <p className="text-sm text-[var(--text-primary)]">Analyserer kvittering...</p>
                  </div>
                </div>
              )}
              {ocrResult && !isScanning && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--accent-success)]" />
                  <p className="text-sm text-[var(--accent-success)]">
                    Hentet {extractedItems.length} varer • {Math.round(ocrResult.confidence * 100)}% sikkerhet
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[var(--border-primary)] p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary)]/10">
                <ImageIcon className="h-8 w-8 text-[var(--accent-primary)]" />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" type="button" onClick={handleCameraClick}>
                  <Camera className="h-4 w-4" />
                  Kamera
                </Button>
                <Button variant="outline" type="button" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" />
                  Last opp
                </Button>
              </div>
              <p className="text-center text-sm text-[var(--text-muted)]">
                Ta et bilde, så henter vi ut dataene automatisk
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Extracted Items */}
      {extractedItems.length > 0 && (
        <Card className="mb-6">
          <CardBody className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">Utpakkede varer</h3>
              <span className="text-xs text-[var(--text-muted)]">
                Trykk for å redigere • Endre kategorier for å lære AI-en
              </span>
            </div>
            <div className="space-y-3">
              {extractedItems.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 ${
                    item.confidence < 0.7 || !item.category_id
                      ? "bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30"
                      : "bg-[var(--bg-secondary)]"
                  }`}
                >
                  {item.isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemEdit(index, "name", e.target.value)}
                        placeholder="Varenavn"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={item.total_price}
                          onChange={(e) => handleItemEdit(index, "total_price", parseFloat(e.target.value))}
                          placeholder="Pris"
                          className="w-24"
                        />
                        <Select
                          value={item.category_id || ""}
                          onChange={(e) => handleCategorySelectChange(index, e.target.value)}
                          options={categoryOptions}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="sm" onClick={() => toggleItemEdit(index)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleItemDelete(index)}>
                          <Trash2 className="h-4 w-4 text-[var(--accent-danger)]" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                          {item.confidence < 0.7 && (
                            <span className="text-xs text-[var(--accent-warning)]">
                              (usikker)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {showNewCategoryInput === index ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Ny kategori..."
                                className="text-xs h-7 w-28"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateNewCategory(index)}
                                disabled={!newCategoryName.trim()}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewCategoryInput(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Select
                                value={item.category_id || ""}
                                onChange={(e) => handleCategorySelectChange(index, e.target.value)}
                                options={categoryOptions}
                                className="text-sm h-9 min-w-[150px]"
                              />
                              {item.userCorrected && (
                                <span className="text-xs text-[var(--accent-success)]">✓</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {formatCurrency(item.total_price)}
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => toggleItemEdit(index)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleItemDelete(index)}>
                          <Trash2 className="h-3 w-3 text-[var(--accent-danger)]" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Receipt Details Form */}
      <Card>
        <CardBody className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Butikk"
              name="merchant"
              value={form.merchant}
              onChange={handleChange}
              placeholder="f.eks. Rema 1000, Kiwi, Meny"
              required
            />

            <Input
              label="Dato"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />

            <Input
              label="Totalbeløp (NOK)"
              name="total"
              type="number"
              step="0.01"
              min="0"
              value={form.total}
              onChange={handleChange}
              placeholder="0.00"
              required
            />

            <Select
              label="Kvitteringskategori"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              options={categoryOptions}
              disabled={categoriesLoading}
            />

            <Input
              label="Notater (valgfritt)"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Eventuelle tilleggsnotater..."
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Lagre kvittering
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
