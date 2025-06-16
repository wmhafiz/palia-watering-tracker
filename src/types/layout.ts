/**
 * Enhanced data structures for grid preview and save/load functionality
 * Based on palia-tools garden planner data structures
 */

/**
 * Represents a single tile in the garden grid
 */
export interface GridTile {
  /** Position in the grid */
  row: number;
  col: number;
  /** Crop planted on this tile (null if empty) */
  cropType: string | null;
  /** Fertilizer applied to this tile (null if none) */
  fertilizerType: string | null;
  /** Whether this tile needs watering */
  needsWater: boolean;
  /** Unique identifier for multi-tile crops (bushes/trees) */
  cropId?: string;
  /** Whether this tile is part of an active plot */
  isActive: boolean;
}

/**
 * Summary of crops that need watering
 */
export interface CropSummary {
  /** Total number of individual plants */
  totalPlants: number;
  /** Number of plants that need water */
  plantsNeedingWater: number;
  /** Breakdown by crop type */
  cropBreakdown: {
    [cropType: string]: {
      /** Total count of this crop type */
      total: number;
      /** Count needing water */
      needingWater: number;
      /** Crop size (single, bush, tree) */
      size: 'single' | 'bush' | 'tree';
      /** Number of tiles per plant */
      tilesPerPlant: number;
    };
  };
  /** Percentage of crops needing water */
  wateringPercentage: number;
}

/**
 * Complete parsed garden data from save code
 */
export interface ParsedGardenData {
  /** Garden dimensions */
  dimensions: {
    rows: number;
    columns: number;
  };
  /** All tiles in the garden grid */
  tiles: GridTile[][];
  /** Active plots configuration */
  activePlots: boolean[][];
  /** Summary of crops needing water */
  cropSummary: CropSummary;
  /** Original save code */
  saveCode: string;
  /** Version of the save format */
  version: string;
  /** Settings information if available */
  settings?: string;
}

/**
 * Metadata for saved layouts
 */
export interface LayoutMetadata {
  /** Unique identifier */
  id: string;
  /** User-provided name */
  name: string;
  /** Auto-generated description */
  description: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  lastModified: Date;
  /** Number of active plots */
  plotCount: number;
  /** Total number of plants */
  plantCount: number;
  /** Dominant crop types (top 3) */
  dominantCrops: string[];
  /** Garden dimensions */
  dimensions: {
    rows: number;
    columns: number;
  };
  /** Tags for categorization */
  tags: string[];
}

/**
 * Saved layout for persistent storage
 */
export interface SavedLayout {
  /** Layout metadata */
  metadata: LayoutMetadata;
  /** Original save code */
  saveCode: string;
  /** Parsed garden data (cached for performance) */
  gardenData: ParsedGardenData;
  /** User notes */
  notes?: string;
  /** Whether this is marked as favorite */
  isFavorite: boolean;
}

/**
 * Storage quota and management info
 */
export interface StorageInfo {
  /** Current number of saved layouts */
  currentCount: number;
  /** Maximum allowed layouts */
  maxCount: number;
  /** Available slots */
  availableSlots: number;
  /** Total storage used (in bytes) */
  storageUsed: number;
  /** Estimated storage limit (in bytes) */
  storageLimit: number;
}

/**
 * Layout service configuration
 */
export interface LayoutServiceConfig {
  /** Maximum number of layouts to store */
  maxLayouts: number;
  /** Storage key prefix */
  storagePrefix: string;
  /** Whether to enable compression */
  enableCompression: boolean;
}

/**
 * Error types for layout operations
 */
export enum LayoutError {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_SAVE_CODE = 'INVALID_SAVE_CODE',
  LAYOUT_NOT_FOUND = 'LAYOUT_NOT_FOUND',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Result type for layout operations
 */
export interface LayoutOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: LayoutError;
    message: string;
    details?: any;
  };
}

/**
 * Search and filter options for layouts
 */
export interface LayoutSearchOptions {
  /** Search query for name/description */
  query?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by crop types */
  cropTypes?: string[];
  /** Sort by field */
  sortBy?: 'name' | 'createdAt' | 'lastModified' | 'plantCount' | 'plotCount';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Show only favorites */
  favoritesOnly?: boolean;
  /** Minimum plant count */
  minPlantCount?: number;
  /** Maximum plant count */
  maxPlantCount?: number;
}