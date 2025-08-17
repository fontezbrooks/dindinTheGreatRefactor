import { useState, useCallback, useMemo, useRef } from 'react';

export interface StackItem {
  id: string;
  [key: string]: any;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface UseCardStackProps<T extends StackItem> {
  data: T[];
  onSwipe?: (item: T, direction: SwipeDirection) => void;
  maxVisibleCards?: number;
}

interface UseCardStackReturn<T extends StackItem> {
  visibleCards: T[];
  headIndex: number;
  isAnimating: boolean;
  onSwipeComplete: (direction: SwipeDirection) => void;
  canSwipe: () => boolean;
  reset: () => void;
  currentCard: T | null;
  nextCard: T | null;
  hasMore: boolean;
}

// Hook manages indices WITHOUT mutating the data array
// This ensures stable, predictable card sequencing
export function useCardStack<T extends StackItem>({
  data,
  onSwipe,
  maxVisibleCards = 3,
}: UseCardStackProps<T>): UseCardStackReturn<T> {
  // Track the index of the top card in the ORIGINAL data array
  // Never mutate or filter the data array itself
  const [headIndex, setHeadIndex] = useState(0);
  
  // Prevent overlapping swipes during animation
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Use ref to avoid stale closures in callbacks
  const headIndexRef = useRef(headIndex);
  headIndexRef.current = headIndex;

  // Calculate visible cards based on current head index
  // This creates a stable window into the data array
  const visibleCards = useMemo(() => {
    const cards: T[] = [];
    for (let i = 0; i < maxVisibleCards; i++) {
      const index = headIndex + i;
      if (index < data.length) {
        cards.push(data[index]);
      }
    }
    return cards;
  }, [data, headIndex, maxVisibleCards]);

  // Current and next cards for easy access
  const currentCard = headIndex < data.length ? data[headIndex] : null;
  const nextCard = headIndex + 1 < data.length ? data[headIndex + 1] : null;
  const hasMore = headIndex < data.length;

  // Advance head index after swipe animation completes
  // This is called from the UI thread via runOnJS
  const advanceHeadIndex = useCallback(() => {
    console.log('[useCardStack] Advancing head index from', headIndexRef.current);
    
    // Update both state and ref atomically
    const newIndex = headIndexRef.current + 1;
    setHeadIndex(newIndex);
    headIndexRef.current = newIndex;
    
    // Clear animation lock
    setIsAnimating(false);
    
    console.log('[useCardStack] New head index:', newIndex);
  }, []);

  // Handle swipe completion with proper synchronization
  const onSwipeComplete = useCallback((direction: SwipeDirection) => {
    console.log('[useCardStack] Swipe complete:', direction, 'Current index:', headIndexRef.current);
    
    // Prevent duplicate processing
    if (isAnimating) {
      console.warn('[useCardStack] Swipe already in progress, ignoring');
      return;
    }
    
    // Get current card before advancing
    const swipedCard = data[headIndexRef.current];
    if (!swipedCard) {
      console.error('[useCardStack] No card at index:', headIndexRef.current);
      return;
    }
    
    // Lock animations
    setIsAnimating(true);
    
    // Call user's swipe handler if provided
    if (onSwipe) {
      onSwipe(swipedCard, direction);
    }
    
    // Advance index after a small delay to ensure animation completes
    // This prevents the flash of the wrong card
    setTimeout(() => {
      advanceHeadIndex();
    }, 50);
  }, [data, onSwipe, advanceHeadIndex, isAnimating]);

  // Check if swipe is allowed
  const canSwipe = useCallback(() => {
    return !isAnimating && hasMore;
  }, [isAnimating, hasMore]);

  // Reset the stack to the beginning
  const reset = useCallback(() => {
    console.log('[useCardStack] Resetting stack');
    setHeadIndex(0);
    headIndexRef.current = 0;
    setIsAnimating(false);
  }, []);

  return {
    visibleCards,
    headIndex,
    isAnimating,
    onSwipeComplete,
    canSwipe,
    reset,
    currentCard,
    nextCard,
    hasMore,
  };
}