# YouTube Analytics Bot - Frontend

Modern React frontend for analyzing YouTube channels and exporting metrics to Google Sheets.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
VITE_API_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

## Deployment

Deploy to Vercel:
```bash
npm run build
```

Add environment variable in Vercel dashboard:
- `VITE_API_URL`: Your backend API URL

## Features

- Clean, modern UI with Tailwind CSS
- Async job processing with status polling
- Direct links to generated Google Sheets
- Error handling and loading states
