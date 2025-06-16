import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainTracker } from './components/MainTracker';
import { GridPreviewPage } from './components/GridPreviewPage';
import { ImportPage } from './components/ImportPage';
import { GridPreviewTest } from './components/GridPreviewTest';

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainTracker />} />
            <Route path="/preview" element={<GridPreviewPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/test" element={<GridPreviewTest />} />
        </Routes>
    );
};

export default App;