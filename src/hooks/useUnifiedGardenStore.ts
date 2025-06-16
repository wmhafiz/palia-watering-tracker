import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  UnifiedGardenStore,
  TrackedCrop,
  PersistedGardenData,
  LegacyData,
  MigrationResult,
  DailyWateringState,
  createTrackedCrop,
  groupPlantsByType,
  validatePersistedData,
  STORAGE_KEYS,
  DEFAULT_DAILY_WATERING_STATE,
  CURRENT_VERSION
} from '../types/unified';
import { Plant } from '../types';
import { MigrationService } from '../services/migrationService';
import { layoutService } from '../services/layoutService';

/**
 * Persistence utilities for the unified store
 */
const persistenceUtils = {
  /**
   * Load persisted data from localStorage
   */
  loadPersistedData: (): PersistedGardenData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.UNIFIED_GARDEN);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      if (parsed.trackedCrops) {
        parsed.trackedCrops = parsed.trackedCrops.map((crop: any) => ({
          ...crop,
          addedAt: new Date(crop.addedAt),
          lastWateredAt: crop.lastWateredAt ? new Date(crop.lastWateredAt) : undefined
        }));
      }

      if (validatePersistedData(parsed)) {
        return parsed;
      } else {
        console.warn('Invalid persisted data format, starting fresh');
        return null;
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
      return null;
    }
  },

  /**
   * Save data to localStorage
   */
  savePersistedData: (data: Omit<PersistedGardenData, 'lastSaved'>): void => {
    try {
      const toSave: PersistedGardenData = {
        ...data,
        lastSaved: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEYS.UNIFIED_GARDEN, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving persisted data:', error);
    }
  },

  /**
   * Create initial persisted data structure
   */
  createInitialData: (migratedFromLegacy = false): PersistedGardenData => ({
    version: CURRENT_VERSION,
    trackedCrops: [],
    dailyWateringState: { ...DEFAULT_DAILY_WATERING_STATE },
    migratedFromLegacy,
    lastSaved: Date.now()
  })
};

/**
 * Create the unified garden store
 */
export const useUnifiedGardenStore = create<UnifiedGardenStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    trackedCrops: [],
    dailyWateringState: { ...DEFAULT_DAILY_WATERING_STATE },
    isInitialized: false,
    isLoading: false,
    lastError: null,

    // Actions
    addCropManually: (cropType: string) => {
      set((state) => {
        // Check if crop already exists
        const existingCrop = state.trackedCrops.find(crop => crop.cropType === cropType);
        if (existingCrop) {
          return { lastError: `${cropType} is already being tracked` };
        }

        const newCrop = createTrackedCrop(cropType, 'manual');
        const updatedCrops = [...state.trackedCrops, newCrop];

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    removeCrop: (cropType: string) => {
      set((state) => {
        const updatedCrops = state.trackedCrops.filter(crop => crop.cropType !== cropType);

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    importPlantsFromGarden: (plants: Plant[]) => {
      set((state) => {
        // Group plants by crop type
        const plantGroups = groupPlantsByType(plants);
        const updatedCrops = [...state.trackedCrops];

        // Process each crop type
        for (const [cropType, plantInstances] of Object.entries(plantGroups)) {
          const existingCropIndex = updatedCrops.findIndex(crop => crop.cropType === cropType);
          
          if (existingCropIndex >= 0) {
            // Update existing crop with new plant instances
            updatedCrops[existingCropIndex] = {
              ...updatedCrops[existingCropIndex],
              source: 'import', // Change source to import
              plantInstances,
              totalCount: plantInstances.length,
              addedAt: new Date() // Update timestamp
            };
          } else {
            // Create new tracked crop
            const newCrop = createTrackedCrop(cropType, 'import', plantInstances);
            updatedCrops.push(newCrop);
          }
        }

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    toggleCropWatered: (cropType: string) => {
      set((state) => {
        const updatedCrops = state.trackedCrops.map(crop => {
          if (crop.cropType === cropType) {
            const newWateredState = !crop.isWatered;
            return {
              ...crop,
              isWatered: newWateredState,
              lastWateredAt: newWateredState ? new Date() : crop.lastWateredAt
            };
          }
          return crop;
        });

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    waterAllCrops: () => {
      set((state) => {
        const now = new Date();
        const updatedCrops = state.trackedCrops.map(crop => ({
          ...crop,
          isWatered: true,
          lastWateredAt: now
        }));

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    waterNoneCrops: () => {
      set((state) => {
        const updatedCrops = state.trackedCrops.map(crop => ({
          ...crop,
          isWatered: false
        }));

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    resetDailyWatering: (currentDay: string) => {
      set((state) => {
        const updatedCrops = state.trackedCrops.map(crop => ({
          ...crop,
          isWatered: false
        }));

        const updatedWateringState: DailyWateringState = {
          ...state.dailyWateringState,
          lastResetDay: currentDay
        };

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: updatedWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          dailyWateringState: updatedWateringState,
          lastError: null
        };
      });
    },

    importFromLegacyData: (legacyData: LegacyData): MigrationResult => {
      const result = MigrationService.migrateLegacyData(legacyData);
      
      if (result.success) {
        set((state) => {
          const migratedCrops: TrackedCrop[] = [];
          
          // Create tracked crops from legacy data
          for (const cropType of legacyData.trackedCrops) {
            const trackedCrop = createTrackedCrop(cropType, 'manual');
            
            // Preserve watering state if available
            if (legacyData.cropWateringState?.watered[cropType] !== undefined) {
              trackedCrop.isWatered = legacyData.cropWateringState.watered[cropType];
              if (trackedCrop.isWatered) {
                trackedCrop.lastWateredAt = new Date();
              }
            }
            
            migratedCrops.push(trackedCrop);
          }

          const updatedWateringState: DailyWateringState = {
            lastResetDay: legacyData.cropWateringState?.lastResetDay || '',
            resetTime: 6
          };

          // Persist migrated data
          persistenceUtils.savePersistedData({
            version: CURRENT_VERSION,
            trackedCrops: migratedCrops,
            dailyWateringState: updatedWateringState,
            migratedFromLegacy: true
          });

          return {
            trackedCrops: migratedCrops,
            dailyWateringState: updatedWateringState,
            lastError: null
          };
        });
      }

      return result;
    },

    clearAllCrops: () => {
      set((state) => {
        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: [],
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: [],
          lastError: null
        };
      });
    },

    getCropByType: (cropType: string) => {
      return get().trackedCrops.find(crop => crop.cropType === cropType);
    },

    getCropsBySource: (source: 'manual' | 'import') => {
      return get().trackedCrops.filter(crop => crop.source === source);
    },

    updatePlantInstances: (cropType: string, plants: Plant[]) => {
      set((state) => {
        const updatedCrops = state.trackedCrops.map(crop => {
          if (crop.cropType === cropType && crop.source === 'import') {
            return {
              ...crop,
              plantInstances: plants,
              totalCount: plants.length
            };
          }
          return crop;
        });

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: state.dailyWateringState,
          migratedFromLegacy: false
        });

        return {
          trackedCrops: updatedCrops,
          lastError: null
        };
      });
    },

    saveAndLoadLayout: async (saveCode: string, name: string, options: { notes?: string; tags?: string[] } = {}) => {
      try {
        set((state) => ({ ...state, isLoading: true, lastError: null }));

        // Save the layout using the layout service
        const saveResult = await layoutService.saveLayout(saveCode, name, {
          notes: options.notes,
          tags: options.tags,
          isFavorite: false
        });

        if (!saveResult.success) {
          set((state) => ({
            ...state,
            isLoading: false,
            lastError: saveResult.error?.message || 'Failed to save layout'
          }));
          return { success: false, error: saveResult.error?.message || 'Failed to save layout' };
        }

        // Import the plants from the saved layout
        const savedLayout = saveResult.data!;
        const plants: Plant[] = [];
        
        // Convert garden data to plants
        for (const [cropType, summary] of Object.entries(savedLayout.gardenData.cropSummary.cropBreakdown)) {
          for (let i = 0; i < summary.total; i++) {
            plants.push({
              id: `${cropType}-${i}`,
              name: cropType,
              needsWater: false
            });
          }
        }

        // Update tracked crops using existing importPlantsFromGarden logic
        const plantGroups = groupPlantsByType(plants);
        const updatedCrops = [...get().trackedCrops];

        // Process each crop type
        for (const [cropType, plantInstances] of Object.entries(plantGroups)) {
          const existingCropIndex = updatedCrops.findIndex(crop => crop.cropType === cropType);
          
          if (existingCropIndex >= 0) {
            // Update existing crop with new plant instances
            updatedCrops[existingCropIndex] = {
              ...updatedCrops[existingCropIndex],
              source: 'import',
              plantInstances,
              totalCount: plantInstances.length,
              addedAt: new Date()
            };
          } else {
            // Create new tracked crop
            const newCrop = createTrackedCrop(cropType, 'import', plantInstances);
            updatedCrops.push(newCrop);
          }
        }

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: get().dailyWateringState,
          migratedFromLegacy: false
        });

        set((state) => ({
          ...state,
          trackedCrops: updatedCrops,
          isLoading: false,
          lastError: null
        }));

        return { success: true };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save and load layout';
        set((state) => ({
          ...state,
          isLoading: false,
          lastError: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },

    loadLayoutById: async (layoutId: string) => {
      try {
        set((state) => ({ ...state, isLoading: true, lastError: null }));

        // Load the layout using the layout service
        const loadResult = layoutService.loadLayout(layoutId);

        if (!loadResult.success) {
          set((state) => ({
            ...state,
            isLoading: false,
            lastError: loadResult.error?.message || 'Failed to load layout'
          }));
          return { success: false, error: loadResult.error?.message || 'Failed to load layout' };
        }

        // Import the plants from the loaded layout
        const savedLayout = loadResult.data!;
        const plants: Plant[] = [];
        
        // Convert garden data to plants
        for (const [cropType, summary] of Object.entries(savedLayout.gardenData.cropSummary.cropBreakdown)) {
          for (let i = 0; i < summary.total; i++) {
            plants.push({
              id: `${cropType}-${i}`,
              name: cropType,
              needsWater: false
            });
          }
        }

        // Update tracked crops using existing importPlantsFromGarden logic
        const plantGroups = groupPlantsByType(plants);
        const updatedCrops = [...get().trackedCrops];

        // Process each crop type
        for (const [cropType, plantInstances] of Object.entries(plantGroups)) {
          const existingCropIndex = updatedCrops.findIndex(crop => crop.cropType === cropType);
          
          if (existingCropIndex >= 0) {
            // Update existing crop with new plant instances
            updatedCrops[existingCropIndex] = {
              ...updatedCrops[existingCropIndex],
              source: 'import',
              plantInstances,
              totalCount: plantInstances.length,
              addedAt: new Date()
            };
          } else {
            // Create new tracked crop
            const newCrop = createTrackedCrop(cropType, 'import', plantInstances);
            updatedCrops.push(newCrop);
          }
        }

        // Persist changes
        persistenceUtils.savePersistedData({
          version: CURRENT_VERSION,
          trackedCrops: updatedCrops,
          dailyWateringState: get().dailyWateringState,
          migratedFromLegacy: false
        });

        set((state) => ({
          ...state,
          trackedCrops: updatedCrops,
          isLoading: false,
          lastError: null
        }));

        return { success: true };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load layout';
        set((state) => ({
          ...state,
          isLoading: false,
          lastError: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    }
  }))
);

/**
 * Initialize the store with persisted data
 */
export const initializeUnifiedStore = () => {
  const store = useUnifiedGardenStore.getState();
  
  if (store.isInitialized) {
    return;
  }

  // Try to load persisted data
  const persistedData = persistenceUtils.loadPersistedData();
  
  if (persistedData) {
    // Load from persisted data
    useUnifiedGardenStore.setState({
      trackedCrops: persistedData.trackedCrops,
      dailyWateringState: persistedData.dailyWateringState,
      isInitialized: true,
      isLoading: false,
      lastError: null
    });
  } else {
    // Initialize with empty state
    const initialData = persistenceUtils.createInitialData();
    persistenceUtils.savePersistedData(initialData);
    
    useUnifiedGardenStore.setState({
      trackedCrops: [],
      dailyWateringState: { ...DEFAULT_DAILY_WATERING_STATE },
      isInitialized: true,
      isLoading: false,
      lastError: null
    });
  }
};

/**
 * Hook for accessing store statistics
 */
export const useGardenStats = () => {
  return useUnifiedGardenStore((state) => {
    const totalCrops = state.trackedCrops.length;
    const wateredCrops = state.trackedCrops.filter(crop => crop.isWatered).length;
    const manualCrops = state.trackedCrops.filter(crop => crop.source === 'manual').length;
    const importedCrops = state.trackedCrops.filter(crop => crop.source === 'import').length;
    const totalPlants = state.trackedCrops.reduce((sum, crop) => sum + crop.totalCount, 0);
    
    return {
      totalCrops,
      wateredCrops,
      unwateredCrops: totalCrops - wateredCrops,
      manualCrops,
      importedCrops,
      totalPlants,
      wateringPercentage: totalCrops > 0 ? Math.round((wateredCrops / totalCrops) * 100) : 0,
      allWatered: totalCrops > 0 && wateredCrops === totalCrops,
      noneWatered: wateredCrops === 0
    };
  });
};