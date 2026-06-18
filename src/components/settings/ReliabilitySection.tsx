import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Platform, StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../../theme';
import {
  getReliabilityStatus,
  isReliabilityOk,
  openAlarmPermissionSettings,
  openBatteryOptimizationSettings,
  openPowerManagerSettings,
  ReliabilityStatus,
} from '../../utils/notificationReliability';

/**
 * Section « Fiabilité des notifications » (Android uniquement).
 *
 * Le digest quotidien ne peut partir à l'heure pile que si l'app est exemptée
 * de l'optimisation batterie et autorisée à poser des alarmes exactes — des
 * réglages système que l'app ne peut pas s'auto-accorder. On lit l'état via
 * notifee et on route l'utilisateur vers le bon écran. L'état se rafraîchit au
 * retour de l'app au premier plan (typiquement après être revenu des réglages).
 */
function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    okRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    okText: {
      flex: 1,
      fontSize: typography.size.sm,
      color: colors.good,
      lineHeight: 18,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warning + '18',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionText: {
      flex: 1,
    },
    actionTitle: {
      fontSize: typography.size.md,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
    actionDesc: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    fixBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.accent,
    },
    fixBtnText: {
      fontSize: typography.size.sm,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
  });
}

interface FixRowProps {
  title: string;
  description: string;
  onFix: () => void;
  styles: ReturnType<typeof makeStyles>;
  warningColor: string;
}

function FixRow({title, description, onFix, styles, warningColor}: FixRowProps) {
  return (
    <View style={styles.actionRow}>
      <MaterialIcons name="error-outline" size={18} color={warningColor} />
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <TouchableOpacity style={styles.fixBtn} onPress={onFix} activeOpacity={ACTIVE_OPACITY}>
        <Text style={styles.fixBtnText}>Régler</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ReliabilitySection() {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [status, setStatus] = useState<ReliabilityStatus | null>(null);

  const refresh = useCallback(() => {
    getReliabilityStatus()
      .then(setStatus)
      .catch(e => console.warn('[Reliability] lecture du statut échouée :', e));
  }, []);

  useEffect(() => {
    refresh();
    // Re-vérifie au retour au premier plan (retour des réglages système).
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Android uniquement ; rien tant que le statut n'est pas chargé.
  if (Platform.OS !== 'android' || status === null) return null;

  if (isReliabilityOk(status)) {
    return (
      <View style={styles.okRow}>
        <MaterialIcons name="check-circle" size={18} color={theme.colors.good} />
        <Text style={styles.okText}>
          Livraison à l’heure activée — le résumé quotidien partira à l’heure choisie.
        </Text>
      </View>
    );
  }

  return (
    <>
      {status.batteryOptimized && (
        <FixRow
          title="Optimisation batterie"
          description="Empêche le résumé de partir à l’heure quand l’app est fermée."
          onFix={openBatteryOptimizationSettings}
          styles={styles}
          warningColor={theme.colors.warning}
        />
      )}
      {!status.exactAlarmAllowed && (
        <FixRow
          title="Alarmes exactes"
          description="Nécessaire pour déclencher le résumé à l’heure pile."
          onFix={openAlarmPermissionSettings}
          styles={styles}
          warningColor={theme.colors.warning}
        />
      )}
      {status.needsPowerManager && (
        <FixRow
          title="Démarrage automatique"
          description="Votre constructeur peut bloquer l’app en arrière-plan."
          onFix={openPowerManagerSettings}
          styles={styles}
          warningColor={theme.colors.warning}
        />
      )}
    </>
  );
}
