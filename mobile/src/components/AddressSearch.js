import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../lib/api';

export default function AddressSearch({ onSelect, c, placeholder = 'Buscar dirección o barrio' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const onChangeText = (text) => {
    setQuery(text);
    clearTimeout(timer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/geo/search', { params: { q: text } });
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const choose = (item) => {
    setQuery(item.display_name);
    setSuggestions([]);
    onSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
  };

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: c.inputBg }]}>
        <TextInput
          style={[styles.input, { color: c.inputText }]}
          value={query}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.label}
        />
        {loading ? <ActivityIndicator color={c.subtitle} style={styles.spinner} /> : null}
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          {suggestions.map((s) => (
            <Pressable
              key={String(s.place_id)}
              onPress={() => choose(s)}
              style={[styles.item, { borderBottomColor: c.cardBorder }]}
            >
              <Text style={[styles.itemText, { color: c.text }]} numberOfLines={2}>
                {s.display_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingRight: 12 },
  input: { flex: 1, padding: 16, fontSize: 16 },
  spinner: { marginLeft: 8 },
  list: { borderRadius: 16, borderWidth: 1, marginTop: 8, overflow: 'hidden' },
  item: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 14, lineHeight: 19 },
});
