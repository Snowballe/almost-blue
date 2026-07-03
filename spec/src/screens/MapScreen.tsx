import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {Camera, Map, ViewAnnotation} from '@maplibre/maplibre-react-native';
import type {StyleSpecification} from '@maplibre/maplibre-gl-style-spec';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {sectors} from '../data/sectors';
import {Sector} from '../types/sector';
import {useSectorsStore} from '../stores/useSectorsStore';
import {getCachedForecast} from '../services/openMeteo';
import {getSubSectorSummary} from '../utils/weatherLogic';
import {useTheme, AppTheme} from '../theme';
import {numericScoreGradientColor} from '../utils/colorUtils';
import {RootStackParamList} from '../navigation/AppNavigator';
import FavoriteButton from '../components/FavoriteButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
};

const FRANCE_CENTER: [number, number] = [2.3, 46.5];

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{id: 'osm', type: 'raster', source: 'osm'}],
};

const SHEET_HEIGHT = 460;

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    container: {flex: 1},
    map:       {flex: 1},
    pin: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2.5,
      borderColor: colors.white,
      elevation: 3,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      elevation: 8,
      overflow: 'hidden',
    },
    sheetInner: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    sheetTitle: {
      flex: 1,
      fontSize: typography.size.lg,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
      marginRight: spacing.md,
    },
    altitude: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    subList: {flex: 1, marginBottom: spacing.md},
    subRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subName:        {fontSize: typography.size.md, color: colors.textPrimary},
    subOrientation: {
      fontSize: typography.size.md,
      color: colors.textMuted,
      fontWeight: typography.weight.medium,
    },
    detailBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    detailBtnText: {
      color: colors.white,
      fontSize: typography.size.md,
      fontWeight: typography.weight.semibold,
    },
  });
}

export default function MapScreen({navigation}: Props) {
  const theme = useTheme();
  const {colors} = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [selected, setSelected] = useState<Sector | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pinColors, setPinColors] = useState<Record<string, string>>({});
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const {isFavorite, toggleFavorite} = useSectorsStore();

  useEffect(() => {
    // Toutes les requêtes en parallèle ; une seule mise à jour d'état à la fin
    // (au lieu de N appels setPinColors séparés → N re-renders).
    // allSettled : une erreur réseau sur un secteur n'annule pas les autres.
    Promise.allSettled(
      sectors.map(sector =>
        getCachedForecast(sector.latitude, sector.longitude).then(forecast => ({
          id: sector.id,
          color: numericScoreGradientColor(
            Math.max(
              ...sector.subSectors.map(
                ss => getSubSectorSummary(forecast, ss.orientation, ss.rockType).numericScore,
              ),
            ),
          ),
        })),
      ),
    ).then(results => {
      const pinColorMap: Record<string, string> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          pinColorMap[r.value.id] = r.value.color;
        }
      }
      setPinColors(pinColorMap);
    });
  }, []);

  const openSheet = useCallback(
    (sector: Sector) => {
      setSelected(sector);
      setSheetVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    },
    [slideAnim],
  );

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelected(null);
    });
  }, [slideAnim]);

  const handleNavigateToDetail = useCallback(() => {
    if (!selected) return;
    // On capture l'id AVANT de lancer l'animation, car closeSheet() va null-ifier
    // `selected` dans son callback — et setTimeout avec un délai magique n'est pas
    // fiable sur les devices lents. On utilise le callback natif de l'animation.
    const sectorId = selected.id;
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelected(null);
      navigation.navigate('SectorDetail', {sectorId});
    });
  }, [selected, navigation, slideAnim]);

  const isFav = selected ? isFavorite(selected.id) : false;

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={OSM_STYLE}>
        <Camera initialViewState={{center: FRANCE_CENTER, zoom: 5}} />
        {sectors.map(sector => (
          <ViewAnnotation
            key={sector.id}
            id={sector.id}
            lngLat={[sector.longitude, sector.latitude]}
            onPress={() => openSheet(sector)}>
            <View
              style={[
                styles.pin,
                {backgroundColor: pinColors[sector.id] ?? colors.accent},
              ]}
            />
          </ViewAnnotation>
        ))}
      </Map>

      {sheetVisible && (
        <>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}>
            {selected && (
              <View style={styles.sheetInner}>
                <View style={styles.handle} />

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <FavoriteButton
                    isFav={isFav}
                    onPress={() => toggleFavorite(selected.id)}
                    size={24}
                  />
                </View>

                {selected.altitude != null && (
                  <Text style={styles.altitude}>{selected.altitude}m</Text>
                )}

                <ScrollView
                  style={styles.subList}
                  showsVerticalScrollIndicator={false}
                  bounces={false}>
                  {selected.subSectors.map(ss => (
                    <View key={ss.id} style={styles.subRow}>
                      <Text style={styles.subName}>{ss.name}</Text>
                      <Text style={styles.subOrientation}>{ss.orientation}</Text>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={handleNavigateToDetail}
                  activeOpacity={0.8}>
                  <Text style={styles.detailBtnText}>Voir le détail →</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}
