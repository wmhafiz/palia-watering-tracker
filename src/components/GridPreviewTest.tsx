import React, { useState, useEffect } from 'react';
import { GridPreview } from './GridPreview';
import { parseGridData } from '../services/plannerService';
import { ParsedGardenData } from '../types/layout';

// Sample save code from demo.ts
const SAMPLE_SAVE_CODE = 'v0.4_D-111-111-111_CR-TTTTTTTTT-PPPPPPPPP-AAAAAAAAA-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN';

export const GridPreviewTest: React.FC = () => {
  const [gardenData, setGardenData] = useState<ParsedGardenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDemoData = async () => {
      try {
        setLoading(true);
        const data = await parseGridData(SAMPLE_SAVE_CODE);
        setGardenData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demo data');
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading demo garden data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading demo data: {error}</p>
        </div>
      </div>
    );
  }

  if (!gardenData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <p>No garden data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Responsive GridPreview Test
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              This demonstrates the responsive GridPreview component across different screen sizes.
              Try resizing your browser window to see how it adapts!
            </p>
          </div>

          {/* Screen Size Indicator */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">Current breakpoint: </span>
              <span className="sm:hidden">Small (&lt; 640px)</span>
              <span className="hidden sm:inline lg:hidden">Medium (640px - 1024px)</span>
              <span className="hidden lg:inline">Large (≥ 1024px)</span>
            </div>
          </div>

          {/* Responsive GridPreview */}
          <GridPreview
            gardenData={gardenData}
            showGrid={true}
            className="w-full"
          />

          {/* Save/Load Layout Buttons - Now visible on all screen sizes */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              💾 Save Layout
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              📂 Load Layout
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              📤 Export Layout
            </button>
          </div>

          {/* Responsive Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Responsive Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Small screens:</strong> Compact tiles (12-32px), 2-column legend, optimized spacing</li>
              <li>• <strong>Medium screens:</strong> Balanced tiles (16-40px), flexible legend layout</li>
              <li>• <strong>Large screens:</strong> Full-size tiles (16-48px), horizontal legend</li>
              <li>• <strong>All sizes:</strong> Save/Load buttons are now always visible and accessible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};