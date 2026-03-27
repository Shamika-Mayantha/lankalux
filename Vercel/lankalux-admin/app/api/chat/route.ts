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
}

function isItineraryIntent(text: string) {
  const t = (text || '').toLowerCase()
  if (!t) return false
  const patterns = [
    'itinerary',
    'itineraries',
    'day by day',
    'day-by-day',
    'plan my trip',
    'create a plan',
    'full plan',
    'detailed plan',
    'travel plan',
    'route for',
  ]
  return patterns.some((p) => t.includes(p))
}

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
  return recentAssistantContents(msgs, 4).some((prev) => normalizeForCompare(prev) === r)
}

function wantsToEndChatWithoutContact(text: string) {
  const t = (text || '').toLowerCase().trim()
  if (!t) return false
  if (/\bend\s*chat\b/.test(t)) return true
  return /\b(end|stop|quit|leave|bye|goodbye|no thanks|not now|skip|cancel|never mind|nevermind)\b/.test(t)
}

/** True if the site welcome or a prior reply already asked for a name — avoids asking twice. */
function assistantAlreadyAskedForName(text: string) {
  const t = (text || '').toLowerCase()
  return /what should i call|may i call|your name|first name|call you|address you properly/i.test(t)
}

function contactGateReply(userTurns: number): string {
  if (userTurns <= 2) {
    return 'Could you share an email or WhatsApp number so someone from our team can reply? Either one is fine.'
  }
  if (userTurns === 3) {
    return 'I still need either an email or a WhatsApp number to continue, whichever you prefer.'
  }
  return 'You can paste an email or WhatsApp here, or tap **End chat** if you would rather stop. No pressure.'
}

function itineraryGuardReply(userTurns: number): string {
  if (userTurns <= 1) {
    return 'We do not write full day-by-day itineraries in this chat. Our team does that after you tap **Send request** with your dates and group size.\n\nHappy to answer general questions here in the meantime.'
  }
  if (userTurns === 2) {
    return 'For a full detailed itinerary, use **Send request** and our team will put it together for you.\n\nAnything specific you want to see in Sri Lanka?'
  }
  return 'Full itineraries are prepared by the team after **Send request**. I can still help with general questions here.'
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

function coerceDraft(d: any): DraftLead {
  const asNum = (v: any) => (typeof v === 'number' ? v : v == null ? null : Number(String(v)))
  const asBool = (v: any) => (typeof v === 'boolean' ? v : v == null ? null : String(v).toLowerCase() === 'true')
  const ages =
    Array.isArray(d?.childrenAgesValues)
      ? d.childrenAgesValues
          .map((x: any) => (typeof x === 'number' ? x : Number(String(x))))
          .filter((n: any) => Number.isFinite(n))
      : null
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
  }
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

    // Name is preferred for tone but does not block "Send request" — only dates, adults, and contact do.
    const mustAskFields: (keyof DraftLead)[] = ['startDate', 'endDate', 'numberOfAdults']
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')?.content || ''

    // Auto-capture contact details if user typed them naturally in chat.
    const inferredEmail = extractEmail(lastUserMessage)
    const inferredWhatsApp = extractWhatsApp(lastUserMessage)
    if (!draft.email && inferredEmail) draft = { ...draft, email: inferredEmail }
    if (!draft.whatsapp && inferredWhatsApp) draft = { ...draft, whatsapp: inferredWhatsApp }
    if (!draft.name) {
      const inferredName = extractNameFromMessage(lastUserMessage)
      if (inferredName) draft = { ...draft, name: inferredName }
    }

    const userTurns = countUserMessages(messages)
    const lastAssistantNorm = normalizeForCompare(lastAssistantMessage)

    // Guest wants to stop without sharing contact — do not loop the same contact prompt.
    if (!draft.email && !draft.whatsapp && wantsToEndChatWithoutContact(lastUserMessage)) {
      const missing = mustAskFields
        .filter((k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === '')
        .concat(['email_or_whatsapp'] as any)
      return jsonResponse(
        {
          success: true,
          reply:
            'Understood. Whenever you are ready, tap **End chat** below to close. No obligation. If you would like help later, you can open chat again anytime.',
          draft,
          missingFields: missing,
          suggestSendRequest: false,
        },
        200
      )
    }

    // Hard guard: do not provide full itinerary generation in chat.
    if (isItineraryIntent(lastUserMessage)) {
      const missing = mustAskFields
        .filter((k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === '')
        .concat(!draft.email && !draft.whatsapp ? (['email_or_whatsapp'] as any) : [])
      let reply = itineraryGuardReply(userTurns)
      if (normalizeForCompare(reply) === lastAssistantNorm) {
        reply = itineraryGuardReply(userTurns + 1)
      }
      return jsonResponse(
        {
          success: true,
          reply,
          draft,
          missingFields: missing,
          suggestSendRequest: true,
        },
        200
      )
    }

    // Contact gate: need email or WhatsApp before open-ended chat (name is asked on the site welcome only).
    if (!draft.email && !draft.whatsapp) {
      const missing = mustAskFields
        .filter((k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === '')
        .concat(!draft.email && !draft.whatsapp ? (['email_or_whatsapp'] as any) : [])
      let reply = contactGateReply(userTurns)
      if (draft.name) {
        reply = `Thanks, ${draft.name}. ${reply}`
      } else if (userTurns === 1 && assistantAlreadyAskedForName(lastAssistantMessage)) {
        reply = 'Got it. ' + reply
      }
      if (normalizeForCompare(reply) === lastAssistantNorm) {
        reply = contactGateReply(userTurns + 2)
      }
      return jsonResponse(
        {
          success: true,
          reply,
          draft,
          missingFields: missing,
          suggestSendRequest: false,
        },
        200
      )
    }

    const system = `You are LankaLux’s website chat. Write like a calm, friendly person on a small travel team: clear and human. No corporate filler, no lectures.

Style (important):
- Use normal sentences. Prefer commas, periods, and short sentences. Do not use em dashes (—), en dashes as pauses, or hyphen bullet lines for every reply. Those read like generic AI. Only use a dash or a short list when the guest clearly wants options or steps spelled out.
- Avoid “phrase — aside” patterns. No decorative colons introducing stacks of bullets unless they asked for a breakdown.

Rules:
- Keep replies short: usually 2 to 4 sentences unless they asked for detail.
- Never say you are an AI or mention models or tools.
- One question at a time when you need something.
- Use their name from the draft occasionally if present; otherwise say “you”.
- Help with Sri Lanka travel, vehicles, how you work, and timing. If they want a full day-by-day itinerary, say the team prepares that after they use “Send request”. Do not improvise a full itinerary in chat.
- If you are not sure, say the team will confirm.
- Update draft fields when the guest clearly gives dates, adults, children, email, WhatsApp, or preferences.

“Send request” needs: start date, end date, number of adults, plus email OR WhatsApp (name optional).

Knowledge:
${CHAT_KNOWLEDGE_SUMMARY}

Reply with STRICT JSON only:
{"reply":"string","draft":{...},"missingFields":[],"suggestSendRequest":true|false}`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.55,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({
            currentDraft: draft,
            mustAskFields,
            conversation: messages,
          }),
        },
      ],
    })

    const text = completion.choices?.[0]?.message?.content || ''
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      // Fallback: if JSON parsing fails, return a safe message.
      return jsonResponse(
        {
          success: true,
          reply:
            'What dates are you looking at, and how many adults are travelling?',
          draft,
          missingFields: mustAskFields
            .filter((k) => (draft as any)[k] == null || String((draft as any)[k]).trim() === '')
            .concat(!draft.email && !draft.whatsapp ? (['email_or_whatsapp'] as any) : []),
          suggestSendRequest: false,
        },
        200
      )
    }

    const nextDraft = { ...draft, ...coerceDraft(parsed?.draft || {}) }
    const missing = mustAskFields
      .filter((k) => (nextDraft as any)[k] == null || String((nextDraft as any)[k]).trim() === '')
      .concat(!nextDraft.email && !nextDraft.whatsapp ? (['email_or_whatsapp'] as any) : [])
    const suggestSendRequest = missing.length === 0

    let reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : 'What dates work for you, and how many people are travelling?'

    if (normalizeForCompare(reply) && isDuplicateAssistantReply(reply, messages)) {
      if (!nextDraft.startDate || !nextDraft.endDate) {
        reply = nextDraft.name
          ? `${nextDraft.name}, what dates are you thinking for Sri Lanka?`
          : 'What dates are you thinking for Sri Lanka?'
      } else if (nextDraft.numberOfAdults == null) {
        reply = 'How many adults (and any kids)?'
      } else {
        reply = 'Anything else you want us to know before you tap **Send request**?'
      }
    }

    return jsonResponse(
      {
        success: true,
        reply,
        draft: nextDraft,
        missingFields: Array.isArray(parsed?.missingFields) ? parsed.missingFields : missing,
        suggestSendRequest,
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

