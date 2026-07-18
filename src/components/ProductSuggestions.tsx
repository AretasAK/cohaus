import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { searchProducts, ProductSuggestion } from '../lib/products';

export function ProductSuggestions({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (suggestion: ProductSuggestion) => void;
}) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      searchProducts(query, i18n.language)
        .then(setSuggestions)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, i18n.language]);

  if (!loading && suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12 }}
      contentContainerStyle={{ gap: 8, paddingRight: 8, alignItems: 'center' }}
    >
      {loading ? (
        <View style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
          <ActivityIndicator size="small" color={theme.textMuted} />
        </View>
      ) : (
        suggestions.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: pressed ? theme.primarySoft : theme.card,
              borderWidth: 1,
              borderColor: pressed ? theme.primary : theme.border,
            })}
          >
            <Ionicons name="add-circle-outline" size={15} color={theme.primary} />
            <View>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{s.name}</Text>
              {s.category ? (
                <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 1 }}>{s.category}</Text>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
