import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UsePageLeaveOptions {
  message?: string;
  onBeforeUnload?: () => void;
  cleanupFiles?: () => Promise<void>;
  enableRouteProtection?: boolean;
}

export const usePageLeaveConfirmation = ({
  message = "Do u want to leave the page. You will lose ur data?",
  onBeforeUnload,
  cleanupFiles,
  enableRouteProtection = true
}: UsePageLeaveOptions = {}) => {
  
  useEffect(() => {
    // Handle browser refresh/close/navigate away - ONLY these events should trigger cleanup
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Call custom cleanup function if provided
      if (onBeforeUnload) {
        onBeforeUnload();
      }
      
      // Trigger file cleanup (async, may not complete before page unloads)
      if (cleanupFiles) {
        cleanupFiles().catch(console.error);
      }
      
      // Set the confirmation message - browsers will show their own dialog
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    // Only add the beforeunload event listener - this handles:
    // - Browser refresh (F5, Ctrl+R)
    // - Tab close (Ctrl+W)
    // - Browser close (Alt+F4)
    // - Navigation away from page
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message, onBeforeUnload, cleanupFiles]);
};

// File cleanup utility function
export const cleanupGeneratedFiles = async (): Promise<void> => {
  try {
    // Determine the correct API URL based on environment
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/cleanup-files' 
      : 'http://localhost:8000/api/cleanup-files';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileTypes: ['csv', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'json', 'tmp', 'temp', 'log', 'pkl', 'pickle', 'cache']
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to cleanup files: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Files cleaned up successfully:', result.message);
    
    if (result.deleted_files && result.deleted_files.length > 0) {
      console.log('Deleted files:', result.deleted_files);
    }
    
  } catch (error) {
    console.error('Error cleaning up files:', error);
    
    // If API cleanup fails, try to cleanup what we can from the frontend
    try {
      // Clear any localStorage items related to the app
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('creatorGPT') || key.startsWith('youtube') || key.startsWith('analysis')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear any sessionStorage items
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('creatorGPT') || key.startsWith('youtube') || key.startsWith('analysis')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('Frontend cleanup completed');
    } catch (frontendError) {
      console.error('Error during frontend cleanup:', frontendError);
    }
  }
};
