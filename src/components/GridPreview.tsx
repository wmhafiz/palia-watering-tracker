import React, { useState, useMemo } from 'react';
import { ParsedGardenData, GridTile } from '../types/layout';
import { TileComponent } from './TileComponent';

interface GridPreviewProps {
  gardenData: ParsedGardenData;
  maxWidth?: number;
  maxHeight?: number;
  onTileClick?: (tile: GridTile) => void;
  showGrid?: boolean;
  className?: string;
}

export const GridPreview: React.FC<GridPreviewProps> = ({
  gardenData,
  maxWidth = 800,
  maxHeight = 600,
  onTileClick,
  showGrid = true,
  className = ''
}) => {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Calculate optimal tile size based on container constraints
  const tileSize = useMemo(() => {
    const { rows, columns } = gardenData.dimensions;
    const maxTileWidth = Math.floor(maxWidth / columns);
    const maxTileHeight = Math.floor(maxHeight / rows);
    const optimalSize = Math.min(maxTileWidth, maxTileHeight, 48); // Max 48px per tile
    return Math.max(optimalSize, 16); // Min 16px per tile
  }, [gardenData.dimensions, maxWidth, maxHeight]);

  // Calculate grid dimensions
  const gridWidth = gardenData.dimensions.columns * tileSize;
  const gridHeight = gardenData.dimensions.rows * tileSize;

  const handleTileClick = (tile: GridTile) => {
    if (onTileClick) {
      onTileClick(tile);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading garden preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Error loading garden preview</div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!gardenData.tiles || gardenData.tiles.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 mb-2">🌱 No garden data available</div>
          <p className="text-gray-400 text-sm">Import a garden layout to see the preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Garden Info Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          Garden Layout Preview
        </h3>
        <p className="text-sm text-gray-600">
          {gardenData.dimensions.rows} × {gardenData.dimensions.columns} plots
          {gardenData.cropSummary.totalPlants > 0 && (
            <span className="ml-2">
              • {gardenData.cropSummary.totalPlants} plants
            </span>
          )}
        </p>
      </div>

      {/* Grid Container */}
      <div className="relative">
        {/* Grid Background */}
        {showGrid && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${tileSize}px ${tileSize}px`
            }}
          />
        )}

        {/* Garden Grid */}
        <div 
          className="relative bg-gray-50 border-2 border-gray-300 rounded-lg overflow-hidden"
          style={{ 
            width: gridWidth, 
            height: gridHeight,
            minWidth: '200px',
            minHeight: '150px'
          }}
        >
          {gardenData.tiles.map((row, rowIndex) => (
            <div 
              key={rowIndex}
              className="flex"
              style={{ height: tileSize }}
            >
              {row.map((tile, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="flex-shrink-0"
                  style={{ width: tileSize, height: tileSize }}
                >
                  <TileComponent
                    tile={tile}
                    size={tileSize}
                    showTooltip={tileSize >= 24} // Only show tooltips for larger tiles
                    onClick={onTileClick ? handleTileClick : undefined}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600 max-w-md">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-50 border border-green-400 rounded-sm"></div>
          <span>Watered</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-50 border border-red-400 rounded-sm"></div>
          <span>Needs Water</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm"></div>
          <span>Empty Plot</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded-sm"></div>
          <span>Inactive</span>
        </div>
      </div>

      {/* Responsive Info */}
      {tileSize < 24 && (
        <p className="text-xs text-gray-500 text-center max-w-md">
          💡 Hover tooltips are hidden at this zoom level. 
          {gridWidth < maxWidth && gridHeight < maxHeight && (
            <span> Try expanding the preview area for more detail.</span>
          )}
        </p>
      )}
    </div>
  );
};