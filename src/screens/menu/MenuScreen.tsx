import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function MenuScreen() {
  const [activeTab, setActiveTab] = useState('notes');
  const { logout } = useAuth();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Epsilon Retrieve</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Selecciona una sección</Text>

        <View style={styles.carouselContainer}>
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const inputRange = tabs.map((_, i) => i);
            const scale = animatedValue.interpolate({
              inputRange,
              outputRange: inputRange.map((i) => (i === index ? 1.2 : 0.8)),
            });
            const opacity = animatedValue.interpolate({
              inputRange,
              outputRange: inputRange.map((i) => (i === index ? 1 : 0.4)),
            });
            const translateX = animatedValue.interpolate({
              inputRange,
              outputRange: inputRange.map((i) => (i - index) * 60),
            });

            return (
              <Animated.View
                key={tab.id}
                style={[
                  styles.tabItem,
                  {
                    transform: [{ scale }, { translateX }],
                    opacity,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    isActive && styles.tabButtonActive,
                    tab.id === 'pomodoros' && styles.tabComingSoon,
                  ]}
                  onPress={() => handleTabChange(tab.id, index)}
                  disabled={tab.id === 'pomodoros'}
                >
                  <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                    {tab.icon}
                  </Text>
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive && styles.tabLabelActive,
                      tab.id === 'pomodoros' && styles.tabLabelComingSoon,
                    ]}
                  >
                    {tab.label}
                    {tab.id === 'pomodoros' && '\n(Próximamente)'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.enterButton}
          onPress={handleEnterSection}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 50,
  },
  carouselContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    marginHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 30,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 100,
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tabComingSoon: {
    opacity: 0.5,
  },
  tabIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  tabIconActive: {
    fontSize: 50,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
    fontSize: 16,
  },
  tabLabelComingSoon: {
    color: '#999',
  },
  enterButton: {
    marginTop: 40,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
