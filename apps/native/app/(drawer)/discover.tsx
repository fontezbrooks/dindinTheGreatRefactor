import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { TinderStack } from '@/components/tinder-stack';
import { RecipeCardItem } from '@/components/recipe-card';
import { SwipeDirection } from '@/hooks/use-card-stack';
import { useSession } from '@/lib/auth-client';

// Mock recipe data - this will be replaced with tRPC calls
const mockRecipes: RecipeCardItem[] = [
  {
    id: '1',
    title: 'Creamy Garlic Pasta',
    description: 'A rich and creamy pasta dish with roasted garlic, parmesan cheese, and fresh herbs.',
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    cook_time: 25,
    difficulty: 'easy',
    rating: 4.8,
    servings: 4,
    tags: ['pasta', 'creamy', 'garlic'],
    dietary_tags: ['vegetarian'],
    cuisine: ['italian'],
  },
  {
    id: '2',
    title: 'Spicy Thai Basil Chicken',
    description: 'Authentic Thai stir-fry with fresh basil, chilies, and aromatic spices.',
    image_url: 'https://images.unsplash.com/photo-1562565652-a0d8c3c59ac8?w=400&h=300&fit=crop',
    cook_time: 15,
    difficulty: 'medium',
    rating: 4.6,
    servings: 2,
    tags: ['spicy', 'thai', 'stir-fry'],
    dietary_tags: ['gluten-free'],
    cuisine: ['thai', 'asian'],
  },
  {
    id: '3',
    title: 'Classic Chocolate Brownies',
    description: 'Fudgy, rich chocolate brownies with a perfect crispy top and gooey center.',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
    cook_time: 45,
    difficulty: 'easy',
    rating: 4.9,
    servings: 12,
    tags: ['chocolate', 'dessert', 'baking'],
    dietary_tags: ['vegetarian'],
    cuisine: ['american'],
  },
  {
    id: '4',
    title: 'Mediterranean Quinoa Bowl',
    description: 'Healthy quinoa bowl with roasted vegetables, feta cheese, and tahini dressing.',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    cook_time: 30,
    difficulty: 'easy',
    rating: 4.4,
    servings: 2,
    tags: ['healthy', 'quinoa', 'mediterranean'],
    dietary_tags: ['vegetarian', 'gluten-free'],
    cuisine: ['mediterranean'],
  },
  {
    id: '5',
    title: 'Korean BBQ Beef Bulgogi',
    description: 'Tender marinated beef with sweet and savory Korean flavors, served with rice.',
    image_url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop',
    cook_time: 20,
    difficulty: 'medium',
    rating: 4.7,
    servings: 4,
    tags: ['korean', 'beef', 'marinated'],
    dietary_tags: ['gluten-free'],
    cuisine: ['korean', 'asian'],
  },
];

export default function DiscoverScreen() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<RecipeCardItem[]>(mockRecipes);
  const [isLoading, setIsLoading] = useState(false);

  // Handle swipe action
  const handleSwipe = useCallback(async (item: RecipeCardItem, direction: SwipeDirection) => {
    console.log(`Swiped ${direction} on recipe: ${item.title}`);
    
    // TODO: Replace with actual tRPC call
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Show feedback for demonstration
      const action = direction === 'right' ? 'liked' : 
                    direction === 'left' ? 'passed' :
                    direction === 'up' ? 'super liked' : 'noted';
      
      // In production, this would be a toast or subtle animation
      console.log(`Recipe ${action}: ${item.title}`);
      
    } catch (error) {
      console.error('Error recording swipe:', error);
      Alert.alert('Error', 'Failed to record your swipe. Please try again.');
    }
  }, []);

  // Handle when stack is empty
  const handleStackEmpty = useCallback(() => {
    console.log('No more recipes to show');
    // TODO: Load more recipes or show empty state
    Alert.alert(
      'No More Recipes!',
      'You\'ve seen all available recipes. Check back later for new ones!',
      [{ text: 'OK' }]
    );
  }, []);

  // Load more recipes (placeholder)
  const loadMoreRecipes = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // TODO: Replace with actual tRPC call to fetch personalized recipes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just reset to original recipes
      setRecipes([...mockRecipes]);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load more recipes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-load recipes when user is authenticated
  useEffect(() => {
    if (session?.user && recipes.length === 0) {
      loadMoreRecipes();
    }
  }, [session, recipes.length, loadMoreRecipes]);

  if (!session?.user) {
    return (
      <View className="flex-1 bg-amber-50 items-center justify-center p-6">
        <Text className="text-xl font-semibold text-gray-800 mb-2">
          Sign In Required
        </Text>
        <Text className="text-gray-600 text-center">
          Please sign in to discover recipes and start swiping!
        </Text>
      </View>
    );
  }

  if (isLoading && recipes.length === 0) {
    return (
      <View className="flex-1 bg-amber-50 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-gray-600 mt-4">Loading delicious recipes...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-amber-50">
      {/* Header */}
      <View className="pt-4 pb-2 px-6">
        <Text className="text-2xl font-bold text-gray-800">
          Discover Recipes
        </Text>
        <Text className="text-gray-600 mt-1">
          Swipe right to like, left to pass, up for super like!
        </Text>
      </View>

      {/* Recipe Stack */}
      <View className="flex-1">
        <TinderStack
          data={recipes}
          onSwipe={handleSwipe}
          onStackEmpty={handleStackEmpty}
          maxVisibleCards={3}
        />
      </View>

      {/* Action Instructions */}
      <View className="px-6 py-4 bg-white/80">
        <View className="flex-row justify-around">
          <View className="items-center">
            <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-2">
              <Text className="text-red-600 font-bold">←</Text>
            </View>
            <Text className="text-xs text-gray-600">Pass</Text>
          </View>
          
          <View className="items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
              <Text className="text-blue-600 font-bold">↑</Text>
            </View>
            <Text className="text-xs text-gray-600">Super</Text>
          </View>
          
          <View className="items-center">
            <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
              <Text className="text-green-600 font-bold">→</Text>
            </View>
            <Text className="text-xs text-gray-600">Like</Text>
          </View>
        </View>
      </View>
    </View>
  );
}