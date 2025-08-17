import React, { useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { RecipeCard, RecipeCardItem } from './recipe-card';
import { useCardStack, SwipeDirection } from '../hooks/use-card-stack';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Configuration constants
const SWIPE_THRESHOLD_X = screenWidth * 0.25; // 25% of screen width
const SWIPE_VELOCITY_THRESHOLD = 400;
const MAX_ROTATION = 20; // degrees
const ANIMATION_DURATION = 200; // ms for swipe out

interface TinderStackProps {
  data: RecipeCardItem[];
  onSwipe?: (item: RecipeCardItem, direction: SwipeDirection) => void;
  onStackEmpty?: () => void;
  maxVisibleCards?: number;
}

export const TinderStack: React.FC<TinderStackProps> = ({
  data,
  onSwipe,
  onStackEmpty,
  maxVisibleCards = 3,
}) => {
  // Use the card stack hook for state management
  const {
    visibleCards,
    headIndex,
    isAnimating,
    onSwipeComplete,
    canSwipe,
    currentCard,
    hasMore,
  } = useCardStack({
    data,
    onSwipe,
    maxVisibleCards,
  });

  // Shared values for the top card animation
  // Only the top card is animated; others are static
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle empty stack
  React.useEffect(() => {
    if (!hasMore && onStackEmpty) {
      onStackEmpty();
    }
  }, [hasMore, onStackEmpty]);

  // Reset animation values when head index changes
  // This ensures clean state for the new top card
  React.useEffect(() => {
    'worklet';
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, [headIndex]);

  // Complete swipe animation and notify JS thread
  const completeSwipe = useCallback((direction: SwipeDirection) => {
    'worklet';
    console.log('[TinderStack] Animation complete, calling onSwipeComplete');
    runOnJS(onSwipeComplete)(direction);
  }, [onSwipeComplete]);

  // Animate card off screen
  const animateOut = useCallback((velocityX: number, velocityY?: number) => {
    'worklet';
    let direction: SwipeDirection;
    let finalX: number;
    let finalY: number = 0;

    // Determine direction based on velocity
    if (Math.abs(velocityX) > Math.abs(velocityY || 0)) {
      // Horizontal swipe
      direction = velocityX > 0 ? 'right' : 'left';
      finalX = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
    } else {
      // Vertical swipe
      direction = (velocityY || 0) > 0 ? 'down' : 'up';
      finalX = translateX.value * 2; // Continue horizontal momentum
      finalY = direction === 'down' ? screenHeight : -screenHeight;
    }
    
    // Animate with proper completion callback
    translateX.value = withTiming(
      finalX,
      { duration: ANIMATION_DURATION },
      (finished) => {
        'worklet';
        if (finished) {
          // Critical: Call JS thread update AFTER animation completes
          completeSwipe(direction);
        }
      }
    );

    if (finalY !== 0) {
      translateY.value = withTiming(finalY, { duration: ANIMATION_DURATION });
    }
    
    // Fade and scale for visual polish
    opacity.value = withTiming(0, { duration: ANIMATION_DURATION * 0.8 });
    scale.value = withTiming(0.8, { duration: ANIMATION_DURATION });
  }, [completeSwipe]);

  // Reset card to center
  const resetPosition = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, { damping: 15, stiffness: 100 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  // Create pan gesture for swiping
  const panGesture = Gesture.Pan()
    .enabled(canSwipe()) // Disable when animating or no cards
    .onBegin(() => {
      'worklet';
      // Cancel any ongoing animations
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(rotation);
    })
    .onUpdate((event) => {
      'worklet';
      // Update position and rotation based on drag
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5; // Reduce vertical movement
      
      // Calculate rotation based on horizontal position
      rotation.value = interpolate(
        event.translationX,
        [-screenWidth / 2, 0, screenWidth / 2],
        [-MAX_ROTATION, 0, MAX_ROTATION],
        Extrapolate.CLAMP
      );
    })
    .onEnd((event) => {
      'worklet';
      const { translationX, translationY, velocityX, velocityY } = event;
      
      // Check if swipe threshold is met (horizontal or vertical)
      const shouldSwipeHorizontal =
        Math.abs(translationX) > SWIPE_THRESHOLD_X ||
        Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;
      
      const shouldSwipeVertical =
        Math.abs(translationY) > SWIPE_THRESHOLD_X ||
        Math.abs(velocityY) > SWIPE_VELOCITY_THRESHOLD;
      
      if (shouldSwipeHorizontal || shouldSwipeVertical) {
        // Determine direction from velocity or position
        const effectiveVelocityX = 
          Math.abs(velocityX) > 100 ? velocityX : 
          (translationX > 0 ? 500 : -500);
        
        const effectiveVelocityY = 
          Math.abs(velocityY) > 100 ? velocityY : 
          (translationY > 0 ? 500 : -500);
        
        animateOut(effectiveVelocityX, effectiveVelocityY);
      } else {
        // Snap back to center
        resetPosition();
      }
    });

  // Animated style for the top card
  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  // Like overlay style (right swipe)
  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD_X],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  // Nope overlay style (left swipe)
  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD_X, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  // Super Like overlay style (up swipe)
  const superLikeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD_X, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  if (!hasMore) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-500">No more recipes!</Text>
        <Text className="text-sm text-gray-400 mt-2">Check back later for new recipes</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center">
      {/* Render cards in reverse order so top card is last (highest z-index) */}
      {visibleCards.slice().reverse().map((item, reverseIndex) => {
        const actualIndex = visibleCards.length - 1 - reverseIndex;
        const isTop = actualIndex === 0;
        
        // Calculate scale and vertical offset for stacked appearance
        const cardScale = 1 - (actualIndex * 0.05);
        const cardTranslateY = actualIndex * 8;
        
        if (isTop && currentCard) {
          // Top card with gestures and animations
          return (
            <GestureDetector key={`card-${item.id}-${headIndex}`} gesture={panGesture}>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    zIndex: 1000 - actualIndex,
                  },
                  topCardStyle,
                ]}
                className="items-center justify-center"
              >
                <RecipeCard 
                  item={item} 
                  testID={`card-top-${item.id}`}
                />
                
                {/* Like Overlay (Right Swipe) */}
                <Animated.View 
                  style={[likeOverlayStyle, {
                    position: 'absolute',
                    top: 50,
                    right: 40,
                    transform: [{ rotate: '-15deg' }],
                  }]}
                  className="bg-green-500 border-3 border-green-500 px-2.5 py-2 rounded-xl"
                >
                  <Text className="text-white text-3xl font-bold">LIKE</Text>
                </Animated.View>
                
                {/* Nope Overlay (Left Swipe) */}
                <Animated.View 
                  style={[nopeOverlayStyle, {
                    position: 'absolute',
                    top: 50,
                    left: 40,
                    transform: [{ rotate: '15deg' }],
                  }]}
                  className="bg-red-500 border-3 border-red-500 px-2.5 py-2 rounded-xl"
                >
                  <Text className="text-white text-3xl font-bold">NOPE</Text>
                </Animated.View>

                {/* Super Like Overlay (Up Swipe) */}
                <Animated.View 
                  style={[superLikeOverlayStyle, {
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: [{ translateX: -50 }],
                  }]}
                  className="bg-blue-500 border-3 border-blue-500 px-2.5 py-2 rounded-xl"
                >
                  <Text className="text-white text-2xl font-bold">SUPER!</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          );
        } else {
          // Background cards - static, no gestures
          return (
            <Animated.View
              key={`card-${item.id}-${headIndex}`}
              style={{
                position: 'absolute',
                zIndex: 1000 - actualIndex,
                transform: [
                  { scale: cardScale },
                  { translateY: cardTranslateY },
                ],
                opacity: 0.95,
              }}
              className="items-center justify-center"
            >
              <RecipeCard 
                item={item} 
                testID={`card-bg-${actualIndex}-${item.id}`}
              />
            </Animated.View>
          );
        }
      })}
    </View>
  );
};