// Vercel Node serverless function (CommonJS). Put this file at: api/chat.js
module.exports = async (req, res) => {
  // --- CORS (allow your Qualtrics origin) ---
  const origin = req.headers.origin || "*";
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
    : ["*"];
  const allowOrigin = allowed.includes("*") || allowed.includes(origin) ? origin : allowed[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      prompt = "",
      system = "",
      history = [],
      model = "gpt-4o-mini",
      temperature = 0.7,
      max_tokens = 512
    } = req.body || {};

    const messages = [];
    if (system && typeof system === "string") messages.push({ role: "system", content: system });
    if (Array.isArray(history)) {
      for (const m of history) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }
    if (prompt) messages.push({ role: "user", content: prompt });

    const oai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false })
    });

    if (!oai.ok) {
      const errText = await oai.text().catch(() => "");
      return res.status(oai.status).json({ error: "OpenAI error", details: errText });
    }

    const data = await oai.json();
    const text = (data?.choices?.[0]?.message?.content || "").trim();

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
