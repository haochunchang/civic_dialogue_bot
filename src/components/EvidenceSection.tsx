import React from 'react';
import type { SourceEvidence } from '../types';

interface EvidenceSectionProps {
    title: string;
    icon: string;
    evidence: SourceEvidence[];
    accentType: 'supporting' | 'opposing';
}

const EvidenceSection: React.FC<EvidenceSectionProps> = ({ title, icon, evidence, accentType }) => {
    const bgVar = `var(--${accentType}-bg)`;
    const borderVar = `var(--${accentType}-border)`;
    const textVar = `var(--${accentType}-text)`;

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
            }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: textVar }}>
                    {title}
                </span>
                <span style={{
                    fontSize: '12px',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: bgVar,
                    color: textVar,
                    fontWeight: 500,
                }}>
                    {evidence.length}
                </span>
            </div>
            {evidence.length === 0 ? (
                <div style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    borderLeft: `3px solid var(--border-color)`,
                    background: '#fafafa',
                    borderRadius: '0 4px 4px 0',
                }}>
                    目前未找到相關證據
                </div>
            ) : (
                <div style={{
                    borderLeft: `3px solid ${borderVar}`,
                    borderRadius: '0 4px 4px 0',
                    overflow: 'hidden',
                }}>
                    {evidence.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '10px 14px',
                                background: bgVar,
                                borderBottom: index < evidence.length - 1 ? `1px solid ${borderVar}` : undefined,
                                fontSize: '14px',
                                lineHeight: 1.7,
                            }}
                        >
                            <span>{item.fact}</span>
                            {item.sourceUrl && (
                                <>
                                    {item.fact && ' '}
                                    <a
                                        href={item.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: 'var(--primary-color)',
                                            textDecoration: 'underline',
                                            textUnderlineOffset: '2px',
                                        }}
                                    >
                                        {item.sourceTitle || item.sourceUrl}
                                    </a>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EvidenceSection;
