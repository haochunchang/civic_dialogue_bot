/// <reference types="vite/client" />
export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
        tool_calls?: {
            function: {
                name: string;
                arguments: any;
            };
        }[];
    };
    done: boolean;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';

async function performWebSearch(query: string): Promise<string> {
    const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
    if (!apiKey || apiKey === 'your_tavily_api_key_here') {
        throw new Error('Tavily API Key 未設定。請在 .env 檔案中設定 VITE_TAVILY_API_KEY。');
    }

    console.log('🔍 [Tavily] Starting web search:', query);

    const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: 'smart',
            include_answer: true,
            max_results: 5,
        }),
    });

    if (!response.ok) {
        console.error('❌ [Tavily] Search failed:', response.statusText);
        throw new Error(`Tavily Search Error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content
    }));

    console.log(`✅ [Tavily] Search completed: ${results.length} results found`);
    console.log('📋 [Tavily] Results:', JSON.stringify(results, null, 2));

    return JSON.stringify(results);
}

export const checkFacts = async (postContent: string): Promise<string> => {
    const baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1';

    console.log('🚀 [FactChecker] Starting fact check process');
    console.log('📝 [FactChecker] Post content:', postContent.substring(0, 100) + (postContent.length > 100 ? '...' : ''));

    const systemPrompt = `你是事實查核助手。你必須用繁體中文回答所有問題。針對以下貼文，提供精簡、有來源的回覆。

## 核心原則
1. 只陳述可查證的事實，不加主觀評論
2. 每個事實都必須附上來源連結
3. 回覆要簡短（200-400字內）
4. 語氣中立友善
5. **必須使用繁體中文撰寫所有回覆內容**

## 超連結格式（非常重要！）
你必須使用 Markdown 超連結格式：[顯示文字](完整網址)

範例：
- 正確：根據[路透社的報導](https://www.reuters.com/article/example)，此事件發生在2023年。
- 錯誤：根據 [X] link，此事件發生在2023年。
- 錯誤：根據路透社的報導，此事件發生在2023年。（缺少連結）

當你使用 web_search 工具時，搜尋結果會包含 title、url、content 三個欄位。
你必須：
1. 從搜尋結果中提取完整的 url
2. 使用 [描述文字](url) 格式建立超連結
3. 描述文字應該是來源名稱或事實描述

## 回覆結構
1. 開頭一句話回應核心問題（繁體中文）
2. 用「•」條列 3-5 個關鍵事實，每個事實都要有 [文字](完整網址) 格式的連結
3. 結尾一句話邀請讀者自行查證（繁體中文）

你擁有 web_search 工具，可以用來搜尋即時資訊。請務必使用此工具來確保資訊的準確性。
記住：所有回覆內容都必須使用繁體中文。`;

    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `請分析此貼文：\n\n${postContent}\n\n請用繁體中文搜尋相關資料後回覆。確保：
1. 使用繁體中文撰寫所有內容
2. 每個事實都使用 [描述文字](完整網址) 格式附上來源
3. 從搜尋結果的 url 欄位中提取完整網址` }
    ];

    const tools = [
        {
            type: 'function',
            function: {
                name: 'web_search',
                description: 'Search the web for real-time information and facts. Use Traditional Chinese for search queries when searching for Chinese content.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to look up on the web. Use Traditional Chinese (繁體中文) when searching for Chinese language content.',
                        },
                    },
                    required: ['query'],
                },
            },
        },
    ];

    // Initial request to Ollama
    console.log('🤖 [Ollama] Sending initial request to model:', model);
    let response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            messages: messages,
            tools: tools,
            stream: false,
        }),
    });

    if (!response.ok) {
        console.error('❌ [Ollama] Request failed:', response.statusText);
        throw new Error(`Ollama Error: ${response.statusText}`);
    }

    let data = (await response.json()) as OllamaResponse;
    let message = data.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 [Ollama] Model requested ${message.tool_calls.length} tool call(s)`);
    }

    // Handle tool calls loop (limited to 3 iterations to avoid infinite loops)
    let iterations = 0;
    while (message.tool_calls && message.tool_calls.length > 0 && iterations < 3) {
        iterations++;
        console.log(`🔄 [FactChecker] Tool call iteration ${iterations}/3`);
        messages.push(message);

        for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === 'web_search') {
                const query = toolCall.function.arguments.query;
                console.log(`🔎 [Tool] Executing web_search with query: "${query}"`);
                try {
                    const searchResultsRaw = await performWebSearch(query);
                    const results = JSON.parse(searchResultsRaw);

                    // Format results to emphasize URL usage
                    const formattedResults = `搜尋結果（請使用這些 URL 建立 Markdown 連結）：

${results.map((r: any, i: number) => `
${i + 1}. 標題：${r.title}
   網址：${r.url}
   內容：${r.content}

   使用範例：[${r.title}](${r.url})
`).join('\n')}

請確保在你的回覆中使用 [描述文字](網址) 格式引用這些來源。`;

                    console.log('📤 [Tool] Sending formatted results back to model');
                    messages.push({
                        role: 'tool',
                        content: formattedResults,
                    });
                } catch (searchError) {
                    console.error('❌ [Tool] Search failed:', searchError);
                    messages.push({
                        role: 'tool',
                        content: `Error performing search: ${searchError instanceof Error ? searchError.message : String(searchError)}`,
                    });
                }
            }
        }

        // Get next response from Ollama after tool results
        console.log('🤖 [Ollama] Requesting next response after tool execution');
        response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            console.error('❌ [Ollama] Request after tool call failed:', response.statusText);
            throw new Error(`Ollama Error after tool call: ${response.statusText}`);
        }

        data = (await response.json()) as OllamaResponse;
        message = data.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
            console.log(`🔧 [Ollama] Model requested ${message.tool_calls.length} more tool call(s)`);
        } else {
            console.log('✅ [Ollama] Model returned final response');
        }
    }

    console.log('🎉 [FactChecker] Fact check completed');
    console.log('📄 [FactChecker] Response preview:', message.content.substring(0, 150) + (message.content.length > 150 ? '...' : ''));

    return message.content;
};
