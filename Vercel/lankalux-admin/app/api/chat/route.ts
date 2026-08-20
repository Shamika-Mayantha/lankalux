import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CHAT_KNOWLEDGE_SUMMARY } from '@/lib/chat-knowledge'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type DraftLead = {
  name?: string | null
  email?: string | null
  whatsapp?: string | null
  startDate?: string | null
  endDate?: string | null
  numberOfAdults?: number | null
  numberOfChildren?: number | null
  childrenAgesValues?: number[] | null
  message?: string | null
  needAirlineTickets?: boolean | null
  airlineFrom?: string | null
  airlineDates?: string | null
  tripPlanningStarted?: boolean | null
  tripDays?: number | null
}

const MAX_REPLY_CHARS = 480
const CONTACT_EMAIL = 'hello@lankalux.com'
const WHATSAPP_DISPLAY = '+94 76 326 1788'

function jsonResponse(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status })
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

function safeText(x: unknown) {
  return typeof x === 'string' ? x.trim() : ''
}

function normalizeForCompare(text: string) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function countUserMessages(msgs: ChatMessage[]) {
  return msgs.filter((m) => m.role === 'user').length
}

function recentAssistantContents(msgs: ChatMessage[], n: number) {
  return msgs
    .filter((m) => m.role === 'assistant')
    .slice(-n)
    .map((m) => m.content)
}

function isDuplicateAssistantReply(reply: string, msgs: ChatMessage[]) {
  const r = normalizeForCompare(reply)
  if (!r) return false
  return recentAssistantContents(msgs, 6).some((prev) => normalizeForCompare(prev) === r)
}

function isSimilarAssistantReply(reply: string, msgs: ChatMessage[]) {
  const r = normalizeForCompare(reply)
  if (r.length < 24) return false
  const chunk = r.slice(0, Math.min(48, r.length))
  return recentAssistantContents(msgs, 4).some((prev) => {
    const p = normalizeForCompare(prev)
    return p.includes(chunk) || r.includes(p.slice(0, Math.min(48, p.length)))
  })
}

function wantsToEndChat(text: string) {
  const t = (text || '').toLowerCase().trim()
  if (!t) return false
  if (/\bend\s*chat\b/.test(t)) return true
  return /^(bye|goodbye|see you|see ya|that's all|thats all|i'm good|im good)[\s.!,]*$/i.test(t)
}

function userAgreesToWhatsApp(text: string) {
  const t = (text || '').toLowerCase()
  if (/\b(no|not|don't|dont|wait|later|email)\b/.test(t)) return false
  return /\b(yes|yeah|yep|sure|ok|okay|please|whatsapp|wa\.me|sounds good|go ahead|that works|perfect|do it|send it|message me|text me)\b/.test(
    t
  )
}

function userAgreesToEmail(text: string) {
  const t = (text || '').toLowerCase()
  if (/\b(no|not|don't|dont|wait|later|whatsapp)\b/.test(t)) return false
  return /\b(email|e-mail|mail me|send (an )?email|hello@lankalux)\b/.test(t)
}

function wantsCustomTripPlan(text: string) {
  const t = (text || '').toLowerCase()
  if (!t) return false
  if (/\b(tell me about|what is|what's|explain|your|the)\b.{0,40}\b(10[- ]?day|signature|published)\b/.test(t)) {
    return false
  }
  if (/\b(plan|build|create|write|design|make|draft|put together)\b.{0,50}\b(itinerary|trip|holiday|vacation|tour|route|schedule)\b/.test(t)) {
    return true
  }
  if (/\b(can you|could you|please|i want you to|help me)\b.{0,40}\b(plan|itinerary)\b/.test(t)) return true
  if (/\bday\s*(1|one)\b/.test(t) && /\b(day\s*(2|two)|each day|day by day)\b/.test(t)) return true
  if (/\b(day[- ]?by[- ]?day|full itinerary|custom itinerary)\b/.test(t)) return true
  return false
}

function looksLikeItinerary(text: string) {
  const days = (text.match(/\bday\s*\d+\b/gi) || []).length
  return days >= 2
}

function extractNameFromMessage(text: string): string | null {
  const raw = (text || '').trim()
  if (!raw || raw.length > 90) return null
  const lower = raw.toLowerCase()
  if (/\b(skip|prefer not|no name|anonymous|rather not|pass)\b/.test(lower)) return null
  const m1 = raw.match(
    /^(?:i'?m|i am|my name is|this is|call me|it's|its)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})\s*\.?$/i
  )
  if (m1) return m1[1].trim().split(/\s+/).slice(0, 4).join(' ')
  return null
}

function extractEmail(text: string) {
  const m = (text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return m ? m[0].trim() : null
}

function extractWhatsApp(text: string) {
  const m = (text || '').match(/(?:\+?\d[\d\s\-()]{7,}\d)/)
  if (!m) return null
  const cleaned = m[0].replace(/[^\d+]/g, '')
  return cleaned.length >= 8 ? cleaned : null
}

function extractTripDays(text: string): number | null {
  const t = (text || '').toLowerCase()
  const m = t.match(/\b(\d{1,2})\s*(?:days?|nights?)\b/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 1 && n <= 60 ? n : null
}

function coerceDraft(d: any): DraftLead {
  const asNum = (v: any) => (typeof v === 'number' ? v : v == null ? null : Number(String(v)))
  const asBool = (v: any) => (typeof v === 'boolean' ? v : v == null ? null : String(v).toLowerCase() === 'true')
  const ages = Array.isArray(d?.childrenAgesValues)
    ? d.childrenAgesValues
        .map((x: any) => (typeof x === 'number' ? x : Number(String(x))))
        .filter((n: any) => Number.isFinite(n))
    : null
  const tripDaysRaw = asNum(d?.tripDays)
  return {
    name: d?.name != null ? String(d.name).trim() || null : null,
    email: d?.email != null ? String(d.email).trim() || null : null,
    whatsapp: d?.whatsapp != null ? String(d.whatsapp).trim() || null : null,
    startDate: d?.startDate != null ? String(d.startDate).trim() || null : null,
    endDate: d?.endDate != null ? String(d.endDate).trim() || null : null,
    numberOfAdults: Number.isFinite(asNum(d?.numberOfAdults)) ? (asNum(d?.numberOfAdults) as number) : null,
    numberOfChildren: Number.isFinite(asNum(d?.numberOfChildren)) ? (asNum(d?.numberOfChildren) as number) : null,
    childrenAgesValues: ages && ages.length ? (ages as number[]) : null,
    message: d?.message != null ? String(d.message).trim() || null : null,
    needAirlineTickets: asBool(d?.needAirlineTickets),
    airlineFrom: d?.airlineFrom != null ? String(d.airlineFrom).trim() || null : null,
    airlineDates: d?.airlineDates != null ? String(d.airlineDates).trim() || null : null,
    tripPlanningStarted: d?.tripPlanningStarted === true ? true : d?.tripPlanningStarted === false ? false : null,
    tripDays:
      Number.isFinite(tripDaysRaw) && (tripDaysRaw as number) >= 1 && (tripDaysRaw as number) <= 60
        ? (tripDaysRaw as number)
        : null,
  }
}

function mergeDraftPatch(base: DraftLead, patchRaw: unknown): DraftLead {
  if (!patchRaw || typeof patchRaw !== 'object') return base
  const p = patchRaw as Record<string, unknown>
  const next = { ...base }
  const merged = coerceDraft({ ...base, ...p })
  const keys: (keyof DraftLead)[] = [
    'name',
    'email',
    'whatsapp',
    'startDate',
    'endDate',
    'numberOfAdults',
    'numberOfChildren',
    'childrenAgesValues',
    'message',
    'needAirlineTickets',
    'airlineFrom',
    'airlineDates',
    'tripPlanningStarted',
    'tripDays',
  ]
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(p, k)) {
      ;(next as any)[k] = (merged as any)[k]
    }
  }
  return next
}

function sanitizeReply(text: string): string {
  let s = (text || '').trim()
  s = s.replace(/\*\*/g, '')
  s = s.replace(/^[•\-\u2013\u2014]\s*/gm, '')
  s = s.replace(/\n[•\-\u2013\u2014]\s*/g, '\n')
  if (s.length > MAX_REPLY_CHARS) {
    const cut = s.slice(0, MAX_REPLY_CHARS)
    const lastPeriod = cut.lastIndexOf('.')
    s = lastPeriod > MAX_REPLY_CHARS * 0.5 ? cut.slice(0, lastPeriod + 1) : cut.trim() + '…'
  }
  return s.trim()
}

function hasContact(d: DraftLead) {
  return !!(d.email || d.whatsapp)
}

function nextLeadField(d: DraftLead, tripIntent: boolean, userTurns: number): string | null {
  if (!hasContact(d) && (tripIntent || userTurns >= 2)) return 'contact'
  if (tripIntent || hasContact(d)) {
    if (!d.startDate && !d.endDate && !d.tripDays) return 'dates'
    if (d.numberOfAdults == null) return 'party'
    if (!d.name) return 'name'
  }
  return null
}

function tripPlanHandoffReply(d: DraftLead) {
  const bits = [
    'Tempting, but I will not write your days from this chat. The team does that properly, once they have your dates and pace.',
    `WhatsApp ${WHATSAPP_DISPLAY} or email ${CONTACT_EMAIL} and they will shape it with you.`,
  ]
  if (!hasContact(d)) {
    bits.push('Or leave an email or WhatsApp number here and I will pass you across.')
  } else if (!d.startDate && !d.endDate && !d.tripDays) {
    bits.push('Rough dates or how many days would help them start.')
  }
  return bits.join(' ')
}

function buildSystemPrompt(opts: {
  tripIntent: boolean
  leadField: string | null
  userTurns: number
  hasContact: boolean
}) {
  const leadLine =
    opts.leadField === 'contact'
      ? 'You still need an email or WhatsApp number. Ask for that in one short, friendly line after you answer.'
      : opts.leadField === 'dates'
        ? 'You still need arrival and departure dates, or how many days. Ask for that in one short line after you answer.'
        : opts.leadField === 'party'
          ? 'You still need how many adults, and children if any. Ask for that in one short line after you answer.'
          : opts.leadField === 'name'
            ? 'You have contact details. If it fits, ask their name so the team can greet them properly. One short line.'
            : opts.userTurns >= 3 && !opts.hasContact
              ? 'Invite them, once, to WhatsApp, email, or to tap Send request when they are ready. Do not nag.'
              : 'Do not force a form. If they volunteer details, thank them and keep going.'

  const planLine = opts.tripIntent
    ? `They want a trip planned. Do not write an itinerary, Day 1 list, or numbered schedule. Direct them to WhatsApp ${WHATSAPP_DISPLAY} or email ${CONTACT_EMAIL}. You may mention published journey pages as inspiration only.`
    : 'If they start asking you to plan days, stop and send them to WhatsApp or email instead.'

  return `You are LankaLux AI, a travel companion on lankalux.com.

PERSONALITY:
Warm, flexible, lightly humorous. A well travelled host, not a booking form.
Dry wit is welcome. One smile per reply is enough.
Joke with the guest, never at them.
If they are playful, play back. If they are brisk, be clear.
Sound like a person. Short sentences. Usually 2 to 4 sentences.
Never use markdown, asterisks, or bullet lists. Commas and short sentences are fine.

WHAT YOU MAY DO:
Answer general questions using ONLY the website knowledge below.
Give a light opinion that already exists on the site: south vs east timing, Yala vs Udawalawe, why ten days beats five frantic nights.
Point to public pages when useful.
Collect a lead naturally: email or WhatsApp, dates, who is travelling, name, what they care about.
Invite Send request, WhatsApp, or email so the human team can follow up.

WHAT YOU MUST NOT DO:
Never invent prices, hotel names, availability, visas, medical advice, or facts not in the knowledge.
Never write a full itinerary, day-by-day plan, or numbered trip schedule.
Never pretend you can confirm a booking.
Never copy a previous assistant sentence in this thread.
Never ask two questions at once.

${planLine}

LEADS:
A lead is an email or WhatsApp number, plus whatever trip notes they share.
${leadLine}
Offer both WhatsApp ${WHATSAPP_DISPLAY} and ${CONTACT_EMAIL} when they want a human.
Set openWhatsApp true only if they clearly want WhatsApp now.
Set openEmail true only if they clearly want email now.

KNOWLEDGE:
${CHAT_KNOWLEDGE_SUMMARY}

Output STRICT JSON only:
{
  "reply": "string",
  "draft": {},
  "missingFields": [],
  "suggestSendRequest": true,
  "openWhatsApp": false,
  "openEmail": false
}

Put newly learned name, email, whatsapp, dates, adults, children, tripDays, or interests into draft. Omit unchanged fields.`
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ success: false, error: 'Missing OPENAI_API_KEY' }, 500)
    }

    const body = (await req.json().catch(() => ({}))) as any
    const messagesRaw: unknown = body?.messages
    const messages: ChatMessage[] = Array.isArray(messagesRaw)
      ? (messagesRaw as any[])
          .map((m): ChatMessage => ({
            role: m?.role === 'assistant' ? 'assistant' : 'user',
            content: safeText(m?.content),
          }))
          .filter((m) => m.content.length > 0)
          .slice(-20)
      : []

    let draft = coerceDraft(body?.draft || {})
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const userTurns = countUserMessages(messages)
    const tripIntent = wantsCustomTripPlan(lastUserMessage)

    const inferredEmail = extractEmail(lastUserMessage)
    const inferredWhatsApp = extractWhatsApp(lastUserMessage)
    if (!draft.email && inferredEmail) draft = { ...draft, email: inferredEmail }
    if (!draft.whatsapp && inferredWhatsApp) draft = { ...draft, whatsapp: inferredWhatsApp }
    if (!draft.name) {
      const inferredName = extractNameFromMessage(lastUserMessage)
      if (inferredName) draft = { ...draft, name: inferredName }
    }
    const inferredDays = extractTripDays(lastUserMessage)
    if (inferredDays && !draft.tripDays) draft = { ...draft, tripDays: inferredDays }
    if (tripIntent) draft = { ...draft, tripPlanningStarted: true }

    const missingBase = (['startDate', 'endDate', 'numberOfAdults'] as (keyof DraftLead)[]).filter(
      (k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === ''
    )
    const missing = missingBase.concat(!hasContact(draft) ? (['email_or_whatsapp'] as any) : [])
    const leadField = nextLeadField(draft, tripIntent, userTurns)

    if (wantsToEndChat(lastUserMessage)) {
      const bye = hasContact(draft)
        ? 'Go well. The team already has a way to reach you if you want the trip written properly.'
        : `Go well. If a custom trip starts calling, WhatsApp ${WHATSAPP_DISPLAY} or ${CONTACT_EMAIL}.`
      return jsonResponse({
        success: true,
        reply: sanitizeReply(bye),
        draft,
        missingFields: missing,
        suggestSendRequest: false,
        openWhatsApp: false,
        openEmail: false,
      })
    }

    if (tripIntent) {
      const agreedWa = userAgreesToWhatsApp(lastUserMessage)
      const agreedEmail = userAgreesToEmail(lastUserMessage)
      return jsonResponse({
        success: true,
        reply: sanitizeReply(tripPlanHandoffReply(draft)),
        draft,
        missingFields: missing,
        suggestSendRequest: hasContact(draft) && missingBase.length === 0,
        openWhatsApp: agreedWa,
        openEmail: agreedEmail && !agreedWa,
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            tripIntent,
            leadField,
            userTurns,
            hasContact: hasContact(draft),
          }),
        },
        {
          role: 'user',
          content: JSON.stringify({
            currentDraft: draft,
            conversation: messages,
            nextLeadField: leadField,
            hint: 'Answer from website knowledge only. No itinerary. Try to earn a lead without sounding like a form.',
          }),
        },
      ],
    })

    const text = completion.choices?.[0]?.message?.content || ''
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      return jsonResponse({
        success: true,
        reply: sanitizeReply(
          `Still here. Beaches, hills, wildlife, or a bit of everything? For a custom trip, WhatsApp ${WHATSAPP_DISPLAY} or ${CONTACT_EMAIL}.`
        ),
        draft,
        missingFields: missing,
        suggestSendRequest: false,
        openWhatsApp: false,
        openEmail: false,
      })
    }

    const nextDraft = mergeDraftPatch(draft, parsed?.draft)
    const nextMissingBase = (['startDate', 'endDate', 'numberOfAdults'] as (keyof DraftLead)[]).filter(
      (k) => (nextDraft as any)[k] == null || String((nextDraft as any)[k]).trim() === ''
    )
    const nextMissing = nextMissingBase.concat(!hasContact(nextDraft) ? (['email_or_whatsapp'] as any) : [])
    const suggestSendRequest = nextMissing.length === 0

    let reply =
      typeof parsed?.reply === 'string'
        ? parsed.reply
        : 'Beaches, hills, wildlife, or the classic we-want-a-bit-of-everything?'

    reply = sanitizeReply(reply)

    if (looksLikeItinerary(reply)) {
      reply = sanitizeReply(tripPlanHandoffReply(nextDraft))
    }

    if (reply && (isDuplicateAssistantReply(reply, messages) || isSimilarAssistantReply(reply, messages))) {
      reply = sanitizeReply(
        hasContact(nextDraft)
          ? 'Still here. Tap Send request when you are ready, or WhatsApp if you would rather talk to a person.'
          : `Still here. Leave an email or WhatsApp, or tap WhatsApp ${WHATSAPP_DISPLAY} and the team will pick it up.`
      )
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.content || ''
    let openWhatsApp = parsed?.openWhatsApp === true && userAgreesToWhatsApp(lastUserMessage)
    let openEmail = parsed?.openEmail === true && userAgreesToEmail(lastUserMessage) && !openWhatsApp
    if (!openWhatsApp && userAgreesToWhatsApp(lastUserMessage) && /whatsapp/i.test(lastAssistant)) {
      openWhatsApp = true
      openEmail = false
    } else if (!openEmail && userAgreesToEmail(lastUserMessage) && /hello@lankalux|email/i.test(lastAssistant)) {
      openEmail = true
    }

    return jsonResponse({
      success: true,
      reply,
      draft: nextDraft,
      missingFields: Array.isArray(parsed?.missingFields) ? parsed.missingFields : nextMissing,
      suggestSendRequest: parsed?.suggestSendRequest === true || suggestSendRequest,
      openWhatsApp,
      openEmail,
    })
  } catch (err) {
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}
