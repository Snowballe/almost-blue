import React, {useState} from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {searchCrags} from '../services/oblyk';
import {Crag} from '../types/crag';
import CragCard from '../components/CragCard';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Search'>;
};

export default function SearchScreen({navigation}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Crag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const crags = await searchCrags(text);
      setResults(crags);
    } catch {
      setError('Impossible de contacter l\'API Oblyk.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Rechercher un secteur…"
        value={query}
        onChangeText={handleSearch}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {loading && <ActivityIndicator style={styles.loader} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={results}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <CragCard
            crag={item}
            onPress={() => navigation.navigate('CragDetail', {crag: item})}
          />
        )}
        ListEmptyComponent={
          !loading && query.length >= 2 ? (
            <Text style={styles.empty}>Aucun résultat pour « {query} »</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  input: {
    margin: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
  },
  loader: {marginTop: 20},
  error: {textAlign: 'center', color: '#ef4444', margin: 12},
  empty: {textAlign: 'center', color: '#9ca3af', marginTop: 40},
});
