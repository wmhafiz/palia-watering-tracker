import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GridPreview } from './GridPreview';
import { CropSummaryComponent } from './CropSummaryComponent';
import { parseGridData } from '../services/plannerService';
import { ParsedGardenData } from '../types/layout';
import { useUnifiedGardenStore } from '../hooks/useUnifiedGardenStore';

export const GridPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gardenData, setGardenData] = useState<ParsedGardenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  
  const { importPlantsFromGarden } = useUnifiedGardenStore();

  // Check for URL parameter on mount
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const codeParam = searchParams.get('code');
    
    if (urlParam || codeParam) {
      const importUrl = urlParam || codeParam || '';
      setUrl(importUrl);
      handleImport(importUrl);
    }
  }, [searchParams]);

  const handleImport = async (importUrl: string) => {
    if (!importUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const gridData = await parseGridData(importUrl);
      setGardenData(gridData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadToTracker = () => {
    if (!gardenData) return;
    
    try {
      // Convert garden data to plants format for the tracker
      const plants = [];
      for (const [cropType, summary] of Object.entries(gardenData.cropSummary.cropBreakdown)) {
        for (let i = 0; i < summary.total; i++) {
          plants.push({
            id: `${cropType}-${i}`,
            name: cropType,
            needsWater: false
          });
        }
      }
      
      importPlantsFromGarden(plants);
      navigate('/'); // Navigate back to main tracker
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layout to tracker');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>←</span>
                <span>Back to Tracker</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Garden Layout Preview</h1>
            </div>
            
            {gardenData && (
              <button
                onClick={handleLoadToTracker}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Load to Tracker
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!gardenData && !loading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Import Garden Layout
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="planner-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Palia Planner URL or Save Code
                  </label>
                  <input
                    id="planner-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://palia-garden-planner.vercel.app/... or v0.4_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a Palia Garden Planner URL or save code directly
                  </p>
                </div>
                
                <button
                  onClick={() => handleImport(url)}
                  disabled={loading || !url.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Importing...' : 'Import & Preview'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Loading garden preview...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading garden preview
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gardenData && (
          <div className="space-y-8">
            {/* Garden Info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Garden Layout
              </h2>
              <p className="text-gray-600">
                {gardenData.dimensions.rows} × {gardenData.dimensions.columns} plots
                {gardenData.cropSummary.totalPlants > 0 && (
                  <span className="ml-2">• {gardenData.cropSummary.totalPlants} plants</span>
                )}
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Grid Preview - Takes up 3 columns on xl screens */}
              <div className="xl:col-span-3">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <GridPreview
                    gardenData={gardenData}
                    className="w-full"
                    showGrid={true}
                  />
                </div>
              </div>

              {/* Crop Summary - Takes up 1 column */}
              <div className="xl:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <CropSummaryComponent
                    cropSummary={gardenData.cropSummary}
                    className="h-fit"
                    hideWateringStatus={true}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setGardenData(null);
                  setUrl('');
                  setError(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Import Another Layout
              </button>
              <button
                onClick={handleLoadToTracker}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Load to Watering Tracker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};