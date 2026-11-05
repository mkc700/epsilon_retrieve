import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AgendaEvent, MAX_AGENDA_DATE, MIN_AGENDA_DATE, dateKey, monthCells, parseDate, shiftMonth } from './model';

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export const formatAgendaDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  parseDate(date).toLocaleDateString('es-MX', options);
export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface Props {
  selectedDate: string;
  month: string;
  events: AgendaEvent[];
  onSelect: (date: string) => void;
  onMonthChange: (date: string) => void;
  onToday: () => void;
  compact?: boolean;
  picker?: boolean;
}

export function MonthCalendar({
  selectedDate, month, events, onSelect, onMonthChange, onToday,
  compact = false, picker = false,
}: Props) {
  const { colors } = useTheme();
  const today = dateKey(new Date());
  const small = compact || picker;
  const cells = useMemo(() => monthCells(month), [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      if (event.deleted) continue;
      const items = map.get(event.date) || [];
      items.push(event);
      map.set(event.date, items);
    }
    for (const items of map.values()) items.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [events]);

  return (
    <View>
      <View style={[styles.heading, small && styles.compactHeading, picker && styles.pickerHeading]}>
        <View style={styles.monthTitle}>
          <Text accessibilityRole="header" style={[styles.month, { color: colors.text }, small && { fontSize: 18 }]}>
            {capitalize(formatAgendaDate(month, { month: 'long' }))}
          </Text>
          <Text style={[styles.year, { color: colors.textSecondary }, small && { fontSize: 12 }]}>
            {parseDate(month).getFullYear()}
          </Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={picker ? 'Mes anterior del selector' : 'Mes anterior'}
            disabled={month.slice(0, 7) === MIN_AGENDA_DATE.slice(0, 7)}
            onPress={() => onMonthChange(shiftMonth(month, -1))} style={[styles.arrow, small && { width: 30 }]}>
            <Feather name="chevron-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onToday}
            style={[styles.today, { borderColor: colors.border }, small && { paddingHorizontal: 9 }]}>
            <Text style={[styles.todayText, { color: colors.text }]}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={picker ? 'Mes siguiente del selector' : 'Mes siguiente'}
            disabled={month.slice(0, 7) === MAX_AGENDA_DATE.slice(0, 7)}
            onPress={() => onMonthChange(shiftMonth(month, 1))} style={[styles.arrow, small && { width: 30 }]}>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekdays}>
        {DAYS.map(day => <Text key={day} style={[styles.weekday, { color: colors.textSecondary }]}>{day}</Text>)}
      </View>
      <View style={styles.grid}>
        {cells.map(date => {
          const items = byDate.get(date) || [];
          const selected = date === selectedDate;
          const isToday = date === today;
          const outside = date.slice(0, 7) !== month.slice(0, 7);
          const disabled = date < MIN_AGENDA_DATE || date > MAX_AGENDA_DATE;
          return (
            <TouchableOpacity key={date} accessibilityRole="button"
              accessibilityLabel={`${formatAgendaDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${isToday ? ', hoy' : ''}${selected ? ', seleccionado' : ''}, ${items.length} ${items.length === 1 ? 'evento' : 'eventos'}`}
              accessibilityState={{ selected, disabled }} disabled={disabled}
              onPress={() => onSelect(date)}
              style={[
                styles.day, small ? styles.smallDay : styles.largeDay,
                { borderColor: colors.border, backgroundColor: selected ? colors.primaryLight : 'transparent' },
                outside && { opacity: 0.4 }, disabled && { opacity: 0.15 },
              ]}>
              <View style={[
                styles.dayNumber, small && styles.smallNumber,
                selected && { backgroundColor: colors.primary },
                isToday && !selected && { borderWidth: 1, borderColor: colors.primary },
              ]}>
                <Text style={[
                  styles.dayText, { color: selected ? '#FFF' : isToday ? colors.primary : colors.text },
                  (selected || isToday) && { fontWeight: '700' },
                ]}>{parseDate(date).getDate()}</Text>
              </View>
              {small ? (
                <View style={styles.dots}>
                  {items.slice(0, 3).map(item => <View key={item.id} style={[styles.dot, { backgroundColor: colors.primary }]} />)}
                  {items.length > 3 && <Text style={[styles.extraDot, { color: colors.primary }]}>+</Text>}
                </View>
              ) : (
                <View style={styles.previews}>
                  {items.slice(0, 2).map(item => (
                    <View key={item.id} style={[styles.eventPreview, { backgroundColor: colors.surfaceSecondary }]}>
                      <View style={[styles.eventAccent, { backgroundColor: colors.primary }]} />
                      <Text numberOfLines={1} style={[styles.eventText, { color: colors.text }]}>
                        {item.time ? `${item.time} ` : ''}{item.title}
                      </Text>
                    </View>
                  ))}
                  {items.length > 2 && <Text style={[styles.more, { color: colors.textSecondary }]}>+{items.length - 2} más</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22, gap: 10 },
  compactHeading: { paddingHorizontal: 13, gap: 4 },
  pickerHeading: { paddingHorizontal: 8, paddingVertical: 12 },
  monthTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
  month: { fontSize: 23, fontWeight: '700', letterSpacing: -0.6 },
  year: { fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  arrow: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  todayText: { fontSize: 12, fontWeight: '500' },
  weekdays: { flexDirection: 'row', paddingBottom: 12 },
  weekday: { width: '14.285714%', textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.285714%', borderTopWidth: StyleSheet.hairlineWidth, padding: 6 },
  smallDay: { height: 59, alignItems: 'center' },
  largeDay: { minHeight: 112 },
  dayNumber: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  smallNumber: { width: 32, height: 32, borderRadius: 11 },
  dayText: { fontSize: 13 },
  dots: { height: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  extraDot: { fontSize: 10, lineHeight: 11 },
  previews: { marginTop: 4, gap: 3 },
  eventPreview: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 4, gap: 4 },
  eventAccent: { width: 2, height: 11, borderRadius: 1 },
  eventText: { fontSize: 9, flexShrink: 1 },
  more: { fontSize: 9, paddingLeft: 5 },
});
