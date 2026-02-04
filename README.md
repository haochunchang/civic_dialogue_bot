# Civic Dialogue Bot

A fact-checking web application that analyzes social media posts and provides evidence-based responses with verified sources. Built with React, TypeScript, and powered by local LLM (Ollama) with web search capabilities.

## Features

- **AI-Powered Fact Checking**: Uses Ollama to analyze claims and statements
- **Real-time Web Search**: Integrates Tavily API to verify facts against current information
- **Source Attribution**: Every fact is linked to its source with proper citations
- **Clean UI**: Simple, intuitive interface for analyzing posts
- **Traditional Chinese Support**: Interface and responses in Traditional Chinese

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI**: Ollama (local LLM)
- **Search**: Tavily API for web search
- **Icons**: Lucide React
- **Styling**: CSS

## Prerequisites

- Node.js (v18 or higher)
- [Ollama](https://ollama.ai/) installed and running locally
- Tavily API key (get one at [tavily.com](https://tavily.com))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd civic_dialogue_bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your configuration:
```env
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

5. Make sure Ollama is running with your chosen model:
```bash
ollama pull llama3.1
ollama serve
```

## Usage

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create a production build:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## How It Works

1. User inputs a social media post or claim
2. The app sends the content to Ollama with a fact-checking prompt
3. Ollama uses the `web_search` tool to query Tavily API for current information
4. The AI analyzes the search results and formulates a response
5. Response is displayed with proper source citations in Markdown format

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # App header
│   ├── QueryInput.tsx      # Input component for posts
│   └── ResponseDisplay.tsx # Display fact-check results
├── hooks/
│   └── useFactChecker.ts   # Custom hook for fact-checking logic
├── services/
│   └── ollama.ts          # Ollama API integration
├── App.tsx                # Main app component
└── main.tsx              # App entry point
```

## Configuration

### Ollama Models

You can use different Ollama models by changing `VITE_OLLAMA_MODEL` in your `.env`:
- `llama3.1` (default)
- `llama2`
- `mistral`
- Any other compatible model

### Tavily Search

The app uses Tavily's smart search with:
- Maximum 5 results per query
- Smart search depth
- Answer extraction enabled

## Development

### Linting

Run ESLint:
```bash
npm run lint
```

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license here]

## Acknowledgments

- [Ollama](https://ollama.ai/) for local LLM capabilities
- [Tavily](https://tavily.com) for web search API
- [Vite](https://vite.dev/) for blazing fast build tooling
