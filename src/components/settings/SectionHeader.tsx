import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useTheme} from '../../theme';

export default function SectionHeader({label}: {label: string}) {
  const {colors, typography, spacing} = useTheme();
  return (
    <Text
      style={[
        styles.base,
        {
          color: colors.textMuted,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.sm,
        },
      ]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {textTransform: 'uppercase', letterSpacing: 0.8},
});
