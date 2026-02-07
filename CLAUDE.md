# CLAUDE.md - Civic Dialogue Bot

## Project Overview

A fact-checking web application ("公民對話促進器") that analyzes social media posts and provides evidence-based responses with verified sources. Uses a local LLM (Ollama) with tool-calling to perform web searches (Tavily API) and return markdown-formatted, sourced responses in **Traditional Chinese**.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Testing:** Vitest 4 + Testing Library + jsdom
- **Linting:** ESLint 9 (flat config)
- **Styling:** Plain CSS with CSS custom properties
- **Font:** Noto Sans TC (Google Fonts)
- **External Services:** Ollama (local LLM), Tavily API (web search)

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run lint         # Run ESLint
npm test             # Run Vitest in watch mode
npx vitest --run     # Run tests once (CI mode)
npm run test:ui      # Run tests with browser UI dashboard
npm run test:coverage # Run tests with coverage report
npm run preview      # Preview production build
```

**Important:** Always run `npm install` first if `node_modules/` is missing.

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Header.tsx       # Sticky header with app title
│   ├── QueryInput.tsx   # Text input + submit button
│   └── ResponseDisplay.tsx  # Renders fact-check results (markdown parser)
├── hooks/
│   └── useFactChecker.ts    # State management for fact-checking flow
├── services/
│   ├── ollama.ts            # Core logic: Ollama + Tavily API integration
│   └── __tests__/
│       └── ollama.test.ts   # 14 tests covering happy paths, edge cases, errors
├── test/
│   └── setup.ts             # Vitest global setup (env mocks, cleanup)
├── App.tsx                  # Root component
├── main.tsx                 # Entry point
├── index.css                # Global styles + CSS variables
└── App.css                  # App layout styles
```

## Architecture

```
QueryInput (user types post) → useFactChecker hook → ollama.ts service
                                                        ├── POST to Ollama /api/chat
                                                        ├── Handle tool_calls (web_search)
                                                        ├── POST to Tavily /search
                                                        └── Loop up to 3 iterations
                                                     → ResponseDisplay (renders markdown)
```

Key patterns:
- **Service layer** (`ollama.ts`) encapsulates all API calls
- **Custom hook** (`useFactChecker`) manages loading/error/response state
- **Tool-calling loop** with a max of 3 iterations to prevent infinite loops
- **Graceful degradation** - Tavily errors are included in tool responses, not thrown

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
VITE_OLLAMA_MODEL=llama3.1                    # LLM model name
VITE_TAVILY_API_KEY=your_tavily_api_key_here  # Tavily API key
```

All env vars use the `VITE_` prefix (required by Vite for client-side access).

## Testing Conventions

- Tests live in `__tests__/` directories adjacent to the code they test
- Test file naming: `<module>.test.ts`
- `fetch` is globally mocked in tests; use `vi.mocked(fetch)` to set up responses
- Test setup (`src/test/setup.ts`) stubs all `VITE_*` env vars
- Tests are organized in `describe` blocks: happy paths, edge cases, error handling, API integration
- All 14 tests currently pass

## Code Conventions

- **Language:** TypeScript with strict mode enabled
- **UI text:** All user-facing strings are in Traditional Chinese
- **Console logging:** Emoji-prefixed logs for debugging (e.g., `🚀`, `🤖`, `🔍`, `✅`, `❌`)
- **Imports:** Use `@/` path alias for `src/` directory imports
- **CSS:** Use CSS custom properties defined in `index.css` (e.g., `--primary-color`, `--text-main`)
- **No unused variables:** TypeScript config enforces `noUnusedLocals` and `noUnusedParameters`
- **Components:** Functional components with TypeScript interfaces for props

## Key Files to Understand

- `src/services/ollama.ts` — Core business logic: LLM interaction, tool calling, web search
- `src/hooks/useFactChecker.ts` — React state management for the fact-checking flow
- `src/components/ResponseDisplay.tsx` — Markdown parsing and rendering logic
- `src/services/__tests__/ollama.test.ts` — Comprehensive test suite (reference for mocking patterns)

## Common Tasks

**Adding a new tool for the LLM:**
1. Add the tool definition in the `tools` array in `checkFacts()` (`src/services/ollama.ts`)
2. Add a handler in the tool-call processing loop
3. Add tests in `src/services/__tests__/ollama.test.ts`

**Modifying the system prompt:**
Edit the `content` of the system message in `checkFacts()` in `src/services/ollama.ts`.

**Changing styles:**
Update CSS custom properties in `src/index.css` for theme-level changes.
