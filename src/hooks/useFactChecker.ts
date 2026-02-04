import { useState } from 'react';
import { checkFacts } from '../services/ollama';

export const useFactChecker = () => {
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeAndRespond = async (postContent: string) => {
        if (!postContent.trim()) {
            setError('請輸入貼文內容');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const result = await checkFacts(postContent);
            setResponse(result);
        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                setError(`發生錯誤：${err.message}`);
            } else {
                setError('發生未知的錯誤');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return {
        response,
        isLoading,
        error,
        analyzeAndRespond,
        setResponse,
    };
};
