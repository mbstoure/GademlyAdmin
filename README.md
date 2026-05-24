# GademlyAdmin — Staff Portal

> Internal super admin panel for Gademly. Runs at `staff.internal.gademly.com`.

## Stack
- Vite + React + TypeScript
- Tailwind CSS (dark premium theme)
- Supabase Auth (super_admin role required)
- Connects to the same backend as `app.gademly.com`

---

## 1. Bootstrap your Super Admin account

After the backend is deployed, promote your first super admin:

```bash
curl -X POST https://gswkptaolciliaelzdzh.supabase.co/functions/v1/make-server-c6b0f6c0/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_ADMIN_BOOTSTRAP_SECRET", "userId": "YOUR_SUPABASE_USER_ID"}'
```

Set the bootstrap secret as a Supabase Edge Function secret:
```bash
npx supabase secrets set ADMIN_BOOTSTRAP_SECRET=your-strong-secret-here
```

---

## 2. Deploy to Cloudflare Pages

### A. Push to GitHub
```bash
git init && git add . && git commit -m "feat: Gademly Super Admin Panel"
git remote add origin https://github.com/YOUR_USERNAME/GademlyAdmin.git
git push -u origin main
```

### B. Cloudflare Pages settings
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables** (set in Cloudflare dashboard):
  ```
  VITE_SUPABASE_URL=https://gswkptaolciliaelzdzh.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  VITE_API_URL=https://gswkptaolciliaelzdzh.supabase.co/functions/v1/make-server-c6b0f6c0
  VITE_APP_URL=https://app.gademly.com
  ```

---

## 3. DNS — staff.internal.gademly.com

In Cloudflare DNS for `gademly.com`:
| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `staff.internal` | `your-pages-project.pages.dev` | ✅ Proxied |

Then in Cloudflare Pages → your project → **Custom domains** → add `staff.internal.gademly.com`.

---

## Local development

```bash
npm run dev
# → http://localhost:5176/
```
