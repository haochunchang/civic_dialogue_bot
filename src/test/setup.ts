import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables
vi.stubEnv('VITE_OLLAMA_BASE_URL', 'http://localhost:11434');
vi.stubEnv('VITE_OLLAMA_MODEL', 'llama3.1');
vi.stubEnv('VITE_TAVILY_API_KEY', 'test-api-key');
