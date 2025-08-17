import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { User, Settings, Heart, TrendingUp, Award, Clock } from 'lucide-react-native';
import { useSession, useSignOut } from '@/lib/auth-client';

interface UserStats {
  total_swipes: number;
  right_swipes: number;
  matches: number;
  recipes_cooked: number;
  daily_streak: number;
  engagement_score: number;
}

interface UserPreferences {
  dietary_restrictions: string[];
  cuisine_preferences: string[];
  difficulty_preference: 'easy' | 'medium' | 'hard' | 'any';
  max_cook_time: number;
  spice_tolerance: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  household_size: number;
  meal_planning_enabled: boolean;
  notification_preferences: {
    new_matches: boolean;
    weekly_recommendations: boolean;
    cooking_reminders: boolean;
  };
}

// Mock data - will be replaced with tRPC calls
const mockStats: UserStats = {
  total_swipes: 156,
  right_swipes: 89,
  matches: 23,
  recipes_cooked: 12,
  daily_streak: 5,
  engagement_score: 85,
};

const mockPreferences: UserPreferences = {
  dietary_restrictions: ['vegetarian'],
  cuisine_preferences: ['italian', 'mexican', 'thai'],
  difficulty_preference: 'medium',
  max_cook_time: 45,
  spice_tolerance: 'medium',
  cooking_skill_level: 'intermediate',
  household_size: 2,
  meal_planning_enabled: true,
  notification_preferences: {
    new_matches: true,
    weekly_recommendations: true,
    cooking_reminders: false,
  },
};

const StatCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subtitle?: string;
}> = ({ icon, label, value, subtitle }) => (
  <View className="bg-white p-4 rounded-xl border border-gray-100 flex-1">
    <View className="flex-row items-center mb-2">
      {icon}
      <Text className="ml-2 text-sm font-medium text-gray-600">{label}</Text>
    </View>
    <Text className="text-2xl font-bold text-gray-800">{value}</Text>
    {subtitle && <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>}
  </View>
);

const PreferenceSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
    <Text className="text-lg font-semibold text-gray-800 mb-3">{title}</Text>
    {children}
  </View>
);

export default function ProfileScreen() {
  const { data: session } = useSession();
  const { signOut } = useSignOut();
  const [stats, setStats] = useState<UserStats>(mockStats);
  const [preferences, setPreferences] = useState<UserPreferences>(mockPreferences);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleEditPreferences = useCallback(() => {
    // TODO: Navigate to preferences editing screen
    Alert.alert('Edit Preferences', 'Preferences editing coming soon!', [{ text: 'OK' }]);
  }, []);

  const updateNotificationPreference = useCallback((key: keyof UserPreferences['notification_preferences'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value,
      },
    }));
    
    // TODO: Save to backend via tRPC
    console.log(`Updated ${key} to ${value}`);
  }, []);

  const calculateMatchRate = useCallback(() => {
    if (stats.right_swipes === 0) return 0;
    return Math.round((stats.matches / stats.right_swipes) * 100);
  }, [stats]);

  if (!session?.user) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <User color="#6b7280" size={64} />
        <Text className="text-xl font-semibold text-gray-800 mb-2 mt-4">
          Sign In Required
        </Text>
        <Text className="text-gray-600 text-center">
          Sign in to view your profile and customize your recipe preferences!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100">
        <View className="pt-4 pb-6 px-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                {session.user.name || 'Food Explorer'}
              </Text>
              <Text className="text-gray-600">{session.user.email}</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditPreferences}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
            >
              <Settings color="#6b7280" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="p-4">
        {/* Stats Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Your Stats</Text>
          
          <View className="flex-row space-x-3 mb-3">
            <StatCard
              icon={<TrendingUp color="#f97316" size={20} />}
              label="Total Swipes"
              value={stats.total_swipes}
            />
            <StatCard
              icon={<Heart color="#ef4444" size={20} />}
              label="Matches"
              value={stats.matches}
              subtitle={`${calculateMatchRate()}% match rate`}
            />
          </View>
          
          <View className="flex-row space-x-3">
            <StatCard
              icon={<Award color="#10b981" size={20} />}
              label="Recipes Cooked"
              value={stats.recipes_cooked}
            />
            <StatCard
              icon={<Clock color="#8b5cf6" size={20} />}
              label="Daily Streak"
              value={`${stats.daily_streak} days`}
            />
          </View>
        </View>

        {/* Dietary Preferences */}
        <PreferenceSection title="Dietary Preferences">
          <View className="flex-row flex-wrap">
            {preferences.dietary_restrictions.length > 0 ? (
              preferences.dietary_restrictions.map((restriction, index) => (
                <View key={index} className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-green-700 text-sm capitalize">{restriction}</Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-500">No dietary restrictions</Text>
            )}
          </View>
        </PreferenceSection>

        {/* Cuisine Preferences */}
        <PreferenceSection title="Favorite Cuisines">
          <View className="flex-row flex-wrap">
            {preferences.cuisine_preferences.map((cuisine, index) => (
              <View key={index} className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-blue-700 text-sm capitalize">{cuisine}</Text>
              </View>
            ))}
          </View>
        </PreferenceSection>

        {/* Cooking Preferences */}
        <PreferenceSection title="Cooking Preferences">
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Difficulty Level</Text>
              <Text className="text-gray-900 font-medium capitalize">
                {preferences.difficulty_preference}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Max Cook Time</Text>
              <Text className="text-gray-900 font-medium">
                {preferences.max_cook_time} minutes
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Spice Tolerance</Text>
              <Text className="text-gray-900 font-medium capitalize">
                {preferences.spice_tolerance}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Cooking Level</Text>
              <Text className="text-gray-900 font-medium capitalize">
                {preferences.cooking_skill_level}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Household Size</Text>
              <Text className="text-gray-900 font-medium">
                {preferences.household_size} {preferences.household_size === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        </PreferenceSection>

        {/* Notifications */}
        <PreferenceSection title="Notifications">
          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">New Matches</Text>
              <Switch
                value={preferences.notification_preferences.new_matches}
                onValueChange={(value) => updateNotificationPreference('new_matches', value)}
                trackColor={{ false: '#d1d5db', true: '#f97316' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Weekly Recommendations</Text>
              <Switch
                value={preferences.notification_preferences.weekly_recommendations}
                onValueChange={(value) => updateNotificationPreference('weekly_recommendations', value)}
                trackColor={{ false: '#d1d5db', true: '#f97316' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Cooking Reminders</Text>
              <Switch
                value={preferences.notification_preferences.cooking_reminders}
                onValueChange={(value) => updateNotificationPreference('cooking_reminders', value)}
                trackColor={{ false: '#d1d5db', true: '#f97316' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Meal Planning</Text>
              <Switch
                value={preferences.meal_planning_enabled}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, meal_planning_enabled: value }))}
                trackColor={{ false: '#d1d5db', true: '#f97316' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </PreferenceSection>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6"
        >
          <Text className="text-red-600 font-medium text-center">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}