import React from 'react';
import { Copy } from 'lucide-react';
import type { FactCheckResult } from '../types';
import EvidenceSection from './EvidenceSection';

interface ResponseDisplayProps {
    response: FactCheckResult | null;
    isLoading: boolean;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ response, isLoading }) => {
    const copyToClipboard = () => {
        if (!response) return;

        if (response.rawMarkdown) {
            const plainText = response.rawMarkdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）');
            navigator.clipboard.writeText(plainText);
            return;
        }

        const lines: string[] = [];
        if (response.summary) lines.push(response.summary, '');

        if (response.supporting.length > 0) {
            lines.push('【支持證據】');
            response.supporting.forEach(e => {
                const source = e.sourceUrl ? `（${e.sourceUrl}）` : '';
                lines.push(`• ${e.fact}${source}`);
            });
            lines.push('');
        }

        if (response.opposing.length > 0) {
            lines.push('【反對證據】');
            response.opposing.forEach(e => {
                const source = e.sourceUrl ? `（${e.sourceUrl}）` : '';
                lines.push(`• ${e.fact}${source}`);
            });
        }

        navigator.clipboard.writeText(lines.join('\n'));
    };

    const renderFallbackContent = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        return lines.map((line, index) => {
            if (!line.trim()) return <br key={index} />;

            let processed = line.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                (_match, linkText, url) => {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline; text-underline-offset: 2px;">${linkText}</a>`;
                }
            );

            processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

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

    const sourceCount = response.rawMarkdown
        ? 0
        : response.supporting.filter(e => e.sourceUrl).length + response.opposing.filter(e => e.sourceUrl).length;

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
                    {response.rawMarkdown ? '📋 回覆內容' : '📋 查核結果'}
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

            <div style={{ padding: '16px', fontSize: '14px', lineHeight: 1.8 }}>
                {response.rawMarkdown ? (
                    renderFallbackContent(response.rawMarkdown)
                ) : (
                    <>
                        {response.summary && (
                            <div style={{
                                padding: '12px 16px',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                fontSize: '14px',
                                lineHeight: 1.7,
                                borderLeft: '3px solid var(--primary-color)',
                            }}>
                                {response.summary}
                            </div>
                        )}

                        <EvidenceSection
                            title="支持證據"
                            icon="✅"
                            evidence={response.supporting}
                            accentType="supporting"
                        />

                        <EvidenceSection
                            title="反對證據"
                            icon="⚠️"
                            evidence={response.opposing}
                            accentType="opposing"
                        />
                    </>
                )}
            </div>

            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--success-bg)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
            }}>
                <span>💡 點擊藍色連結可查看原始來源</span>
                {sourceCount > 0 && <span>📎 {sourceCount} 個來源</span>}
            </div>
        </div>
    );
};

export default ResponseDisplay;
