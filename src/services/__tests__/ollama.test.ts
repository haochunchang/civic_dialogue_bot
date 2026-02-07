import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkFacts, parseFactCheckResponse } from '../ollama';

// Mock global fetch
global.fetch = vi.fn();

describe('ollama service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseFactCheckResponse', () => {
    it('parses well-formed response with all markers', () => {
      const raw = `[SUMMARY]
此貼文聲稱某事件已發生，但查核結果顯示部分屬實。

[SUPPORTING]
• 根據[中央社報導](https://www.cna.com.tw/news/1)，該事件確實有相關紀錄
• 另據[聯合新聞網](https://udn.com/news/2)，政府已發布正式聲明

[OPPOSING]
• 然而[台灣事實查核中心](https://tfc-taiwan.org.tw/articles/1)指出，部分數據被誇大
• [MyGoPen](https://www.mygopen.com/2024/01/fake)查核後認為該說法有誤導之嫌

[END]`;

      const result = parseFactCheckResponse(raw);

      expect(result.rawMarkdown).toBeUndefined();
      expect(result.summary).toContain('此貼文聲稱某事件已發生');
      expect(result.supporting).toHaveLength(2);
      expect(result.supporting[0].sourceUrl).toBe('https://www.cna.com.tw/news/1');
      expect(result.supporting[0].sourceTitle).toBe('中央社報導');
      expect(result.opposing).toHaveLength(2);
      expect(result.opposing[0].sourceUrl).toBe('https://tfc-taiwan.org.tw/articles/1');
      expect(result.opposing[1].sourceTitle).toBe('MyGoPen');
    });

    it('returns rawMarkdown fallback when markers are missing', () => {
      const raw = '這是一個沒有標記的回覆，只有純文字。';
      const result = parseFactCheckResponse(raw);

      expect(result.rawMarkdown).toBe(raw);
      expect(result.supporting).toHaveLength(0);
      expect(result.opposing).toHaveLength(0);
    });

    it('returns rawMarkdown when markers exist but no parseable evidence', () => {
      const raw = `[SUPPORTING]
[OPPOSING]
[END]`;

      const result = parseFactCheckResponse(raw);
      expect(result.rawMarkdown).toBe(raw);
    });

    it('handles response with only supporting markers', () => {
      const raw = `[SUPPORTING]
• 根據[來源A](https://example.com/a)，事實如此

[OPPOSING]

[END]`;

      const result = parseFactCheckResponse(raw);
      expect(result.rawMarkdown).toBeUndefined();
      expect(result.supporting).toHaveLength(1);
      expect(result.opposing).toHaveLength(0);
    });

    it('handles malformed links gracefully', () => {
      const raw = `[SUPPORTING]
• 這是一個沒有連結的事實描述，但內容足夠長
• 根據[壞掉的連結](，缺少網址

[OPPOSING]
• 根據[有效來源](https://example.com/valid)，此事不實

[END]`;

      const result = parseFactCheckResponse(raw);
      expect(result.rawMarkdown).toBeUndefined();
      expect(result.supporting.length).toBeGreaterThanOrEqual(1);
      expect(result.opposing).toHaveLength(1);
      expect(result.opposing[0].sourceUrl).toBe('https://example.com/valid');
    });

    it('extracts summary from [SUMMARY] block', () => {
      const raw = `[SUMMARY]
這是總結內容

[SUPPORTING]
• 事實 [來源](https://example.com)

[OPPOSING]
• 反駁 [來源](https://example.com/2)

[END]`;

      const result = parseFactCheckResponse(raw);
      expect(result.summary).toBe('這是總結內容');
    });
  });

  describe('checkFacts', () => {
    describe('happy path', () => {
      it('returns FactCheckResult when response has markers', async () => {
        const mockResponse = {
          model: 'llama3.1',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: `[SUMMARY]
測試總結

[SUPPORTING]
• 支持事實 [來源A](https://example.com/a)

[OPPOSING]
• 反對事實 [來源B](https://example.com/b)
• 反對事實2 [來源C](https://example.com/c)

[END]`,
          },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('測試貼文內容');

        expect(result.summary).toContain('測試總結');
        expect(result.supporting).toHaveLength(1);
        expect(result.opposing).toHaveLength(2);
        expect(result.rawMarkdown).toBeUndefined();
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('returns rawMarkdown fallback for unstructured response', async () => {
        const mockResponse = {
          model: 'llama3.1',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: '這是一個沒有標記的測試回覆',
          },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('測試貼文內容');

        expect(result.rawMarkdown).toBe('這是一個沒有標記的測試回覆');
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
            content: `[SUMMARY]
查核結果

[SUPPORTING]
• 支持 [來源](https://example.com/a)

[OPPOSING]
• 反對1 [來源](https://example.com/b)
• 反對2 [來源](https://example.com/c)

[END]`,
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

        expect(result.supporting).toHaveLength(1);
        expect(result.opposing).toHaveLength(2);
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
            content: `[SUMMARY]
完整查核

[SUPPORTING]
• 支持 [來源](https://example.com/s1)

[OPPOSING]
• 反對1 [來源](https://example.com/o1)
• 反對2 [來源](https://example.com/o2)

[END]`,
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

        expect(result.supporting).toHaveLength(1);
        expect(result.opposing).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });
    });

    describe('Phase 2 counter-evidence', () => {
      it('triggers Phase 2 when opposing evidence is sparse', async () => {
        const mockPhase1Response = {
          message: {
            role: 'assistant',
            content: `[SUMMARY]
查核結果

[SUPPORTING]
• 支持事實 [來源](https://example.com/s1)

[OPPOSING]
• 僅一條反對 [來源](https://example.com/o1)

[END]`,
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [
            {
              title: '事實查核結果',
              url: 'https://tfc-taiwan.org.tw/articles/1',
              content: '查核內容',
            },
          ],
        };

        const mockPhase2Response = {
          message: {
            role: 'assistant',
            content: '• 根據查核，[事實查核中心](https://tfc-taiwan.org.tw/articles/1)指出此說法有誤',
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({ ok: true, json: async () => mockPhase1Response })
          // Phase 2: Tavily search
          .mockResolvedValueOnce({ ok: true, json: async () => mockTavilyResponse })
          // Phase 2: Ollama call
          .mockResolvedValueOnce({ ok: true, json: async () => mockPhase2Response });

        const result = await checkFacts('測試內容');

        // Phase 2 should have triggered (3 fetch calls: Phase1 Ollama + Phase2 Tavily + Phase2 Ollama)
        expect(global.fetch).toHaveBeenCalledTimes(3);
        // Should have merged opposing evidence
        expect(result.opposing.length).toBeGreaterThanOrEqual(1);
      });

      it('skips Phase 2 when sufficient opposing evidence exists', async () => {
        const mockResponse = {
          message: {
            role: 'assistant',
            content: `[SUMMARY]
查核結果

[SUPPORTING]
• 支持 [來源](https://example.com/s1)

[OPPOSING]
• 反對1 [來源](https://example.com/o1)
• 反對2 [來源](https://example.com/o2)

[END]`,
          },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('測試內容');

        // Only 1 fetch call (Phase 1 only, no Phase 2)
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result.opposing).toHaveLength(2);
      });

      it('skips Phase 2 when response is rawMarkdown fallback', async () => {
        const mockResponse = {
          message: {
            role: 'assistant',
            content: '無標記的回覆內容',
          },
          done: true,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await checkFacts('測試內容');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result.rawMarkdown).toBeDefined();
      });

      it('deduplicates Phase 2 results by URL', async () => {
        const mockPhase1Response = {
          message: {
            role: 'assistant',
            content: `[SUMMARY]
查核結果

[SUPPORTING]
• 支持 [來源](https://example.com/s1)

[OPPOSING]
• 反對 [來源](https://example.com/o1)

[END]`,
          },
          done: true,
        };

        const mockTavilyResponse = {
          results: [{ title: 'Test', url: 'https://example.com/o1', content: 'Content' }],
        };

        const mockPhase2Response = {
          message: {
            role: 'assistant',
            // Returns same URL as Phase 1
            content: '• 重複的反對 [來源](https://example.com/o1)',
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({ ok: true, json: async () => mockPhase1Response })
          .mockResolvedValueOnce({ ok: true, json: async () => mockTavilyResponse })
          .mockResolvedValueOnce({ ok: true, json: async () => mockPhase2Response });

        const result = await checkFacts('測試內容');

        // Should not have duplicates
        const urls = result.opposing.map(e => e.sourceUrl);
        expect(new Set(urls).size).toBe(urls.length);
      });

      it('continues with Phase 1 results when Phase 2 fails', async () => {
        const mockPhase1Response = {
          message: {
            role: 'assistant',
            content: `[SUMMARY]
查核結果

[SUPPORTING]
• 支持 [來源](https://example.com/s1)

[OPPOSING]
• 反對 [來源](https://example.com/o1)

[END]`,
          },
          done: true,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({ ok: true, json: async () => mockPhase1Response })
          // Phase 2 Tavily fails
          .mockRejectedValueOnce(new Error('Network error'));

        const result = await checkFacts('測試內容');

        // Should still return Phase 1 results
        expect(result.supporting).toHaveLength(1);
        expect(result.opposing).toHaveLength(1);
      });
    });

    describe('edge cases', () => {
      it('limits tool call iterations to 5', async () => {
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

        // Should stop at 5 iterations
        // Initial call + 5 iterations (each with 1 Ollama + 1 Tavily call)
        expect(global.fetch).toHaveBeenCalledTimes(11); // 1 + (5 * 2)
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

        expect(result.rawMarkdown).toBeTruthy();
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

        expect(result.rawMarkdown).toBe('無搜尋結果的回覆');
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

        const result = await checkFacts('測試內容');
        expect(result.rawMarkdown).toBe('搜尋失敗後的回覆');
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

        expect(result.rawMarkdown).toBe('儘管搜尋失敗仍提供的回覆');
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

      it('sends correct request format to Tavily with max_results 8', async () => {
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
        expect(body.max_results).toBe(8);
      });

      it('includes structured format instructions in system prompt', async () => {
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
        expect(systemMessage.content).toContain('[SUPPORTING]');
        expect(systemMessage.content).toContain('[OPPOSING]');
        expect(systemMessage.content).toContain('[SUMMARY]');
      });
    });
  });
});
