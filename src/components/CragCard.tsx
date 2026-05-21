import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Crag} from '../types/crag';
import {useCragsStore} from '../store/useCragsStore';

interface Props {
  crag: Crag;
  onPress: () => void;
}

export default function CragCard({crag, onPress}: Props) {
  const {addFavorite, removeFavorite, isFavorite} = useCragsStore();
  const fav = isFavorite(crag.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.info}>
        <Text style={styles.name}>{crag.name}</Text>
        <Text style={styles.sub}>
          {[crag.city, crag.region, crag.country].filter(Boolean).join(', ')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.favBtn, fav && styles.favBtnActive]}
        onPress={() => (fav ? removeFavorite(crag.id) : addFavorite(crag))}>
        <Text style={styles.favIcon}>{fav ? '★' : '☆'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  info: {flex: 1},
  name: {fontSize: 16, fontWeight: '600', color: '#111'},
  sub: {fontSize: 13, color: '#6b7280', marginTop: 2},
  favBtn: {padding: 8, borderRadius: 20},
  favBtnActive: {},
  favIcon: {fontSize: 22, color: '#9ca3af'},
});
