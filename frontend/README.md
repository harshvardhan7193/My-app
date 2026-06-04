# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploying

This project is ready for static deployment on **Netlify** or **Vercel**. SPA fallback (so React Router deep links don't 404) is pre-configured for both.

- Build command: `npm run build`
- Output / publish directory: `dist`

### Deploying to Netlify

- SPA redirects are configured in `netlify.toml` and `public/_redirects`.
- Just connect the repo and pick the `frontend` directory as the base.

### Deploying to Vercel

- `vercel.json` configures Vite framework, build command, output directory, and a SPA rewrite (`/(.*) -> /index.html`).
- In the Vercel project settings, set **Root Directory** to `frontend`.

### Required environment variables (both platforms)

Set these in your deployment platform's environment variables UI:

- `VITE_API_URL` — full URL to the backend API root, e.g. `https://your-backend.vercel.app/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_VAPID_KEY`

Use `frontend/.env.example` as the reference template for variable names.

> Reminder: when the frontend (Vercel/Netlify) and backend (Vercel) live on different domains, the backend must be configured with `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `NODE_ENV=production`, and the frontend's deployed URL listed in `CLIENT_URL` (or `CLIENT_URLS` for multiple origins).
