import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  label: string;
  value: string;
  onPress: () => void;
}

export default function DateRow({label, value, onPress}: Props) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={ACTIVE_OPACITY}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={styles.value}>{value}</Text>
        <MaterialIcons name="chevron-right" size={20} color={theme.colors.textDisabled} />
      </View>
    </TouchableOpacity>
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
    label: {
      flex: 1,
      fontSize: typography.size.md,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
    value: {fontSize: typography.size.md, color: colors.textMuted},
    right: {flexDirection: 'row', alignItems: 'center', gap: 4},
  });
}
