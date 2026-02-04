import React from 'react';
import { Copy } from 'lucide-react';

interface ResponseDisplayProps {
    response: string | null;
    isLoading: boolean;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ response, isLoading }) => {
    const copyToClipboard = () => {
        if (response) {
            // Convert to plain text, putting URLs in parens
            const plainText = response.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）');
            navigator.clipboard.writeText(plainText);
        }
    };

    const renderContent = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        return lines.map((line, index) => {
            if (!line.trim()) return <br key={index} />;

            // Process Markdown links [text](url)
            let processed = line.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                (match, linkText, url) => {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline; text-underline-offset: 2px;">${linkText}</a>`;
                }
            );

            // Process Bold **text**
            processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Process bare URLs
            processed = processed.replace(
                /(?<!href=")(https?:\/\/[^\s<]+)/g,
                '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline; word-break: break-all;">$1</a>'
            );

            const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./);

            return (
                <div
                    key={index}
                    style={{
                        marginBottom: isBullet ? '14px' : '10px',
                        paddingLeft: isBullet ? '4px' : '0',
                        lineHeight: '1.8',
                    }}
                    dangerouslySetInnerHTML={{ __html: processed }}
                />
            );
        });
    };

    if (isLoading) {
        return (
            <div style={{
                background: '#fff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '40px 20px',
                textAlign: 'center',
            }}>
                <div className="spinner" style={{
                    width: '32px',
                    height: '32px',
                    margin: '0 auto 12px',
                    border: '3px solid #e5e5e5',
                    borderTopColor: 'var(--primary-color)',
                    borderRadius: '50%',
                }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                    搜尋資料中...
                </p>
            </div>
        );
    }

    if (!response) return null;

    return (
        <div style={{
            background: '#fff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                background: '#fafafa',
            }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    📋 回覆內容
                </span>
                <button
                    onClick={copyToClipboard}
                    style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        color: 'var(--primary-color)',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <Copy size={14} /> 複製
                </button>
            </div>
            <div style={{
                padding: '16px',
                fontSize: '14px',
                lineHeight: 1.8,
            }}>
                {renderContent(response)}
            </div>
            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--success-bg)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
            }}>
                💡 點擊藍色連結可查看原始來源
            </div>
        </div>
    );
};

export default ResponseDisplay;
