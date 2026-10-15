# HROne frontend

React, TypeScript, Vite and Tailwind CSS frontend for the HROne Employee Attendance & Analytics assignment.

## Setup

From this directory:

```bash
npm install
npm run dev
```

The application is available at `http://localhost:5173`.

## API and mock mode

The frontend uses the typed service layer in `src/lib/api`. Demo mode is enabled by default and keeps mock data
isolated from the real HTTP client. Configure local environment values in `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCKS=true
```

Set `VITE_USE_MOCKS=false` only when the FastAPI service is running and configured with MongoDB. The client uses the
paths and schemas in the repository's `openapi.yaml`; it does not fall back to mock data when real API requests fail.

## Verification

```bash
npm run build
```

The build runs TypeScript project checks before the Vite production build.
