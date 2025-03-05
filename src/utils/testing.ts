/**
 * Helper function to detect if we're in a test environment
 * @returns True if the application is running in a test environment
 */
export function isTestEnv(): boolean {
  return typeof process !== 'undefined' && 
         process.env !== undefined && 
         process.env.NODE_ENV === 'test';
}
