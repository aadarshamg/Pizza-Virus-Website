# Pizza Virus - Customer Website

Web version of `customer-app`: menu, product customisation, cart, checkout (COD + PhonePe), order tracking, rewards, profile.
Uses the **same Supabase project** as the app, admin portal and staff portal - website orders appear in both portals automatically.

Stack: Vite + React 18 + React Router 7 + Tailwind 3 (same as `admin-portal`), Leaflet for the address map.

## Run locally
```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (same values as the app)
npm install
npm run dev            # http://localhost:5173
```

## One-time setup
1. **Deploy the web payment function** (the app's functions are untouched):
   ```bash
   supabase functions deploy create-phonepe-web-order
   supabase secrets set WEB_ALLOWED_ORIGINS="https://<your-domain>,http://localhost:5173"
   ```
   It reuses the existing secrets `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_ENV`, `SERVICE_ROLE_KEY`.
2. **Supabase → Authentication → URL Configuration**: add `https://<your-domain>/**` and `http://localhost:5173/**`
   to Redirect URLs (needed for Google sign-in and password-reset links).
3. **Deploy**: import this folder into Vercel (framework: Vite), set the two `VITE_` env vars. `vercel.json` handles SPA routes.

## Where things live
- `src/utils/pricing.js` - item price + bill formula (identical to the app's CartScreen)
- `src/lib/orders.js` - checkout validation, order/order_items insert, PhonePe start/verify
- `src/contexts/` - Auth, Store, Cart (cart persists in localStorage)
- `src/pages/` - one file per screen; `src/pages/auth/` for sign-in flows
