import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  value: number;
  onChange: (h: number) => void;
}

export default function HourSelector({value, onChange}: Props) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const label = `${String(value).padStart(2, '0')}h00`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heure du résumé</Text>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => onChange((value + 23) % 24)}
          activeOpacity={ACTIVE_OPACITY}
          style={styles.btn}>
          <Text style={styles.btnLabel}>−</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{label}</Text>
        <TouchableOpacity
          onPress={() => onChange((value + 1) % 24)}
          activeOpacity={ACTIVE_OPACITY}
          style={styles.btn}>
          <Text style={styles.btnLabel}>+</Text>
        </TouchableOpacity>
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
      paddingBottom: spacing.md,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: typography.size.md,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
    row: {flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8},
    btn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
    },
    btnLabel: {fontSize: typography.size.lg, color: colors.textPrimary, lineHeight: 22},
    value: {
      fontSize: typography.size.md,
      color: colors.accent,
      fontWeight: typography.weight.medium,
      minWidth: 56,
      textAlign: 'center',
    },
  });
}
