import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {useSettingsStore} from '../stores/useSettingsStore';
import {isDegenerate} from '../utils/seasonLogic';
import MonthDayPicker, {formatSeasonBound} from '../components/MonthDayPicker';
import {sendTestNotification, checkAndNotify} from '../services/notificationService';
import {useNotificationStore} from '../stores/useNotificationStore';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../theme';
import SectionHeader from '../components/settings/SectionHeader';
import ToggleRow from '../components/settings/ToggleRow';
import DateRow from '../components/settings/DateRow';
import IntervalSelector from '../components/settings/IntervalSelector';

// ── Factory de styles ─────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    safe:      {flex: 1, backgroundColor: colors.background},
    container: {flex: 1, backgroundColor: colors.background},
    content:   {paddingBottom: spacing.xxxl},

    warningBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.warning + '18',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    warningIcon: {marginTop: 1},
    warningText: {
      flex: 1,
      fontSize: typography.size.sm,
      color: colors.warning,
      lineHeight: 18,
    },
    resetRow: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resetText: {
      fontSize: typography.size.sm,
      color: colors.accent,
      textAlign: 'center',
    },
    debugBtn: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    debugBtnText: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
    },
    aboutBlock: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    aboutTitle: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
    },
    aboutText: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}

// ── Écran principal ────────────────────────────────────────────────────────────

type PickerTarget = 'start' | 'end' | null;

export default function SettingsScreen() {
  const theme = useTheme();
  const {colors} = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const {
    notificationsEnabled,
    checkIntervalMinutes,
    notificationsInSummer,
    hibernationEnabled,
    colorScheme,
    offseasonStart,
    offseasonEnd,
    setNotificationsEnabled,
    setCheckIntervalMinutes,
    setNotificationsInSummer,
    setHibernationEnabled,
    setColorScheme,
    setOffseasonStart,
    setOffseasonEnd,
    resetOffseasonDates,
  } = useSettingsStore();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const datesAreDegen = isDegenerate(offseasonStart, offseasonEnd);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Notifications ── */}
        <SectionHeader label="Notifications" />

        <ToggleRow
          label="Alertes météo"
          description="Notifie quand les conditions deviennent favorables sur un secteur favori."
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />

        {notificationsEnabled && (
          <>
            <IntervalSelector
              value={checkIntervalMinutes}
              onChange={setCheckIntervalMinutes}
            />
            <ToggleRow
              label="Alertes en été"
              description="Envoie des alertes météo même en dehors de la hors-saison."
              value={notificationsInSummer}
              onValueChange={setNotificationsInSummer}
            />
          </>
        )}

        {/* ── Saison ── */}
        <SectionHeader label="Saison" />

        <ToggleRow
          label="Hibernation estivale"
          description="Affiche un écran de mise en veille hors de la fenêtre hors-saison."
          value={hibernationEnabled}
          onValueChange={setHibernationEnabled}
        />

        {/* ── Fenêtre hors-saison ── */}
        <SectionHeader label="Fenêtre hors-saison" />

        <DateRow
          label="Début"
          value={formatSeasonBound(offseasonStart)}
          onPress={() => setPickerTarget('start')}
        />
        <DateRow
          label="Fin"
          value={formatSeasonBound(offseasonEnd)}
          onPress={() => setPickerTarget('end')}
        />

        {datesAreDegen && (
          <View style={styles.warningBlock}>
            <MaterialIcons name="warning" size={16} color={colors.warning} style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Début et fin identiques — toute l'année sera considérée hors-saison.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.resetRow}
          onPress={resetOffseasonDates}
          activeOpacity={ACTIVE_OPACITY}>
          <Text style={styles.resetText}>
            Réinitialiser aux dates par défaut (1er nov. → 31 mars)
          </Text>
        </TouchableOpacity>

        {/* ── Apparence ── */}
        <SectionHeader label="Apparence" />

        <ToggleRow
          label="Thème clair"
          description="Passe à une interface claire."
          value={colorScheme === 'light'}
          onValueChange={v => setColorScheme(v ? 'light' : 'dark')}
        />

        {/* ── Debug ── */}
        <SectionHeader label="Debug" />

        <TouchableOpacity
          style={styles.debugBtn}
          onPress={() => {
            // Pas d'await intentionnel ici (bouton debug fire-and-forget),
            // mais on attrape les erreurs pour éviter un crash silencieux.
            sendTestNotification().catch(e =>
              console.warn('[Debug] sendTestNotification échoué :', e),
            );
          }}
          activeOpacity={ACTIVE_OPACITY}>
          <Text style={styles.debugBtnText}>Envoyer une notif de test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.debugBtn}
          onPress={async () => {
            try {
              // Reset les scores pour forcer la détection de transition, puis check forcé
              useNotificationStore.getState().clearScores();
              await checkAndNotify(true); // force=true → ignore saison + toggle
            } catch (e) {
              console.warn('[Debug] checkAndNotify échoué :', e);
            }
          }}
          activeOpacity={ACTIVE_OPACITY}>
          <Text style={styles.debugBtnText}>Forcer un check météo (ignore la saison)</Text>
        </TouchableOpacity>

        {/* ── À propos ── */}
        <SectionHeader label="À propos" />

        <View style={styles.aboutBlock}>
          <Text style={styles.aboutTitle}>Almost Blue</Text>
          <Text style={styles.aboutText}>
            Conditions météo pour les grimpeurs·ses outdoor, en dehors de la saison estivale.
          </Text>
          <Text style={styles.aboutText}>
            Données météo : Open-Meteo (open-meteo.com)
          </Text>
          <Text style={styles.aboutText}>
            Fonds de carte : OpenStreetMap contributors
          </Text>
        </View>

      </ScrollView>

      {/* ── Pickers ── */}
      <MonthDayPicker
        visible={pickerTarget === 'start'}
        title="Début de la hors-saison"
        value={offseasonStart}
        onChange={setOffseasonStart}
        onClose={() => setPickerTarget(null)}
      />
      <MonthDayPicker
        visible={pickerTarget === 'end'}
        title="Fin de la hors-saison"
        value={offseasonEnd}
        onChange={setOffseasonEnd}
        onClose={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
}
