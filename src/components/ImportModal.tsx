import React, { useState, useCallback } from 'react';
import { useGardenStore } from '../hooks/useGardenStore';
import { parseGridData } from '../services/plannerService';
import { ParsedGardenData } from '../types/layout';
import { GridPreview } from './GridPreview';
import { CropSummaryComponent } from './CropSummaryComponent';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gardenData, setGardenData] = useState<ParsedGardenData | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const { setPlants } = useGardenStore();

  const handleImport = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Parse the grid data (we don't need the legacy plants format for preview)
      const gridData = await parseGridData(url);
      
      setGardenData(gridData);
      setShowPreview(true);
      
      // Generate a default layout name based on the garden
      const dominantCrops = Object.entries(gridData.cropSummary.cropBreakdown)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 2)
        .map(([crop]) => crop);
      
      const defaultName = dominantCrops.length > 0
        ? `${dominantCrops.join(' & ')} Garden`
        : `Garden Layout ${new Date().toLocaleDateString()}`;
      
      setLayoutName(defaultName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleClose = useCallback(() => {
    setUrl('');
    setError(null);
    setLoading(false);
    setGardenData(null);
    setLayoutName('');
    setShowPreview(false);
    onClose();
  }, [onClose]);

  const handleSaveLayout = useCallback(async () => {
    if (!gardenData || !layoutName.trim()) return;
    
    try {
      // Convert grid data to plants for the existing store
      const plants = [];
      for (const [cropType, summary] of Object.entries(gardenData.cropSummary.cropBreakdown)) {
        for (let i = 0; i < summary.total; i++) {
          plants.push({
            id: `${cropType}-${i}`,
            name: cropType,
            needsWater: i < summary.needingWater
          });
        }
      }
      
      setPlants(plants);
      
      // TODO: Save to layout service when implemented
      console.log('Saving layout:', layoutName, gardenData);
      
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save layout');
    }
  }, [gardenData, layoutName, setPlants, handleClose]);

  const handleBackToImport = useCallback(() => {
    setShowPreview(false);
    setGardenData(null);
    setLayoutName('');
    setError(null);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg w-full mx-4 ${showPreview ? 'max-w-6xl max-h-[90vh] overflow-hidden' : 'max-w-md'}`}>
        {!showPreview ? (
          // Import Form
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Import from Palia Planner
            </h2>
            
            <div className="mb-4">
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

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !url.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importing...' : 'Import & Preview'}
              </button>
            </div>
          </div>
        ) : (
          // Preview & Save Form
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Garden Layout Preview
                  </h2>
                  <p className="text-sm text-gray-600">
                    Review your garden and save the layout
                  </p>
                </div>
                <button
                  onClick={handleBackToImport}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to Import
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <div className="p-6">
                  {gardenData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Grid Preview - Takes up 2 columns on large screens */}
                      <div className="lg:col-span-2">
                        <GridPreview
                          gardenData={gardenData}
                          maxWidth={600}
                          maxHeight={400}
                          className="w-full"
                        />
                      </div>

                      {/* Crop Summary - Takes up 1 column */}
                      <div className="lg:col-span-1">
                        <CropSummaryComponent
                          cropSummary={gardenData.cropSummary}
                          className="h-fit"
                        />
                      </div>
                    </div>
                  )}

                  {/* Save Layout Form */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">
                      Save Layout
                    </h3>
                    <div className="mb-4">
                      <label htmlFor="layout-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Layout Name
                      </label>
                      <input
                        id="layout-name"
                        type="text"
                        value={layoutName}
                        onChange={(e) => setLayoutName(e.target.value)}
                        placeholder="Enter a name for this layout..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLayout}
                        disabled={!layoutName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        💾 Save Layout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};