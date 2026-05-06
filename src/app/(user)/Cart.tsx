import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/Button';
import { useCart } from '@/hooks/use-cart';
import { FontSize } from '@/constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.title}>Your Cart</ThemedText>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
              <ThemedText style={styles.emptyText}>
                Add dishes from the menu and they will appear here.
              </ThemedText>
              <Button
                label="Browse Menu"
                variant="secondary"
                onPress={() => router.replace('/(user)/Home')}
                size="large"
                radius={20}
                style={{ paddingHorizontal: 0, width: '100%' }}
              />
            </View>
          ) : (
            <>
              {items.map((item) => {
                const imageSource =
                  typeof item.image === 'string'
                    ? { uri: item.image }
                    : item.image || require('@/assets/images/icon.png');
                const itemExtras = item.options.reduce((sum, option) => sum + option.additionalPrice, 0);
                const itemTotal = (item.basePrice + itemExtras) * item.quantity;

                return (
                  <View key={item.id} style={styles.cartItem}>
                    <Image source={imageSource} style={styles.cartImage} />
                    <View style={styles.cartInfo}>
                      <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                      <ThemedText style={styles.itemMeta}>{item.category}</ThemedText>
                      {item.options.map((option) => (
                        <ThemedText key={option.id} style={styles.optionText}>
                          {option.groupLabel}: {option.choiceName}
                        </ThemedText>
                      ))}
                      {item.specialInstructions ? (
                        <ThemedText style={styles.instructionsText}>
                          Note: {item.specialInstructions}
                        </ThemedText>
                      ) : null}
                      <ThemedText style={styles.itemTotal}>P{itemTotal.toFixed(2)}</ThemedText>
                    </View>
                    <View style={styles.cartActions}>
                      <Pressable style={styles.iconButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Ionicons name="remove" size={16} color="#0F2F57" />
                      </Pressable>
                      <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
                      <Pressable style={styles.iconButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Ionicons name="add" size={16} color="#0F2F57" />
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() =>
                          Alert.alert('Remove item', `Remove ${item.name} from cart?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
                          ])
                        }
                      >
                        <Ionicons name="trash-outline" size={18} color="#D85A30" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.summaryValue}>P{subtotal.toFixed(2)}</ThemedText>
                </View>
                <ThemedText style={styles.summaryHint}>
                  Delivery fee will be calculated by the backend on checkout.
                </ThemedText>
                <Button
                  label="Proceed to Checkout"
                  variant="secondary"
                  onPress={() => router.push('/(user)/Checkout')}
                  size="large"
                  radius={20}
                  style={{ paddingHorizontal: 0, width: '100%' }}
                />
              </View>
            </>
          )}
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
  content: {
    padding: 18,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    gap: 14,
    marginTop: 18,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: FontSize.heading,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: FontSize.body,
    lineHeight: 24,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cartImage: {
    width: 88,
    height: 88,
    borderRadius: 18,
  },
  cartInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  itemMeta: {
    color: '#6B7280',
    fontSize: FontSize.small,
  },
  optionText: {
    color: '#4B5563',
    fontSize: FontSize.xs,
  },
  instructionsText: {
    color: '#D85A30',
    fontSize: FontSize.xs,
  },
  itemTotal: {
    color: '#0F2F57',
    fontSize: FontSize.subtitle,
    fontWeight: '900',
    marginTop: 4,
  },
  cartActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  deleteButton: {
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#0F2F57',
    fontSize: FontSize.heading,
    fontWeight: '900',
  },
  summaryHint: {
    color: '#6B7280',
    fontSize: FontSize.small,
    lineHeight: 20,
  },
});
