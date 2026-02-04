import React, { useState } from 'react';
import Header from './components/Header';
import QueryInput from './components/QueryInput';
import ResponseDisplay from './components/ResponseDisplay';
import { useFactChecker } from './hooks/useFactChecker';

const App: React.FC = () => {
    const [postContent, setPostContent] = useState<string>('');
    const { response, isLoading, error, analyzeAndRespond } = useFactChecker();

    const handleAnalyze = () => {
        analyzeAndRespond(postContent);
    };

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
            <Header />
            <main className="container">
                <QueryInput
                    postContent={postContent}
                    setPostContent={setPostContent}
                    onAnalyze={handleAnalyze}
                    isLoading={isLoading}
                    error={error}
                />
                <ResponseDisplay
                    response={response}
                    isLoading={isLoading}
                />
            </main>
        </div>
    );
}

export default App;
