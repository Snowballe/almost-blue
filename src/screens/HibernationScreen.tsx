import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {nextSeasonChangeDate} from '../utils/seasonLogic';
import {useSettingsStore} from '../stores/useSettingsStore';
import {theme} from '../theme';

interface Props {
  onOverride: () => void;
}

function formatReturnDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

export default function HibernationScreen({onOverride}: Props) {
  const offseasonStart = useSettingsStore(s => s.offseasonStart);
  const offseasonEnd = useSettingsStore(s => s.offseasonEnd);
  const returnDate = nextSeasonChangeDate(new Date(), offseasonStart, offseasonEnd);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <Text style={styles.moon}>🌙</Text>

        <Text style={styles.appName}>Almost Blue</Text>
        <Text style={styles.subtitle}>en hibernation estivale</Text>

        <Text style={styles.body}>
          Les falaises sèchent vite,{'\n'}profites-en !
        </Text>

        <View style={styles.divider} />

        <Text style={styles.returnLabel}>Retour en hors-saison :</Text>
        <Text style={styles.returnDate}>{formatReturnDate(returnDate)}</Text>

      </View>

      <TouchableOpacity
        style={styles.overrideBtn}
        onPress={onOverride}
        activeOpacity={0.75}>
        <Text style={styles.overrideBtnText}>Voir quand même  →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const {colors, spacing, typography} = theme;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  moon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
  body: {
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  returnLabel: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  returnDate: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  overrideBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  overrideBtnText: {
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
});
