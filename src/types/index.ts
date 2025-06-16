export interface Plant {
  id: string;
  name: string;
  needsWater: boolean;
}

// Re-export layout types for convenience
export * from './layout';

// Re-export unified types for convenience
export * from './unified';