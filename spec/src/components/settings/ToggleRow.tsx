import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {useTheme, AppTheme} from '../../theme';

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
  const theme = useTheme();
  const {colors} = theme;
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.label,
            {color: disabled ? colors.textMuted : colors.textPrimary},
          ]}>
          {label}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {disabled && disabledNote ? (
          <Text style={styles.note}>{disabledNote}</Text>
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

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    rowDisabled: {opacity: 0.5},
    rowText: {flex: 1},
    label: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.medium,
    },
    description: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    note: {
      fontSize: typography.size.xs,
      color: colors.accent,
      marginTop: 4,
      fontStyle: 'italic',
    },
  });
}
