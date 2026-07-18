import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  passwordToggle?: boolean;
}

export function Input({ label, error, style, containerStyle, passwordToggle, secureTextEntry, ...props }: InputProps) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const isSecure = passwordToggle ? hidden : secureTextEntry;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isSecure}
          style={[
            styles.input,
            { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
            passwordToggle && { paddingRight: 46 },
            style,
          ]}
          {...props}
        />
        {passwordToggle ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            style={{ position: 'absolute', right: 14 }}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14, width: '100%' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  error: { fontSize: 12, marginTop: 4 },
});
