const ALLOWED_ORIGINS = [
  "https://mygame77.github.io",
  "https://novara-ai.mygame77123.workers.dev",
  "http://localhost:8788"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    console.log("Request Origin:", origin);
console.log("Allowed Origins:", ALLOWED_ORIGINS);

    const headers = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
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

      if (!env.AI) {
        return Response.json(
          { error: "Cloudflare AI binding is missing. Configure env.AI in your Worker settings." },
          { status: 500, headers }
        );
      }

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "system",
              content: "You are NOVARA AI, a helpful, friendly AI assistant. Give clear, accurate, and useful answers. Keep your responses easy to understand."
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        }
      );

      const reply =
        result?.response ||
        result?.choices?.[0]?.message?.content ||
        result?.output_text;

      if (typeof reply !== "string" || !reply.trim()) {
        return Response.json(
          { error: "The AI returned an empty response. Please try again." },
          { status: 502, headers }
        );
      }

      return Response.json(
        { reply: reply.trim() },
        { headers }
      );

    } catch (error) {
      return Response.json(
        { error: "Cloudflare AI request failed. Check your AI binding, model availability, and account limits." },
        { status: 500, headers }
      );
    }
  }
};
