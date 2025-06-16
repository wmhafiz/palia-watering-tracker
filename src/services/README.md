# Enhanced Data Structures and Services

This document describes the enhanced data structures and services implemented for the Palia Watering Tracker's grid preview and save/load functionality.

## Overview

The implementation provides a comprehensive data layer for managing garden layouts with the following key components:

- **Enhanced TypeScript interfaces** for complete garden representation
- **Extended plannerService** with grid parsing capabilities
- **New layoutService** for persistent storage and management
- **Backward compatibility** with existing functionality

## Data Structures

### Core Types (`src/types/layout.ts`)

#### `GridTile`
Represents a single tile in the garden grid:
```typescript
interface GridTile {
  row: number;
  col: number;
  cropType: string | null;
  fertilizerType: string | null;
  needsWater: boolean;
  cropId?: string; // For multi-tile crops
  isActive: boolean;
}
```

#### `CropSummary`
Provides watering status analysis:
```typescript
interface CropSummary {
  totalPlants: number;
  plantsNeedingWater: number;
  cropBreakdown: {
    [cropType: string]: {
      total: number;
      needingWater: number;
      size: 'single' | 'bush' | 'tree';
      tilesPerPlant: number;
    };
  };
  wateringPercentage: number;
}
```

#### `ParsedGardenData`
Complete garden representation:
```typescript
interface ParsedGardenData {
  dimensions: { rows: number; columns: number };
  tiles: GridTile[][];
  activePlots: boolean[][];
  cropSummary: CropSummary;
  saveCode: string;
  version: string;
  settings?: string;
}
```

#### `SavedLayout`
Persistent layout storage:
```typescript
interface SavedLayout {
  metadata: LayoutMetadata;
  saveCode: string;
  gardenData: ParsedGardenData;
  notes?: string;
  isFavorite: boolean;
}
```

## Services

### Enhanced PlannerService (`src/services/plannerService.ts`)

#### New Functions

**`parseGridData(input: string): Promise<ParsedGardenData>`**
- Parses save codes into complete garden data structures
- Extracts grid layout, crop positions, and fertilizer information
- Generates comprehensive crop summaries

**`generateCropSummary(tiles: GridTile[][]): CropSummary`**
- Analyzes garden tiles for watering status
- Handles multi-tile crops correctly (bushes and trees)
- Calculates watering percentages and breakdowns

**`parseSaveCode(input: string): Promise<Plant[]>`**
- Enhanced version maintaining backward compatibility
- Uses new parsing internally with fallback to original implementation

#### Backward Compatibility
- Original `parsePaliaPlannerUrl()` function remains unchanged
- Existing code continues to work without modifications
- New functions provide enhanced capabilities when needed

### LayoutService (`src/services/layoutService.ts`)

#### Core Operations

**Save/Load Operations:**
```typescript
// Save a layout
const result = await layoutService.saveLayout(
  saveCode, 
  'My Garden', 
  { notes: 'Notes', tags: ['tag1'], isFavorite: true }
);

// Load a layout
const layout = layoutService.loadLayout(layoutId);
```

**Search and Filter:**
```typescript
const layouts = layoutService.searchLayouts({
  query: 'garden name',
  tags: ['efficient'],
  sortBy: 'plantCount',
  sortDirection: 'desc',
  favoritesOnly: true
});
```

**CRUD Operations:**
```typescript
// Update metadata
layoutService.updateLayoutMetadata(id, { name: 'New Name' });

// Delete layout
layoutService.deleteLayout(id);

// Get storage info
const info = layoutService.getStorageInfo();
```

**Export/Import:**
```typescript
// Export layouts
const exportData = layoutService.exportLayouts();

// Import layouts
const result = await layoutService.importLayouts(jsonData);
```

#### Features

- **Quota Management**: Configurable maximum layouts (default: 50)
- **Metadata Tracking**: Automatic generation of descriptions and dominant crops
- **Search & Filter**: Comprehensive search with multiple criteria
- **Storage Management**: localStorage with size tracking
- **Error Handling**: Comprehensive error types and validation
- **Export/Import**: JSON-based backup and restore

## Usage Examples

### Basic Grid Parsing
```typescript
import { parseGridData } from './services/plannerService';

const gardenData = await parseGridData(saveCode);
console.log(`Garden: ${gardenData.dimensions.rows}x${gardenData.dimensions.columns}`);
console.log(`Plants needing water: ${gardenData.cropSummary.plantsNeedingWater}`);
```

### Layout Management
```typescript
import { layoutService } from './services/layoutService';

// Save a layout
const result = await layoutService.saveLayout(
  saveCode,
  'Efficient Tomato Farm',
  {
    notes: 'Optimized for maximum tomato yield',
    tags: ['tomato', 'efficient', 'beginner'],
    isFavorite: true
  }
);

// Search layouts
const searchResult = layoutService.searchLayouts({
  tags: ['efficient'],
  minPlantCount: 10,
  sortBy: 'plantCount',
  sortDirection: 'desc'
});
```

### Error Handling
```typescript
const result = await layoutService.saveLayout(saveCode, name);
if (!result.success) {
  switch (result.error?.type) {
    case 'QUOTA_EXCEEDED':
      // Handle quota exceeded
      break;
    case 'INVALID_SAVE_CODE':
      // Handle invalid save code
      break;
    default:
      // Handle other errors
  }
}
```

## Configuration

### LayoutService Configuration
```typescript
import { LayoutService } from './services/layoutService';

const customService = new LayoutService({
  maxLayouts: 100,
  storagePrefix: 'custom_prefix',
  enableCompression: true
});
```

## Storage Structure

### localStorage Keys
- `palia_watering_tracker_layouts_data`: Main layout data
- `palia_watering_tracker_layouts_metadata`: Metadata cache (future use)

### Data Format
```json
{
  "version": "1.0",
  "exportDate": "2024-01-01T00:00:00.000Z",
  "layouts": [
    {
      "metadata": { /* LayoutMetadata */ },
      "saveCode": "v0.4_D-111...",
      "gardenData": { /* ParsedGardenData */ },
      "notes": "Optional notes",
      "isFavorite": false
    }
  ]
}
```

## Error Types

- `QUOTA_EXCEEDED`: Maximum layouts reached
- `INVALID_SAVE_CODE`: Save code parsing failed
- `LAYOUT_NOT_FOUND`: Layout ID not found
- `STORAGE_ERROR`: localStorage operation failed
- `VALIDATION_ERROR`: Data validation failed

## Testing

Run the demonstration:
```typescript
import { runAllDemonstrations } from './services/demo';
await runAllDemonstrations();
```

## Integration Notes

- **Palia-tools Compatibility**: Uses existing crop mappings and parsing logic
- **Performance**: Cached garden data for fast access
- **Memory Management**: Configurable storage limits
- **Type Safety**: Full TypeScript coverage with strict typing
- **Extensibility**: Modular design for easy feature additions

## Future Enhancements

- Compression for large layouts
- Cloud sync capabilities
- Layout sharing features
- Advanced search filters
- Batch operations
- Layout templates