import React, { useEffect } from 'react';
import { useUnifiedGardenStore, useGardenStats, initializeUnifiedStore } from '../hooks/useUnifiedGardenStore';
import { MigrationService } from '../services/migrationService';

/**
 * Test component to verify unified store functionality
 * This component can be temporarily added to App.tsx for testing
 */
export const UnifiedStoreTest: React.FC = () => {
  const {
    trackedCrops,
    addCropManually,
    removeCrop,
    toggleCropWatered,
    waterAllCrops,
    waterNoneCrops,
    clearAllCrops,
    isInitialized
  } = useUnifiedGardenStore();

  const stats = useGardenStats();

  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeUnifiedStore();
    }
  }, [isInitialized]);

  // Check migration status
  const migrationStatus = {
    hasLegacyData: MigrationService.hasLegacyData(),
    hasUnifiedData: MigrationService.hasUnifiedData(),
    shouldOfferMigration: MigrationService.shouldOfferMigration()
  };

  const testCrops = ['Tomato', 'Wheat', 'Rice', 'Potato'];

  return (
    <div className="p-6 bg-gray-100 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Unified Store Test Panel</h2>
      
      {/* Initialization Status */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-800">Store Status</h3>
        <p className="text-sm text-blue-600">
          Initialized: {isInitialized ? '✅' : '❌'}
        </p>
      </div>

      {/* Migration Status */}
      <div className="mb-4 p-3 bg-yellow-50 rounded">
        <h3 className="font-semibold text-yellow-800">Migration Status</h3>
        <div className="text-sm text-yellow-600 space-y-1">
          <p>Has Legacy Data: {migrationStatus.hasLegacyData ? '✅' : '❌'}</p>
          <p>Has Unified Data: {migrationStatus.hasUnifiedData ? '✅' : '❌'}</p>
          <p>Should Offer Migration: {migrationStatus.shouldOfferMigration ? '✅' : '❌'}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4 p-3 bg-green-50 rounded">
        <h3 className="font-semibold text-green-800">Statistics</h3>
        <div className="text-sm text-green-600 grid grid-cols-2 gap-2">
          <p>Total Crops: {stats.totalCrops}</p>
          <p>Watered: {stats.wateredCrops}</p>
          <p>Manual: {stats.manualCrops}</p>
          <p>Imported: {stats.importedCrops}</p>
          <p>Total Plants: {stats.totalPlants}</p>
          <p>Progress: {stats.wateringPercentage}%</p>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-4 space-y-2">
        <h3 className="font-semibold">Test Controls</h3>
        <div className="flex flex-wrap gap-2">
          {testCrops.map(crop => (
            <button
              key={crop}
              onClick={() => addCropManually(crop)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Add {crop}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={waterAllCrops}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Water All
          </button>
          <button
            onClick={waterNoneCrops}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            Water None
          </button>
          <button
            onClick={clearAllCrops}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Tracked Crops Display */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Tracked Crops ({trackedCrops.length})</h3>
        {trackedCrops.length === 0 ? (
          <p className="text-gray-500 text-sm">No crops tracked</p>
        ) : (
          <div className="space-y-2">
            {trackedCrops.map(crop => (
              <div
                key={crop.cropType}
                className="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{crop.cropType}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    crop.source === 'import' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {crop.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {crop.totalCount} plant{crop.totalCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCropWatered(crop.cropType)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                      crop.isWatered
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {crop.isWatered ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => removeCrop(crop.cropType)}
                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* localStorage Debug */}
      <div className="p-3 bg-gray-50 rounded">
        <h3 className="font-semibold text-gray-800 mb-2">localStorage Debug</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Unified Data: {localStorage.getItem('paliaUnifiedGarden') ? 'Present' : 'None'}</p>
          <p>Legacy Tracked: {localStorage.getItem('paliaTrackedCrops') ? 'Present' : 'None'}</p>
          <p>Legacy Watering: {localStorage.getItem('paliaWateringState') ? 'Present' : 'None'}</p>
        </div>
      </div>
    </div>
  );
};