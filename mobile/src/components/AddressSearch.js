import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../lib/api';
import { fonts } from '../lib/theme';
import { Search } from '../lib/icons';

export default function AddressSearch({ onSelect, c, placeholder = 'Dirección o barrio' }) {
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
      <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
        <Search size={18} color={c.text} strokeWidth={2} />
        <TextInput
          style={[styles.input, { color: c.inputText }]}
          value={query}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          accessibilityLabel={placeholder}
        />
        {loading ? <ActivityIndicator color={c.text} /> : null}
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={String(s.place_id)}
              onPress={() => choose(s)}
              style={[styles.item, i > 0 && { borderTopWidth: 1, borderTopColor: c.cardBorder }]}
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
  inputRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: { flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  list: { borderRadius: 16, borderWidth: 1, marginTop: 8, overflow: 'hidden' },
  item: { padding: 14 },
  itemText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
});
