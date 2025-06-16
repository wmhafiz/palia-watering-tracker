import React, { useState, useMemo, useEffect } from 'react';
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
  maxWidth,
  maxHeight,
  onTileClick,
  showGrid = true,
  className = ''
}) => {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg'>('lg');

  // Detect screen size changes
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('sm');
      } else if (width < 1024) {
        setScreenSize('md');
      } else {
        setScreenSize('lg');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Calculate responsive dimensions and tile size
  const { tileSize, containerMaxWidth, containerMaxHeight } = useMemo(() => {
    const { rows, columns } = gardenData.dimensions;
    
    // Responsive container dimensions
    let containerWidth: number;
    let containerHeight: number;
    
    if (maxWidth && maxHeight) {
      // Use provided dimensions if available
      containerWidth = maxWidth;
      containerHeight = maxHeight;
    } else {
      // Responsive defaults based on screen size
      switch (screenSize) {
        case 'sm':
          containerWidth = Math.min(window.innerWidth - 32, 350); // 16px padding on each side
          containerHeight = Math.min(window.innerHeight * 0.4, 300);
          break;
        case 'md':
          containerWidth = Math.min(window.innerWidth - 64, 600); // 32px padding on each side
          containerHeight = Math.min(window.innerHeight * 0.5, 450);
          break;
        case 'lg':
        default:
          containerWidth = 800;
          containerHeight = 600;
          break;
      }
    }

    // Calculate optimal tile size
    const maxTileWidth = Math.floor(containerWidth / columns);
    const maxTileHeight = Math.floor(containerHeight / rows);
    
    // Responsive tile size limits
    const maxTileSize = screenSize === 'sm' ? 32 : screenSize === 'md' ? 40 : 48;
    const minTileSize = screenSize === 'sm' ? 12 : 16;
    
    const optimalSize = Math.min(maxTileWidth, maxTileHeight, maxTileSize);
    const finalTileSize = Math.max(optimalSize, minTileSize);

    return {
      tileSize: finalTileSize,
      containerMaxWidth: containerWidth,
      containerMaxHeight: containerHeight
    };
  }, [gardenData.dimensions, maxWidth, maxHeight, screenSize]);

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
    <div className={`w-full h-full ${className}`}>
      {/* Scrollable container with proper height constraints */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col items-center space-y-2 sm:space-y-4 min-h-full py-4">
          {/* Garden Info Header */}
          <div className="text-center px-4 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">
              Garden Layout Preview
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {gardenData.dimensions.rows} × {gardenData.dimensions.columns} plots
              {gardenData.cropSummary.totalPlants > 0 && (
                <span className="block sm:inline sm:ml-2">
                  • {gardenData.cropSummary.totalPlants} plants
                </span>
              )}
            </p>
          </div>

          {/* Grid Container - Responsive wrapper */}
          <div className="w-full flex justify-center px-2 sm:px-4 flex-shrink-0">
            <div className="relative" style={{ maxWidth: '100%' }}>
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
                className="relative bg-gray-50 border-2 border-gray-300 rounded-lg overflow-hidden mx-auto"
                style={{
                  width: gridWidth,
                  height: gridHeight,
                  minWidth: screenSize === 'sm' ? '200px' : '250px',
                  minHeight: screenSize === 'sm' ? '150px' : '200px',
                  maxWidth: '100%'
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
                          showTooltip={tileSize >= (screenSize === 'sm' ? 20 : 24)}
                          onClick={onTileClick ? handleTileClick : undefined}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend - Responsive layout */}
          <div className="w-full px-4 flex-shrink-0">
            <div className={`
              flex flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-600 max-w-full
              ${screenSize === 'sm' ? 'grid grid-cols-2 gap-2' : ''}
            `}>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-50 border border-green-400 rounded-sm flex-shrink-0"></div>
                <span className="whitespace-nowrap">Watered</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-50 border border-red-400 rounded-sm flex-shrink-0"></div>
                <span className="whitespace-nowrap">Needs Water</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm flex-shrink-0"></div>
                <span className="whitespace-nowrap">Empty Plot</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded-sm flex-shrink-0"></div>
                <span className="whitespace-nowrap">Inactive</span>
              </div>
            </div>
          </div>

          {/* Responsive Info */}
          {tileSize < (screenSize === 'sm' ? 20 : 24) && (
            <div className="px-4 flex-shrink-0">
              <p className="text-xs text-gray-500 text-center max-w-md mx-auto">
                💡 {screenSize === 'sm' ? 'Tooltips hidden on small screens' : 'Hover tooltips are hidden at this zoom level'}
                {screenSize !== 'sm' && gridWidth < containerMaxWidth && gridHeight < containerMaxHeight && (
                  <span> Try expanding the preview area for more detail.</span>
                )}
              </p>
            </div>
          )}

          {/* Spacer to ensure content doesn't get cut off */}
          <div className="flex-grow min-h-4"></div>
        </div>
      </div>
    </div>
  );
};