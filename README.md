# TemorPay Demo

This project now includes a static frontend and a lightweight Node backend with the core admin/payment endpoints.

## Run locally

```bash
npm install
npm start
```

The site runs on `http://localhost:4173` by default.

## API endpoints

- `POST /api/auth/login`
- `GET /api/delivery/queue` (auth required)
- `POST /api/delivery/retry/:orderId` (auth required)
- `POST /api/invoices/:id/confirm` (auth required)
- `POST /api/webhooks/ltc`
- `GET /api/invoices` (auth required)

Use `Authorization: Bearer <token>` for protected routes.

## Export site as ZIP

```bash
./export-site.sh
```

This creates `temor-site-export.zip` with all site/frontend/backend files needed for deployment.

## Vercel deployment

1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Keep defaults (Vercel will use `vercel.json`).
4. Add environment variables:
   - `OWNER_EMAIL`
   - `OWNER_PASSWORD`
5. Deploy.

After deploy, your static pages and `/api/*` routes are live under the same domain.

## Email auto-delivery (production architecture)

For production, wire these routes to your DB + email provider (Resend/SendGrid/Postmark/SES):

1. Webhook receives payment (`/api/webhooks/ltc`) and marks invoice paid.
2. Create a delivery job for the order.
3. Worker sends product email and updates queue status (`Sent` / `Failed`).
4. Admin can retry failed jobs (`/api/delivery/retry/:orderId`).
5. Manual TXID confirmation can trigger queueing (`/api/invoices/:id/confirm`).
