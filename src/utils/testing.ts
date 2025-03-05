/**
 * Helper function to detect if we're in a test environment
 * @returns True if the application is running in a test environment
 */
export function isTestEnv(): boolean {
  // Handle browser environments where process might not exist
  if (typeof process === 'undefined') {
    // In browsers, check for test-specific global variables that Vitest sets
    return typeof window !== 'undefined' && 
           (window as any).__VITEST__ !== undefined;
  }
  
  // In Node.js environments, check NODE_ENV
  if (process.env) {
    // Check for common test environment indicators
    return process.env.NODE_ENV === 'test' || 
           process.env.VITEST !== undefined;
  }
  
  return false;
}
