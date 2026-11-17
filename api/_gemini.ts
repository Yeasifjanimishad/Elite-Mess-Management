import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export const FAST_TEXT_MODEL = 'gemini-3.1-flash-lite';
export const RECEIPT_MODEL = 'gemini-3.1-flash-lite';

const allowedUnits = ['kg', 'Liter', 'pcs', 'Dozen', 'Packets', 'Bags', 'Other'] as const;

export interface ParsedReceiptPayload {
  items: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  notes: string;
}

export function parseGeminiError(err: unknown, fallback: string): { status: number; message: string } {
  let status = 500;
  let message = err instanceof Error ? err.message : fallback;
  try {
    const parsed = JSON.parse(message);
    if (parsed?.error?.message) {
      message = String(parsed.error.message);
    }
    if (typeof parsed?.error?.code === 'number') {
      status = parsed.error.code;
    }
  } catch {
    // Keep raw error message if not JSON
  }
  return { status, message };
}

export function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function resolveImageToInlineData(imageInput: string): Promise<{ mimeType: string; data: string }> {
  const trimmed = imageInput.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const imgResp = await fetch(trimmed, { signal: AbortSignal.timeout(10000) });
    if (!imgResp.ok) {
      throw new Error(`Could not fetch receipt image URL (HTTP ${imgResp.status}).`);
    }
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) {
      throw new Error('The provided URL did not return an image.');
    }
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  }

  throw new Error('Unsupported receipt image format. Please upload or capture an image first.');
}

export async function runReceiptScan(
  ai: GoogleGenAI,
  imageDataUrl: string,
  language?: string
): Promise<ParsedReceiptPayload> {
  const inlineData = await resolveImageToInlineData(imageDataUrl);
  const preferBangla = language === 'Bangla';

  const prompt = [
    'Analyze this grocery / bazaar receipt or purchase photo for a shared mess/hostel expense tracker.',
    'Extract the purchase summary into structured JSON fields:',
    '- items: concise comma-separated list of purchased items (if handwritten or printed receipt in English or Bangla, summarize clearly).',
    '- quantity: total numeric quantity (use 1 if multiple mixed items or unclear).',
    `- unit: pick the single best unit from [${allowedUnits.join(', ')}] (use "Bags" or "kg" or "pcs" for mixed groceries).`,
    '- price: unit rate / price per unit as a positive number (if mixed items with total only, set price equal to total and quantity to 1).',
    '- total: grand total amount paid on the receipt as a positive number.',
    `- notes: brief itemized breakdown, shop name, or date if visible (${preferBangla ? 'may include Bangla/English item names' : 'in English'}).`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: RECEIPT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData },
          { text: prompt },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          price: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ['items', 'quantity', 'unit', 'price', 'total', 'notes'],
      },
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('AI returned an empty response for this image.');
  }

  const parsed = JSON.parse(rawText) as Partial<ParsedReceiptPayload>;
  const safeQuantity = Number(parsed.quantity) > 0 ? Number(parsed.quantity) : 1;
  const safeTotal =
    Number(parsed.total) > 0
      ? Number(parsed.total)
      : Number(parsed.price) > 0
      ? Number(parsed.price) * safeQuantity
      : 0;
  const safePrice =
    Number(parsed.price) > 0
      ? Number(parsed.price)
      : safeTotal > 0
      ? Number((safeTotal / safeQuantity).toFixed(2))
      : 0;
  const safeUnit = allowedUnits.includes((parsed.unit || '') as (typeof allowedUnits)[number])
    ? String(parsed.unit)
    : 'kg';

  return {
    items: String(parsed.items || '').trim() || 'Grocery Items',
    quantity: safeQuantity,
    unit: safeUnit,
    price: safePrice,
    total: safeTotal,
    notes: String(parsed.notes || '').trim(),
  };
}

export function sanitizeContextForRole(rawContext?: Record<string, unknown>): Record<string, unknown> {
  const ctx = rawContext && typeof rawContext === 'object' ? rawContext : {};
  const role =
    ctx.role === 'Admin' || ctx.role === 'Meal Manager' || ctx.role === 'Member'
      ? ctx.role
      : 'Member';

  const basePersonal: Record<string, unknown> = {
    userName: ctx.userName,
    role,
    language: ctx.language,
    messName: ctx.messName,
    activeMonth: ctx.activeMonth,
    currency: ctx.currency,
    isMonthClosed: ctx.isMonthClosed,
    mealLockTime: ctx.mealLockTime,
    defaultMealOn: ctx.defaultMealOn,
    guestMealLimit: ctx.guestMealLimit,
    hasBkash: ctx.hasBkash,
    hasNagad: ctx.hasNagad,
    currentMealRate: ctx.currentMealRate,
    myTotalMeals: ctx.myTotalMeals,
    myEstimatedBill: ctx.myEstimatedBill,
    myApprovedDeposits: ctx.myApprovedDeposits,
    myCarryForward: ctx.myCarryForward,
    myBalance: ctx.myBalance,
    assignedBazaarBuyers: ctx.assignedBazaarBuyers,
  };

  if (role === 'Member') {
    return basePersonal;
  }

  if (role === 'Meal Manager') {
    return {
      ...basePersonal,
      activeMembersCount: ctx.activeMembersCount,
      totalMessMeals: ctx.totalMessMeals,
      totalMessExpense: ctx.totalMessExpense,
      pendingBazaarCount: ctx.pendingBazaarCount,
      pendingDepositsCount: ctx.pendingDepositsCount,
      managerPermissions: ctx.managerPermissions,
    };
  }

  // Admin: full mess overview & sensitive admin insights
  return {
    ...basePersonal,
    activeMembersCount: ctx.activeMembersCount,
    totalMessMeals: ctx.totalMessMeals,
    totalMessExpense: ctx.totalMessExpense,
    pendingBazaarCount: ctx.pendingBazaarCount,
    pendingDepositsCount: ctx.pendingDepositsCount,
    managerPermissions: ctx.managerPermissions,
    adminSummary: ctx.adminSummary,
  };
}

export function buildAssistantSystemInstruction(sanitizedContext: Record<string, unknown>): string {
  const role = String(sanitizedContext.role || 'Member');

  const roleRules =
    role === 'Admin'
      ? [
          'ROLE ACCESS (ADMIN): The current user is the Mess Admin.',
          '- You MAY share all mess-wide financial summaries, total expenses/deposits/cash balance, pending approvals, member dues/balances from adminSummary, manager permissions, month closing/rollover steps, member management, full audit logs, and JSON backup/restore guidance.',
        ]
      : role === 'Meal Manager'
      ? [
          'ROLE ACCESS (MEAL MANAGER): The current user is a Meal Manager.',
          '- Help with meal sheet overrides, pending bazaar/deposit verification, bazaar auto-rotation, utility bills, notices, reports/WhatsApp slips, and mess audit logs.',
          '- RESTRICTED ADMIN DATA: Do NOT reveal Admin-only governance or secrets (how to modify Manager Permissions, promoting/removing Admin/Managers, Database JSON Backup/Restore internals, or other members’ private credentials/individual dues lists). If asked, explain that only the Mess Admin has access.',
        ]
      : [
          'ROLE ACCESS (MEMBER — STRICT PRIVACY): The current user is a standard Member.',
          '- ONLY answer using this member’s OWN personal stats (myTotalMeals, myEstimatedBill, myApprovedDeposits, myCarryForward, myBalance), public meal rules (mealLockTime, guestMealLimit, defaultMealOn, currentMealRate), assignedBazaarBuyers, bKash/Nagad payment flow, and Member-visible tabs (Overview, Meal Sheet, Bazaar submission, Deposits, Utilities view, Notice Board, Reports own bill slip, Activity Log own activity only).',
          '- STRICT CONFIDENTIALITY BLOCK: NEVER reveal, estimate, or help access Admin/Manager-only or other members’ private data—including total mess treasury/cash/expenses, pending approval queues, other members’ dues/balances/deposits/meals/phone numbers/emails/activity logs, Manager Permission settings, Month Closing/Rollover controls, Member/Role management, or Database JSON Backup/Restore. If the Member asks for any of these, clearly reply (in their language) that this information is restricted to the Mess Admin and cannot be shared with Members.',
        ];

  return [
    'You are the concise, helpful AI Assistant for a shared hostel/bachelor Mess Management System (MMS).',
    'App Overview: Overview, Meal Sheet (Breakfast 0.5/Lunch 1/Dinner 1, Guest meals, cutoff lock, Vacation Mode), Bazaar Log (assigned buyers, Upload/Camera receipt + AI Scan), Deposits (dues, 1-click bKash/Nagad copy), Utilities & Bills, Notice Board, Reports (Meal Rate = (Approved Bazaar+Overheads)/Total Meals, Bill Slip), Activity Log (Admin/Manager: all; Member: own only), Settings & Header (Theme Palette, Notifications).',
    ...roleRules,
    `Live Context: ${JSON.stringify(sanitizedContext)}`,
    'Response Style: Match user language (Bangla, Banglish, or English). Be fast, practical, and concise (short bullets, ~60-140 words unless Admin asks for deeper breakdown). Use exact numbers from Live Context; never invent nonexistent features or hidden data.',
  ].join('\n');
}

export function formatAssistantContents(messages: Array<{ role: string; content: string }>) {
  return messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-8)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.trim() }],
    }));
}
