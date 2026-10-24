import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import NotesScreen from '../../src/screens/notes/NotesScreen';
import AgendaScreen from '../../src/screens/agenda/AgendaScreen';
import TodosScreen from '../../src/screens/todos/TodosScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function TabsLayout() {
  const [activeTab, setActiveTab] = useState('notes');
  const { logout } = useAuth();
  const router = useRouter();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const tabs = [
    { id: 'notes', label: 'Notas', icon: '📝' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'todos', label: 'Tareas', icon: '✅' },
    { id: 'pomodoros', label: 'Pomodoros', icon: '🍅' },
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

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'notes':
        return <NotesScreen />;
      case 'agenda':
        return <AgendaScreen />;
      case 'todos':
        return <TodosScreen />;
      case 'pomodoros':
        return (
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonText}>🍅</Text>
            <Text style={styles.comingSoonTitle}>Pomodoros</Text>
            <Text style={styles.comingSoonSubtitle}>Próximamente</Text>
          </View>
        );
      default:
        return <NotesScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Epsilon Retrieve</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.content}>{renderContent()}</View>
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
  carouselContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabItem: {
    marginHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 80,
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
    fontSize: 32,
    marginBottom: 8,
  },
  tabIconActive: {
    fontSize: 40,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
    fontSize: 14,
  },
  tabLabelComingSoon: {
    color: '#999',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  comingSoonText: {
    fontSize: 80,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: '#999',
  },
});
