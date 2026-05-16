import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/Button';
import { useCart } from '@/hooks/use-cart';
import { FontSize } from '@/constants/theme';
import { ordersService, type FulfillmentType, type OrderQuoteResponse } from '@/services/orders.services';
import { QuoteSummarySkeleton } from '@/components/ui/SkeletonScreens';

const paymentMethods = [
  { id: 'gcash', label: 'GCash' },
  { id: 'paymongo', label: 'PayMongo' },
  { id: 'cash_on_delivery', label: 'Cash on Delivery' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const quoteItems = useMemo(
    () =>
      items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        optionChoiceIds: item.options.map((option) => option.id),
        specialInstructions: item.specialInstructions,
      })),
    [items]
  );

  useEffect(() => {
    const loadQuote = async () => {
      if (items.length === 0) {
        setLoadingQuote(false);
        return;
      }

      try {
        const data = await ordersService.quote(quoteItems, fulfillmentType);
        setQuote(data);
      } catch (err: any) {
        Alert.alert('Unable to calculate totals', err.message || 'Please try again.');
      } finally {
        setLoadingQuote(false);
      }
    };

    loadQuote();
  }, [fulfillmentType, items, quoteItems]);

  const handlePlaceOrder = async () => {
    if (fulfillmentType === 'delivery' && (!street.trim() || !city.trim())) {
      Alert.alert('Missing address', 'Please enter your street and city.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Cart empty', 'Add items before checking out.');
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await ordersService.create({
        fulfillmentType,
        deliveryStreet: fulfillmentType === 'delivery' ? street.trim() : '',
        deliveryBarangay: fulfillmentType === 'delivery' ? barangay.trim() : '',
        deliveryCity: fulfillmentType === 'delivery' ? city.trim() : '',
        customerNote: customerNote.trim()
          ? `${customerNote.trim()} | Payment: ${paymentMethod}`
          : `Payment: ${paymentMethod}`,
        items: quoteItems,
      });

      clearCart();
      router.replace(`/(user)/order/${response.id}`);
    } catch (err: any) {
      Alert.alert('Unable to place order', err.message || 'Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

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
            <ThemedText style={styles.title}>Checkout</ThemedText>
          </View>

          <View style={styles.fulfillmentSection}>
            <ThemedText style={styles.sectionTitle}>How would you like to receive it?</ThemedText>
            <View style={styles.fulfillmentTabs}>
              {([
                { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
                { id: 'pickup', label: 'Pickup', icon: 'bag-handle-outline' },
              ] as const).map((option) => {
                const selected = fulfillmentType === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.fulfillmentTab, selected && styles.fulfillmentTabSelected]}
                    onPress={() => setFulfillmentType(option.id)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={selected ? '#FFFFFF' : '#0F2F57'}
                    />
                    <ThemedText style={[styles.fulfillmentTabText, selected && styles.fulfillmentTabTextSelected]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText style={styles.fulfillmentHint}>
              {fulfillmentType === 'delivery'
                ? 'We will bring the order to your address.'
                : 'Pick up from the store once your order is ready.'}
            </ThemedText>
          </View>

          {fulfillmentType === 'delivery' ? (
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Street address"
                placeholderTextColor="#6B7280"
                value={street}
                onChangeText={setStreet}
              />
              <TextInput
                style={styles.input}
                placeholder="Barangay / Area"
                placeholderTextColor="#6B7280"
                value={barangay}
                onChangeText={setBarangay}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#6B7280"
                value={city}
                onChangeText={setCity}
              />
            </View>
          ) : null}

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
            {paymentMethods.map((method) => {
              const selected = paymentMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <ThemedText style={styles.paymentLabel}>{method.label}</ThemedText>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#FF8E00' : '#6B7280'}
                  />
                </Pressable>
              );
            })}
            <ThemedText style={styles.paymentHint}>
              Payment choice is collected in the app flow. Backend order storage still needs a dedicated payment field if you want it persisted separately.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Extra Note</ThemedText>
            <TextInput
              style={[styles.input, styles.noteInput]}
              multiline
              numberOfLines={4}
              placeholder="Rider note, landmark, or delivery reminder"
              placeholderTextColor="#6B7280"
              value={customerNote}
              onChangeText={setCustomerNote}
            />
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
            {loadingQuote ? (
              <QuoteSummarySkeleton />
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.summaryValue}>P{(quote?.subtotal ?? subtotal).toFixed(2)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>
                    {fulfillmentType === 'delivery' ? 'Delivery Fee' : 'Pickup Fee'}
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>P{(quote?.deliveryFee ?? 0).toFixed(2)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.totalLabel}>Total</ThemedText>
                  <ThemedText style={styles.totalValue}>P{(quote?.totalAmount ?? subtotal).toFixed(2)}</ThemedText>
                </View>
              </>
            )}
          </View>

          <Button
            label={placingOrder ? 'Placing Order...' : 'Place Order'}
            variant="secondary"
            onPress={handlePlaceOrder}
            size="large"
            radius={20}
            style={{ paddingHorizontal: 0, width: '100%' }}
          />
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  fulfillmentSection: {
    gap: 10,
  },
  fulfillmentTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  fulfillmentTab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fulfillmentTabSelected: {
    backgroundColor: '#0F2F57',
  },
  fulfillmentTabText: {
    color: '#0F2F57',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  fulfillmentTabTextSelected: {
    color: '#FFFFFF',
  },
  fulfillmentHint: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#111827',
    fontSize: FontSize.body,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  paymentOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderWidth: 1.5,
    borderColor: '#FF8E00',
    backgroundColor: '#FFF4E7',
  },
  paymentLabel: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  paymentHint: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: FontSize.body,
  },
  summaryValue: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  totalLabel: {
    color: '#0F2F57',
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  totalValue: {
    color: '#0F2F57',
    fontSize: FontSize.heading,
    fontWeight: '900',
  },
});
