import { View, Text, TouchableOpacity, StyleSheet, Animated, Switch } from 'react-native';
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function MenuScreen() {
  const [activeTab, setActiveTab] = useState('notes');
  const { logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const tabs = [
    { id: 'notes', label: 'Notas', icon: '📝', route: '/notes' },
    { id: 'agenda', label: 'Agenda', icon: '📅', route: '/agenda' },
    { id: 'todos', label: 'Tareas', icon: '✅', route: '/todos' },
    { id: 'pomodoros', label: 'Pomodoros', icon: '🍅', route: null },
  ];

  const handleTabChange = (tabId: string, index: number) => {
    if (tabId === 'pomodoros') return;

    Animated.timing(animatedValue, {
      toValue: index,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setActiveTab(tabId);
  };

  const handleEnterSection = () => {
    const selectedTab = tabs.find(tab => tab.id === activeTab);
    if (selectedTab && selectedTab.route) {
      router.push(selectedTab.route);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Epsilon Retrieve</Text>
        <View style={styles.headerActions}>
          <View style={styles.themeToggle}>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.surface : colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: colors.error }]}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>Selecciona una sección</Text>

        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary },
                  tab.id === 'pomodoros' && styles.tabComingSoon,
                ]}
                onPress={() => {
                  if (tab.id !== 'pomodoros') {
                    const index = tabs.findIndex(t => t.id === tab.id);
                    handleTabChange(tab.id, index);
                  }
                }}
                disabled={tab.id === 'pomodoros'}
                accessible={true}
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive, disabled: tab.id === 'pomodoros' }}
                accessibilityRole="tab"
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: colors.textSecondary },
                    isActive && { color: colors.background },
                    tab.id === 'pomodoros' && { color: colors.textTertiary },
                  ]}
                >
                  {tab.label}
                  {tab.id === 'pomodoros' && ' (Próximamente)'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.enterButton, { backgroundColor: colors.primary }]}
          onPress={handleEnterSection}
          accessible={true}
          accessibilityLabel={`Entrar a ${tabs.find(t => t.id === activeTab)?.label}`}
          accessibilityRole="button"
        >
          <Text style={styles.enterButtonText}>Entrar a {tabs.find(t => t.id === activeTab)?.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggle: {
    marginRight: 8,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  tabsContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabComingSoon: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  enterButton: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
