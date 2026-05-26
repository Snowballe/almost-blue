import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SeasonBound, maxDayForMonth} from '../utils/seasonLogic';
import {theme} from '../theme';

const {colors, spacing, typography} = theme;

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const MONTHS_FR_SHORT = [
  'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function formatSeasonBound(b: SeasonBound): string {
  return `${b.day} ${MONTHS_FR_SHORT[b.month - 1]}`;
}

const ITEM_H = 48;

interface ColumnProps {
  data: {label: string; value: number}[];
  selected: number;
  onSelect: (v: number) => void;
}

function PickerColumn({data, selected, onSelect}: ColumnProps) {
  const ref = useRef<FlatList>(null);

  // Scroll to selected item on mount / when selected changes
  useEffect(() => {
    const idx = data.findIndex(d => d.value === selected);
    if (idx >= 0) {
      // Short delay to let the list render first
      setTimeout(() => {
        ref.current?.scrollToIndex({index: idx, animated: true, viewPosition: 0.5});
      }, 80);
    }
  }, [selected, data]);

  return (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={item => String(item.value)}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({
        length: ITEM_H,
        offset: ITEM_H * index,
        index,
      })}
      renderItem={({item}) => {
        const active = item.value === selected;
        return (
          <TouchableOpacity
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onSelect(item.value)}
            activeOpacity={0.7}>
            <Text style={[styles.itemText, active && styles.itemTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

interface Props {
  visible: boolean;
  title: string;
  value: SeasonBound;
  onChange: (v: SeasonBound) => void;
  onClose: () => void;
}

export default function MonthDayPicker({
  visible,
  title,
  value,
  onChange,
  onClose,
}: Props) {
  const [localMonth, setLocalMonth] = useState(value.month);
  const [localDay, setLocalDay] = useState(value.day);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalMonth(value.month);
      setLocalDay(value.day);
    }
  }, [visible, value]);

  // Clamp day when month changes (e.g. jour 31 → fév → jour 28)
  function handleMonthChange(m: number) {
    setLocalMonth(m);
    const max = maxDayForMonth(m);
    if (localDay > max) setLocalDay(max);
  }

  const monthData = MONTHS_FR.map((name, i) => ({label: name, value: i + 1}));
  const dayMax = maxDayForMonth(localMonth);
  const dayData = Array.from({length: dayMax}, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.columnsRow}>
            {/* Header labels */}
            <Text style={styles.colLabel}>Mois</Text>
            <Text style={styles.colLabel}>Jour</Text>
          </View>

          <View style={styles.columns}>
            <PickerColumn
              data={monthData}
              selected={localMonth}
              onSelect={handleMonthChange}
            />
            <View style={styles.colDivider} />
            <PickerColumn
              data={dayData}
              selected={localDay}
              onSelect={setLocalDay}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={() => {
                onChange({month: localMonth, day: localDay});
                onClose();
              }}>
              <Text style={styles.btnConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  colLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  columns: {
    flexDirection: 'row',
    height: ITEM_H * 5, // show ~5 items at a time
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  column: {
    flex: 1,
  },
  colDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  item: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.accent + '22', // accent à 13% d'opacité
  },
  itemText: {
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  itemTextActive: {
    color: colors.accent,
    fontWeight: typography.weight.semibold,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  btnCancelText: {
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnConfirmText: {
    fontSize: typography.size.md,
    color: colors.accent,
    fontWeight: typography.weight.semibold,
  },
});
