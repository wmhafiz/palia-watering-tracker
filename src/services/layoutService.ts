import { v4 as uuidv4 } from 'uuid';
import { 
  SavedLayout, 
  LayoutMetadata, 
  ParsedGardenData, 
  StorageInfo, 
  LayoutServiceConfig, 
  LayoutError, 
  LayoutOperationResult, 
  LayoutSearchOptions 
} from '../types/layout';
import { parseGridData, generateCropSummary } from './plannerService';

/**
 * Default configuration for the layout service
 */
const DEFAULT_CONFIG: LayoutServiceConfig = {
  maxLayouts: 50,
  storagePrefix: 'palia_watering_tracker_layouts',
  enableCompression: false
};

/**
 * Service for managing saved garden layouts in localStorage
 */
export class LayoutService {
  private config: LayoutServiceConfig;
  private storageKey: string;
  private metadataKey: string;

  constructor(config: Partial<LayoutServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageKey = `${this.config.storagePrefix}_data`;
    this.metadataKey = `${this.config.storagePrefix}_metadata`;
  }

  /**
   * Save a new layout or update an existing one
   */
  async saveLayout(
    saveCode: string, 
    name: string, 
    options: {
      notes?: string;
      tags?: string[];
      isFavorite?: boolean;
      updateExisting?: boolean;
      existingId?: string;
    } = {}
  ): Promise<LayoutOperationResult<SavedLayout>> {
    try {
      // Parse the garden data
      const gardenData = await parseGridData(saveCode);
      
      // Check quota if creating new layout
      if (!options.updateExisting) {
        const storageInfo = this.getStorageInfo();
        if (storageInfo.currentCount >= this.config.maxLayouts) {
          return {
            success: false,
            error: {
              type: LayoutError.QUOTA_EXCEEDED,
              message: `Maximum number of layouts (${this.config.maxLayouts}) reached. Please delete some layouts first.`,
              details: { currentCount: storageInfo.currentCount, maxCount: this.config.maxLayouts }
            }
          };
        }
      }

      // Generate metadata
      const now = new Date();
      const dominantCrops = this.getDominantCrops(gardenData);
      
      const metadata: LayoutMetadata = {
        id: options.existingId || uuidv4(),
        name: name.trim(),
        description: this.generateDescription(gardenData),
        createdAt: options.updateExisting ? this.getExistingLayout(options.existingId!)?.metadata.createdAt || now : now,
        lastModified: now,
        plotCount: this.countActivePlots(gardenData.activePlots),
        plantCount: gardenData.cropSummary.totalPlants,
        dominantCrops,
        dimensions: gardenData.dimensions,
        tags: options.tags || []
      };

      const savedLayout: SavedLayout = {
        metadata,
        saveCode,
        gardenData,
        notes: options.notes,
        isFavorite: options.isFavorite || false
      };

      // Save to storage
      const layouts = this.getAllLayouts();
      const existingIndex = layouts.findIndex(l => l.metadata.id === metadata.id);
      
      if (existingIndex >= 0) {
        layouts[existingIndex] = savedLayout;
      } else {
        layouts.push(savedLayout);
      }

      this.saveToStorage(layouts);

      return {
        success: true,
        data: savedLayout
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.VALIDATION_ERROR,
          message: error instanceof Error ? error.message : 'Failed to save layout',
          details: error
        }
      };
    }
  }

  /**
   * Load a layout by ID
   */
  loadLayout(id: string): LayoutOperationResult<SavedLayout> {
    try {
      const layouts = this.getAllLayouts();
      const layout = layouts.find(l => l.metadata.id === id);

      if (!layout) {
        return {
          success: false,
          error: {
            type: LayoutError.LAYOUT_NOT_FOUND,
            message: `Layout with ID ${id} not found`
          }
        };
      }

      return {
        success: true,
        data: layout
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to load layout',
          details: error
        }
      };
    }
  }

  /**
   * Delete a layout by ID
   */
  deleteLayout(id: string): LayoutOperationResult<boolean> {
    try {
      const layouts = this.getAllLayouts();
      const initialCount = layouts.length;
      const filteredLayouts = layouts.filter(l => l.metadata.id !== id);

      if (filteredLayouts.length === initialCount) {
        return {
          success: false,
          error: {
            type: LayoutError.LAYOUT_NOT_FOUND,
            message: `Layout with ID ${id} not found`
          }
        };
      }

      this.saveToStorage(filteredLayouts);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to delete layout',
          details: error
        }
      };
    }
  }

  /**
   * Get all layouts with optional search and filtering
   */
  searchLayouts(options: LayoutSearchOptions = {}): LayoutOperationResult<SavedLayout[]> {
    try {
      let layouts = this.getAllLayouts();

      // Apply filters
      if (options.query) {
        const query = options.query.toLowerCase();
        layouts = layouts.filter(layout => 
          layout.metadata.name.toLowerCase().includes(query) ||
          layout.metadata.description.toLowerCase().includes(query) ||
          (layout.notes && layout.notes.toLowerCase().includes(query))
        );
      }

      if (options.tags && options.tags.length > 0) {
        layouts = layouts.filter(layout =>
          options.tags!.some(tag => layout.metadata.tags.includes(tag))
        );
      }

      if (options.cropTypes && options.cropTypes.length > 0) {
        layouts = layouts.filter(layout =>
          options.cropTypes!.some(cropType => layout.metadata.dominantCrops.includes(cropType))
        );
      }

      if (options.favoritesOnly) {
        layouts = layouts.filter(layout => layout.isFavorite);
      }

      if (options.minPlantCount !== undefined) {
        layouts = layouts.filter(layout => layout.metadata.plantCount >= options.minPlantCount!);
      }

      if (options.maxPlantCount !== undefined) {
        layouts = layouts.filter(layout => layout.metadata.plantCount <= options.maxPlantCount!);
      }

      // Apply sorting
      if (options.sortBy) {
        layouts.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'name':
              aValue = a.metadata.name.toLowerCase();
              bValue = b.metadata.name.toLowerCase();
              break;
            case 'createdAt':
              aValue = new Date(a.metadata.createdAt).getTime();
              bValue = new Date(b.metadata.createdAt).getTime();
              break;
            case 'lastModified':
              aValue = new Date(a.metadata.lastModified).getTime();
              bValue = new Date(b.metadata.lastModified).getTime();
              break;
            case 'plantCount':
              aValue = a.metadata.plantCount;
              bValue = b.metadata.plantCount;
              break;
            case 'plotCount':
              aValue = a.metadata.plotCount;
              bValue = b.metadata.plotCount;
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return options.sortDirection === 'desc' ? 1 : -1;
          if (aValue > bValue) return options.sortDirection === 'desc' ? -1 : 1;
          return 0;
        });
      }

      return {
        success: true,
        data: layouts
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to search layouts',
          details: error
        }
      };
    }
  }

  /**
   * Update layout metadata (name, notes, tags, favorite status)
   */
  updateLayoutMetadata(
    id: string, 
    updates: {
      name?: string;
      notes?: string;
      tags?: string[];
      isFavorite?: boolean;
    }
  ): LayoutOperationResult<SavedLayout> {
    try {
      const layouts = this.getAllLayouts();
      const layoutIndex = layouts.findIndex(l => l.metadata.id === id);

      if (layoutIndex === -1) {
        return {
          success: false,
          error: {
            type: LayoutError.LAYOUT_NOT_FOUND,
            message: `Layout with ID ${id} not found`
          }
        };
      }

      const layout = layouts[layoutIndex];
      
      // Update metadata
      if (updates.name !== undefined) {
        layout.metadata.name = updates.name.trim();
      }
      if (updates.notes !== undefined) {
        layout.notes = updates.notes;
      }
      if (updates.tags !== undefined) {
        layout.metadata.tags = updates.tags;
      }
      if (updates.isFavorite !== undefined) {
        layout.isFavorite = updates.isFavorite;
      }

      layout.metadata.lastModified = new Date();
      layouts[layoutIndex] = layout;

      this.saveToStorage(layouts);

      return {
        success: true,
        data: layout
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to update layout metadata',
          details: error
        }
      };
    }
  }

  /**
   * Get storage information and quota status
   */
  getStorageInfo(): StorageInfo {
    const layouts = this.getAllLayouts();
    const storageData = localStorage.getItem(this.storageKey) || '[]';
    const storageUsed = new Blob([storageData]).size;
    
    // Estimate localStorage limit (usually 5-10MB, we'll use 5MB as conservative estimate)
    const storageLimit = 5 * 1024 * 1024; // 5MB in bytes

    return {
      currentCount: layouts.length,
      maxCount: this.config.maxLayouts,
      availableSlots: Math.max(0, this.config.maxLayouts - layouts.length),
      storageUsed,
      storageLimit
    };
  }

  /**
   * Export layouts as JSON
   */
  exportLayouts(layoutIds?: string[]): LayoutOperationResult<string> {
    try {
      let layouts = this.getAllLayouts();
      
      if (layoutIds && layoutIds.length > 0) {
        layouts = layouts.filter(layout => layoutIds.includes(layout.metadata.id));
      }

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        layouts
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to export layouts',
          details: error
        }
      };
    }
  }

  /**
   * Import layouts from JSON
   */
  async importLayouts(jsonData: string, options: { overwrite?: boolean } = {}): Promise<LayoutOperationResult<number>> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.layouts || !Array.isArray(importData.layouts)) {
        return {
          success: false,
          error: {
            type: LayoutError.VALIDATION_ERROR,
            message: 'Invalid import data format'
          }
        };
      }

      const existingLayouts = this.getAllLayouts();
      let importedCount = 0;

      for (const layoutData of importData.layouts) {
        // Validate layout structure
        if (!this.isValidSavedLayout(layoutData)) {
          continue;
        }

        const existingIndex = existingLayouts.findIndex(l => l.metadata.id === layoutData.metadata.id);
        
        if (existingIndex >= 0) {
          if (options.overwrite) {
            existingLayouts[existingIndex] = layoutData;
            importedCount++;
          }
        } else {
          // Check quota
          if (existingLayouts.length + importedCount >= this.config.maxLayouts) {
            break;
          }
          existingLayouts.push(layoutData);
          importedCount++;
        }
      }

      this.saveToStorage(existingLayouts);

      return {
        success: true,
        data: importedCount
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.VALIDATION_ERROR,
          message: 'Failed to import layouts',
          details: error
        }
      };
    }
  }

  /**
   * Clear all layouts (with confirmation)
   */
  clearAllLayouts(): LayoutOperationResult<boolean> {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.metadataKey);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: LayoutError.STORAGE_ERROR,
          message: 'Failed to clear layouts',
          details: error
        }
      };
    }
  }

  // Private helper methods

  private getAllLayouts(): SavedLayout[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const layouts = JSON.parse(data);
      return Array.isArray(layouts) ? layouts : [];
    } catch (error) {
      console.error('Failed to load layouts from storage:', error);
      return [];
    }
  }

  private saveToStorage(layouts: SavedLayout[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(layouts));
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  }

  private getExistingLayout(id: string): SavedLayout | null {
    const layouts = this.getAllLayouts();
    return layouts.find(l => l.metadata.id === id) || null;
  }

  private generateDescription(gardenData: ParsedGardenData): string {
    const { dimensions, cropSummary } = gardenData;
    const activePlots = this.countActivePlots(gardenData.activePlots);
    
    let description = `${dimensions.rows}×${dimensions.columns} garden with ${activePlots} active plots`;
    
    if (cropSummary.totalPlants > 0) {
      description += `, ${cropSummary.totalPlants} plants`;
      
      const topCrops = Object.entries(cropSummary.cropBreakdown)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 2)
        .map(([crop]) => crop);
      
      if (topCrops.length > 0) {
        description += ` (${topCrops.join(', ')})`;
      }
    }
    
    return description;
  }

  private getDominantCrops(gardenData: ParsedGardenData): string[] {
    return Object.entries(gardenData.cropSummary.cropBreakdown)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 3)
      .map(([crop]) => crop);
  }

  private countActivePlots(activePlots: boolean[][]): number {
    return activePlots.flat().filter(Boolean).length;
  }

  private isValidSavedLayout(data: any): data is SavedLayout {
    return (
      data &&
      typeof data === 'object' &&
      data.metadata &&
      typeof data.metadata.id === 'string' &&
      typeof data.metadata.name === 'string' &&
      typeof data.saveCode === 'string' &&
      data.gardenData &&
      typeof data.isFavorite === 'boolean'
    );
  }
}

// Export a default instance
export const layoutService = new LayoutService();

// Export utility functions
export {
  DEFAULT_CONFIG as LAYOUT_SERVICE_DEFAULT_CONFIG
};