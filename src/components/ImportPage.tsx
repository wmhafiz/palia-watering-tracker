import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedGardenStore } from '../hooks/useUnifiedGardenStore';
import { parseGridData } from '../services/plannerService';
import { ParsedGardenData, SavedLayout } from '../types/layout';
import { GridPreview } from './GridPreview';
import { CropSummaryComponent } from './CropSummaryComponent';
import { layoutService } from '../services/layoutService';

type ImportMode = 'url' | 'saved';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gardenData, setGardenData] = useState<ParsedGardenData | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [layoutNotes, setLayoutNotes] = useState('');
  const [layoutTags, setLayoutTags] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Saved layouts state
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<SavedLayout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'lastModified'>('lastModified');
  
  const { saveAndLoadLayout, loadLayoutById } = useUnifiedGardenStore();

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

  // Load saved layouts when switching to saved mode
  useEffect(() => {
    if (importMode === 'saved') {
      loadSavedLayouts();
    }
  }, [importMode, loadSavedLayouts]);

  // Reload layouts when search or sort changes
  useEffect(() => {
    if (importMode === 'saved') {
      loadSavedLayouts();
    }
  }, [searchQuery, sortBy, loadSavedLayouts, importMode]);

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
          setSaveLoading(true);
          setError(null);
          
          if (selectedLayout) {
              // Load existing layout
              const result = await loadLayoutById(selectedLayout.metadata.id);
              if (!result.success) {
                  setError(result.error || 'Failed to load layout');
                  return;
              }
          } else {
              // Save new layout and load it
              const tags = layoutTags.trim() ? layoutTags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
              const result = await saveAndLoadLayout(url, layoutName, {
                  notes: layoutNotes.trim() || undefined,
                  tags: tags.length > 0 ? tags : undefined
              });
              
              if (!result.success) {
                  setError(result.error || 'Failed to save and load layout');
                  return;
              }
          }
          
          navigate('/');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process layout');
      } finally {
          setSaveLoading(false);
      }
  }, [gardenData, layoutName, layoutNotes, layoutTags, selectedLayout, url, saveAndLoadLayout, loadLayoutById, navigate]);

  const handleBackToImport = useCallback(() => {
    setShowPreview(false);
    setGardenData(null);
    setLayoutName('');
    setError(null);
  }, []);

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
              <h1 className="text-xl font-semibold text-gray-900">
                {showPreview ? 'Garden Layout Preview' : 'Import Garden Layout'}
              </h1>
            </div>
            
            {showPreview && gardenData && (
              <button
                onClick={() => {
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
                    
                    const { importPlantsFromGarden } = useUnifiedGardenStore.getState();
                    importPlantsFromGarden(plants);
                    navigate('/');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load layout to tracker');
                  }
                }}
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
        {!showPreview ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tab Navigation */}
              <div className="p-6 border-b border-gray-200">
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
              <div className="p-6">
                {importMode === 'url' ? (
                  // URL Import Form
                  <div className="space-y-6">
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

                    {error && (
                      <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => navigate('/')}
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
                  <div className="space-y-6">
                    {/* Search and Sort Controls */}
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

                    {error && (
                      <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {error}
                      </div>
                    )}

                    {/* Layouts List */}
                    <div className="min-h-96">
                      {savedLayouts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
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
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-500">
                        {savedLayouts.length} layout{savedLayouts.length !== 1 ? 's' : ''} found
                      </span>
                      <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Preview & Load Form
          <div className="space-y-8">
            {/* Back Button */}
            <div>
              <button
                onClick={handleBackToImport}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>←</span>
                <span>Back to {importMode === 'saved' ? 'Saved Layouts' : 'Import'}</span>
              </button>
            </div>

            {gardenData && (
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
            )}

            {/* Load/Save Layout Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {selectedLayout ? 'Load Layout' : 'Save Layout'}
              </h3>
              
              {selectedLayout && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
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
                <div className="space-y-4 mb-4">
                  <div>
                    <label htmlFor="layout-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Layout Name *
                    </label>
                    <input
                      id="layout-name"
                      type="text"
                      value={layoutName}
                      onChange={(e) => setLayoutName(e.target.value)}
                      placeholder="Enter a name for this layout..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="layout-notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="layout-notes"
                      value={layoutNotes}
                      onChange={(e) => setLayoutNotes(e.target.value)}
                      placeholder="Add any notes about this layout..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="layout-tags" className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (Optional)
                    </label>
                    <input
                      id="layout-tags"
                      type="text"
                      value={layoutTags}
                      onChange={(e) => setLayoutTags(e.target.value)}
                      placeholder="Enter tags separated by commas (e.g., farming, efficient, beginner)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tags help organize and search your layouts
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  disabled={saveLoading}
                >
                  Cancel
                </button>
                
                {!selectedLayout && (
                  <button
                    onClick={async () => {
                      if (!gardenData) return;
                      try {
                        setSaveLoading(true);
                        setError(null);
                        
                        // Load without saving - use the existing import logic
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
                        
                        // Use the existing import action from unified store
                        const { importPlantsFromGarden } = useUnifiedGardenStore.getState();
                        importPlantsFromGarden(plants);
                        
                        navigate('/');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to load layout');
                      } finally {
                        setSaveLoading(false);
                      }
                    }}
                    disabled={saveLoading}
                    className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saveLoading ? 'Loading...' : '📥 Load Without Saving'}
                  </button>
                )}
                
                <button
                  onClick={handleSaveLayout}
                  disabled={(!selectedLayout && !layoutName.trim()) || saveLoading}
                  className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    selectedLayout
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {saveLoading
                    ? 'Processing...'
                    : selectedLayout
                      ? '📥 Load Layout'
                      : '💾 Save & Load Layout'
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};