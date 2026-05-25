import { Tabs } from 'expo-router';
import { Compass, Home, Inbox as InboxIcon, Map, User } from 'lucide-react-native';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme';
import { AuthGuard } from '@features/auth';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 3,
            borderTopColor: colors.border,
            height: 64,
          },
          tabBarLabelStyle: { fontFamily: 'Fredoka_500Medium', fontSize: 10 },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: t('tabs.trips'),
            tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: t('tabs.discover'),
            tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t('tabs.inbox'),
            tabBarIcon: ({ color, size }) => <InboxIcon color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
