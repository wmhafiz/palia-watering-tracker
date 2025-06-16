import React, { useState, useCallback, useEffect } from 'react';
import { useGardenStore } from '../hooks/useGardenStore';
import { useUnifiedGardenStore } from '../hooks/useUnifiedGardenStore';
import { parseGridData } from '../services/plannerService';
import { ParsedGardenData, SavedLayout } from '../types/layout';
import { GridPreview } from './GridPreview';
import { CropSummaryComponent } from './CropSummaryComponent';
import { layoutService } from '../services/layoutService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = 'url' | 'saved';

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gardenData, setGardenData] = useState<ParsedGardenData | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Saved layouts state
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<SavedLayout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'lastModified'>('lastModified');
  
  const { setPlants } = useGardenStore();
  const { importPlantsFromGarden } = useUnifiedGardenStore();

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

  const loadSavedLayouts = useCallback(() => {
    const result = layoutService.searchLayouts({
      query: searchQuery,
      sortBy,
      sortDirection: 'desc'
    });
    
    if (result.success) {
      setSavedLayouts(result.data || []);
    } else {
      setError(result.error?.message || 'Failed to load saved layouts');
    }
  }, [searchQuery, sortBy]);

  // Load saved layouts when modal opens or when switching to saved mode
  useEffect(() => {
    if (isOpen && importMode === 'saved') {
      loadSavedLayouts();
    }
  }, [isOpen, importMode, loadSavedLayouts]);

  // Reload layouts when search or sort changes
  useEffect(() => {
    if (importMode === 'saved') {
      loadSavedLayouts();
    }
  }, [searchQuery, sortBy, loadSavedLayouts, importMode]);

  const handleClose = useCallback(() => {
    setImportMode('url');
    setUrl('');
    setError(null);
    setLoading(false);
    setGardenData(null);
    setLayoutName('');
    setShowPreview(false);
    setSavedLayouts([]);
    setSelectedLayout(null);
    setSearchQuery('');
    setSortBy('lastModified');
    onClose();
  }, [onClose]);

  const handleLoadSavedLayout = useCallback((layout: SavedLayout) => {
    setSelectedLayout(layout);
    setGardenData(layout.gardenData);
    setLayoutName(layout.metadata.name);
    setShowPreview(true);
  }, []);

  const handleDeleteLayout = useCallback(async (layoutId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this layout?')) {
      return;
    }
    
    const result = layoutService.deleteLayout(layoutId);
    if (result.success) {
      loadSavedLayouts();
    } else {
      setError(result.error?.message || 'Failed to delete layout');
    }
  }, [loadSavedLayouts]);

  const handleToggleFavorite = useCallback(async (layoutId: string, isFavorite: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const result = layoutService.updateLayoutMetadata(layoutId, { isFavorite: !isFavorite });
    if (result.success) {
      loadSavedLayouts();
    } else {
      setError(result.error?.message || 'Failed to update favorite status');
    }
  }, [loadSavedLayouts]);

  const handleSaveLayout = useCallback(async () => {
      if (!gardenData || !layoutName.trim()) return;
      
      try {
          // Convert grid data to plants for both stores
          const plants = [];
          for (const [cropType, summary] of Object.entries(gardenData.cropSummary.cropBreakdown)) {
              for (let i = 0; i < summary.total; i++) {
                  plants.push({
                      id: `${cropType}-${i}`,
                      name: cropType,
                      needsWater: false // Always set to false to remove watered states
                  });
              }
          }
          
          // Update both stores
          setPlants(plants);
          importPlantsFromGarden(plants);
          
          handleClose();
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load layout');
      }
  }, [gardenData, layoutName, setPlants, importPlantsFromGarden, handleClose]);

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
      <div className={`bg-white rounded-lg w-full mx-4 ${showPreview ? 'max-w-6xl max-h-[90vh] overflow-hidden' : 'max-w-4xl max-h-[80vh] overflow-hidden'}`}>
        {!showPreview ? (
          <div className="flex flex-col h-full">
            {/* Header with tabs */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                Import Garden Layout
              </h2>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setImportMode('url')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    importMode === 'url'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Import from URL
                </button>
                <button
                  onClick={() => setImportMode('saved')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    importMode === 'saved'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Load Saved Layout
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {importMode === 'url' ? (
                // URL Import Form
                <div className="p-6">
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
                // Saved Layouts List
                <div className="flex flex-col h-full">
                  {/* Search and Sort Controls */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search layouts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'name' | 'createdAt' | 'lastModified')}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="lastModified">Last Modified</option>
                          <option value="createdAt">Created Date</option>
                          <option value="name">Name</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Layouts List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {error}
                      </div>
                    )}

                    {savedLayouts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-lg font-medium mb-1">No saved layouts found</p>
                        <p className="text-sm">Import and save some layouts to see them here</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {savedLayouts.map((layout) => (
                          <div
                            key={layout.metadata.id}
                            onClick={() => handleLoadSavedLayout(layout)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-gray-900 truncate">
                                    {layout.metadata.name}
                                  </h3>
                                  {layout.isFavorite && (
                                    <span className="text-yellow-500">⭐</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {layout.metadata.description}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{layout.metadata.plantCount} plants</span>
                                  <span>{layout.metadata.dimensions.rows}×{layout.metadata.dimensions.columns}</span>
                                  <span>{new Date(layout.metadata.lastModified).toLocaleDateString()}</span>
                                </div>
                                {layout.metadata.dominantCrops.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {layout.metadata.dominantCrops.slice(0, 3).map((crop) => (
                                      <span
                                        key={crop}
                                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                                      >
                                        {crop}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  onClick={(e) => handleToggleFavorite(layout.metadata.id, layout.isFavorite, e)}
                                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                                  title={layout.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  {layout.isFavorite ? '⭐' : '☆'}
                                </button>
                                <button
                                  onClick={(e) => handleDeleteLayout(layout.metadata.id, e)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete layout"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {savedLayouts.length} layout{savedLayouts.length !== 1 ? 's' : ''} found
                      </span>
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Preview & Load Form
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Garden Layout Preview
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedLayout ? 'Review saved layout and load it' : 'Review your garden and save the layout'}
                  </p>
                </div>
                <button
                  onClick={handleBackToImport}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to {importMode === 'saved' ? 'Saved Layouts' : 'Import'}
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
                          hideWateringStatus={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Load/Save Layout Form */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">
                      {selectedLayout ? 'Load Layout' : 'Save Layout'}
                    </h3>
                    
                    {selectedLayout && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-blue-900">{selectedLayout.metadata.name}</span>
                          {selectedLayout.isFavorite && <span className="text-yellow-500">⭐</span>}
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{selectedLayout.metadata.description}</p>
                        <div className="flex items-center gap-4 text-xs text-blue-600">
                          <span>Created: {new Date(selectedLayout.metadata.createdAt).toLocaleDateString()}</span>
                          <span>Modified: {new Date(selectedLayout.metadata.lastModified).toLocaleDateString()}</span>
                        </div>
                        {selectedLayout.notes && (
                          <p className="text-sm text-blue-700 mt-2 italic">"{selectedLayout.notes}"</p>
                        )}
                      </div>
                    )}
                    
                    {!selectedLayout && (
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
                    )}

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
                        disabled={!selectedLayout && !layoutName.trim()}
                        className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          selectedLayout
                            ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        }`}
                      >
                        {selectedLayout ? '📥 Load Layout' : '💾 Save Layout'}
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