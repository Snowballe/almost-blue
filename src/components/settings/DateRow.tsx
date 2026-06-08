import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {useTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  label: string;
  value: string;
  onPress: () => void;
}

export default function DateRow({label, value, onPress}: Props) {
  const {colors, typography, spacing} = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomColor: colors.border,
          gap: spacing.md,
        },
      ]}
      onPress={onPress}
      activeOpacity={ACTIVE_OPACITY}>
      <Text
        style={{
          flex: 1,
          fontSize: typography.size.md,
          color: colors.textPrimary,
          fontWeight: typography.weight.medium,
        }}>
        {label}
      </Text>
      <View style={styles.right}>
        <Text style={{fontSize: typography.size.md, color: colors.textMuted}}>
          {value}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  right: {flexDirection: 'row', alignItems: 'center', gap: 4},
});
