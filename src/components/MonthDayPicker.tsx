import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SeasonBound, maxDayForMonth} from '../utils/seasonLogic';
import {useTheme, AppTheme} from '../theme';

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

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
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
      height: ITEM_H * 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    column:     {flex: 1},
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
    itemActive:     {backgroundColor: colors.accent + '22'},
    itemText:       {fontSize: typography.size.md, color: colors.textMuted},
    itemTextActive: {color: colors.accent, fontWeight: typography.weight.semibold},
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
    btnCancelText:  {fontSize: typography.size.md, color: colors.textMuted},
    btnConfirm:     {flex: 1, paddingVertical: spacing.md, alignItems: 'center'},
    btnConfirmText: {
      fontSize: typography.size.md,
      color: colors.accent,
      fontWeight: typography.weight.semibold,
    },
  });
}

interface ColumnProps {
  data: {label: string; value: number}[];
  selected: number;
  onSelect: (v: number) => void;
  styles: ReturnType<typeof makeStyles>;
  accentColor: string;
}

function PickerColumn({data, selected, onSelect, styles, accentColor}: ColumnProps) {
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    const idx = data.findIndex(d => d.value === selected);
    if (idx < 0) {
      return;
    }
    // Cleanup indispensable : si le composant est démonté dans les 80 ms,
    // scrollToIndex s'exécuterait sur un ref stale.
    const timer = setTimeout(() => {
      ref.current?.scrollToIndex({index: idx, animated: true, viewPosition: 0.5});
    }, 80);
    return () => clearTimeout(timer);
  }, [selected, data]);

  return (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={item => String(item.value)}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({length: ITEM_H, offset: ITEM_H * index, index})}
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

export default function MonthDayPicker({visible, title, value, onChange, onClose}: Props) {
  const theme = useTheme();
  const {colors} = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [localMonth, setLocalMonth] = useState(value.month);
  const [localDay, setLocalDay] = useState(value.day);

  useEffect(() => {
    if (visible) {
      setLocalMonth(value.month);
      setLocalDay(value.day);
    }
  }, [visible, value]);

  function handleMonthChange(m: number) {
    setLocalMonth(m);
    const max = maxDayForMonth(m);
    if (localDay > max) setLocalDay(max);
  }

  const monthData = MONTHS_FR.map((name, i) => ({label: name, value: i + 1}));
  const dayMax = maxDayForMonth(localMonth);
  const dayData = Array.from({length: dayMax}, (_, i) => ({label: String(i + 1), value: i + 1}));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.columnsRow}>
            <Text style={styles.colLabel}>Mois</Text>
            <Text style={styles.colLabel}>Jour</Text>
          </View>

          <View style={styles.columns}>
            <PickerColumn data={monthData} selected={localMonth} onSelect={handleMonthChange} styles={styles} accentColor={colors.accent} />
            <View style={styles.colDivider} />
            <PickerColumn data={dayData} selected={localDay} onSelect={setLocalDay} styles={styles} accentColor={colors.accent} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={() => { onChange({month: localMonth, day: localDay}); onClose(); }}>
              <Text style={styles.btnConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
