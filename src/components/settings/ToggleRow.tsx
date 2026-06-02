import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {useTheme} from '../../theme';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  disabledNote?: string;
}

export default function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  disabledNote,
}: Props) {
  const {colors, typography, spacing} = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomColor: colors.border,
          gap: spacing.md,
        },
        disabled && styles.rowDisabled,
      ]}>
      <View style={styles.rowText}>
        <Text
          style={{
            fontSize: typography.size.md,
            color: disabled ? colors.textMuted : colors.textPrimary,
            fontWeight: typography.weight.medium,
          }}>
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontSize: typography.size.sm,
              color: colors.textMuted,
              marginTop: 2,
              lineHeight: 18,
            }}>
            {description}
          </Text>
        ) : null}
        {disabled && disabledNote ? (
          <Text
            style={{
              fontSize: typography.size.xs,
              color: colors.accent,
              marginTop: 4,
              fontStyle: 'italic',
            }}>
            {disabledNote}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{false: colors.border, true: colors.accent}}
        thumbColor={colors.textPrimary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  rowDisabled: {opacity: 0.5},
  rowText: {flex: 1},
});

