
import { useState, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
}

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const RESET_WINDOW = 60 * 1000; // 1 minute

export const useRateLimit = (key: string) => {
  const [state, setState] = useState<RateLimitState>(() => {
    const stored = localStorage.getItem(`rateLimit_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Reset if block duration has passed
      if (parsed.isBlocked && now - parsed.lastAttempt > BLOCK_DURATION) {
        return { attempts: 0, lastAttempt: 0, isBlocked: false };
      }
      
      // Reset attempts if reset window has passed
      if (now - parsed.lastAttempt > RESET_WINDOW) {
        return { attempts: 0, lastAttempt: 0, isBlocked: false };
      }
      
      return parsed;
    }
    return { attempts: 0, lastAttempt: 0, isBlocked: false };
  });

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    if (state.isBlocked) {
      const timeRemaining = BLOCK_DURATION - (now - state.lastAttempt);
      if (timeRemaining > 0) {
        return { 
          allowed: false, 
          message: `Too many attempts. Try again in ${Math.ceil(timeRemaining / 60000)} minutes.` 
        };
      } else {
        // Unblock
        const newState = { attempts: 0, lastAttempt: 0, isBlocked: false };
        setState(newState);
        localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
        return { allowed: true, message: '' };
      }
    }

    return { allowed: true, message: '' };
  }, [state, key]);

  const recordAttempt = useCallback((success: boolean = false) => {
    const now = Date.now();
    
    if (success) {
      // Reset on success
      const newState = { attempts: 0, lastAttempt: 0, isBlocked: false };
      setState(newState);
      localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
      return;
    }

    const newAttempts = state.attempts + 1;
    const shouldBlock = newAttempts >= MAX_ATTEMPTS;
    
    const newState = {
      attempts: newAttempts,
      lastAttempt: now,
      isBlocked: shouldBlock
    };
    
    setState(newState);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
  }, [state, key]);

  return { checkRateLimit, recordAttempt, isBlocked: state.isBlocked };
};
