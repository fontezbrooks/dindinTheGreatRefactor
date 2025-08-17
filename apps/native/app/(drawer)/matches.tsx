import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Heart, Clock, Users, Star } from 'lucide-react-native';
import { useSession } from '@/lib/auth-client';

interface MatchedRecipe {
  id: string;
  title: string;
  image_url?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cook_time?: number;
  rating?: number;
  matchedAt: string;
  matchedUsers: {
    id: string;
    name: string;
    image?: string;
  }[];
}

// Mock matched recipes data
const mockMatches: MatchedRecipe[] = [
  {
    id: '1',
    title: 'Creamy Garlic Pasta',
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    difficulty: 'easy',
    cook_time: 25,
    rating: 4.8,
    matchedAt: '2024-08-17T10:30:00Z',
    matchedUsers: [
      { id: '1', name: 'Sarah Chen', image: 'https://i.pravatar.cc/100?img=1' },
      { id: '2', name: 'Mike Johnson', image: 'https://i.pravatar.cc/100?img=2' },
    ],
  },
  {
    id: '2',
    title: 'Korean BBQ Beef Bulgogi',
    image_url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop',
    difficulty: 'medium',
    cook_time: 20,
    rating: 4.7,
    matchedAt: '2024-08-16T15:45:00Z',
    matchedUsers: [
      { id: '3', name: 'Alex Park', image: 'https://i.pravatar.cc/100?img=3' },
    ],
  },
  {
    id: '3',
    title: 'Classic Chocolate Brownies',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
    difficulty: 'easy',
    cook_time: 45,
    rating: 4.9,
    matchedAt: '2024-08-15T20:15:00Z',
    matchedUsers: [
      { id: '4', name: 'Emma Wilson', image: 'https://i.pravatar.cc/100?img=4' },
      { id: '5', name: 'David Lee', image: 'https://i.pravatar.cc/100?img=5' },
      { id: '6', name: 'Lisa Rodriguez', image: 'https://i.pravatar.cc/100?img=6' },
    ],
  },
];

const formatMatchTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return 'Yesterday';
  return `${Math.floor(diffInHours / 24)}d ago`;
};

const formatCookTime = (minutes?: number): string => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function MatchesScreen() {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<MatchedRecipe[]>(mockMatches);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // TODO: Replace with actual tRPC call to fetch matches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just refresh with the same data
      setMatches([...mockMatches]);
    } catch (error) {
      console.error('Error refreshing matches:', error);
      Alert.alert('Error', 'Failed to refresh matches. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRecipePress = useCallback((recipe: MatchedRecipe) => {
    // TODO: Navigate to recipe detail screen
    Alert.alert(
      recipe.title,
      `You matched with ${recipe.matchedUsers.length} ${recipe.matchedUsers.length === 1 ? 'person' : 'people'} on this recipe!`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleUserPress = useCallback((user: { name: string }) => {
    // TODO: Navigate to user profile or start chat
    Alert.alert('User Profile', `View ${user.name}'s profile`, [{ text: 'OK' }]);
  }, []);

  if (!session?.user) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Heart color="#ef4444" size={64} />
        <Text className="text-xl font-semibold text-gray-800 mb-2 mt-4">
          Sign In Required
        </Text>
        <Text className="text-gray-600 text-center">
          Sign in to see your recipe matches and connect with other food lovers!
        </Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <View className="pt-4 pb-2 px-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-800">Your Matches</Text>
          <Text className="text-gray-600 mt-1">Recipes you both loved</Text>
        </View>
        
        <View className="flex-1 items-center justify-center p-6">
          <Heart color="#d1d5db" size={64} />
          <Text className="text-xl font-semibold text-gray-800 mb-2 mt-4">
            No Matches Yet
          </Text>
          <Text className="text-gray-600 text-center">
            Start swiping on recipes to find matches with other users who share your taste!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="pt-4 pb-2 px-6 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-800">Your Matches</Text>
        <Text className="text-gray-600 mt-1">
          {matches.length} recipe{matches.length !== 1 ? 's' : ''} you both loved
        </Text>
      </View>

      {/* Matches List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#f97316"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 space-y-4">
          {matches.map((match) => (
            <TouchableOpacity
              key={match.id}
              onPress={() => handleRecipePress(match)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Recipe Image and Info */}
              <View className="flex-row">
                <Image
                  source={{ uri: match.image_url }}
                  className="w-24 h-24"
                  resizeMode="cover"
                />
                
                <View className="flex-1 p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-lg font-semibold text-gray-800 flex-1 mr-2" numberOfLines={1}>
                      {match.title}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {formatMatchTime(match.matchedAt)}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center space-x-4 mb-3">
                    {match.cook_time && (
                      <View className="flex-row items-center">
                        <Clock color="#6b7280" size={14} />
                        <Text className="ml-1 text-sm text-gray-600">
                          {formatCookTime(match.cook_time)}
                        </Text>
                      </View>
                    )}
                    
                    <Text className="text-sm text-gray-600 capitalize">
                      {match.difficulty}
                    </Text>
                    
                    {match.rating && (
                      <View className="flex-row items-center">
                        <Star color="#f59e0b" fill="#f59e0b" size={14} />
                        <Text className="ml-1 text-sm text-gray-600">
                          {match.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Matched Users */}
              <View className="px-4 pb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Heart color="#ef4444" fill="#ef4444" size={16} />
                    <Text className="ml-2 text-sm font-medium text-gray-700">
                      Matched with {match.matchedUsers.length} {match.matchedUsers.length === 1 ? 'person' : 'people'}
                    </Text>
                  </View>
                  
                  <View className="flex-row -space-x-2">
                    {match.matchedUsers.slice(0, 3).map((user, index) => (
                      <TouchableOpacity
                        key={user.id}
                        onPress={() => handleUserPress(user)}
                        className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                        style={{ zIndex: 10 - index }}
                      >
                        <Image
                          source={{ uri: user.image || `https://i.pravatar.cc/32?u=${user.id}` }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                    {match.matchedUsers.length > 3 && (
                      <View className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white items-center justify-center">
                        <Text className="text-xs font-medium text-gray-600">
                          +{match.matchedUsers.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View className="flex-row flex-wrap mt-2">
                  {match.matchedUsers.slice(0, 2).map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleUserPress(user)}
                      className="mr-3 mb-1"
                    >
                      <Text className="text-sm text-blue-600">{user.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {match.matchedUsers.length > 2 && (
                    <Text className="text-sm text-gray-500">
                      and {match.matchedUsers.length - 2} more
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}