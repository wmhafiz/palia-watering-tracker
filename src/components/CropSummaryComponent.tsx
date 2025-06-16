import React from 'react';
import { CropSummary } from '../types/layout';

interface CropSummaryComponentProps {
  cropSummary: CropSummary;
  onMarkAsWatered?: (cropType: string) => void;
  onMarkAllAsWatered?: () => void;
  className?: string;
  hideWateringStatus?: boolean;
}

/**
 * Maps crop names to image filenames (same as TileComponent)
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

export const CropSummaryComponent: React.FC<CropSummaryComponentProps> = ({
  cropSummary,
  onMarkAsWatered,
  onMarkAllAsWatered,
  className = '',
  hideWateringStatus = false
}) => {
  const getCropImage = (cropType: string): string => {
    const imageName = CROP_IMAGE_MAP[cropType];
    return imageName ? `/images/${imageName}` : '/images/65px-Wheat.webp';
  };

  const getSizeIcon = (size: 'single' | 'bush' | 'tree'): string => {
    switch (size) {
      case 'single': return '🌱';
      case 'bush': return '🌿';
      case 'tree': return '🌳';
      default: return '🌱';
    }
  };

  const getWateringStatus = (needingWater: number, total: number) => {
    if (needingWater === 0) {
      return { text: 'All watered', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (needingWater === total) {
      return { text: 'All need water', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else {
      return { text: 'Partially watered', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    }
  };

  // Sort crops by those needing water first, then alphabetically
  const sortedCrops = Object.entries(cropSummary.cropBreakdown).sort(([, a], [, b]) => {
    if (a.needingWater > 0 && b.needingWater === 0) return -1;
    if (a.needingWater === 0 && b.needingWater > 0) return 1;
    return a.needingWater === b.needingWater ? 0 : b.needingWater - a.needingWater;
  });

  if (cropSummary.totalPlants === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-500 mb-2">🌱 No crops planted</div>
        <p className="text-sm text-gray-400">
          Your garden is ready for planting!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Crop Summary
            </h3>
            <p className="text-sm text-gray-600">
              {hideWateringStatus
                ? `${cropSummary.totalPlants} plants`
                : `${cropSummary.totalPlants} plants • ${cropSummary.plantsNeedingWater} need water`
              }
            </p>
          </div>
          {!hideWateringStatus && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {cropSummary.wateringPercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">need water</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!hideWateringStatus && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Watering Progress</span>
              <span>
                {cropSummary.totalPlants - cropSummary.plantsNeedingWater} / {cropSummary.totalPlants} watered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, 100 - cropSummary.wateringPercentage)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!hideWateringStatus && cropSummary.plantsNeedingWater > 0 && onMarkAllAsWatered && (
          <div className="mt-3">
            <button
              onClick={onMarkAllAsWatered}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              💧 Mark All as Watered
            </button>
          </div>
        )}
      </div>

      {/* Crop List */}
      <div className="p-4">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {sortedCrops.map(([cropType, summary]) => {
            const status = getWateringStatus(summary.needingWater, summary.total);
            
            return (
              <div 
                key={cropType}
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Crop Image */}
                <div className="flex-shrink-0">
                  <img
                    src={getCropImage(cropType)}
                    alt={cropType}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/65px-Wheat.webp';
                    }}
                  />
                </div>

                {/* Crop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-800 truncate">
                      {cropType}
                    </h4>
                    <span className="text-xs" title={`${summary.size} crop`}>
                      {getSizeIcon(summary.size)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-600">
                      {summary.total} plant{summary.total !== 1 ? 's' : ''}
                    </span>
                    {!hideWateringStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                        {status.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Watering Status */}
                {!hideWateringStatus && (
                  <div className="flex-shrink-0 text-right">
                    {summary.needingWater > 0 ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-red-600">
                          {summary.needingWater} need water
                        </div>
                        {onMarkAsWatered && (
                          <button
                            onClick={() => onMarkAsWatered(cropType)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Mark Watered
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-green-600">
                        ✅ All watered
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        {sortedCrops.length > 3 && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Showing {sortedCrops.length} crop type{sortedCrops.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};