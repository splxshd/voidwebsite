const http = require("http");
const { URL } = require("url");

// Environment variables
const OWNER_EMAIL = process.env.OWNER_EMAIL || "owner@temorpay.com";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "temor123";

const port = process.env.PORT || 3000;

// In-memory storage (resets on deploy — fine for demo)
let invoices = [];
let invoiceCounter = 1;

/*
|--------------------------------------------------------------------------
| Core Request Handler
|--------------------------------------------------------------------------
*/

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse body if needed
  const getBody = () =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  /*
  |--------------------------------------------------------------------------
  | ROUTES
  |--------------------------------------------------------------------------
  */

  // Health check
  if (pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Login
  if (pathname === "/api/login" && req.method === "POST") {
    const body = await getBody();

    if (
      body.email === OWNER_EMAIL &&
      body.password === OWNER_PASSWORD
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false }));
    }
    return;
  }

  // Create invoice
  if (pathname === "/api/invoices" && req.method === "POST") {
    const body = await getBody();

    const invoice = {
      id: invoiceCounter++,
      amount: body.amount,
      description: body.description || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    invoices.push(invoice);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(invoice));
    return;
  }

  // Get all invoices
  if (pathname === "/api/invoices" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(invoices));
    return;
  }

  // Confirm invoice
  if (
    pathname.startsWith("/api/invoices/") &&
    pathname.endsWith("/confirm") &&
    req.method === "POST"
  ) {
    const id = parseInt(pathname.split("/")[3]);
    const invoice = invoices.find((i) => i.id === id);

    if (!invoice) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invoice not found" }));
      return;
    }

    invoice.status = "confirmed";

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(invoice));
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

/*
|--------------------------------------------------------------------------
| Vercel Export
|--------------------------------------------------------------------------
*/

module.exports = handler;

/*
|--------------------------------------------------------------------------
| Local Dev Server (only runs locally)
|--------------------------------------------------------------------------
*/

if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`Temor server running on http://localhost:${port}`);
  });
}
