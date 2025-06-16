import React, { useState, useEffect } from 'react';
import { MigrationService, migrationUtils } from '../services/migrationService';
import { useUnifiedGardenStore } from '../hooks/useUnifiedGardenStore';

interface MigrationBannerProps {
  onMigrationComplete?: () => void;
}

export const MigrationBanner: React.FC<MigrationBannerProps> = ({ onMigrationComplete }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<{
    cropCount: number;
    hasWateringState: boolean;
    estimatedDataSize: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { importFromLegacyData } = useUnifiedGardenStore();

  // Check if migration should be offered
  useEffect(() => {
    const migrationStatus = migrationUtils.getMigrationStatus();
    
    if (migrationStatus === 'available') {
      setShowBanner(true);
      const summary = MigrationService.getMigrationSummary();
      setMigrationSummary(summary);
    }
  }, []);

  const handleMigrate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const legacyData = MigrationService.extractLegacyData();
      
      if (!legacyData) {
        setError('No legacy data found to migrate');
        return;
      }

      const result = importFromLegacyData(legacyData);

      if (result.success) {
        // Clean up legacy data after successful migration
        MigrationService.cleanupLegacyData();
        
        // Hide banner and notify parent
        setShowBanner(false);
        onMigrationComplete?.();
        
        // Show success message briefly
        setTimeout(() => {
          alert(migrationUtils.formatMigrationResult(result));
        }, 100);
      } else {
        setError(migrationUtils.formatMigrationResult(result));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setShowBanner(false);
    onMigrationComplete?.();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg border border-blue-500/20">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-lg">📦</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Import Your Existing Crop Data
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  We found your previously tracked crops. Would you like to import them into the new system?
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-blue-200 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {migrationSummary && (
            <div className="mt-4 bg-blue-500/20 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="flex items-center space-x-4">
                    <span>🌱 {migrationSummary.cropCount} crops</span>
                    {migrationSummary.hasWateringState && (
                      <span>💧 Watering state preserved</span>
                    )}
                    <span>📊 {migrationSummary.estimatedDataSize}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-200 hover:text-white text-xs underline"
                >
                  {showDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {showDetails && (
                <div className="mt-3 pt-3 border-t border-blue-400/20">
                  <div className="text-xs text-blue-100 space-y-1">
                    <p>• Your tracked crops will be imported as manually selected crops</p>
                    <p>• Current watering status will be preserved if available</p>
                    <p>• Daily reset schedule (6 AM) will continue as normal</p>
                    <p>• Original data will be safely removed after successful import</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-400/30 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <span className="text-red-200">⚠️</span>
                <span className="text-red-100 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end space-x-3">
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-4 py-2 text-blue-200 hover:text-white transition-colors disabled:opacity-50 text-sm"
            >
              Skip for now
            </button>
            <button
              onClick={handleMigrate}
              disabled={isLoading}
              className="px-4 py-2 bg-white text-blue-700 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>Importing...</span>
                </div>
              ) : (
                'Import Data'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to manage migration banner state
 */
export const useMigrationBanner = () => {
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    const migrationStatus = migrationUtils.getMigrationStatus();
    setShowMigration(migrationStatus === 'available');
  }, []);

  const hideMigration = () => setShowMigration(false);

  return {
    showMigration,
    hideMigration
  };
};