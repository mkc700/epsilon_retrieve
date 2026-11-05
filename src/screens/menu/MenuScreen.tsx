import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Switch,
  ScrollView,
  AccessibilityInfo,
  useWindowDimensions,
  Platform,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

const CARD_GAP = 14;
const MAX_SIDE_OFFSET = 150;
const SIDE_SCALE = 0.8;
const SIDE_OPACITY = 0.62;
const CARD_HEIGHT = 292;
const CAROUSEL_HEIGHT = CARD_HEIGHT + 40;

const SECTIONS: Array<{
  id: string;
  label: string;
  icon: string;
  route: string | null;
  tagline: string;
}> = [
  { id: 'notes', label: 'Notas', icon: 'N', route: '/notes', tagline: 'Escribe y organiza tus ideas' },
  { id: 'agenda', label: 'Agenda', icon: 'A', route: '/agenda', tagline: 'Citas y pendientes del día' },
  { id: 'todos', label: 'Tareas', icon: 'T', route: '/todos', tagline: 'Pendientes claros, sin fricción' },
  { id: 'pomodoros', label: 'Pomodoros', icon: 'P', route: null, tagline: 'Enfoque en bloques de 25 minutos' },
];

export default function MenuScreen() {
  const { logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  // Tarjeta centrada siempre cabe en pantalla; las laterales se asoman sin salirse
  const cardWidth = Math.min(236, Math.floor(screenWidth * 0.64));
  const step = cardWidth + CARD_GAP;
  const sideOffset = Math.max(48, Math.min(MAX_SIDE_OFFSET, Math.floor((screenWidth - cardWidth) / 2) - 10));
  const sidePadding = Math.max(0, (screenWidth - cardWidth) / 2);
  // Cabecera adaptada al ancho: en compactos se acorta la etiqueta de salida
  const compactHeader = screenWidth < 450;
  const headerTitleSize = screenWidth < 350 ? 15 : compactHeader ? 20 : 24;
  const headerPadH = compactHeader ? 16 : 20;
  const headerGap = compactHeader ? 6 : 8;
  const logoutLabel = compactHeader ? 'Salir' : 'Cerrar Sesión';

  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const syncActiveIndex = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      const clamped = Math.max(0, Math.min(SECTIONS.length - 1, index));
      if (clamped !== activeIndexRef.current) {
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
      }
    },
    []
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.setValue(event.nativeEvent.contentOffset.x);
      syncActiveIndex(event);
    },
    [scrollX, syncActiveIndex]
  );

  const isPomodoroActive = activeIndex === SECTIONS.length - 1;

  const handleSectionPress = (index: number) => {
    const section = SECTIONS[index];
    if (index !== activeIndexRef.current) {
      scrollViewRef.current?.scrollTo({ x: index * step, animated: !reduceMotion });
      activeIndexRef.current = index;
      setActiveIndex(index);
      return;
    }
    if (section.route) {
      router.push(section.route);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingHorizontal: headerPadH }]}>
        <Text
          style={[styles.headerTitle, { color: colors.primary, fontSize: headerTitleSize }]}
          numberOfLines={1}
        >
          Epsilon Retrieve
        </Text>
        <View style={[styles.headerActions, { gap: headerGap }]}>
          <View style={styles.themeToggle}>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Cambiar tema"
            />
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel={logoutLabel === 'Salir' ? 'Salir' : 'Cerrar Sesión'}
          >
            <Text style={[styles.logoutText, { color: colors.text, fontSize: compactHeader ? 12 : 13 }]}>{logoutLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>Selecciona una sección</Text>

        <View style={styles.carouselViewport}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            snapToAlignment="start"
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            directionalLockEnabled={true}
            removeClippedSubviews={true}
            accessibilityLabel="Carrusel de secciones"
          >
            {SECTIONS.map((section, index) => {
              const isActive = index === activeIndex;
              const isAvailable = section.route !== null;
              const inputRange = [
                (index - 2) * step,
                (index - 1) * step,
                index * step,
                (index + 1) * step,
                (index + 2) * step,
              ];

              const translateX = scrollX.interpolate({
                inputRange,
                outputRange: reduceMotion
                  ? [0, 0, 0, 0, 0]
                  : [sideOffset * 2, sideOffset, 0, -sideOffset, -sideOffset * 2],
                extrapolate: 'clamp',
              });
              const rotateY = scrollX.interpolate({
                inputRange,
                outputRange: reduceMotion
                  ? ['0deg', '0deg', '0deg', '0deg', '0deg']
                  : ['-54deg', '-42deg', '0deg', '42deg', '54deg'],
                extrapolate: 'clamp',
              });
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: reduceMotion
                  ? [1, 1, 1, 1, 1]
                  : [SIDE_SCALE - 0.08, SIDE_SCALE, 1, SIDE_SCALE, SIDE_SCALE - 0.08],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: reduceMotion
                  ? [0.5, 0.8, 1, 0.8, 0.5]
                  : [SIDE_OPACITY - 0.25, SIDE_OPACITY, 1, SIDE_OPACITY, SIDE_OPACITY - 0.25],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={section.id}
                  style={[
                    styles.cardSlot,
                    {
                      width: cardWidth,
                      transform:
                        Platform.OS === 'web'
                          ? [{ scale: isActive ? 1 : 0.94 }]
                          : [{ perspective: 900 }, { translateX }, { rotateY }, { scale }],
                      opacity: Platform.OS === 'web' ? (isActive ? 1 : 0.6) : opacity,
                      zIndex: isActive ? 20 : 10 - Math.abs(index - activeIndex),
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleSectionPress(index)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isAvailable ? section.label : `${section.label}, próximamente`
                    }
                    accessibilityHint={
                      !isAvailable
                        ? 'Esta sección estará disponible próximamente'
                        : isActive
                          ? `Entrar a ${section.label}`
                          : 'Centrar esta sección'
                    }
                    accessibilityState={{ selected: isActive, disabled: !isAvailable }}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                      isActive && {
                        shadowColor: colors.primaryPressed,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                      },
                    ]}
                  >
                    <View style={[
                      styles.cardIconContainer,
                      isActive ? { backgroundColor: 'rgba(255,255,255,0.15)' } : { backgroundColor: colors.surfaceSecondary }
                    ]}>
                      <Text style={[
                        styles.cardIcon,
                        { color: isActive ? colors.onPrimary : colors.text }
                      ]}>{section.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.cardLabel,
                        { color: isActive ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {section.label}
                    </Text>
                    <Text
                      style={[
                        styles.cardTagline,
                        { color: isActive ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
                      ]}
                    >
                      {section.tagline}
                    </Text>

                    <View style={styles.cardFooter}>
                      {!isAvailable ? (
                        <View
                          style={[
                            styles.comingSoonPill,
                            {
                              backgroundColor: isActive
                                ? 'rgba(255,255,255,0.18)'
                                : colors.surfaceSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.comingSoonText,
                              { color: isActive ? colors.onPrimary : colors.textSecondary },
                            ]}
                          >
                            Próximamente
                          </Text>
                        </View>
                      ) : isActive ? (
                        <Text style={[styles.enterHint, { color: colors.onPrimary }]}>Entrar{'  →'}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        <Text style={[styles.hintText, { color: colors.textTertiary }]}>
          {isPomodoroActive
            ? 'Pomodoros estará disponible próximamente'
            : 'Desliza y toca la tarjeta centrada para entrar'}
        </Text>
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
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  themeToggle: {
    marginRight: 4,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  carouselViewport: {
    height: CAROUSEL_HEIGHT,
    width: '100%',
    justifyContent: 'center',
  },
  cardSlot: {
    height: CARD_HEIGHT,
    marginRight: CARD_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 16,
  },
  cardIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 14,
  },
  cardTagline: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  cardFooter: {
    marginTop: 'auto',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enterHint: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  comingSoonPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
});


