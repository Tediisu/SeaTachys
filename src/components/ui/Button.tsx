import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, FontSize } from '@/constants/theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  radius?: number;
}

export default function Button({ label, onPress, variant = 'primary', size = 'small', radius = Radius.full , style }: ButtonProps) {
  const colors = useTheme();

  const variantStyles = {
    primary: {
      backgroundColor: colors.accent,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  const textStyles = {
    primary: { color: '#ffffff' },
    outline: { color: colors.accent },
    ghost: { color: colors.accent },
  };

  const sizeStyles = {
    small:  { width: 100, height: 40, },
    medium: { width: 180, height: 50, },
    large:  { width: 280, height: 56, },
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        pressed && { backgroundColor: colors.accentPressed },
        { borderRadius: radius ?? Radius.full },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.label, textStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
});