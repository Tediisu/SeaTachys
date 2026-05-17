import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/Button';
import { FontSize } from '@/constants/theme';
import { ordersService, type CustomerOrder, type OrderStatus } from '@/services/orders.services';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const CLOSED_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

function formatPeso(value: number) {
  return `P${Number(value).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusStyle(status: OrderStatus) {
  if (status === 'delivered') return styles.statusDelivered;
  if (status === 'cancelled') return styles.statusCancelled;
  if (status === 'on_the_way' || status === 'picked_up') return styles.statusTransit;
  return styles.statusActive;
}

function OrderCard({ order, onPress }: { order: CustomerOrder; onPress: () => void }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Pressable style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText style={styles.orderNumber}>Order #{order.orderNumber}</ThemedText>
          <ThemedText style={styles.orderDate}>{formatDate(order.placedAt)}</ThemedText>
        </View>
        <View style={[styles.statusPill, statusStyle(order.status)]}>
          <ThemedText style={styles.statusText}>{STATUS_LABELS[order.status]}</ThemedText>
        </View>
      </View>

      <View style={styles.orderMetaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
          <ThemedText style={styles.metaText}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </ThemedText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <ThemedText style={styles.metaText}>{formatPeso(order.totalAmount)}</ThemedText>
        </View>
      </View>

      <View style={styles.trackRow}>
        <ThemedText style={styles.trackText}>View order status</ThemedText>
        <Ionicons name="chevron-forward" size={18} color="#0F2F57" />
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async (showRefreshState = false) => {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextOrders = await ordersService.listMine();
      setOrders(nextOrders);
    } catch (err: any) {
      Alert.alert('Unable to load orders', err.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const activeOrders = orders.filter((order) => !CLOSED_STATUSES.includes(order.status));
  const pastOrders = orders.filter((order) => CLOSED_STATUSES.includes(order.status));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#0F2F57" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title}>My Orders</ThemedText>
              <ThemedText style={styles.subtitle}>Track active orders or reopen past receipts.</ThemedText>
            </View>
            <Pressable style={styles.refreshButton} onPress={() => loadOrders(true)}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#0F2F57" />
              ) : (
                <Ionicons name="refresh" size={20} color="#0F2F57" />
              )}
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#FF8E00" />
              <ThemedText style={styles.loadingText}>Loading orders...</ThemedText>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyTitle}>No orders yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Once you checkout, your active order and history will appear here.
              </ThemedText>
              <Button
                label="Browse Menu"
                variant="secondary"
                onPress={() => router.replace('/(user)/(tabs)/Home')}
                size="large"
                radius={20}
                style={{ paddingHorizontal: 0, width: '100%' }}
              />
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Active Orders</ThemedText>
                {activeOrders.length === 0 ? (
                  <ThemedText style={styles.sectionEmpty}>No active orders right now.</ThemedText>
                ) : (
                  activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onPress={() => router.push(`/(user)/order/${order.id}`)}
                    />
                  ))
                )}
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Past Orders</ThemedText>
                {pastOrders.length === 0 ? (
                  <ThemedText style={styles.sectionEmpty}>Completed orders will collect here.</ThemedText>
                ) : (
                  pastOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onPress={() => router.push(`/(user)/order/${order.id}`)}
                    />
                  ))
                )}
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: FontSize.small,
    marginTop: 2,
  },
  loadingState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: FontSize.body,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    gap: 14,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: FontSize.heading,
    fontWeight: '900',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: FontSize.body,
    lineHeight: 23,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: FontSize.title,
    fontWeight: '900',
  },
  sectionEmpty: {
    color: '#6B7280',
    fontSize: FontSize.small,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderNumber: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '900',
  },
  orderDate: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusActive: {
    backgroundColor: '#FFF4E7',
  },
  statusTransit: {
    backgroundColor: '#E5F0FF',
  },
  statusDelivered: {
    backgroundColor: '#E1F5EE',
  },
  statusCancelled: {
    backgroundColor: '#FCE7E3',
  },
  statusText: {
    color: '#111827',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  orderMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#6B7280',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  trackText: {
    color: '#0F2F57',
    fontSize: FontSize.small,
    fontWeight: '900',
  },
});
