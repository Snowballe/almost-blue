import React from 'react';
import {View, FlatList, Text, StyleSheet} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useCragsStore} from '../store/useCragsStore';
import CragCard from '../components/CragCard';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Favorites'>;
};

export default function FavoritesScreen({navigation}: Props) {
  const favorites = useCragsStore(s => s.favorites);

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <CragCard
            crag={item}
            onPress={() => navigation.navigate('CragDetail', {crag: item})}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucun secteur en favori.{'\n'}Recherchez un secteur pour en ajouter.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 60,
    lineHeight: 24,
  },
});
