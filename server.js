import express from "express";

const app = express();

// Endpoint SSE que o MCP/cliente vai consumir
app.get("/mcp/sse", (req, res) => {
  // cabeçalhos obrigatórios para SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // envia cabeçalhos imediatamente
  res.flushHeaders?.();

  // ping periódico para manter a conexão viva
  const keepAlive = setInterval(() => {
    res.write(":keepalive\n\n"); // comentário SSE
  }, 15000);

  // exemplo: manda um evento simples a cada 5s
  let i = 0;
  const ticker = setInterval(() => {
    res.write("event: message\n");
    res.write(`data: {"count": ${i++}}\n\n`);
  }, 5000);

  // quando o cliente fecha a conexão
  req.on("close", () => {
    clearInterval(keepAlive);
    clearInterval(ticker);
    res.end();
  });
});

// rota simples de saúde
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("MCP SSE server listening on", port);
});
