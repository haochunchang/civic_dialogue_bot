import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="header" style={{
            background: '#fff',
            borderBottom: '1px solid var(--border-color)',
            padding: '16px 20px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            <div className="container" style={{
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                maxWidth: '640px',
                padding: 0
            }}>
                <span style={{ fontSize: '24px' }}>🔍</span>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                        公民對話促進器
                    </h1>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        事實查核 · 來源連結
                    </p>
                </div>
            </div>
        </header>
    );
};

export default Header;
