import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, User, TrendingUp } from 'lucide-react-native';
import { useSession } from '@/lib/auth-client';
import { SignIn } from '@/components/sign-in';
import { SignUp } from '@/components/sign-up';

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}> = ({ icon, title, description, onPress, color }) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
  >
    <View className={`w-12 h-12 ${color} rounded-xl items-center justify-center mb-3`}>
      {icon}
    </View>
    <Text className="text-lg font-semibold text-gray-800 mb-1">{title}</Text>
    <Text className="text-gray-600 text-sm">{description}</Text>
  </TouchableOpacity>
);

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const navigateToDiscover = () => router.push('/(drawer)/discover');
  const navigateToMatches = () => router.push('/(drawer)/matches');
  const navigateToProfile = () => router.push('/(drawer)/profile');

  if (!session?.user) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <View className="px-6 py-8">
          {/* App Header */}
          <View className="text-center mb-8">
            <Text className="text-4xl font-bold text-gray-800 mb-2">DinDin</Text>
            <Text className="text-lg text-gray-600">
              Discover recipes, match with others, decide what's for dinner!
            </Text>
          </View>

          {/* Hero Image */}
          <View className="mb-8 rounded-2xl overflow-hidden">
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop' }}
              className="w-full h-48"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/30 items-center justify-center">
              <Text className="text-white text-xl font-bold">Find Your Perfect Recipe</Text>
            </View>
          </View>

          {/* Features */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-800 mb-4">
              How DinDin Works
            </Text>
            <View className="space-y-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-4">
                  <Heart color="#f97316" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Swipe Through Recipes</Text>
                  <Text className="text-gray-600 text-sm">Browse curated recipes tailored to your taste</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
                  <Heart color="#ef4444" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Match with Others</Text>
                  <Text className="text-gray-600 text-sm">Find people who love the same recipes</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                  <User color="#10b981" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Cook Together</Text>
                  <Text className="text-gray-600 text-sm">Plan meals and cook with your matches</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Auth Forms */}
          <SignIn />
          <View className="my-6">
            <View className="flex-row items-center">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>
          </View>
          <SignUp />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="px-6 py-8">
        {/* Welcome Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {session.user.name}!
          </Text>
          <Text className="text-gray-600">
            Ready to discover some delicious recipes?
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-gray-800 mb-4">
            Quick Actions
          </Text>
          <View className="space-y-4">
            <QuickActionCard
              icon={<Heart color="#ffffff" size={24} />}
              title="Discover Recipes"
              description="Swipe through personalized recipe recommendations"
              onPress={navigateToDiscover}
              color="bg-orange-500"
            />

            <QuickActionCard
              icon={<Heart color="#ffffff" size={24} />}
              title="View Matches"
              description="See recipes you and others both loved"
              onPress={navigateToMatches}
              color="bg-red-500"
            />

            <QuickActionCard
              icon={<User color="#ffffff" size={24} />}
              title="My Profile"
              description="Update preferences and view your stats"
              onPress={navigateToProfile}
              color="bg-blue-500"
            />
          </View>
        </View>

        {/* Recent Activity Placeholder */}
        <View className="bg-white rounded-xl p-6 border border-gray-100">
          <View className="flex-row items-center mb-4">
            <TrendingUp color="#f97316" size={24} />
            <Text className="text-xl font-semibold text-gray-800 ml-3">
              Your Activity
            </Text>
          </View>
          <Text className="text-gray-600 text-center py-8">
            Start swiping to see your activity here!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
