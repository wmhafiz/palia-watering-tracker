import React from 'react';
import { TrackedCrop } from '../types/unified';

interface CropWateringItemProps {
  /** The tracked crop data */
  trackedCrop: TrackedCrop;
  /** Crop data from crops.json for display */
  cropData?: any;
  /** Click handler for toggling watered state */
  onToggle: () => void;
  /** Optional click handler for the entire item */
  onClick?: () => void;
  /** Whether to show additional details */
  showDetails?: boolean;
}

export const CropWateringItem: React.FC<CropWateringItemProps> = ({
  trackedCrop,
  cropData,
  onToggle,
  onClick,
  showDetails = false
}) => {
  const { cropType, source, totalCount, isWatered, lastWateredAt, plantInstances } = trackedCrop;

  // Get crop display data
  const displayName = cropData?.name || cropType;
  const imageUrl = cropData?.picture_url;
  const harvestTime = cropData?.harvest_time;
  const baseValue = cropData?.base_value;
  const starValue = cropData?.star_value;
  const gardenBuff = cropData?.garden_buff;
  const group = cropData?.group;

  // Format last watered time
  const formatLastWatered = (date?: Date): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div
      className={`flex items-center space-x-3 py-2 border-b border-gray-200 last:border-b-0 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-800/20' : ''
      }`}
      onClick={onClick}
    >
      {/* Crop Image */}
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={displayName} 
            className="w-12 h-12 object-contain rounded bg-gray-100 border border-gray-300" 
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
            <span className="text-gray-500 text-xs">🌱</span>
          </div>
        )}
      </div>

      {/* Crop Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className="font-semibold text-gray-300 truncate">{displayName}</div>
          
          {/* Source indicator */}
          <span className={`px-2 py-1 text-xs rounded-full ${
            source === 'import' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {source === 'import' ? '📥 Imported' : '✋ Manual'}
          </span>

          {/* Count indicator for imported crops */}
          {totalCount > 1 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {totalCount} plants
            </span>
          )}
        </div>

        {/* Crop details */}
        {showDetails && cropData && (
          <div className="text-xs text-gray-400 flex flex-wrap gap-x-2 gap-y-1 mt-1">
            {harvestTime && <span>⏱ {harvestTime}</span>}
            {baseValue && starValue && <span>💰 {baseValue}/{starValue}</span>}
            {gardenBuff && <span>🌱 {gardenBuff}</span>}
            {group && <span>🏷 {group}</span>}
          </div>
        )}

        {/* Last watered info */}
        {isWatered && lastWateredAt && (
          <div className="text-xs text-green-400 mt-1">
            Watered {formatLastWatered(lastWateredAt)}
          </div>
        )}

        {/* Plant instances info for imported crops */}
        {source === 'import' && plantInstances.length > 0 && showDetails && (
          <div className="text-xs text-gray-400 mt-1">
            Plant IDs: {plantInstances.slice(0, 3).map(p => p.id).join(', ')}
            {plantInstances.length > 3 && ` +${plantInstances.length - 3} more`}
          </div>
        )}
      </div>

      {/* Watering Status Button */}
      <div className="flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
            isWatered
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-400 hover:border-blue-400'
          }`}
          aria-label={`${isWatered ? 'Mark as not watered' : 'Mark as watered'}: ${displayName}`}
        >
          {isWatered ? '✓' : '○'}
        </button>
      </div>
    </div>
  );
};

/**
 * Compact version for smaller displays
 */
export const CompactCropWateringItem: React.FC<CropWateringItemProps> = ({
  trackedCrop,
  cropData,
  onToggle,
  onClick
}) => {
  const { cropType, source, totalCount, isWatered } = trackedCrop;
  const displayName = cropData?.name || cropType;
  const imageUrl = cropData?.picture_url;

  return (
    <div
      className={`flex items-center space-x-2 py-1 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-800/20' : ''
      }`}
      onClick={onClick}
    >
      {/* Compact Image */}
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={displayName} 
            className="w-8 h-8 object-contain rounded" 
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-500 text-xs">🌱</span>
          </div>
        )}
      </div>

      {/* Compact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-300 truncate">{displayName}</span>
          {totalCount > 1 && (
            <span className="text-xs text-gray-400">({totalCount})</span>
          )}
          <span className={`w-2 h-2 rounded-full ${
            source === 'import' ? 'bg-green-400' : 'bg-blue-400'
          }`} title={source === 'import' ? 'Imported' : 'Manual'} />
        </div>
      </div>

      {/* Compact Status */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-colors ${
          isWatered
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-400 hover:border-blue-400'
        }`}
      >
        {isWatered ? '✓' : '○'}
      </button>
    </div>
  );
};