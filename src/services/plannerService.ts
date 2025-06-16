import { v4 as uuidv4 } from 'uuid';
import { Plant } from '../types/index';
import {
  ParsedGardenData,
  GridTile,
  CropSummary
} from '../types/layout';

/**
 * Correct crop code mappings from the Palia Garden Planner v0.4
 * Based on palia-tools/assets/scripts/garden-planner/enums/cropCode.ts
 */
const CROP_MAPPINGS: { [key: string]: string } = {
  'N': 'None',
  'T': 'Tomato',
  'P': 'Potato',
  'R': 'Rice',
  'W': 'Wheat',
  'C': 'Carrot',
  'O': 'Onion',
  'Co': 'Cotton',
  'B': 'Blueberry',
  'A': 'Apple',
  'Cr': 'Corn',
  'S': 'Spicy Pepper',
  'Cb': 'Napa Cabbage',
  'Bk': 'Bok Choy',
  'Pm': 'Rockhopper Pumpkin',
  'Bt': 'Batterfly Bean'
};

/**
 * Fertilizer code mappings from the Palia Garden Planner
 */
const FERTILIZER_MAPPINGS: { [key: string]: string } = {
  'N': 'None',
  'S': 'Speedy Gro',
  'Q': 'Quality Up',
  'W': 'Weed Block',
  'H': 'Harvest Boost',
  'Y': 'Hydrate Pro'
};

/**
 * Crop size definitions for proper counting
 */
const CROP_SIZES: { [key: string]: { size: 'single' | 'bush' | 'tree', tiles: number } } = {
  'Tomato': { size: 'single', tiles: 1 },
  'Potato': { size: 'single', tiles: 1 },
  'Rice': { size: 'single', tiles: 1 },
  'Wheat': { size: 'single', tiles: 1 },
  'Carrot': { size: 'single', tiles: 1 },
  'Onion': { size: 'single', tiles: 1 },
  'Cotton': { size: 'single', tiles: 1 },
  'Corn': { size: 'single', tiles: 1 },
  'Napa Cabbage': { size: 'single', tiles: 1 },
  'Bok Choy': { size: 'single', tiles: 1 },
  'Blueberry': { size: 'bush', tiles: 4 },
  'Spicy Pepper': { size: 'bush', tiles: 4 },
  'Batterfly Bean': { size: 'bush', tiles: 4 },
  'Rockhopper Pumpkin': { size: 'bush', tiles: 4 },
  'Apple': { size: 'tree', tiles: 9 }
};

/**
 * Parses crop codes from a plot using the exact garden planner regex
 * @param plotCropString - String containing crop codes for one plot (e.g., "OOCrCrTCoCoPO")
 * @returns Array of crop names found in the plot
 */
function parseCropCodesFromPlot(plotCropString: string): string[] {
  console.log(`🔍 Parsing plot: "${plotCropString}"`);
  
  // Use the exact regex from garden.ts: /[A-Z](?:\.[A-Z]|[^A-Z])*/g
  const regex = /[A-Z](?:\.[A-Z]|[^A-Z])*/g;
  const cropCodes = plotCropString.match(regex);
  
  if (!cropCodes) {
    console.log(`⚠️ No crop codes found in plot: "${plotCropString}"`);
    return [];
  }
  
  console.log(`🔍 Found ${cropCodes.length} crop codes:`, cropCodes);
  
  const crops: string[] = [];
  
  // Process each tile in the plot (should be 9 tiles per plot)
  for (let tileIndex = 0; tileIndex < cropCodes.length; tileIndex++) {
    const cropCodeWithFert = cropCodes[tileIndex];
    const [cropCode, fertiliserCode] = cropCodeWithFert.split('.');
    
    console.log(`  🔸 Tile ${tileIndex + 1}: "${cropCodeWithFert}" -> crop: "${cropCode}", fert: "${fertiliserCode || 'none'}"`);
    
    if (CROP_MAPPINGS[cropCode]) {
      const cropName = CROP_MAPPINGS[cropCode];
      if (cropName !== 'None') {
        crops.push(cropName);
        console.log(`    ✅ Added ${cropName}`);
      }
    } else {
      console.log(`    ❌ Unknown crop code: "${cropCode}"`);
    }
  }
  
  return crops;
}

/**
 * Counts crops properly, handling multi-tile crops (bushes and trees)
 * @param allCropTiles - Array of all crop names from individual tiles
 * @returns Object with proper crop counts
 */
function countCropsCorrectly(allCropTiles: string[]): { [key: string]: number } {
  console.log(`📊 Counting crops from ${allCropTiles.length} tiles...`);
  
  const tileCounts: { [key: string]: number } = {};
  
  // Count all tiles first
  for (const cropName of allCropTiles) {
    tileCounts[cropName] = (tileCounts[cropName] || 0) + 1;
  }
  
  console.log(`🔢 Tile counts:`, tileCounts);
  
  // Convert tile counts to plant counts based on crop size
  const plantCounts: { [key: string]: number } = {};
  
  for (const [cropName, tileCount] of Object.entries(tileCounts)) {
    const cropSize = CROP_SIZES[cropName];
    if (cropSize) {
      const plantCount = Math.floor(tileCount / cropSize.tiles);
      if (plantCount > 0) {
        plantCounts[cropName] = plantCount;
        console.log(`🌱 ${cropName}: ${tileCount} tiles ÷ ${cropSize.tiles} tiles/plant = ${plantCount} plants`);
      }
    } else {
      console.log(`⚠️ Unknown crop size for: ${cropName}`);
      plantCounts[cropName] = tileCount; // Fallback to tile count
    }
  }
  
  return plantCounts;
}

/**
 * Parses garden save code or URL and extracts plant data
 * @param input - Either a direct save code or palia-garden-planner.vercel.app URL
 * @returns Promise<Plant[]> - Array of Plant objects parsed from the input
 * @throws Error if input is invalid or parsing fails
 */
export async function parsePaliaPlannerUrl(input: string): Promise<Plant[]> {
  console.log(`🚀 Starting to parse input: ${input.substring(0, 100)}...`);
  
  let saveCode = '';
  
  // Determine if input is URL or direct save code
  if (input.startsWith('http')) {
    try {
      const urlObj = new URL(input);
      
      // Check if it's a palia-garden-planner.vercel.app URL
      if (urlObj.hostname !== 'palia-garden-planner.vercel.app') {
        throw new Error('Invalid Palia Planner URL.');
      }
      
      // Extract layout parameter
      const layoutParam = urlObj.searchParams.get('layout');
      if (!layoutParam) {
        throw new Error('Invalid Palia Planner URL - no layout parameter found.');
      }
      
      saveCode = layoutParam;
      console.log(`📋 Extracted save code from URL: ${saveCode}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid Palia Planner URL')) {
        throw error;
      }
      throw new Error('Invalid URL format.');
    }
  } else {
    // Direct save code
    saveCode = input;
    console.log(`📋 Using direct save code: ${saveCode}`);
  }
  
  try {
    // Parse the save code format: v{version}_{dimensionInfo}_{cropInfo}_{settingsInfo}
    const sections = saveCode.split('_');
    console.log(`📊 Save code sections:`, sections);
    
    if (sections.length < 3) {
      throw new Error('Invalid save code format - insufficient sections.');
    }
    
    const version = sections[0];
    const dimensionInfo = sections[1];
    const cropInfo = sections[2];
    const settingsInfo = sections[3] || '';
    
    console.log(`📝 Version: ${version}`);
    console.log(`📐 Dimensions: ${dimensionInfo}`);
    console.log(`🌱 Crops: ${cropInfo}`);
    console.log(`⚙️ Settings: ${settingsInfo}`);
    
    // Validate version
    if (!version.startsWith('v')) {
      throw new Error('Invalid save code format - missing version prefix.');
    }
    
    // Extract crop data
    let cropsSection = '';
    if (cropInfo.startsWith('CR-')) {
      cropsSection = cropInfo.substring(3); // Remove 'CR-' prefix
    } else {
      throw new Error('Invalid save code format - crops section should start with CR-.');
    }
    
    console.log(`🌾 Crops section after removing CR-: ${cropsSection}`);
    
    // Split crops section by dashes to get individual rows
    const rows = cropsSection.split('-');
    console.log(`📋 Crop rows:`, rows);
    
    const plants: Plant[] = [];
    
    // Collect all crop tiles first
    const allCropTiles: string[] = [];
    
    // Process each row to extract crop codes
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      console.log(`🔄 Processing plot ${rowIndex + 1}/${rows.length}: "${row}"`);
      
      // Process all plots, including Apple plots (AAAAAAAAA)
      const plotCrops = parseCropCodesFromPlot(row);
      allCropTiles.push(...plotCrops);
    }
    
    // Count crops correctly (handling multi-tile crops)
    const cropCounts = countCropsCorrectly(allCropTiles);
    
    console.log(`📊 Final crop counts:`, cropCounts);
    
    // Convert counts to Plant objects
    for (const [cropName, count] of Object.entries(cropCounts)) {
      for (let i = 0; i < count; i++) {
        const plant: Plant = {
          id: uuidv4(),
          name: cropName,
          needsWater: false
        };
        plants.push(plant);
      }
    }
    
    console.log(`✅ Successfully parsed ${plants.length} plants`);
    return plants;
    
  } catch (error) {
    console.error(`❌ Parsing error:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse garden data.');
  }
}

/**
 * Parses garden save code and extracts complete garden layout data
 * @param input - Either a direct save code or palia-garden-planner.vercel.app URL
 * @returns Promise<ParsedGardenData> - Complete garden data structure
 * @throws Error if input is invalid or parsing fails
 */
export async function parseGridData(input: string): Promise<ParsedGardenData> {
  console.log(`🔍 Parsing grid data from input: ${input.substring(0, 100)}...`);
  
  let saveCode = '';
  
  // Extract save code from URL or use direct input
  if (input.startsWith('http')) {
    try {
      const urlObj = new URL(input);
      
      if (urlObj.hostname !== 'palia-garden-planner.vercel.app') {
        throw new Error('Invalid Palia Planner URL.');
      }
      
      const layoutParam = urlObj.searchParams.get('layout');
      if (!layoutParam) {
        throw new Error('Invalid Palia Planner URL - no layout parameter found.');
      }
      
      saveCode = layoutParam;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid Palia Planner URL')) {
        throw error;
      }
      throw new Error('Invalid URL format.');
    }
  } else {
    saveCode = input;
  }
  
  try {
    // Parse the save code format: v{version}_{dimensionInfo}_{cropInfo}_{settingsInfo}
    const sections = saveCode.split('_');
    
    if (sections.length < 3) {
      throw new Error('Invalid save code format - insufficient sections.');
    }
    
    const version = sections[0];
    const dimensionInfo = sections[1];
    const cropInfo = sections[2];
    const settingsInfo = sections[3] || '';
    
    console.log(`📝 Version: ${version}`);
    console.log(`📐 Dimensions: ${dimensionInfo}`);
    console.log(`🌱 Crops: ${cropInfo}`);
    
    // Validate version
    if (!version.startsWith('v')) {
      throw new Error('Invalid save code format - missing version prefix.');
    }
    
    // Parse dimensions - these represent plot dimensions, not tile dimensions
    const plotDimensions = dimensionInfo.split('-').slice(1); // Remove first empty element
    const plotRows = plotDimensions.length;
    const plotColumns = plotDimensions[0].length;
    
    // Calculate actual tile dimensions (each plot is 3x3 tiles)
    const tileRows = plotRows * 3;
    const tileColumns = plotColumns * 3;
    
    console.log(`📐 Plot dimensions: ${plotRows}x${plotColumns} plots`);
    console.log(`📐 Tile dimensions: ${tileRows}x${tileColumns} tiles`);
    
    // Parse active plots
    const activePlots: boolean[][] = [];
    for (let i = 0; i < plotRows; i++) {
      activePlots[i] = [];
      for (let j = 0; j < plotColumns; j++) {
        activePlots[i][j] = plotDimensions[i][j] === '1';
      }
    }
    
    // Extract and parse crop data
    let cropsSection = '';
    if (cropInfo.startsWith('CR-')) {
      cropsSection = cropInfo.substring(3);
    } else {
      throw new Error('Invalid save code format - crops section should start with CR-.');
    }
    
    const cropRows = cropsSection.split('-');
    console.log(`🌾 Found ${cropRows.length} crop plot strings`);
    
    // Initialize tiles grid with actual tile dimensions
    const tiles: GridTile[][] = [];
    for (let i = 0; i < tileRows; i++) {
      tiles[i] = [];
      for (let j = 0; j < tileColumns; j++) {
        const plotRow = Math.floor(i / 3);
        const plotCol = Math.floor(j / 3);
        const isPlotActive = plotRow < plotRows && plotCol < plotColumns && activePlots[plotRow][plotCol];
        
        tiles[i][j] = {
          row: i,
          col: j,
          cropType: null,
          fertilizerType: null,
          needsWater: false, // Don't set random watering status - only relevant for tracked crops
          isActive: isPlotActive
        };
      }
    }
    
    // Parse crop data for each active plot
    let plotIndex = 0;
    for (let plotRow = 0; plotRow < plotRows; plotRow++) {
      for (let plotCol = 0; plotCol < plotColumns; plotCol++) {
        if (activePlots[plotRow][plotCol] && plotIndex < cropRows.length) {
          const plotCropString = cropRows[plotIndex];
          console.log(`🔄 Processing plot [${plotRow},${plotCol}] (index ${plotIndex}): "${plotCropString}"`);
          
          const regex = /[A-Z](?:\.[A-Z]|[^A-Z])*/g;
          const cropCodes = plotCropString.match(regex);
          
          if (cropCodes && cropCodes.length === 9) { // Each plot should have 9 tiles
            // Map each crop code to its corresponding tile in the 3x3 plot
            let tileIndex = 0;
            for (let pi = 0; pi < 3; pi++) {
              for (let pj = 0; pj < 3; pj++) {
                const tileRow = plotRow * 3 + pi;
                const tileCol = plotCol * 3 + pj;
                
                if (tileRow < tileRows && tileCol < tileColumns && tileIndex < cropCodes.length) {
                  const cropCodeWithFert = cropCodes[tileIndex];
                  const [cropCode, fertiliserCode] = cropCodeWithFert.split('.');
                  
                  const tile = tiles[tileRow][tileCol];
                  
                  if (CROP_MAPPINGS[cropCode] && CROP_MAPPINGS[cropCode] !== 'None') {
                    tile.cropType = CROP_MAPPINGS[cropCode];
                    
                    // Generate crop ID for multi-tile crops
                    const cropSize = CROP_SIZES[CROP_MAPPINGS[cropCode]];
                    if (cropSize && cropSize.size !== 'single') {
                      tile.cropId = uuidv4();
                    }
                    
                    console.log(`  🔸 Tile [${tileRow},${tileCol}]: ${CROP_MAPPINGS[cropCode]}`);
                  }
                  
                  if (fertiliserCode && FERTILIZER_MAPPINGS[fertiliserCode] && FERTILIZER_MAPPINGS[fertiliserCode] !== 'None') {
                    tile.fertilizerType = FERTILIZER_MAPPINGS[fertiliserCode];
                    console.log(`  🧪 Fertilizer: ${FERTILIZER_MAPPINGS[fertiliserCode]}`);
                  }
                }
                tileIndex++;
              }
            }
          } else {
            console.log(`⚠️ Plot ${plotIndex} has ${cropCodes?.length || 0} crop codes, expected 9`);
          }
          plotIndex++;
        }
      }
    }
    
    // Generate crop summary
    const cropSummary = generateCropSummary(tiles);
    
    const gardenData: ParsedGardenData = {
      dimensions: { rows: tileRows, columns: tileColumns },
      tiles,
      activePlots,
      cropSummary,
      saveCode,
      version,
      settings: settingsInfo || undefined
    };
    
    console.log(`✅ Successfully parsed garden data: ${tileRows}x${tileColumns} tiles (${plotRows}x${plotColumns} plots) with ${cropSummary.totalPlants} plants`);
    return gardenData;
    
  } catch (error) {
    console.error(`❌ Grid parsing error:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse garden grid data.');
  }
}

/**
 * Generates a summary of crops and their watering status
 * @param tiles - 2D array of garden tiles
 * @returns CropSummary with watering statistics
 */
export function generateCropSummary(tiles: GridTile[][]): CropSummary {
  const cropBreakdown: CropSummary['cropBreakdown'] = {};
  let totalPlants = 0;
  let plantsNeedingWater = 0;
  
  // Count all crop tiles
  const cropTiles: string[] = [];
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.cropType && tile.cropType !== 'None' && tile.isActive) {
        cropTiles.push(tile.cropType);
      }
    }
  }
  
  // Count tiles by crop type
  const tileCounts: { [key: string]: { total: number; needingWater: number } } = {};
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.cropType && tile.cropType !== 'None' && tile.isActive) {
        if (!tileCounts[tile.cropType]) {
          tileCounts[tile.cropType] = { total: 0, needingWater: 0 };
        }
        tileCounts[tile.cropType].total++;
        if (tile.needsWater) {
          tileCounts[tile.cropType].needingWater++;
        }
      }
    }
  }
  
  // Convert tile counts to plant counts
  for (const [cropType, counts] of Object.entries(tileCounts)) {
    const cropSize = CROP_SIZES[cropType];
    if (cropSize) {
      const plantCount = Math.floor(counts.total / cropSize.tiles);
      const plantsNeedingWaterCount = Math.floor(counts.needingWater / cropSize.tiles);
      
      if (plantCount > 0) {
        cropBreakdown[cropType] = {
          total: plantCount,
          needingWater: plantsNeedingWaterCount,
          size: cropSize.size,
          tilesPerPlant: cropSize.tiles
        };
        
        totalPlants += plantCount;
        plantsNeedingWater += plantsNeedingWaterCount;
      }
    }
  }
  
  const wateringPercentage = totalPlants > 0 ? (plantsNeedingWater / totalPlants) * 100 : 0;
  
  return {
    totalPlants,
    plantsNeedingWater,
    cropBreakdown,
    wateringPercentage: Math.round(wateringPercentage * 100) / 100
  };
}

/**
 * Enhanced version of parsePaliaPlannerUrl that maintains backward compatibility
 * but uses the new parseGridData function internally
 * @param input - Either a direct save code or palia-garden-planner.vercel.app URL
 * @returns Promise<Plant[]> - Array of Plant objects for backward compatibility
 */
export async function parseSaveCode(input: string): Promise<Plant[]> {
  try {
    const gardenData = await parseGridData(input);
    const plants: Plant[] = [];
    
    // Convert crop summary to Plant objects for backward compatibility
    for (const [cropType, summary] of Object.entries(gardenData.cropSummary.cropBreakdown)) {
      for (let i = 0; i < summary.total; i++) {
        plants.push({
          id: uuidv4(),
          name: cropType,
          needsWater: false
        });
      }
    }
    
    return plants;
  } catch (error) {
    // Fallback to original implementation for backward compatibility
    return parsePaliaPlannerUrl(input);
  }
}