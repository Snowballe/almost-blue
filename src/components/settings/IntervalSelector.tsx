import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {
  CHECK_INTERVALS,
  CHECK_INTERVAL_LABELS,
  CheckInterval,
} from '../../stores/useSettingsStore';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  value: CheckInterval;
  onChange: (v: CheckInterval) => void;
}

export default function IntervalSelector({value, onChange}: Props) {
  const theme = useTheme();
  const {colors} = theme;
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fréquence de vérification</Text>
      <View style={styles.chips}>
        {CHECK_INTERVALS.map(interval => {
          const active = interval === value;
          return (
            <TouchableOpacity
              key={interval}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => onChange(interval)}
              activeOpacity={ACTIVE_OPACITY}>
              <Text
                style={[
                  styles.chipLabel,
                  {color: active ? colors.accent : colors.textMuted},
                ]}>
                {CHECK_INTERVAL_LABELS[interval]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.size.md,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
    chips: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipActive: {borderColor: colors.accent, backgroundColor: colors.accent + '22'},
    chipInactive: {borderColor: colors.border, backgroundColor: 'transparent'},
    chipLabel: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },
  });
}
