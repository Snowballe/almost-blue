import React, {useMemo} from 'react';
import {
  FlatList,
  ListRenderItem,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {sectors} from '../data/sectors';
import {Sector} from '../types/sector';
import {useSectorsStore} from '../stores/useSectorsStore';
import {theme} from '../theme';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
};

function SectorRow({
  sector,
  onPress,
  isFav,
  onToggleFav,
}: {
  sector: Sector;
  onPress: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{sector.name}</Text>
        <Text style={styles.rowMeta}>
          {sector.subSectors.length} sous-secteur
          {sector.subSectors.length > 1 ? 's' : ''}
          {sector.altitude != null ? ` · ${sector.altitude}m` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.favBtn}
        onPress={onToggleFav}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
        <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
          {isFav ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SectorListScreen({navigation}: Props) {
  const {favoriteIds, toggleFavorite, isFavorite} = useSectorsStore();

  const {favorites, others} = useMemo(() => {
    const favSet = new Set(favoriteIds);
    return {
      favorites: sectors.filter(s => favSet.has(s.id)),
      others: sectors.filter(s => !favSet.has(s.id)),
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

const {colors, spacing, typography} = theme;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  list: {paddingBottom: spacing.xxxl},
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
  rowInfo: {flex: 1},
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
  favIcon: {fontSize: 22, color: colors.textDisabled},
  favIconActive: {color: colors.warning},
});
