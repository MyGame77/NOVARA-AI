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

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    // Validate the request origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return Response.json(
        { error: "Origin not allowed." },
        { status: 403, headers }
      );
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return Response.json(
        { error: "Use POST for chat requests." },
        { status: 405, headers }
      );
    }

    try {
      const body = await request.json();
      const message = body.message;

      // Validate the message
      if (typeof message !== "string" || !message.trim()) {
        return Response.json(
          { error: "Please enter a message." },
          { status: 400, headers }
        );
      }

      // Run NOVARA AI using Llama on Cloudflare Workers AI
      const result = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages: [
            {
              role: "system",
              content:
                "You are NOVARA AI, a helpful and friendly AI assistant. " +
                "Give accurate, clear answers. Never invent facts about your creator. " +
                "If you do not know something, say so."
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        }
      );

      const reply =
        result?.response?.trim() ||
        "Llama returned an empty response.";

      return Response.json(
        { reply },
        { headers }
      );

    } catch (error) {
      console.error("NOVARA AI error:", error);

      return Response.json(
        { error: "NOVARA AI encountered an error. Check the Worker logs." },
        { status: 500, headers }
      );
    }
  }
};
```
