const ALLOWED_ORIGINS = new Set([
  "https://mygame77.github.io",
  "http://localhost:8788",
  "http://127.0.0.1:8788"
]);

function jsonResponse(data, status, origin) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET";
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    // Browser Origin values are origins only (scheme + host), never the repo path.
    const rawOrigin = request.headers.get("Origin") || "";
    let origin = "";
    try {
      origin = rawOrigin ? new URL(rawOrigin).origin.toLowerCase() : "";
    } catch {
      origin = "";
    }

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    // Allow opening the Worker URL directly to check that the correct code is deployed.
    if (request.method === "GET" && new URL(request.url).pathname === "/") {
      return jsonResponse({ service: "NOVARA AI API", status: "online", hint: "Send a POST request with JSON { message: \"Hello\" } from the website." }, 200, origin);
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "Origin not allowed", receivedOrigin: rawOrigin || "(none)" }, 403, "");
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY secret is missing in Cloudflare Worker settings." }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body." }, 400, origin);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return jsonResponse({ error: "Please enter a message." }, 400, origin);
    if (message.length > 10000) return jsonResponse({ error: "Message is too long (maximum 10,000 characters)." }, 413, origin);

    try {
      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: "You are NOVARA AI, a helpful, friendly AI assistant. Give clear, accurate answers. If you are unsure, say so." }]
            },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        }
      );

      const data = await geminiResponse.json().catch(() => ({}));
      if (!geminiResponse.ok) {
        const messageFromGemini = data?.error?.message || `Gemini request failed (${geminiResponse.status}).`;
        return jsonResponse({ error: messageFromGemini }, geminiResponse.status >= 400 && geminiResponse.status < 600 ? geminiResponse.status : 502, origin);
      }

      const reply = (data.candidates?.[0]?.content?.parts || [])
        .map(part => typeof part.text === "string" ? part.text : "")
        .join("")
        .trim();
      if (!reply) return jsonResponse({ error: "Gemini returned no text. Try a different prompt." }, 502, origin);
      return jsonResponse({ reply }, 200, origin);
    } catch (error) {
      return jsonResponse({ error: "Could not reach Gemini. Please try again." }, 502, origin);
    }
  }
};
