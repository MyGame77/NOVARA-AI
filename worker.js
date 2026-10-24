const MODEL = "@cf/meta/llama-3.2-3b-instruct";

const ALLOWED_ORIGINS = [
  "https://mygame77.github.io",
  "http://localhost:8788",
  "http://127.0.0.1:8788"
];

const SYSTEM_PROMPT = `
You are NOVARA AI, a helpful AI assistant created for the NOVARA AI website.
Be friendly, natural, clear, and accurate. Answer the user's actual question.
Do not invent facts, prices, dates, sources, URLs, or technical details.
If you are unsure or lack enough information, say so honestly.
For coding questions, provide clear explanations and properly fenced code blocks.
Keep answers appropriately concise unless the user asks for detail.
`;

function makeHeaders(origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = makeHeaders(origin);

    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return json({ error: `Origin not allowed: ${origin}` }, 403, headers);
      }
      return new Response(null, { status: 204, headers });
    }

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: `Origin not allowed: ${origin}` }, 403, headers);
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/status")) {
      return json({
        service: "NOVARA AI API",
        status: "online",
        provider: "Cloudflare Workers AI",
        model: MODEL
      }, 200, headers);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST with JSON { message: \"Hello\" }." }, 405, headers);
    }

    try {
      if (!env.AI || typeof env.AI.run !== "function") {
        throw new Error("Workers AI binding is missing. Add an AI binding named AI and redeploy.");
      }

      const body = await request.json();
      let messages;

      if (Array.isArray(body.messages)) {
        messages = body.messages
          .filter(item =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim()
          )
          .slice(-20)
          .map(item => ({ role: item.role, content: item.content.trim() }));
      } else {
        const message = typeof body.message === "string" ? body.message.trim() : "";
        messages = message ? [{ role: "user", content: message }] : [];
      }

      if (!messages.length) {
        return json({ error: "Please enter a message." }, 400, headers);
      }

      const latestUserMessage = [...messages].reverse().find(item => item.role === "user");
      if (latestUserMessage?.content.length > 12000) {
        return json({ error: "Message is too long. Please keep it under 12,000 characters." }, 413, headers);
      }

      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 768
      });

      const reply =
        result?.response ||
        result?.result?.response ||
        result?.choices?.[0]?.message?.content;

      if (typeof reply !== "string" || !reply.trim()) {
        console.error("Workers AI returned an unexpected result:", JSON.stringify(result));
        return json({ error: "Cloudflare AI returned an empty response. Please try again." }, 502, headers);
      }

      return json({ reply: reply.trim(), provider: "Cloudflare Workers AI", model: MODEL }, 200, headers);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("NOVARA AI request failed:", detail);
      return json({
        error: "Cloudflare AI request failed.",
        details: detail
      }, 502, headers);
    }
  }
};
