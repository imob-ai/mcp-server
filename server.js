import express from "express";

const app = express();
app.use(express.json());

const AUTH_TOKEN = process.env.MCP_TOKEN || ""; // defina no Railway
const channels = new Map(); // channel -> Set(res)

// helper: pega (ou cria) o Set de clientes do canal
function getChannel(name) {
  if (!channels.has(name)) channels.set(name, new Set());
  return channels.get(name);
}

// SSE: clientes se inscrevem em um canal (?channel=geral&token=XXX)
app.get("/mcp/sse", (req, res) => {
  const channel = (req.query.channel || "geral").toString();
  const token = (req.query.token || "").toString();
  if (AUTH_TOKEN && token !== AUTH_TOKEN) return res.sendStatus(401);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const subs = getChannel(channel);
  subs.add(res);

  // ping pra manter conexão viva
  const keep = setInterval(() => res.write(":keepalive\n\n"), 15000);

  req.on("close", () => {
    clearInterval(keep);
    subs.delete(res);
  });
});

// Recebe evento do n8n e transmite ao canal
app.post("/mcp/event", (req, res) => {
  const token = (req.query.token || req.headers["x-auth-token"] || "").toString();
  if (AUTH_TOKEN && token !== AUTH_TOKEN) return res.sendStatus(401);

  const channel = (req.query.channel || req.body.channel || "geral").toString();
  const data = req.body?.data ?? req.body;

  const subs = getChannel(channel);
  for (const client of subs) {
    client.write("event: message\n");
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  res.status(200).json({ delivered: subs.size });
});

app.get("/healthz", (_req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("MCP SSE up on", port));
