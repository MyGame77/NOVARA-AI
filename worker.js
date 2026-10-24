
const ALLOWED_ORIGINS = [
  "https://mygame77.github.io",
  "https://novara-ai.mygame77123.workers.dev",
  "http://localhost:8788"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

    const headers = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return Response.json(
        { error: "Origin not allowed" },
        { status: 403, headers }
      );
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Use POST for chat requests." },
        { status: 405, headers }
      );
    }

    if (!env.GROQ_API_KEY) {
      return Response.json(
        { error: "GROQ_API_KEY secret is missing." },
        { status: 500, headers }
      );
    }

    try {
      const body = await request.json();
      const message = body.message;

      if (typeof message !== "string" || !message.trim()) {
        return Response.json(
          { error: "Please enter a message." },
          { status: 400, headers }
        );
      }

      const result = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  "You are NOVARA AI, a helpful and friendly AI assistant. Give accurate, clear answers. Do not invent facts about your creator. If you don't know something, say so."
              },
              {
                role: "user",
                content: message.trim()
              }
            ],
            temperature: 0.7,
            max_completion_tokens: 1024
          })
        }
      );

      const data = await result.json();

      if (!result.ok) {
        return Response.json(
          {
            error:
              data.error?.message ||
              `Groq API request failed (${result.status}).`
          },
          { status: 502, headers }
        );
      }

      const reply =
        data.choices?.[0]?.message?.content?.trim();

      return Response.json(
        { reply: reply || "Groq returned an empty response." },
        { headers }
      );
    } catch {
      return Response.json(
        { error: "Server error while contacting Groq." },
        { status: 500, headers }
      );
    }
  }
};
