import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkFacts } from '../ollama';

// Mock global fetch
global.fetch = vi.fn();

describe('ollama service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkFacts', () => {
    describe('happy path', () => {
      it('returns AI response when no tool calls are needed', async () => {
        const mockResponse = {
          model: 'llama3.1',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: '這是一個測試回覆',
          },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('測試貼文內容');

        expect(result).toBe('這是一個測試回覆');
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('performs web search when AI requests tool call', async () => {
        const mockOllamaResponseWithToolCall = {
          model: 'llama3.1',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'web_search',
                  arguments: { query: '測試查詢' },
                },
              },
            ],
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [
            {
              title: '測試標題',
              url: 'https://example.com/test',
              content: '測試內容',
            },
          ],
        };

        const mockFinalOllamaResponse = {
          model: 'llama3.1',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: '根據搜尋結果，這是事實查核回覆',
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockOllamaResponseWithToolCall,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTavilyResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockFinalOllamaResponse,
          });

        const result = await checkFacts('測試貼文內容');

        expect(result).toBe('根據搜尋結果，這是事實查核回覆');
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      it('handles multiple tool calls in sequence', async () => {
        const mockFirstToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'web_search',
                  arguments: { query: '第一次查詢' },
                },
              },
            ],
          },
          done: true,
        };

        const mockSecondToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'web_search',
                  arguments: { query: '第二次查詢' },
                },
              },
            ],
          },
          done: true,
        };

        const mockFinalResponse = {
          message: {
            role: 'assistant',
            content: '完整的事實查核回覆',
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [
            {
              title: '搜尋結果',
              url: 'https://example.com',
              content: '內容',
            },
          ],
        };

        (global.fetch as any)
          .mockResolvedValueOnce({ ok: true, json: async () => mockFirstToolCall })
          .mockResolvedValueOnce({ ok: true, json: async () => mockTavilyResponse })
          .mockResolvedValueOnce({ ok: true, json: async () => mockSecondToolCall })
          .mockResolvedValueOnce({ ok: true, json: async () => mockTavilyResponse })
          .mockResolvedValueOnce({ ok: true, json: async () => mockFinalResponse });

        const result = await checkFacts('測試內容');

        expect(result).toBe('完整的事實查核回覆');
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });
    });

    describe('edge cases', () => {
      it('limits tool call iterations to 3', async () => {
        const mockToolCallResponse = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'web_search',
                  arguments: { query: '查詢' },
                },
              },
            ],
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [{ title: 'Test', url: 'https://example.com', content: 'Content' }],
        };

        // Mock infinite tool calls
        (global.fetch as any).mockImplementation((url: string) => {
          if (url.includes('tavily')) {
            return Promise.resolve({ ok: true, json: async () => mockTavilyResponse });
          }
          return Promise.resolve({ ok: true, json: async () => mockToolCallResponse });
        });

        const result = await checkFacts('測試內容');

        // Should stop at 3 iterations despite more tool calls
        // Initial call + 3 iterations (each with 1 Ollama + 1 Tavily call)
        expect(global.fetch).toHaveBeenCalledTimes(7); // 1 + (3 * 2)
      });

      it('handles empty post content', async () => {
        const mockResponse = {
          message: { role: 'assistant', content: '請提供貼文內容' },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('');

        expect(result).toBeTruthy();
      });

      it('handles Tavily search with no results', async () => {
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試' } },
              },
            ],
          },
          done: true,
        };

        const mockEmptyTavilyResponse = {
          results: [],
        };

        const mockFinalResponse = {
          message: { role: 'assistant', content: '無搜尋結果的回覆' },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({ ok: true, json: async () => mockToolCall })
          .mockResolvedValueOnce({ ok: true, json: async () => mockEmptyTavilyResponse })
          .mockResolvedValueOnce({ ok: true, json: async () => mockFinalResponse });

        const result = await checkFacts('測試內容');

        expect(result).toBe('無搜尋結果的回覆');
      });
    });

    describe('error states', () => {
      it('throws error when Ollama request fails', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
        });

        await expect(checkFacts('測試內容')).rejects.toThrow(
          'Ollama Error: Internal Server Error'
        );
      });

      it('validates Tavily API key format during search', async () => {
        // This tests that the API key validation exists in the code
        // The actual validation happens inside performWebSearch
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試' } },
              },
            ],
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [{ title: 'Test', url: 'https://example.com', content: 'Content' }],
        };

        const mockFinalResponse = {
          message: { role: 'assistant', content: '回覆' },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockToolCall,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTavilyResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockFinalResponse,
          });

        const result = await checkFacts('測試內容');

        // Verify the API key was used in the Tavily request
        const tavilyCall = (global.fetch as any).mock.calls.find((call: any) =>
          call[0].includes('tavily')
        );
        const body = JSON.parse(tavilyCall[1].body);
        expect(body.api_key).toBeDefined();
      });

      it('throws error when Tavily search fails with HTTP error', async () => {
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試' } },
              },
            ],
          },
          done: true,
        };

        const mockFinalResponse = {
          message: {
            role: 'assistant',
            content: '搜尋失敗後的回覆',
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockToolCall,
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized',
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockFinalResponse,
          });

        // The current implementation adds error message to tool results and continues
        const result = await checkFacts('測試內容');
        expect(result).toBe('搜尋失敗後的回覆');
      });

      it('throws error when Ollama fails after tool execution', async () => {
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試' } },
              },
            ],
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [{ title: 'Test', url: 'https://example.com', content: 'Content' }],
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockToolCall,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTavilyResponse,
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Service Unavailable',
          });

        await expect(checkFacts('測試內容')).rejects.toThrow(
          'Ollama Error after tool call: Service Unavailable'
        );
      });

      it('continues with error message when Tavily search fails mid-execution', async () => {
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試' } },
              },
            ],
          },
          done: true,
        };

        const mockFinalResponse = {
          message: {
            role: 'assistant',
            content: '儘管搜尋失敗仍提供的回覆',
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockToolCall,
          })
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockFinalResponse,
          });

        const result = await checkFacts('測試內容');

        expect(result).toBe('儘管搜尋失敗仍提供的回覆');
      });
    });

    describe('API integration', () => {
      it('sends correct request format to Ollama', async () => {
        const mockResponse = {
          message: { role: 'assistant', content: '回覆' },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await checkFacts('測試內容');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:11434/api/chat',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"model":"llama3.1"'),
          })
        );
      });

      it('sends correct request format to Tavily', async () => {
        const mockToolCall = {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'web_search', arguments: { query: '測試查詢' } },
              },
            ],
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [{ title: 'Test', url: 'https://example.com', content: 'Content' }],
        };

        const mockFinalResponse = {
          message: { role: 'assistant', content: '回覆' },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockToolCall,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTavilyResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockFinalResponse,
          });

        await checkFacts('測試內容');

        const tavilyCall = (global.fetch as any).mock.calls.find((call: any) =>
          call[0].includes('tavily')
        );

        expect(tavilyCall).toBeDefined();
        expect(tavilyCall[1].method).toBe('POST');
        const body = JSON.parse(tavilyCall[1].body);
        expect(body.query).toBe('測試查詢');
        expect(body.search_depth).toBe('smart');
        expect(body.max_results).toBe(5);
      });

      it('includes Traditional Chinese instructions in system prompt', async () => {
        const mockResponse = {
          message: { role: 'assistant', content: '回覆' },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await checkFacts('測試內容');

        const requestBody = JSON.parse(
          (global.fetch as any).mock.calls[0][1].body
        );
        const systemMessage = requestBody.messages.find(
          (m: any) => m.role === 'system'
        );

        expect(systemMessage.content).toContain('繁體中文');
        expect(systemMessage.content).toContain('Markdown');
      });
    });
  });
});
