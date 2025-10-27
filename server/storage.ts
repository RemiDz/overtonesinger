// Storage interface for vocal analyzer
// This app is entirely client-side, so no persistent storage is needed

export interface IStorage {
  // No storage methods needed for this client-side audio app
}

export class MemStorage implements IStorage {
  constructor() {
    // Client-side app - no persistent storage needed
  }
}

export const storage = new MemStorage();
