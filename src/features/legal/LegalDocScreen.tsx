import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { LegalDoc } from '../../legal/content';

export function LegalDocScreen({
  navigation,
  title,
  docs,
}: {
  navigation: any;
  title: string;
  docs: Record<'es' | 'en', LegalDoc>;
}) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const doc = docs[language];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>{doc.updated}</Text>
        {doc.sections.map((section) => (
          <View key={section.heading} style={{ marginBottom: 20 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, marginBottom: 6 }}>
              {section.heading}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 21 }}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
