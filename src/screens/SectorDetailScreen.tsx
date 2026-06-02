import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {sectors} from '../data/sectors';
import {SubSector} from '../types/sector';
import {getCachedForecast} from '../services/openMeteo';
import {getSubSectorSummary} from '../utils/weatherLogic';
import {WeatherForecast, WeatherScore, SubSectorSummary} from '../types/weather';
import {useSectorsStore} from '../stores/useSectorsStore';
import {useTheme, AppTheme} from '../theme';
import {RootStackParamList} from '../navigation/AppNavigator';
import {ORIENTATION_LABEL} from '../utils/orientationUtils';
import FavoriteButton from '../components/FavoriteButton';
import {numericScoreGradientColor} from '../utils/colorUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'SectorDetail'>;

const SCORE_LABEL: Record<WeatherScore, string> = {
  good: 'Sec',
  ok: 'Incertain',
  bad: 'Humide',
};

function formatWindow(w: SubSectorSummary['nextGoodWindow']): string | null {
  if (!w) return null;
  const d = new Date(`${w.date}T12:00`);
  const day = d.toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric'});
  if (w.startHour === w.endHour) return `${day} ${w.startHour}h`;
  return `${day} ${w.startHour}h–${w.endHour}h`;
}

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    container:    {flex: 1, backgroundColor: colors.background},
    content:      {paddingBottom: spacing.xxxl},
    metaBlock: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metaText: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginBottom: 2,
    },
    notes: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    sectionTitle: {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    subRowInfo:  {flex: 1},
    subRowName: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.medium,
      color: colors.textPrimary,
    },
    subRowNotes: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    subRowRight: {alignItems: 'flex-end', gap: spacing.xs},
    subRowWindow: {
      fontSize: typography.size.sm,
      color: colors.good,
      marginTop: 2,
      fontWeight: typography.weight.medium,
    },
    orientation: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      fontWeight: typography.weight.medium,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      color: colors.background,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
    },
    loader:     {marginTop: spacing.xl},
    errorText:  {textAlign: 'center', color: colors.danger, margin: spacing.lg},
    retryBtn: {
      alignSelf: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    retryText: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
    },
    headerFavContainer: {marginRight: spacing.md},
  });
}

function SubSectorRow({
  subSector,
  forecast,
  styles,
}: {
  subSector: SubSector;
  forecast: WeatherForecast | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const {colors} = useTheme();
  const summary: SubSectorSummary | null = forecast
    ? getSubSectorSummary(forecast, subSector.orientation, subSector.rockType)
    : null;
  const score = summary?.score ?? null;
  const window = summary ? formatWindow(summary.nextGoodWindow) : null;

  return (
    <View style={styles.subRow}>
      <View style={styles.subRowInfo}>
        <Text style={styles.subRowName}>{subSector.name}</Text>
        {window && score === 'good' ? (
          <Text style={styles.subRowWindow}>{window}</Text>
        ) : null}
        {subSector.notes ? (
          <Text style={styles.subRowNotes}>{subSector.notes}</Text>
        ) : null}
      </View>
      <View style={styles.subRowRight}>
        <Text style={styles.orientation}>
          {ORIENTATION_LABEL[subSector.orientation]}
        </Text>
        {summary ? (
          <View style={[styles.badge, {backgroundColor: numericScoreGradientColor(summary.numericScore)}]}>
            <Text style={styles.badgeText}>
              {SCORE_LABEL[score!]} · {summary.numericScore.toFixed(1)}/10
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, {backgroundColor: colors.border}]}>
            <Text style={styles.badgeText}>—</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SectorDetailScreen({route, navigation}: Props) {
  const theme = useTheme();
  const {colors} = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const {sectorId} = route.params;
  // On n'utilise pas de non-null assertion (!) : un deep link malformé ou un ID
  // supprimé de sectors.ts retournerait undefined et crasherait l'app.
  const sector = sectors.find(s => s.id === sectorId) ?? null;
  const {isFavorite, toggleFavorite} = useSectorsStore();
  const isFav = isFavorite(sectorId);

  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extraction en callback pour permettre le retry manuel depuis l'UI.
  const loadForecast = useCallback(() => {
    if (!sector) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    getCachedForecast(sector.latitude, sector.longitude)
      .then(setForecast)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sector]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    navigation.setOptions({
      title: sector?.name ?? 'Secteur',
      headerRight: sector
        ? () => (
            <FavoriteButton
              isFav={isFav}
              onPress={() => toggleFavorite(sectorId)}
              style={styles.headerFavContainer}
            />
          )
        : undefined,
    });
  }, [navigation, sector, isFav, toggleFavorite, sectorId, styles]);

  // Rendu de secours si le secteur est introuvable (deep link invalide, etc.)
  if (!sector) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Secteur introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.metaBlock}>
        {sector.altitude != null && (
          <Text style={styles.metaText}>Altitude : {sector.altitude}m</Text>
        )}
        <Text style={styles.metaText}>
          {sector.latitude.toFixed(4)}°N, {sector.longitude.toFixed(4)}°E
        </Text>
        {sector.notes ? (
          <Text style={styles.notes}>{sector.notes}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Sous-secteurs — météo 72h</Text>

      {loading && (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      )}
      {error && (
        <>
          <Text style={styles.errorText}>Météo indisponible.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadForecast}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </>
      )}

      {sector.subSectors.map(ss => (
        <SubSectorRow
          key={ss.id}
          subSector={ss}
          forecast={forecast}
          styles={styles}
        />
      ))}
    </ScrollView>
  );
}
