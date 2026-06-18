import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useTheme, ACTIVE_OPACITY} from '../../theme';

interface Props {
  value: number;
  onChange: (h: number) => void;
}

export default function HourSelector({value, onChange}: Props) {
  const {colors, typography, spacing} = useTheme();
  const label = `${String(value).padStart(2, '0')}h00`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          borderBottomColor: colors.border,
        },
      ]}>
      <Text
        style={{
          fontSize: typography.size.md,
          color: colors.textPrimary,
          fontWeight: typography.weight.medium,
        }}>
        Heure du résumé
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => onChange((value + 23) % 24)}
          activeOpacity={ACTIVE_OPACITY}
          style={[styles.btn, {borderColor: colors.border}]}>
          <Text style={{fontSize: typography.size.lg, color: colors.textPrimary, lineHeight: 22}}>
            −
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            fontSize: typography.size.md,
            color: colors.accent,
            fontWeight: typography.weight.medium,
            minWidth: 56,
            textAlign: 'center',
          }}>
          {label}
        </Text>
        <TouchableOpacity
          onPress={() => onChange((value + 1) % 24)}
          activeOpacity={ACTIVE_OPACITY}
          style={[styles.btn, {borderColor: colors.border}]}>
          <Text style={{fontSize: typography.size.lg, color: colors.textPrimary, lineHeight: 22}}>
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {borderBottomWidth: 1},
  row: {flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8},
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
