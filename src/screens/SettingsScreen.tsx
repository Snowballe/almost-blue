import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {
  useSettingsStore,
  CHECK_INTERVALS,
  CHECK_INTERVAL_LABELS,
  CheckInterval,
} from '../stores/useSettingsStore';
import {isDegenerate} from '../utils/seasonLogic';
import MonthDayPicker, {formatSeasonBound} from '../components/MonthDayPicker';
import {sendTestNotification, checkAndNotify} from '../services/notificationService';
import {useNotificationStore} from '../stores/useNotificationStore';
import {useTheme, AppTheme} from '../theme';

// ── Factory de styles ─────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    safe:      {flex: 1, backgroundColor: colors.background},
    container: {flex: 1, backgroundColor: colors.background},
    content:   {paddingBottom: spacing.xxxl},

    sectionHeader: {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    rowDisabled: {opacity: 0.5},
    rowText: {flex: 1},
    rowLabel: {
      fontSize: typography.size.md,
      color: colors.textPrimary,
      fontWeight: typography.weight.medium,
    },
    rowLabelDisabled: {color: colors.textMuted},
    rowDescription: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    rowNote: {
      fontSize: typography.size.xs,
      color: colors.accent,
      marginTop: 4,
      fontStyle: 'italic',
    },
    dateRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dateValue: {
      fontSize: typography.size.md,
      color: colors.textMuted,
    },

    // ── Sélecteur de fréquence ──
    intervalRow: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    chips: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '22',
    },
    chipText: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      fontWeight: typography.weight.medium,
    },
    chipTextActive: {
      color: colors.accent,
    },

    // ── Warning ──
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

    // ── Debug ──
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

    // ── À propos ──
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

type Styles = ReturnType<typeof makeStyles>;

// ── Sous-composants ────────────────────────────────────────────────────────────

function SectionHeader({label, styles}: {label: string; styles: Styles}) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  disabledNote?: string;
  styles: Styles;
  borderColor: string;
  accentColor: string;
  thumbColor: string;
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  disabledNote,
  styles,
  borderColor,
  accentColor,
  thumbColor,
}: ToggleRowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
        {disabled && disabledNote ? (
          <Text style={styles.rowNote}>{disabledNote}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{false: borderColor, true: accentColor}}
        thumbColor={thumbColor}
        ios_backgroundColor={borderColor}
      />
    </View>
  );
}

interface DateRowProps {
  label: string;
  value: string;
  onPress: () => void;
  styles: Styles;
  chevronColor: string;
}

function DateRow({label, value, onPress, styles, chevronColor}: DateRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.dateRowRight}>
        <Text style={styles.dateValue}>{value}</Text>
        <MaterialIcons name="chevron-right" size={20} color={chevronColor} />
      </View>
    </TouchableOpacity>
  );
}

interface IntervalSelectorProps {
  value: CheckInterval;
  onChange: (v: CheckInterval) => void;
  styles: Styles;
}

function IntervalSelector({value, onChange, styles}: IntervalSelectorProps) {
  return (
    <View style={styles.intervalRow}>
      <Text style={styles.rowLabel}>Fréquence de vérification</Text>
      <View style={styles.chips}>
        {CHECK_INTERVALS.map(interval => {
          const active = interval === value;
          return (
            <TouchableOpacity
              key={interval}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(interval)}
              activeOpacity={0.7}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {CHECK_INTERVAL_LABELS[interval]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
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
        <SectionHeader label="Notifications" styles={styles} />

        <ToggleRow
          label="Alertes météo"
          description="Notifie quand les conditions deviennent favorables sur un secteur favori."
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          styles={styles}
          borderColor={colors.border}
          accentColor={colors.accent}
          thumbColor={colors.textPrimary}
        />

        {notificationsEnabled && (
          <>
            <IntervalSelector
              value={checkIntervalMinutes}
              onChange={setCheckIntervalMinutes}
              styles={styles}
            />
            <ToggleRow
              label="Alertes en été"
              description="Envoie des alertes météo même en dehors de la hors-saison."
              value={notificationsInSummer}
              onValueChange={setNotificationsInSummer}
              styles={styles}
              borderColor={colors.border}
              accentColor={colors.accent}
              thumbColor={colors.textPrimary}
            />
          </>
        )}

        {/* ── Saison ── */}
        <SectionHeader label="Saison" styles={styles} />

        <ToggleRow
          label="Hibernation estivale"
          description="Affiche un écran de mise en veille hors de la fenêtre hors-saison."
          value={hibernationEnabled}
          onValueChange={setHibernationEnabled}
          styles={styles}
          borderColor={colors.border}
          accentColor={colors.accent}
          thumbColor={colors.textPrimary}
        />

        {/* ── Fenêtre hors-saison ── */}
        <SectionHeader label="Fenêtre hors-saison" styles={styles} />

        <DateRow
          label="Début"
          value={formatSeasonBound(offseasonStart)}
          onPress={() => setPickerTarget('start')}
          styles={styles}
          chevronColor={colors.textDisabled}
        />
        <DateRow
          label="Fin"
          value={formatSeasonBound(offseasonEnd)}
          onPress={() => setPickerTarget('end')}
          styles={styles}
          chevronColor={colors.textDisabled}
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
          activeOpacity={0.7}>
          <Text style={styles.resetText}>
            Réinitialiser aux dates par défaut (22 sept. → 20 juin)
          </Text>
        </TouchableOpacity>

        {/* ── Apparence ── */}
        <SectionHeader label="Apparence" styles={styles} />

        <ToggleRow
          label="Thème clair"
          description="Passe à une interface claire."
          value={colorScheme === 'light'}
          onValueChange={v => setColorScheme(v ? 'light' : 'dark')}
          styles={styles}
          borderColor={colors.border}
          accentColor={colors.accent}
          thumbColor={colors.textPrimary}
        />

        {/* ── Debug ── */}
        <SectionHeader label="Debug" styles={styles} />

        <TouchableOpacity
          style={styles.debugBtn}
          onPress={() => sendTestNotification()}
          activeOpacity={0.7}>
          <Text style={styles.debugBtnText}>Envoyer une notif de test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.debugBtn}
          onPress={async () => {
            // Reset les scores pour forcer la détection de transition, puis check forcé
            useNotificationStore.getState().clearScores();
            await checkAndNotify(true); // force=true → ignore saison + toggle
          }}
          activeOpacity={0.7}>
          <Text style={styles.debugBtnText}>Forcer un check météo (ignore la saison)</Text>
        </TouchableOpacity>

        {/* ── À propos ── */}
        <SectionHeader label="À propos" styles={styles} />

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
