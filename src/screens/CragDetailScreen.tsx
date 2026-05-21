import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fetchForecast} from '../services/openMeteo';
import {buildForecast} from '../utils/weatherLogic';
import {WeatherForecast, WeatherSlot} from '../types/weather';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CragDetail'>;

const SCORE_COLOR = {good: '#22c55e', ok: '#f59e0b', bad: '#ef4444'};
const SCORE_LABEL = {good: 'Bon', ok: 'Correct', bad: 'Mauvais'};

function SlotRow({slot}: {slot: WeatherSlot}) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotTime}>
        {slot.date} {String(slot.hour).padStart(2, '0')}h
      </Text>
      <View style={[styles.badge, {backgroundColor: SCORE_COLOR[slot.score]}]}>
        <Text style={styles.badgeText}>{SCORE_LABEL[slot.score]}</Text>
      </View>
      <Text style={styles.slotMeta}>
        {slot.temperature}°C · {slot.windspeed}km/h · {slot.precipitation}mm
      </Text>
    </View>
  );
}

export default function CragDetailScreen({route}: Props) {
  const {crag} = route.params;
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForecast(crag.latitude, crag.longitude)
      .then(hourly => setForecast(buildForecast(hourly)))
      .catch(() => setError('Impossible de charger la météo.'))
      .finally(() => setLoading(false));
  }, [crag]);

  const types = [
    crag.sport_climbing && 'Voie',
    crag.bouldering && 'Bloc',
    crag.multi_pitch && 'Grande voie',
    crag.trad_climbing && 'Trad',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{crag.name}</Text>
        <Text style={styles.location}>
          {[crag.city, crag.region, crag.country].filter(Boolean).join(', ')}
        </Text>
        {types ? <Text style={styles.types}>{types}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Fenêtres météo — 72h</Text>

      {loading && <ActivityIndicator style={styles.loader} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {forecast?.slots
        .filter(s => s.hour >= 7 && s.hour <= 20)
        .map((slot, i) => <SlotRow key={i} slot={slot} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {padding: 16, backgroundColor: '#fff', marginBottom: 8},
  name: {fontSize: 22, fontWeight: '700', color: '#111'},
  location: {fontSize: 14, color: '#6b7280', marginTop: 4},
  types: {fontSize: 13, color: '#3b82f6', marginTop: 6},
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  slotTime: {width: 100, fontSize: 13, color: '#374151'},
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  badgeText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  slotMeta: {flex: 1, fontSize: 12, color: '#9ca3af'},
  loader: {marginTop: 30},
  error: {textAlign: 'center', color: '#ef4444', margin: 16},
});
