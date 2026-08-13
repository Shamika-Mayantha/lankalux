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

const MAX_REPLY_CHARS = 480

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
  return /^(bye|goodbye|see you|see ya|that's all|thats all|i'm good|im good)[\s.!,]*$/i.test(t)
}

function userAgreesToWhatsApp(text: string) {
  const t = (text || '').toLowerCase()
  if (/\b(no|not|don't|dont|wait|later)\b/.test(t)) return false
  return /\b(yes|yeah|yep|sure|ok|okay|please|whatsapp|wa\.me|sounds good|go ahead|that works|perfect|do it|send it|message me|text me)\b/.test(
    t
  )
}

function askNameReply(): string {
  return 'What should I call you, so I stop saying hey there in my head?'
}

function askContactReply(seed: number): string {
  const options = [
    'If you drop an email, our humans can send a proper plan instead of me guessing in a chat bubble.',
    'Got a good email for follow up? I am charming, but I cannot book hotels from here.',
    'Share an email or WhatsApp and the team can take it from cocktail napkin to real itinerary.',
  ]
  return options[Math.abs(seed) % options.length]
}

function planningOpeningReply(name: string): string {
  const n = (name || '').trim().split(/\s+/)[0] || 'there'
  return `Hi ${n}. Roughly how many days do you have? Sri Lanka is small until you try to see all of it.`
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
  'wildlife',
  'beach',
  'beaches',
  'safari',
  'hills',
  'hill',
  'tea',
  'train',
  'trains',
  'culture',
  'coast',
  'coastal',
  'yala',
  'ella',
  'kandy',
  'galle',
  'sigiriya',
  'trip',
  'tour',
  'tours',
  'jeep',
  'info',
  'information',
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
    const missingBase = mustAskFields.filter(
      (k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === ''
    )

    if (!draft.email && !draft.whatsapp && wantsToEndChatWithoutContact(lastUserMessage)) {
      const missing = missingBase.concat(['email_or_whatsapp'] as any)
      return jsonResponse(
        {
          success: true,
          reply: sanitizeReply(
            'No stress. Tap End chat when you like. I will be here later, slightly less caffeinated, still good with maps.'
          ),
          draft,
          missingFields: missing,
          suggestSendRequest: false,
          openWhatsApp: false,
        },
        200
      )
    }

    if (userTurns >= 1 && draft.tripPlanningStarted !== true) {
      draft = { ...draft, tripPlanningStarted: true }
    }

    const system = `You are LankaLux AI, a travel companion for private Sri Lanka journeys.

You help guests explore ideas and, when they are ready, book with LankaLux. You are not a form. You are the person who actually likes planning trips.

PERSONALITY:

* Warm, flexible, lightly humorous. Think a well travelled host who has heard every "is Sri Lanka safe?" question and still answers kindly.
* Dry wit is welcome. One smile per reply is enough. Never a standup set.
* Joke with the guest, never at them. No sarcasm about their budget, family, or taste.
* If they are playful, play back. If they are brisk or stressed, drop the jokes and be clear.
* Follow their lead. They can talk beaches, food, trains, leopards, or just "we have 8 days in March."
* Sound like a person. Short sentences. Natural rhythm.

STRICT RULES:

* NEVER use markdown, asterisks, or bullet lists in the reply
* Do not use hyphen lists. Commas and short sentences are fine. Hyphens inside words like check-in are fine
* Keep replies short. Usually 2 to 4 sentences
* Ask at most ONE question, and only if it helps
* Do not repeat yourself
* Do not invent prices, hotel names, availability, or policies
* Do not force a script

BE FLEXIBLE:

* Answer the actual question first, even if you do not have their name yet
* Never stall a travel question behind "what is your name" or "what is your email"
* They can skip questions, change their mind, or jump topics. Go with it
* Offer a useful nugget early: a region pairing, a pacing tip, a why this works
* You may sketch a loose route in one or two sentences, not a full day by day schedule

KNOWLEDGE ABOUT LANKALUX:

* Private chauffeur driven tours across Sri Lanka
* One vehicle for the entire stay
* Airport pickup and drop off included
* Custom itineraries from their pace and interests
* Hotel arrangements and full travel planning
* Experienced English speaking drivers
* Current promotion: free safari jeep (jeep only, not park tickets)

CONVERSION (gentle, not a funnel):

* After you have been actually helpful, you may casually ask what to call them
* Once the trip has some shape (days, vibe, or dates), invite an email or WhatsApp so the team can send a real plan
* If they are keen, suggest WhatsApp for a full draft, or Send request on the page
* If they clearly agree to WhatsApp, set openWhatsApp to true
* If they are just browsing, keep chatting. Do not hunt for contact details every turn

WHATSAPP MESSAGE (context only):

"Hi LankaLux, I'd like to plan my Sri Lanka trip. My name is [Name] and I'm looking for [details]."

IMPORTANT:

* Never copy a previous assistant sentence in this thread
* Never ask two questions at once
* If they already answered something, do not ask it again

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
    const flexibilityHints: string[] = []
    if (isRepeatedUserQuestion(lastUserMessage, messages)) {
      flexibilityHints.push('They may be repeating a question. Answer freshly, with a new angle, no copied wording.')
    }
    if (!draft.name && userTurns >= 2) {
      flexibilityHints.push('You may casually ask what to call them after you answer. Do not make it the whole reply.')
    }
    if (!draft.email && !draft.whatsapp && userTurns >= 3) {
      flexibilityHints.push('If the trip idea has any shape, you may invite an email or WhatsApp. Never block their question behind it.')
    }
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.85,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({
            currentDraft: draft,
            mustAskFields,
            conversation: messages,
            hint: flexibilityHints.length ? flexibilityHints.join(' ') : undefined,
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
            'Still here. Beaches, hills, wildlife, or the classic "we want a bit of everything"?'
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
        : 'Are you more slow mornings and late lunches, or the see-it-all energy?'

    reply = sanitizeReply(reply)

    const openWhatsApp = parsed?.openWhatsApp === true && userAgreesToWhatsApp(lastUserMessage)

    if (reply && (isDuplicateAssistantReply(reply, messages) || isSimilarAssistantReply(reply, messages))) {
      if (!nextDraft.name) {
        reply = askNameReply()
      } else if (!nextDraft.tripDays) {
        reply = planningOpeningReply(nextDraft.name || '')
      } else if (!nextDraft.startDate || !nextDraft.endDate) {
        reply = 'Even a rough month helps. Sri Lanka in March and Sri Lanka in monsoon are two different movies.'
      } else if (nextDraft.numberOfAdults == null) {
        reply = 'How many adults should I keep in mind for the vehicle? I promise I am not seating a cricket team unless you say so.'
      } else if (!nextDraft.email && !nextDraft.whatsapp) {
        reply = askContactReply(userTurns + 3)
      } else {
        reply = sanitizeReply(
          'Whenever you like, WhatsApp our team or tap Send request. I will not take it personally if you pick the humans.'
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
