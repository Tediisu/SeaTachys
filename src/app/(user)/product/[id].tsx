import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/Button';
import { useTheme } from '@/hooks/use-theme';
import { menuService, type MenuItemDetailDto, type MenuItemOptionChoiceDto } from '@/services/menu.services';
import { useCart } from '@/hooks/use-cart';
import { FontSize, Spacing } from '@/constants/theme';

export default function ProductDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCart();

  const [item, setItem] = useState<MenuItemDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const loadItem = async () => {
      try {
        const data = await menuService.getItem(String(id));
        setItem(data);
      } catch (err: any) {
        setError(err.message || 'Unable to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadItem();
    }
  }, [id]);

  const toggleChoice = (groupId: string, choiceId: string, maxSelections: number) => {
    setSelectedOptions((current) => {
      const currentSelected = current[groupId] ?? [];
      const isSelected = currentSelected.includes(choiceId);

      if (isSelected) {
        return {
          ...current,
          [groupId]: currentSelected.filter((id) => id !== choiceId),
        };
      }

      if (maxSelections === 1) {
        return {
          ...current,
          [groupId]: [choiceId],
        };
      }

      if (currentSelected.length >= maxSelections) {
        return current;
      }

      return {
        ...current,
        [groupId]: [...currentSelected, choiceId],
      };
    });
  };

  const selectedChoiceDetails = useMemo(() => {
    if (!item) return [];

    return item.optionGroups.flatMap((group) => {
      const choiceIds = selectedOptions[group.id] ?? [];
      return group.choices
        .filter((choice) => choiceIds.includes(choice.id))
        .map((choice) => ({
          id: choice.id,
          groupLabel: group.label,
          choiceName: choice.name,
          additionalPrice: Number(choice.additionalPrice),
        }));
    });
  }, [item, selectedOptions]);

  const total = useMemo(() => {
    if (!item) return 0;
    const extras = selectedChoiceDetails.reduce((sum, option) => sum + option.additionalPrice, 0);
    return (Number(item.price) + extras) * quantity;
  }, [item, quantity, selectedChoiceDetails]);

  const handleAddToCart = () => {
    if (!item) return;

    for (const group of item.optionGroups) {
      const selected = selectedOptions[group.id] ?? [];
      if (group.isRequired && selected.length === 0) {
        setError(`${group.label} is required`);
        return;
      }
    }

    addItem({
      menuItemId: item.id,
      name: item.name,
      image: item.imageUrl || null,
      category: 'Seafood',
      basePrice: Number(item.price),
      quantity,
      specialInstructions: notes.trim(),
      options: selectedChoiceDetails,
    });

    router.push('/(user)/Cart');
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error || 'Product not found'}</ThemedText>
      </ThemedView>
    );
  }

  const imageSource = item.imageUrl ? { uri: item.imageUrl } : require('@/assets/images/icon.png');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Button
              variant="secondary"
              icon={<Ionicons name="chevron-back-outline" size={22} color="white" />}
              onPress={() => router.back()}
              size="boxSmall"
              radius={50}
              style={{ paddingHorizontal: 0 }}
            />
          </View>

          <Image source={imageSource} style={styles.heroImage} />

          <View style={styles.card}>
            <ThemedText style={styles.name}>{item.name}</ThemedText>
            <ThemedText style={styles.description}>
              {item.description || 'Fresh seafood dish prepared for fast delivery.'}
            </ThemedText>
            <ThemedText style={styles.price}>P{Number(item.price).toFixed(2)}</ThemedText>

            {item.optionGroups.map((group) => (
              <View key={group.id} style={styles.groupBlock}>
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupTitle}>{group.label}</ThemedText>
                  <ThemedText style={styles.groupHint}>
                    {group.isRequired ? 'Required' : 'Optional'} · max {group.maxSelections}
                  </ThemedText>
                </View>
                {group.choices.map((choice: MenuItemOptionChoiceDto) => {
                  const selected = (selectedOptions[group.id] ?? []).includes(choice.id);
                  return (
                    <Pressable
                      key={choice.id}
                      style={[styles.choiceRow, selected && styles.choiceRowSelected]}
                      onPress={() => toggleChoice(group.id, choice.id, group.maxSelections)}
                    >
                      <View style={styles.choiceTextWrap}>
                        <ThemedText style={styles.choiceName}>{choice.name}</ThemedText>
                        <ThemedText style={styles.choicePrice}>
                          +P{Number(choice.additionalPrice).toFixed(2)}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={selected ? colors.accent : colors.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={styles.notesBlock}>
              <ThemedText style={styles.groupTitle}>Extra instructions</ThemedText>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Anything the kitchen should know?"
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
              />
            </View>

            <View style={styles.quantityRow}>
              <ThemedText style={styles.groupTitle}>Quantity</ThemedText>
              <View style={styles.quantityControls}>
                <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => Math.max(1, current - 1))}>
                  <Ionicons name="remove" size={18} color={colors.primary} />
                </Pressable>
                <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
                <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => current + 1)}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

            <Button
              label={`Add to Cart · P${total.toFixed(2)}`}
              variant="secondary"
              onPress={handleAddToCart}
              size="large"
              radius={20}
              style={{ paddingHorizontal: 0, width: '100%' }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F8',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  headerRow: {
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: 26,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  name: {
    color: '#111827',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  description: {
    color: '#6B7280',
    fontSize: FontSize.body,
    lineHeight: 24,
  },
  price: {
    color: '#0F2F57',
    fontSize: 26,
    fontWeight: '900',
  },
  groupBlock: {
    gap: 10,
  },
  groupHeader: {
    gap: 2,
  },
  groupTitle: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  groupHint: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  choiceRow: {
    backgroundColor: '#F7F9FC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  choiceRowSelected: {
    borderWidth: 1.5,
    borderColor: '#FF8E00',
    backgroundColor: '#FFF4E7',
  },
  choiceTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  choiceName: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  choicePrice: {
    color: '#6B7280',
    fontSize: FontSize.small,
  },
  notesBlock: {
    gap: 10,
  },
  notesInput: {
    minHeight: 96,
    backgroundColor: '#F7F9FC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
    color: '#111827',
    fontSize: FontSize.body,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: '#111827',
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  errorText: {
    color: '#D85A30',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
});
