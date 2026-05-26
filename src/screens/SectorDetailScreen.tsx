import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {sectors} from '../data/sectors';
import {SubSector} from '../types/sector';
import {getCachedForecast} from '../services/openMeteo';
import {getSubSectorSummary} from '../utils/weatherLogic';
import {WeatherForecast, WeatherScore, SubSectorSummary} from '../types/weather';
import {useSectorsStore} from '../stores/useSectorsStore';
import {theme} from '../theme';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SectorDetail'>;

const SCORE_COLOR: Record<WeatherScore, string> = {
  good: theme.colors.good,
  ok: theme.colors.warning,
  bad: theme.colors.danger,
};
const SCORE_LABEL: Record<WeatherScore, string> = {
  good: 'Sec',
  ok: 'Incertain',
  bad: 'Humide',
};
const ORIENTATION_LABEL: Record<string, string> = {
  N: '↑ N', NE: '↗ NE', E: '→ E', SE: '↘ SE',
  S: '↓ S', SW: '↙ SW', W: '← W', NW: '↖ NW',
};

function formatWindow(
  w: SubSectorSummary['nextGoodWindow'],
): string | null {
  if (!w) return null;
  const d = new Date(`${w.date}T12:00`);
  const day = d.toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric'});
  if (w.startHour === w.endHour) return `${day} ${w.startHour}h`;
  return `${day} ${w.startHour}h–${w.endHour}h`;
}

function SubSectorRow({
  subSector,
  forecast,
}: {
  subSector: SubSector;
  forecast: WeatherForecast | null;
}) {
  const summary: SubSectorSummary | null = forecast
    ? getSubSectorSummary(forecast, subSector.orientation)
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
        {score ? (
          <View style={[styles.badge, {backgroundColor: SCORE_COLOR[score]}]}>
            <Text style={styles.badgeText}>{SCORE_LABEL[score]}</Text>
          </View>
        ) : (
          <View style={[styles.badge, {backgroundColor: theme.colors.border}]}>
            <Text style={styles.badgeText}>—</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SectorDetailScreen({route, navigation}: Props) {
  const {sectorId} = route.params;
  const sector = sectors.find(s => s.id === sectorId)!;
  const {isFavorite, toggleFavorite} = useSectorsStore();
  const isFav = isFavorite(sectorId);

  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCachedForecast(sector.latitude, sector.longitude)
      .then(setForecast)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sector]);

  useEffect(() => {
    navigation.setOptions({
      title: sector.name,
      headerRight: () => (
        <TouchableOpacity onPress={() => toggleFavorite(sectorId)}>
          <Text style={styles.headerFav}>{isFav ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, sector, isFav, toggleFavorite, sectorId]);

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

      <Text style={styles.sectionTitle}>Sous-secteurs — météo 48h</Text>

      {loading && (
        <ActivityIndicator
          style={styles.loader}
          color={theme.colors.accent}
        />
      )}
      {error && (
        <Text style={styles.errorText}>Météo indisponible.</Text>
      )}

      {sector.subSectors.map(ss => (
        <SubSectorRow key={ss.id} subSector={ss} forecast={forecast} />
      ))}
    </ScrollView>
  );
}

const {colors, spacing, typography} = theme;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: spacing.xxxl},
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
  subRowInfo: {flex: 1},
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
  subRowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
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
  subRowWindow: {
    fontSize: typography.size.sm,
    color: theme.colors.good,
    marginTop: 2,
    fontWeight: typography.weight.medium,
  },
  loader: {marginTop: spacing.xl},
  errorText: {
    textAlign: 'center',
    color: colors.danger,
    margin: spacing.lg,
  },
  headerFav: {
    fontSize: 22,
    color: colors.warning,
    marginRight: spacing.md,
  },
});
