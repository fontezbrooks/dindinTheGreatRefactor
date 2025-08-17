import React from 'react';
import { View, Text, Image, ViewStyle, Dimensions } from 'react-native';
import { Clock, Star, Users } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface RecipeCardItem {
  id: string;
  title: string;
  image?: string;
  image_url?: string;
  description: string;
  cookTime?: string;
  cook_time?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rating?: number;
  likes?: number;
  dislikes?: number;
  tags?: string[];
  dietary_tags?: string[];
  cuisine?: string[];
  servings?: number;
}

interface RecipeCardProps {
  item: RecipeCardItem;
  style?: ViewStyle;
  testID?: string;
}

// Convert cook time to display format
const formatCookTime = (item: RecipeCardItem): string => {
  if (item.cookTime) return item.cookTime;
  if (item.cook_time) {
    const minutes = item.cook_time;
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return '30min';
};

// Calculate rating from likes/dislikes or use provided rating
const calculateRating = (item: RecipeCardItem): number => {
  if (item.rating) return item.rating;
  if (item.likes !== undefined && item.dislikes !== undefined) {
    const total = item.likes + item.dislikes;
    if (total === 0) return 0;
    return (item.likes / total) * 5;
  }
  return 4.0; // Default rating
};

// Get display tags from various tag fields
const getDisplayTags = (item: RecipeCardItem): string[] => {
  const allTags = [
    ...(item.tags || []),
    ...(item.dietary_tags || []),
    ...(item.cuisine || [])
  ];
  return allTags.slice(0, 3); // Limit to 3 tags
};

// Pure presentational component - no state, no animations
// This prevents unnecessary re-renders and keeps cards stable
export const RecipeCard = React.memo<RecipeCardProps>(({ item, style, testID }) => {
  const imageUrl = item.image_url || item.image || 'https://via.placeholder.com/400x300';
  const cookTime = formatCookTime(item);
  const rating = calculateRating(item);
  const displayTags = getDisplayTags(item);
  
  return (
    <View 
      style={[{
        width: screenWidth - 32,
        height: screenHeight - 250,
      }, style]} 
      className="bg-white rounded-3xl shadow-lg overflow-hidden"
      testID={testID}
    >
      <Image 
        source={{ uri: imageUrl }} 
        className="w-full"
        style={{ height: '60%' }}
        resizeMode="cover" 
      />

      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text 
            className="text-xl font-bold text-gray-800 flex-1 mr-2" 
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {rating > 0 && (
            <View className="flex-row items-center">
              <Star color="#f59e0b" fill="#f59e0b" size={16} />
              <Text className="ml-1 text-gray-700 text-sm">{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text className="text-gray-600 mb-3 text-sm leading-5" numberOfLines={2}>
          {item.description}
        </Text>

        <View className="flex-row items-center mb-3">
          <View className="flex-row items-center">
            <Clock color="#6b7280" size={14} />
            <Text className="ml-1 text-gray-500 text-sm">{cookTime}</Text>
          </View>
          <Text className="text-gray-400 mx-2">•</Text>
          <Text className="text-gray-500 text-sm capitalize">{item.difficulty}</Text>
          {item.servings && (
            <>
              <Text className="text-gray-400 mx-2">•</Text>
              <View className="flex-row items-center">
                <Users color="#6b7280" size={14} />
                <Text className="ml-1 text-gray-500 text-sm">{item.servings} servings</Text>
              </View>
            </>
          )}
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {displayTags.map((tag, index) => (
            <View key={`${item.id}-tag-${index}`} className="bg-amber-100 px-2.5 py-1 rounded-xl">
              <Text className="text-orange-600 text-xs font-medium">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if the item ID changes
  return prevProps.item.id === nextProps.item.id;
});

RecipeCard.displayName = 'RecipeCard';