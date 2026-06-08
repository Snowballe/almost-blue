import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {
  CHECK_INTERVALS,
  CHECK_INTERVAL_LABELS,
  CheckInterval,
} from '../../stores/useSettingsStore';
import {useTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  value: CheckInterval;
  onChange: (v: CheckInterval) => void;
}

export default function IntervalSelector({value, onChange}: Props) {
  const {colors, typography, spacing} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomColor: colors.border,
          gap: spacing.sm,
        },
      ]}>
      <Text
        style={{
          fontSize: typography.size.md,
          color: colors.textPrimary,
          fontWeight: typography.weight.medium,
        }}>
        Fréquence de vérification
      </Text>
      <View style={styles.chips}>
        {CHECK_INTERVALS.map(interval => {
          const active = interval === value;
          return (
            <TouchableOpacity
              key={interval}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accent + '22' : 'transparent',
                },
              ]}
              onPress={() => onChange(interval)}
              activeOpacity={ACTIVE_OPACITY}>
              <Text
                style={{
                  fontSize: typography.size.sm,
                  color: active ? colors.accent : colors.textMuted,
                  fontWeight: typography.weight.medium,
                }}>
                {CHECK_INTERVAL_LABELS[interval]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {borderBottomWidth: 1},
  chips: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
});
