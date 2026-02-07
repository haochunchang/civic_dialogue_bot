/// <reference types="vite/client" />
import type { SourceEvidence, FactCheckResult } from '../types';

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

export async function performWebSearch(query: string): Promise<string> {
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
            max_results: 8,
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

const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

export function parseFactCheckResponse(raw: string): FactCheckResult {
    const hasSupportingMarker = raw.includes('[SUPPORTING]');
    const hasOpposingMarker = raw.includes('[OPPOSING]');

    if (!hasSupportingMarker && !hasOpposingMarker) {
        return {
            summary: '',
            supporting: [],
            opposing: [],
            rawMarkdown: raw,
        };
    }

    let summary = '';
    const summaryMatch = raw.match(/\[SUMMARY\]([\s\S]*?)(?=\[SUPPORTING\]|\[OPPOSING\]|\[END\]|$)/);
    if (summaryMatch) {
        summary = summaryMatch[1].trim();
    }

    const supporting = extractEvidence(raw, '[SUPPORTING]', '[OPPOSING]');
    const opposing = extractEvidence(raw, '[OPPOSING]', '[END]');

    if (supporting.length === 0 && opposing.length === 0) {
        return {
            summary: '',
            supporting: [],
            opposing: [],
            rawMarkdown: raw,
        };
    }

    return { summary, supporting, opposing };
}

function extractEvidence(raw: string, startMarker: string, endMarker: string): SourceEvidence[] {
    const startIdx = raw.indexOf(startMarker);
    if (startIdx === -1) return [];

    const afterStart = raw.substring(startIdx + startMarker.length);
    const endIdx = afterStart.indexOf(endMarker);
    const section = endIdx !== -1 ? afterStart.substring(0, endIdx) : afterStart;

    const evidence: SourceEvidence[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('[')) continue;

        const bulletContent = trimmed.replace(/^[•\-\d.]\s*/, '');
        if (!bulletContent) continue;

        const linkMatch = LINK_REGEX.exec(bulletContent);
        LINK_REGEX.lastIndex = 0;

        if (linkMatch) {
            const sourceTitle = linkMatch[1];
            const sourceUrl = linkMatch[2];
            const fact = bulletContent.replace(LINK_REGEX, '').trim().replace(/[，,。.、]+$/, '').trim() || sourceTitle;
            LINK_REGEX.lastIndex = 0;

            evidence.push({ fact, sourceTitle, sourceUrl });
        } else if (bulletContent.length > 5) {
            evidence.push({ fact: bulletContent, sourceTitle: '', sourceUrl: '' });
        }
    }

    return evidence;
}

export const checkFacts = async (postContent: string): Promise<FactCheckResult> => {
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
6. **必須同時搜尋支持和反對貼文主張的證據**

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

## 搜尋策略
你需要進行至少兩次搜尋：
1. 第一次搜尋：查找支持貼文主張的證據
2. 第二次搜尋：查找反對或質疑貼文主張的證據（加入「事實查核」「爭議」「反駁」等關鍵字）

## 回覆結構（嚴格遵循此格式）
你必須使用以下標記來組織回覆：

[SUMMARY]
一句話總結此貼文的核心主張及查核結論

[SUPPORTING]
• 支持貼文主張的事實1，附上 [來源名稱](完整網址)
• 支持貼文主張的事實2，附上 [來源名稱](完整網址)

[OPPOSING]
• 反對或質疑貼文主張的事實1，附上 [來源名稱](完整網址)
• 反對或質疑貼文主張的事實2，附上 [來源名稱](完整網址)

[END]

如果找不到支持或反對的證據，請在該區段寫「目前未找到相關證據」。

你擁有 web_search 工具，可以用來搜尋即時資訊。請務必使用此工具來確保資訊的準確性。
記住：所有回覆內容都必須使用繁體中文。`;

    let messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `請分析此貼文：\n\n${postContent}\n\n請用繁體中文搜尋相關資料後回覆。確保：
1. 使用繁體中文撰寫所有內容
2. 每個事實都使用 [描述文字](完整網址) 格式附上來源
3. 從搜尋結果的 url 欄位中提取完整網址
4. 必須搜尋支持和反對的證據
5. 使用 [SUMMARY]、[SUPPORTING]、[OPPOSING]、[END] 標記組織回覆` }
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

    // Phase 1: Initial request to Ollama
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

    // Handle tool calls loop (limited to 5 iterations)
    let iterations = 0;
    while (message.tool_calls && message.tool_calls.length > 0 && iterations < 5) {
        iterations++;
        console.log(`🔄 [FactChecker] Tool call iteration ${iterations}/5`);
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

    console.log('📄 [FactChecker] Phase 1 complete, parsing response');

    // Parse Phase 1 response
    let result = parseFactCheckResponse(message.content);

    // Phase 2: Counter-evidence search (if opposing evidence is sparse)
    if (result.rawMarkdown === undefined && result.opposing.length < 2) {
        console.log(`⚖️ [FactChecker] Phase 2: Only ${result.opposing.length} opposing item(s), searching for counter-evidence`);

        try {
            const counterQuery = `${postContent.substring(0, 100)} 事實查核 爭議 反駁`;
            const searchResultsRaw = await performWebSearch(counterQuery);

            const phase2Messages: any[] = [
                {
                    role: 'system',
                    content: `你是事實查核助手。從以下搜尋結果中，找出反對或質疑原始貼文主張的事實。
每個事實必須使用 [來源名稱](完整網址) 格式附上來源連結。
只列出反對的證據，用「•」條列。必須使用繁體中文。`,
                },
                {
                    role: 'user',
                    content: `原始貼文：${postContent}\n\n搜尋結果：${searchResultsRaw}\n\n請列出反對或質疑此貼文主張的事實（每條都要附上來源連結）：`,
                },
            ];

            const phase2Response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: phase2Messages,
                    stream: false,
                }),
            });

            if (phase2Response.ok) {
                const phase2Data = (await phase2Response.json()) as OllamaResponse;
                const phase2Content = phase2Data.message.content;
                const additionalOpposing = extractEvidenceFromBullets(phase2Content);

                // Deduplicate by URL
                const existingUrls = new Set(result.opposing.map(e => e.sourceUrl));
                for (const item of additionalOpposing) {
                    if (item.sourceUrl && !existingUrls.has(item.sourceUrl)) {
                        result.opposing.push(item);
                        existingUrls.add(item.sourceUrl);
                    }
                }

                console.log(`✅ [FactChecker] Phase 2 added ${additionalOpposing.length} opposing item(s) after dedup`);
            }
        } catch (phase2Error) {
            console.error('⚠️ [FactChecker] Phase 2 failed, continuing with Phase 1 results:', phase2Error);
        }
    }

    console.log('🎉 [FactChecker] Fact check completed');
    return result;
};

function extractEvidenceFromBullets(text: string): SourceEvidence[] {
    const evidence: SourceEvidence[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const bulletContent = trimmed.replace(/^[•\-\d.]\s*/, '');
        if (!bulletContent) continue;

        const linkMatch = LINK_REGEX.exec(bulletContent);
        LINK_REGEX.lastIndex = 0;

        if (linkMatch) {
            const sourceTitle = linkMatch[1];
            const sourceUrl = linkMatch[2];
            const fact = bulletContent.replace(LINK_REGEX, '').trim().replace(/[，,。.、]+$/, '').trim() || sourceTitle;
            LINK_REGEX.lastIndex = 0;

            evidence.push({ fact, sourceTitle, sourceUrl });
        }
    }

    return evidence;
}
