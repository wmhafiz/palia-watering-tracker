import React from 'react';
import { GridTile } from '../types/layout';

interface TileComponentProps {
  tile: GridTile;
  size?: number;
  showTooltip?: boolean;
  onClick?: (tile: GridTile) => void;
}

/**
 * Maps crop names to image filenames
 */
const CROP_IMAGE_MAP: { [key: string]: string } = {
  'Apple': '65px-Apple.webp',
  'Batterfly Bean': '65px-Batterfly_Beans.webp',
  'Blueberry': '65px-Blueberries.webp',
  'Bok Choy': '65px-Bok_Choy.webp',
  'Carrot': '65px-Carrot.webp',
  'Cotton': '65px-Cotton.webp',
  'Napa Cabbage': '65px-Napa_Cabbage.webp',
  'Onion': '65px-Onion.webp',
  'Potato': '65px-Potato.webp',
  'Rice': '65px-Rice.webp',
  'Rockhopper Pumpkin': '65px-Rockhopper_Pumpkin.webp',
  'Spicy Pepper': '65px-Spicy_Pepper.webp',
  'Tomato': '65px-Tomato.webp',
  'Wheat': '65px-Wheat.webp',
  'Corn': '65px-Wheat.webp', // Fallback to wheat for corn
};

/**
 * Fertilizer color mappings for visual indicators
 */
const FERTILIZER_COLORS: { [key: string]: string } = {
  'Speedy Gro': '#10B981', // Green
  'Quality Up': '#8B5CF6', // Purple
  'Weed Block': '#F59E0B', // Amber
  'Harvest Boost': '#EF4444', // Red
  'Hydrate Pro': '#3B82F6', // Blue
};

export const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  size = 32,
  showTooltip = true,
  onClick
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(tile);
    }
  };

  const getCropImage = (cropType: string): string => {
    const imageName = CROP_IMAGE_MAP[cropType];
    return imageName ? `/images/${imageName}` : '/images/65px-Wheat.webp'; // Fallback
  };

  const renderTileContent = () => {
    if (!tile.isActive) {
      // Inactive plot - show gray background
      return (
        <div 
          className="w-full h-full bg-gray-200 border border-gray-300 rounded-sm"
          style={{ width: size, height: size }}
        />
      );
    }

    if (!tile.cropType) {
      // Empty active plot - show soil background
      return (
        <div 
          className="w-full h-full bg-amber-100 border border-amber-300 rounded-sm"
          style={{ width: size, height: size }}
        />
      );
    }

    // Active plot with crop
    return (
      <div 
        className={`relative w-full h-full border-2 rounded-sm transition-all duration-200 ${
          tile.needsWater 
            ? 'border-red-400 bg-red-50' 
            : 'border-green-400 bg-green-50'
        } ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}`}
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        {/* Crop Image */}
        <img
          src={getCropImage(tile.cropType)}
          alt={tile.cropType}
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            // Fallback to wheat image if crop image fails to load
            const target = e.target as HTMLImageElement;
            target.src = '/images/65px-Wheat.webp';
          }}
        />
        
        {/* Fertilizer Indicator */}
        {tile.fertilizerType && tile.fertilizerType !== 'None' && (
          <div 
            className="absolute top-0 right-0 w-2 h-2 rounded-full border border-white"
            style={{ 
              backgroundColor: FERTILIZER_COLORS[tile.fertilizerType] || '#6B7280',
              width: Math.max(4, size * 0.125),
              height: Math.max(4, size * 0.125)
            }}
            title={tile.fertilizerType}
          />
        )}
        
        {/* Watering Status Indicator */}
        {tile.needsWater && (
          <div 
            className="absolute bottom-0 left-0 bg-blue-500 rounded-full border border-white"
            style={{ 
              width: Math.max(4, size * 0.125),
              height: Math.max(4, size * 0.125)
            }}
            title="Needs Water"
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const tileElement = (
    <div className="relative inline-block">
      {renderTileContent()}
    </div>
  );

  // Add tooltip if enabled and there's crop data
  if (showTooltip && tile.isActive && tile.cropType) {
    return (
      <div className="group relative">
        {tileElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="font-medium">{tile.cropType}</div>
          {tile.fertilizerType && tile.fertilizerType !== 'None' && (
            <div className="text-gray-300">Fertilizer: {tile.fertilizerType}</div>
          )}
          <div className={tile.needsWater ? 'text-red-300' : 'text-green-300'}>
            {tile.needsWater ? 'Needs Water' : 'Watered'}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      </div>
    );
  }

  return tileElement;
};