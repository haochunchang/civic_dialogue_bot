import React from 'react';

interface QueryInputProps {
    postContent: string;
    setPostContent: (content: string) => void;
    onAnalyze: () => void;
    isLoading: boolean;
    error: string | null;
}

const QueryInput: React.FC<QueryInputProps> = ({
    postContent,
    setPostContent,
    onAnalyze,
    isLoading,
    error
}) => {
    return (
        <div style={{
            background: '#fff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
        }}>
            <textarea
                value={postContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPostContent(e.target.value)}
                placeholder="貼上要查核的內容..."
                style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    background: '#fafafa',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                }}
                onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => e.target.style.borderColor = '#ddd'}
            />

            {error && (
                <div style={{
                    marginTop: '12px',
                    color: 'var(--error-text)',
                    fontSize: '13px',
                    background: 'var(--error-bg)',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--error-border)'
                }}>
                    {error}
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '12px',
            }}>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading || !postContent.trim()}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#fff',
                        background: isLoading || !postContent.trim() ? '#ccc' : 'var(--primary-color)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isLoading || !postContent.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    {isLoading ? '查核中...' : '查核並產生回覆'}
                </button>
            </div>
        </div>
    );
};

export default QueryInput;
