import React, {useMemo} from 'react';
import {
  ListRenderItem,
  SectionList,
  StyleSheet,
  Text,
  View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {sectors} from '../data/sectors';
import {Sector} from '../types/sector';
import {useSectorsStore} from '../stores/useSectorsStore';
import {useTheme, AppTheme, ACTIVE_OPACITY} from '../theme';
import {RootStackParamList} from '../navigation/AppNavigator';
import FavoriteButton from '../components/FavoriteButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
};

function makeStyles(t: AppTheme) {
  const {colors, spacing, typography} = t;
  return StyleSheet.create({
    container:     {flex: 1, backgroundColor: colors.background},
    list:          {paddingBottom: spacing.xxxl},
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowInfo:      {flex: 1},
    rowName: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.semibold,
      color: colors.textPrimary,
    },
    rowMeta: {
      fontSize: typography.size.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    favBtn: {paddingLeft: spacing.md},
  });
}

function SectorRow({
  sector,
  onPress,
  isFav,
  onToggleFav,
  styles,
}: {
  sector: Sector;
  onPress: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={ACTIVE_OPACITY}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{sector.name}</Text>
        <Text style={styles.rowMeta}>
          {sector.subSectors.length} sous-secteur
          {sector.subSectors.length > 1 ? 's' : ''}
          {sector.altitude != null ? ` · ${sector.altitude}m` : ''}
        </Text>
      </View>
      <FavoriteButton isFav={isFav} onPress={onToggleFav} style={styles.favBtn} />
    </TouchableOpacity>
  );
}

export default function SectorListScreen({navigation}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {favoriteIds, toggleFavorite, isFavorite} = useSectorsStore();

  const {favorites, others} = useMemo(() => {
    const favSet = new Set(favoriteIds);
    return {
      favorites: sectors.filter(s => favSet.has(s.id)),
      others:    sectors.filter(s => !favSet.has(s.id)),
    };
  }, [favoriteIds]);

  const sections = useMemo(() => {
    const result = [];
    if (favorites.length > 0) {
      result.push({title: 'Favoris', data: favorites});
    }
    if (others.length > 0) {
      result.push({
        title: favorites.length > 0 ? 'Tous les secteurs' : 'Secteurs',
        data: others,
      });
    }
    return result;
  }, [favorites, others]);

  const renderItem: ListRenderItem<Sector> = ({item}) => (
    <SectorRow
      sector={item}
      isFav={isFavorite(item.id)}
      onPress={() => navigation.navigate('SectorDetail', {sectorId: item.id})}
      onToggleFav={() => toggleFavorite(item.id)}
      styles={styles}
    />
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({section}) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
