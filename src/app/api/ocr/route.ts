import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  suggested_category: string;
  confidence: number;
}

interface OCRResult {
  merchant: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  raw_text: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate image format - OpenAI only supports PNG, JPEG, GIF, WEBP
    const supportedFormats = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/jpg"];
    const formatMatch = image.match(/^data:(image\/[a-z]+);base64,/);

    if (!formatMatch) {
      return NextResponse.json(
        { error: "Invalid image format. Please use PNG or JPG." },
        { status: 400 }
      );
    }

    const imageFormat = formatMatch[1];
    if (!supportedFormats.includes(imageFormat)) {
      return NextResponse.json(
        { error: `Unsupported image format (${imageFormat}). Please use PNG, JPG, or WEBP. If using iPhone, go to Settings > Camera > Formats > Most Compatible.` },
        { status: 400 }
      );
    }

    // Call GPT-4 Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a receipt OCR assistant for Norwegian grocery receipts. Analyze receipt images and extract structured data.

Use these Norwegian categories (use the exact Norwegian names):
- Kjøtt (kjøttprodukter: kylling, kjøttdeig, pølser, bacon)
- Fisk (fisk og sjømat: laks, torsk, reker, fiskegrateng)
- Grønnsaker (grønnsaker og poteter: tomat, agurk, paprika, salat, poteter)
- Frukt (frisk frukt: epler, bananer, appelsiner)
- Brød (brød og bakervarer: brød, rundstykker, tortilla, naan)
- Melk (melk, fløte, kremfløte)
- Ost (ost, revet ost, hvitost, brunost)
- Melkeprodukter (andre meieriprodukter: smør, rømme, yoghurt, kesam)
- Egg (egg i alle varianter)
- Godteri (sjokolade og godteri: smågodt, karamell)
- Snacks (chips og snacks: potetgull, nøtter)
- Drikke (brus, juice, vann)
- Krydder (krydderblandinger og sauser)
- Kaffe (kaffe og te - IKKE godteri)
- Pålegg (smørepålegg: leverpostei, syltetøy, nugatti)
- Mat (ferdigmat, pasta, hermetikk, tørrvarer)
- Husholdning (rengjøring, papir, plastposer)
- Personlig pleie (hygiene, kosmetikk)
- Annet (pant, diverse)

Important rules:
- Fiskegrateng → Fisk (not Mat)
- Leverpostei → Pålegg (not Mat)
- Kaffe products → Kaffe (not Godteri)

Always respond with valid JSON only, no markdown formatting.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this receipt image and extract:
1. Merchant/store name
2. Date (in YYYY-MM-DD format)
3. Total amount
4. Individual items with their prices and quantities
5. Suggest a category for each item

Respond with ONLY valid JSON in this exact format:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "total": 123.45,
  "items": [
    {
      "name": "Item Name",
      "quantity": 1,
      "unit_price": 12.34,
      "total_price": 12.34,
      "suggested_category": "Groceries",
      "confidence": 0.95
    }
  ],
  "raw_text": "Full text from receipt",
  "confidence": 0.90
}

If you cannot read something clearly, use your best guess and set a lower confidence score (0.0-1.0).
If you cannot determine the date, use today's date.
Norwegian kroner amounts should be parsed correctly (comma as decimal separator sometimes).`,
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to analyze receipt" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      const result: OCRResult = JSON.parse(jsonStr);

      return NextResponse.json(result);
    } catch (parseError) {
      console.error("Failed to parse OCR result:", content);
      return NextResponse.json(
        { error: "Failed to parse receipt data", raw: content },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
