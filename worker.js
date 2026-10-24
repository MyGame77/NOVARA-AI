
const ALLOWED_ORIGINS = [
  "https://MyGame77.github.io",
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
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: message.trim() }]
              }
            ],
            systemInstruction: {
              parts: [{
                text: "You are NOVARA AI, a helpful, friendly AI assistant. Give clear and accurate answers."
              }]
            }
          })
        }
      );

      const data = await result.json();

      if (!result.ok) {
        return Response.json(
          { error: data.error?.message || "Gemini request failed." },
          { status: result.status, headers }
        );
      }

      const reply = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      return Response.json(
        { reply: reply || "Gemini returned an empty response." },
        { headers }
      );
    } catch {
      return Response.json(
        { error: "Server error. Check the Worker configuration." },
        { status: 500, headers }
      );
    }
  }
};
