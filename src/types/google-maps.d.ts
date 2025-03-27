// types/google-maps.d.ts

// Add Google Maps types to the global window object
declare global {
    interface Window {
      google: typeof google;
    }
  }
  
  // This will prevent TS errors when using Google Maps APIs
  export {};