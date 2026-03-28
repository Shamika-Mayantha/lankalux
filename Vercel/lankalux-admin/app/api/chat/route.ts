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
  startDate?: string | null // YYYY-MM-DD
  endDate?: string | null // YYYY-MM-DD
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

const MAX_REPLY_CHARS = 420

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

function recentUserContents(msgs: ChatMessage[], n: number) {
  return msgs
    .filter((m) => m.role === 'user')
    .slice(-(n + 1), -1)
    .map((m) => normalizeForCompare(m.content))
    .filter(Boolean)
}

function isRepeatedUserQuestion(lastUser: string, msgs: ChatMessage[]) {
  const u = normalizeForCompare(lastUser)
  if (u.length < 12) return false
  return recentUserContents(msgs, 5).some((prev) => prev === u || (prev.length > 16 && u.includes(prev)))
}

function wantsToEndChatWithoutContact(text: string) {
  const t = (text || '').toLowerCase().trim()
  if (!t) return false
  if (/\bend\s*chat\b/.test(t)) return true
  return /\b(end|stop|quit|leave|bye|goodbye|no thanks|not now|skip|cancel|never mind|nevermind)\b/.test(t)
}

function userAgreesToWhatsApp(text: string) {
  const t = (text || '').toLowerCase()
  if (/\b(no|not|don't|dont|wait|later)\b/.test(t)) return false
  return /\b(yes|yeah|yep|sure|ok|okay|please|whatsapp|wa\.me|sounds good|go ahead|that works|perfect|do it|send it|message me|text me)\b/.test(
    t
  )
}

function askNameReply(): string {
  return 'What should I call you?'
}

function askContactReply(seed: number): string {
  const options = [
    'Thanks. What email should we use to follow up?',
    'Lovely. What is the best email to reach you on?',
    'Great. Could you share an email for our team to reply to?',
  ]
  return options[Math.abs(seed) % options.length]
}

function planningOpeningReply(name: string): string {
  const n = (name || '').trim().split(/\s+/)[0] || 'there'
  return `Hi ${n}, I can help you plan your Sri Lanka trip. How many days are you thinking of?`
}

const NAME_GREETING_WORDS = new Set([
  'hello',
  'hi',
  'hey',
  'thanks',
  'thank',
  'yes',
  'no',
  'ok',
  'okay',
  'sure',
  'please',
  'help',
])

function extractNameFromMessage(text: string): string | null {
  const raw = (text || '').trim()
  if (!raw || raw.length > 90) return null
  const lower = raw.toLowerCase()
  if (/\b(skip|prefer not|no name|anonymous|rather not|pass)\b/.test(lower)) return null
  const m1 = raw.match(
    /^(?:i'?m|i am|my name is|this is|call me|it's|its)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})\s*\.?$/i
  )
  if (m1) return m1[1].trim().split(/\s+/).slice(0, 4).join(' ')
  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length >= 1 && words.length <= 3 && raw.length <= 42) {
    const w0 = words[0].toLowerCase()
    if (words.length === 1 && NAME_GREETING_WORDS.has(w0)) return null
    if (words.every((w) => /^[A-Za-z][A-Za-z'.-]*$/.test(w))) return raw
  }
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
  const m = t.match(/\b(\d{1,2})\s*(?:days?|nights?)\b/) || t.match(/\b(?:about|around|for)\s+(\d{1,2})\b/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 1 && n <= 60 ? n : null
}

function coerceDraft(d: any): DraftLead {
  const asNum = (v: any) => (typeof v === 'number' ? v : v == null ? null : Number(String(v)))
  const asBool = (v: any) => (typeof v === 'boolean' ? v : v == null ? null : String(v).toLowerCase() === 'true')
  const ages =
    Array.isArray(d?.childrenAgesValues)
      ? d.childrenAgesValues
          .map((x: any) => (typeof x === 'number' ? x : Number(String(x))))
          .filter((n: any) => Number.isFinite(n))
      : null
  const tripDaysRaw = asNum(d?.tripDays)
  const out: DraftLead = {
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
    tripDays: Number.isFinite(tripDaysRaw) && (tripDaysRaw as number) >= 1 && (tripDaysRaw as number) <= 60 ? (tripDaysRaw as number) : null,
  }
  return out
}

/** Merge model JSON draft patch without wiping fields omitted from the patch. */
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

    const mustAskFields: (keyof DraftLead)[] = ['startDate', 'endDate', 'numberOfAdults']
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')?.content || ''

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

    const userTurns = countUserMessages(messages)
    const lastAssistantNorm = normalizeForCompare(lastAssistantMessage)
    const tripStarted = draft.tripPlanningStarted === true

    const missingBase = mustAskFields.filter(
      (k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === ''
    )

    if (!draft.email && !draft.whatsapp && wantsToEndChatWithoutContact(lastUserMessage)) {
      const missing = missingBase.concat(['email_or_whatsapp'] as any)
      return jsonResponse(
        {
          success: true,
          reply: sanitizeReply(
            'Understood. Whenever you are ready, tap End chat below. You can open this assistant again anytime.'
          ),
          draft,
          missingFields: missing,
          suggestSendRequest: false,
          openWhatsApp: false,
        },
        200
      )
    }

    if (!draft.name && userTurns >= 1) {
      let reply = askNameReply()
      if (normalizeForCompare(reply) === lastAssistantNorm) reply = 'How would you like me to address you?'
      const missing = missingBase.concat(!draft.email && !draft.whatsapp ? (['email_or_whatsapp'] as any) : [])
      return jsonResponse(
        { success: true, reply, draft, missingFields: missing, suggestSendRequest: false, openWhatsApp: false },
        200
      )
    }

    if (!draft.email && !draft.whatsapp && userTurns >= 1) {
      let reply = askContactReply(userTurns + lastUserMessage.length)
      if (normalizeForCompare(reply) === lastAssistantNorm) reply = askContactReply(userTurns + 9)
      const missing = missingBase.concat(['email_or_whatsapp'] as any)
      return jsonResponse(
        { success: true, reply, draft, missingFields: missing, suggestSendRequest: false, openWhatsApp: false },
        200
      )
    }

    if (draft.name && (draft.email || draft.whatsapp) && !tripStarted) {
      let reply = planningOpeningReply(draft.name || '')
      if (normalizeForCompare(reply) === lastAssistantNorm) {
        reply = `Hi ${(draft.name || '').trim().split(/\s+/)[0] || 'there'}, to get started, how many days do you have in Sri Lanka?`
      }
      const nextDraft = { ...draft, tripPlanningStarted: true }
      const missing = missingBase.concat(!nextDraft.email && !nextDraft.whatsapp ? (['email_or_whatsapp'] as any) : [])
      return jsonResponse(
        {
          success: true,
          reply,
          draft: nextDraft,
          missingFields: missing,
          suggestSendRequest: false,
          openWhatsApp: false,
        },
        200
      )
    }

    const system = `You are LankaLux AI, a premium travel assistant for Sri Lanka.

Your role is to help users plan their trip and guide them toward booking with LankaLux.

STRICT RULES:

* Speak naturally like a human
* NEVER use dashes, hyphens, or bullet formatting for lists in your reply
* NEVER use markdown bold or asterisks
* Keep responses short, clear, and helpful
* Ask only ONE question at a time
* Do NOT repeat information
* Do NOT overload the user with questions
* Do NOT sound like AI

KNOWLEDGE ABOUT LANKALUX:

* Private chauffeur-driven tours across Sri Lanka
* Vehicle provided for the entire stay
* Airport pickup and drop-off included
* Custom itineraries based on preferences
* Hotel arrangements and full travel planning
* Experienced English-speaking drivers
* Current promotion: Free safari jeep (jeep only, not tickets)

CONVERSATION STYLE:

* Friendly, calm, premium tone
* Not pushy, not salesy
* Feels like a real travel assistant

CONVERSATION FLOW:

* Start simple
* Ask gradual questions
* Give value early (suggest places, routes, ideas in one or two short sentences when it fits)
* Then guide toward booking

CONVERSION LOGIC:

* If user shows interest, suggest shaping an itinerary with the team
* If user is serious, suggest continuing on WhatsApp for a full draft
* If the user clearly agrees to WhatsApp, set openWhatsApp to true in your JSON output

WHATSAPP MESSAGE (for context only; do not paste this verbatim unless redirecting):

"Hi LankaLux, I'd like to plan my Sri Lanka trip. My name is [Name] and I'm looking for [details]."

IMPORTANT:

* Never invent facts, prices, or policies not in the knowledge base
* Never repeat the same sentence you used in a previous assistant message in this thread
* Never ask multiple questions at once
* You may give brief route ideas (example regions) but not full day-by-day schedules

REFERENCE:
${CHAT_KNOWLEDGE_SUMMARY}

Output STRICT JSON only with this shape:
{
  "reply": "string",
  "draft": { },
  "missingFields": ["startDate","endDate","numberOfAdults","email_or_whatsapp"],
  "suggestSendRequest": true|false,
  "openWhatsApp": true|false
}

Set openWhatsApp to true only if the guest clearly agrees to move to WhatsApp now. Otherwise false.

Data for Send request on the website: start date, end date, number of adults, plus email or WhatsApp already collected. Optional: children, preferences, airline help.`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.65,
      max_tokens: 320,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({
            currentDraft: draft,
            mustAskFields,
            conversation: messages,
            hint: isRepeatedUserQuestion(lastUserMessage, messages)
              ? 'The user may be repeating a similar question. Answer in a fresh way without repeating your last wording.'
              : undefined,
          }),
        },
      ],
    })

    const text = completion.choices?.[0]?.message?.content || ''
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      return jsonResponse(
        {
          success: true,
          reply: sanitizeReply(
            'I am here. What part of Sri Lanka are you most curious about, beaches, hills, or culture?'
          ),
          draft,
          missingFields: missingBase.concat(!draft.email && !draft.whatsapp ? (['email_or_whatsapp'] as any) : []),
          suggestSendRequest: false,
          openWhatsApp: false,
        },
        200
      )
    }

    const nextDraft = mergeDraftPatch(draft, parsed?.draft)
    const missing = mustAskFields
      .filter((k) => (nextDraft as any)[k] == null || String((nextDraft as any)[k]).trim() === '')
      .concat(!nextDraft.email && !nextDraft.whatsapp ? (['email_or_whatsapp'] as any) : [])

    const suggestSendRequest = missing.length === 0

    let reply =
      typeof parsed?.reply === 'string'
        ? parsed.reply
        : 'What kind of pace do you like on holiday, relaxed days or quite a bit of sightseeing?'

    reply = sanitizeReply(reply)

    const openWhatsApp = parsed?.openWhatsApp === true && userAgreesToWhatsApp(lastUserMessage)

    if (reply && (isDuplicateAssistantReply(reply, messages) || isSimilarAssistantReply(reply, messages))) {
      if (!nextDraft.tripDays) {
        reply = nextDraft.name
          ? `${(nextDraft.name || '').trim().split(/\s+/)[0]}, how many days will you have in Sri Lanka?`
          : 'How many days will you have in Sri Lanka?'
      } else if (!nextDraft.startDate || !nextDraft.endDate) {
        reply = 'What month or rough dates are you considering? Even a ballpark helps.'
      } else if (nextDraft.numberOfAdults == null) {
        reply = 'How many adults should I keep in mind for the vehicle?'
      } else {
        reply = sanitizeReply(
          'I can line up next steps on WhatsApp with our team whenever you like, or use Send request on this page.'
        )
      }
    }

    return jsonResponse(
      {
        success: true,
        reply,
        draft: nextDraft,
        missingFields: Array.isArray(parsed?.missingFields) ? parsed.missingFields : missing,
        suggestSendRequest,
        openWhatsApp,
      },
      200
    )
  } catch (err) {
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}
