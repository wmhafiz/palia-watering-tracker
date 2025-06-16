import { 
  LegacyData, 
  MigrationResult, 
  TrackedCrop, 
  createTrackedCrop,
  STORAGE_KEYS 
} from '../types/unified';

/**
 * Service for handling migration from legacy localStorage data
 */
export class MigrationService {
  /**
   * Check if legacy data exists in localStorage
   */
  static hasLegacyData(): boolean {
    const legacyTrackedCrops = localStorage.getItem(STORAGE_KEYS.LEGACY_TRACKED_CROPS);
    const legacyWateringState = localStorage.getItem(STORAGE_KEYS.LEGACY_WATERING_STATE);
    
    return !!(legacyTrackedCrops || legacyWateringState);
  }

  /**
   * Check if unified data already exists
   */
  static hasUnifiedData(): boolean {
    const unifiedData = localStorage.getItem(STORAGE_KEYS.UNIFIED_GARDEN);
    return !!unifiedData;
  }

  /**
   * Determine if migration should be offered to the user
   */
  static shouldOfferMigration(): boolean {
    return this.hasLegacyData() && !this.hasUnifiedData();
  }

  /**
   * Extract legacy data from localStorage
   */
  static extractLegacyData(): LegacyData | null {
    try {
      const trackedCropsRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_TRACKED_CROPS);
      const wateringStateRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_WATERING_STATE);

      let trackedCrops: string[] = [];
      let cropWateringState: { watered: { [cropName: string]: boolean }; lastResetDay: string } | undefined;

      // Parse tracked crops
      if (trackedCropsRaw) {
        const parsed = JSON.parse(trackedCropsRaw);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          trackedCrops = parsed;
        }
      }

      // Parse watering state
      if (wateringStateRaw) {
        const parsed = JSON.parse(wateringStateRaw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.watered === 'object' &&
          typeof parsed.lastResetDay === 'string'
        ) {
          cropWateringState = parsed;
        }
      }

      // Return null if no valid data found
      if (trackedCrops.length === 0 && !cropWateringState) {
        return null;
      }

      return {
        trackedCrops,
        cropWateringState
      };
    } catch (error) {
      console.error('Error extracting legacy data:', error);
      return null;
    }
  }

  /**
   * Migrate legacy data to unified format
   */
  static migrateLegacyData(legacyData: LegacyData): MigrationResult {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: [],
      wateringStatePreserved: false
    };

    try {
      const migratedCrops: TrackedCrop[] = [];

      // Migrate tracked crops
      for (const cropType of legacyData.trackedCrops) {
        try {
          const trackedCrop = createTrackedCrop(cropType, 'manual');
          
          // Preserve watering state if available
          if (legacyData.cropWateringState?.watered[cropType] !== undefined) {
            trackedCrop.isWatered = legacyData.cropWateringState.watered[cropType];
            if (trackedCrop.isWatered) {
              trackedCrop.lastWateredAt = new Date();
            }
          }

          migratedCrops.push(trackedCrop);
          result.migratedCount++;
        } catch (error) {
          result.errors.push(`Failed to migrate crop "${cropType}": ${error}`);
        }
      }

      // Check if watering state was preserved
      result.wateringStatePreserved = !!legacyData.cropWateringState;

      result.success = result.errors.length === 0 || result.migratedCount > 0;
      
      return result;
    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      return result;
    }
  }

  /**
   * Clean up legacy data after successful migration
   */
  static cleanupLegacyData(): void {
    try {
      // Remove legacy localStorage entries
      localStorage.removeItem(STORAGE_KEYS.LEGACY_TRACKED_CROPS);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_WATERING_STATE);
      
      console.log('Legacy data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up legacy data:', error);
    }
  }

  /**
   * Get migration summary for display to user
   */
  static getMigrationSummary(): {
    cropCount: number;
    hasWateringState: boolean;
    estimatedDataSize: string;
  } | null {
    const legacyData = this.extractLegacyData();
    if (!legacyData) return null;

    const cropCount = legacyData.trackedCrops.length;
    const hasWateringState = !!legacyData.cropWateringState;
    
    // Rough estimate of data size
    const estimatedBytes = JSON.stringify(legacyData).length;
    const estimatedDataSize = estimatedBytes < 1024 
      ? `${estimatedBytes} bytes`
      : `${Math.round(estimatedBytes / 1024)} KB`;

    return {
      cropCount,
      hasWateringState,
      estimatedDataSize
    };
  }

  /**
   * Validate that migration can be performed safely
   */
  static validateMigrationSafety(): {
    canMigrate: boolean;
    warnings: string[];
    blockers: string[];
  } {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Check if unified data already exists
    if (this.hasUnifiedData()) {
      blockers.push('Unified data already exists. Migration would overwrite existing data.');
    }

    // Check if legacy data is valid
    const legacyData = this.extractLegacyData();
    if (!legacyData) {
      blockers.push('No valid legacy data found to migrate.');
    }

    // Check for potential data conflicts
    if (legacyData && legacyData.trackedCrops.length > 50) {
      warnings.push('Large number of tracked crops detected. Migration may take longer.');
    }

    // Check localStorage availability
    try {
      localStorage.setItem('__migration_test__', 'test');
      localStorage.removeItem('__migration_test__');
    } catch (error) {
      blockers.push('localStorage is not available for migration.');
    }

    return {
      canMigrate: blockers.length === 0,
      warnings,
      blockers
    };
  }
}

/**
 * Utility functions for migration
 */
export const migrationUtils = {
  /**
   * Format migration result for user display
   */
  formatMigrationResult: (result: MigrationResult): string => {
    if (result.success) {
      let message = `Successfully migrated ${result.migratedCount} crop${result.migratedCount !== 1 ? 's' : ''}`;
      if (result.wateringStatePreserved) {
        message += ' with watering state preserved';
      }
      if (result.errors.length > 0) {
        message += ` (${result.errors.length} warning${result.errors.length !== 1 ? 's' : ''})`;
      }
      return message;
    } else {
      return `Migration failed: ${result.errors.join(', ')}`;
    }
  },

  /**
   * Get user-friendly migration status
   */
  getMigrationStatus: (): 'not-needed' | 'available' | 'completed' | 'blocked' => {
    if (!MigrationService.hasLegacyData()) {
      return 'not-needed';
    }
    
    if (MigrationService.hasUnifiedData()) {
      return 'completed';
    }

    const validation = MigrationService.validateMigrationSafety();
    if (!validation.canMigrate) {
      return 'blocked';
    }

    return 'available';
  }
};