/**
 * Speech-to-text for voice input - wraps Groq's OpenAI-compatible Whisper
 * endpoint. The composer records a short audio clip in the browser and POSTs it
 * here as multipart form-data; we forward it to Groq and hand back plain text
 * the shopper can edit before sending.
 *
 * Whisper transcribes Sinhala and Tamil speech well (and English/Singlish/
 * Tanglish phonetically), so this is the lowest-risk way to let someone's amma
 * just *talk* to Aura. No spoken replies here - read-aloud uses the browser's
 * built-in speech synthesis on the client (zero extra cost/keys).
 */
export const runtime = "nodejs";
export const maxDuration = 30;

// Whisper large v3 turbo: fast, multilingual, cheap. Override via GROQ_STT_MODEL.
const STT_MODEL = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";
const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Guard rail: a dictation clip should be short. Reject anything that smells like
// abuse of the (rate-limited) Groq audio quota.
const MAX_BYTES = 8 * 1024 * 1024; // ~8 MB ≈ a minute of compressed audio

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "Voice input isn't configured." }, { status: 500 });
  }

  let inbound: FormData;
  try {
    inbound = await req.formData();
  } catch {
    return Response.json({ error: "Invalid audio upload." }, { status: 400 });
  }

  const file = inbound.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "No audio received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That clip is too long - keep it under a minute." }, { status: 413 });
  }

  // Optional language hint from the client (the profile language, when set) so
  // Whisper biases toward the right script instead of guessing per clip.
  const langHint = inbound.get("language");

  const form = new FormData();
  form.append("file", file, "speech.webm");
  form.append("model", STT_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (typeof langHint === "string" && /^[a-z]{2}$/.test(langHint)) {
    form.append("language", langHint);
  }

  try {
    const res = await fetch(GROQ_STT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[aura/transcribe] groq error", res.status, detail.slice(0, 300));
      const limited = res.status === 429;
      return Response.json(
        {
          error: limited
            ? "Voice is a touch busy right now - try again in a moment, or type it."
            : "I couldn't catch that. Mind trying again, or typing it?",
        },
        { status: limited ? 429 : 502 },
      );
    }
    const data = (await res.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[aura/transcribe] failed", err);
    return Response.json({ error: "Voice input hiccuped. Please type it instead." }, { status: 502 });
  }
}
