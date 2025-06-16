/**
 * Demonstration of the enhanced data structures and services
 * This file shows how to use the new layout and planner services
 */

import { parseGridData, generateCropSummary, parseSaveCode } from './plannerService';
import { layoutService } from './layoutService';
import { ParsedGardenData, SavedLayout, LayoutSearchOptions } from '../types/layout';

// Sample save code for demonstration (3x3 garden with mixed crops)
const SAMPLE_SAVE_CODE = 'v0.4_D-111-111-111_CR-TTTTTTTTT-PPPPPPPPP-AAAAAAAAA-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN-NNNNNNNNN';

/**
 * Demonstrates parsing garden data with the new enhanced functions
 */
export async function demonstrateGridParsing(): Promise<void> {
  console.log('🔍 Demonstrating Grid Parsing...');
  
  try {
    // Parse complete garden data
    const gardenData: ParsedGardenData = await parseGridData(SAMPLE_SAVE_CODE);
    
    console.log('📐 Garden Dimensions:', gardenData.dimensions);
    console.log('🌱 Total Plants:', gardenData.cropSummary.totalPlants);
    console.log('💧 Plants Needing Water:', gardenData.cropSummary.plantsNeedingWater);
    console.log('📊 Watering Percentage:', `${gardenData.cropSummary.wateringPercentage}%`);
    console.log('🌾 Crop Breakdown:', gardenData.cropSummary.cropBreakdown);
    
    // Demonstrate backward compatibility
    const plants = await parseSaveCode(SAMPLE_SAVE_CODE);
    console.log('🔄 Backward Compatible Plants:', plants.length);
    
  } catch (error) {
    console.error('❌ Error parsing garden data:', error);
  }
}

/**
 * Demonstrates saving and managing layouts
 */
export async function demonstrateLayoutManagement(): Promise<void> {
  console.log('💾 Demonstrating Layout Management...');
  
  try {
    // Save a new layout
    const saveResult = await layoutService.saveLayout(
      SAMPLE_SAVE_CODE,
      'My Awesome Garden',
      {
        notes: 'This is a mixed crop garden with tomatoes, potatoes, and apple trees.',
        tags: ['mixed', 'efficient', 'beginner-friendly'],
        isFavorite: true
      }
    );
    
    if (saveResult.success && saveResult.data) {
      const layout = saveResult.data;
      console.log('✅ Layout saved successfully!');
      console.log('📋 Layout ID:', layout.metadata.id);
      console.log('📝 Layout Name:', layout.metadata.name);
      console.log('📊 Plant Count:', layout.metadata.plantCount);
      console.log('🏷️ Tags:', layout.metadata.tags);
      
      // Load the layout back
      const loadResult = layoutService.loadLayout(layout.metadata.id);
      if (loadResult.success) {
        console.log('📂 Layout loaded successfully!');
      }
      
      // Update layout metadata
      const updateResult = layoutService.updateLayoutMetadata(layout.metadata.id, {
        name: 'Updated Garden Name',
        tags: ['mixed', 'efficient', 'updated']
      });
      
      if (updateResult.success) {
        console.log('✏️ Layout updated successfully!');
      }
      
      // Search layouts
      const searchOptions: LayoutSearchOptions = {
        query: 'garden',
        tags: ['mixed'],
        sortBy: 'plantCount',
        sortDirection: 'desc'
      };
      
      const searchResult = layoutService.searchLayouts(searchOptions);
      if (searchResult.success) {
        console.log('🔍 Found layouts:', searchResult.data?.length);
      }
      
      // Get storage info
      const storageInfo = layoutService.getStorageInfo();
      console.log('💽 Storage Info:');
      console.log('  - Current layouts:', storageInfo.currentCount);
      console.log('  - Available slots:', storageInfo.availableSlots);
      console.log('  - Storage used:', `${Math.round(storageInfo.storageUsed / 1024)} KB`);
      
    } else {
      console.error('❌ Failed to save layout:', saveResult.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Error in layout management:', error);
  }
}

/**
 * Demonstrates export/import functionality
 */
export async function demonstrateExportImport(): Promise<void> {
  console.log('📤📥 Demonstrating Export/Import...');
  
  try {
    // Save multiple layouts for export
    await layoutService.saveLayout(SAMPLE_SAVE_CODE, 'Garden 1', { tags: ['export-demo'] });
    await layoutService.saveLayout(SAMPLE_SAVE_CODE, 'Garden 2', { tags: ['export-demo'] });
    
    // Export layouts
    const exportResult = layoutService.exportLayouts();
    if (exportResult.success && exportResult.data) {
      console.log('📤 Export successful! Data size:', exportResult.data.length, 'characters');
      
      // Clear layouts
      layoutService.clearAllLayouts();
      console.log('🗑️ Layouts cleared');
      
      // Import layouts back
      const importResult = await layoutService.importLayouts(exportResult.data);
      if (importResult.success) {
        console.log('📥 Import successful! Imported', importResult.data, 'layouts');
      }
    }
    
  } catch (error) {
    console.error('❌ Error in export/import:', error);
  }
}

/**
 * Demonstrates error handling and validation
 */
export async function demonstrateErrorHandling(): Promise<void> {
  console.log('⚠️ Demonstrating Error Handling...');
  
  try {
    // Try to parse invalid save code
    const invalidResult = await parseGridData('invalid-save-code');
    console.log('This should not execute');
  } catch (error) {
    console.log('✅ Correctly caught parsing error:', (error as Error).message);
  }
  
  // Try to load non-existent layout
  const loadResult = layoutService.loadLayout('non-existent-id');
  if (!loadResult.success) {
    console.log('✅ Correctly handled missing layout:', loadResult.error?.type);
  }
  
  // Try to exceed quota (using a test service with low limit)
  const testService = new (require('./layoutService').LayoutService)({ maxLayouts: 1 });
  
  const result1 = await testService.saveLayout(SAMPLE_SAVE_CODE, 'Layout 1');
  const result2 = await testService.saveLayout(SAMPLE_SAVE_CODE, 'Layout 2');
  
  if (result1.success && !result2.success) {
    console.log('✅ Correctly enforced quota limit:', result2.error?.type);
  }
}

/**
 * Run all demonstrations
 */
export async function runAllDemonstrations(): Promise<void> {
  console.log('🚀 Starting Enhanced Data Structures Demo...\n');
  
  await demonstrateGridParsing();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateLayoutManagement();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateExportImport();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateErrorHandling();
  console.log('\n🎉 Demo completed successfully!');
}

// Export individual functions for selective testing
export {
  SAMPLE_SAVE_CODE
};