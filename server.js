import express from "express";

const app = express();
app.use(express.json()); // permite receber JSON no body

// Lista de conexões SSE ativas
const clients = [];

// Endpoint SSE
app.get("/mcp/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // adiciona este cliente à lista
  clients.push(res);

  // remove cliente quando fecha conexão
  req.on("close", () => {
    const i = clients.indexOf(res);
    if (i >= 0) clients.splice(i, 1);
  });
});

// Endpoint para o n8n mandar eventos
app.post("/mcp/event", (req, res) => {
  const event = req.body;
  // envia para todos os clientes conectados
  clients.forEach((client) => {
    client.write(`event: message\n`);
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  res.status(200).send({ delivered: clients.length });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("MCP SSE server listening on", port);
});
