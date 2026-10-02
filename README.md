# Bloomberg Terminal Clone

Clone of the Bloomberg Terminal built with Next.js 15, React 19, and TypeScript. This project demonstrates real-time financial data visualization with a professional interface inspired by the Bloomberg Terminal. Structured as an SPA because for a terminal with constantly mutating financial data, URL structure and browser history have limited utility compared to a traditional SPA approach.

![Preview](README.png)

## Features

- **Real-time Market Data**: Simulated market updates with configurable refresh rates
- **Multiple Views**: Market data, news, market movers, and volatility analysis
- **Interactive UI**: Terminal-like interface with keyboard shortcuts
- **Watchlist**: Create and manage lists of financial instruments
- **Dark/Light Mode**: Toggle between color schemes
- **Responsive Design**: Works on desktop and tablet devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19 with shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: Jotai for local state, React Query for server state
- **Backend**: Express server (`backend/`) with MongoDB for market-data caching and rate limiting
- **Animation**: Motion (formerly Framer Motion)
- **Linting/Formatting**: Biome.js

## Getting Started

### Prerequisites

- Node LTS
- pnpm

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=bloomberg

# Express backend URL (consumed by the Next.js proxy route)
BACKEND_URL=http://localhost:3001
BACKEND_PORT=3001

# Alpha Vantage API key for market data
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key

# OpenAI API key for AI features
OPENAI_API_KEY=your_openai_api_key

# Allowed origins for API access (comma-separated list, no spaces)
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000
```

### Running Locally

The app has two processes: the Next.js frontend and an Express backend that talks to MongoDB. Both read `.env.local` from the repo root.

```bash
# Install dependencies for both packages
pnpm install
pnpm --dir backend install

# Terminal 1: start MongoDB (e.g. a local install or Docker)
docker run -d -p 27017:27017 --name bloomberg-mongo mongo

# Terminal 2: start the backend on BACKEND_PORT (default 3001)
pnpm --dir backend dev

# Terminal 3: start the frontend on http://localhost:3000
pnpm dev
```

The backend exposes `GET /api/market-data`, `POST /api/market-data`, and `POST /api/seed`. The Next.js route at `app/api/market-data` proxies to it using `BACKEND_URL`, so the browser only ever talks to the Next.js server. Market data is cached in the `market_data` collection with a TTL index and falls back to bundled sample data when Alpha Vantage is unavailable.

## Project Structure

The project is structured as follows:

- `/app`: Next.js App Router pages and API routes (the market-data route proxies to the backend)
- `/backend`: Express + MongoDB server (`server.ts`) with its own `package.json`
- `/components/bloomberg`: Terminal-specific components
  - `/api`: API client functions for market data fetching and simulation
  - `/atoms`: Jotai atoms for local state management
  - `/core`: Core Bloomberg Terminal components
    - Reusable UI elements specific to the terminal (buttons, modals, etc.)
    - User interaction components (keyboard shortcuts, watchlist, etc.)
  - `/hooks`: Custom React hooks for data fetching and UI state
  - `/layout`: Layout components that define the terminal structure
    - Terminal container, header, footer, and navigation elements
  - `/lib`: Terminal-specific utility functions and configuration
  - `/providers`: Context providers for React Query and other global state
  - `/ui`: Terminal-specific UI components
    - Data visualization components (tables, sparklines, etc.)
    - Terminal-specific UI elements that aren't part of the core
  - `/views`: Main view components for different terminal screens
    - Market view, news view, volatility view, etc.
- `/components/ui`: shadcn/ui base components (design system)
- `/lib`: Application-wide utility functions and shared code, including the MongoDB client and Alpha Vantage fetcher
- `/public`: Static assets and images

### Component Organization Philosophy

Components are organized based on:

- **Core Components**: Foundational UI elements specific to the Bloomberg Terminal interface
- **Layout Components**: Define the overall structure and layout of the application
- **UI Components**: Specialized components for data visualization and user interaction
- **View Components**: Complete screens or major sections of the application

## Performance Optimizations

- React Query for efficient data fetching and caching
- Optimized update cycles to reduce API calls
- Memoization of expensive calculations
- Conditional rendering for performance-critical components

## Security Features

- **Origin Restriction**: API endpoints are restricted to specific domains configured via the `ALLOWED_ORIGINS` environment variable
- **Rate Limiting**: Prevents abuse by limiting requests per IP address, tracked in MongoDB
- **Input Validation**: All API inputs are validated and sanitized using Zod schemas
- **Response Limiting**: AI responses are limited in token count to prevent excessive usage
- **Environment Variables**: Sensitive keys are stored in environment variables and not exposed to the client

## License

MIT
