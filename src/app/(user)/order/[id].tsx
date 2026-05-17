import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/Button';
import { FontSize } from '@/constants/theme';
import { ordersService, type CustomerOrder, type OrderStatus } from '@/services/orders.services';
import { orderMessagesService, type OrderMessage } from '@/services/order-messages.services';

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

const STATUS_COPY: Record<OrderStatus, string> = {
  pending: 'Waiting for the restaurant to accept your order',
  confirmed: 'Your order has been accepted',
  preparing: 'Your food is being prepared',
  ready_for_pickup: 'Waiting for rider pickup',
  picked_up: 'Your rider has picked up the order',
  on_the_way: 'Your rider is on the way',
  delivered: 'Delivered. Enjoy your meal',
  cancelled: 'This order was cancelled',
};

const TIP_OPTIONS = [20, 40, 60];

const PROGRESS_STAGES = [
  {
    key: 'preparing',
    label: 'Preparing',
    statuses: ['pending', 'confirmed', 'preparing'] as OrderStatus[],
  },
  {
    key: 'pickup',
    label: 'Pickup',
    statuses: ['ready_for_pickup', 'picked_up'] as OrderStatus[],
  },
  {
    key: 'delivery',
    label: 'Delivery',
    statuses: ['on_the_way'] as OrderStatus[],
  },
  {
    key: 'done',
    label: 'Done',
    statuses: ['delivered'] as OrderStatus[],
  },
] as const;

function formatPeso(value: number) {
  return `P${Number(value).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Pending';

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function estimatedTime(status: OrderStatus) {
  switch (status) {
    case 'pending':
    case 'confirmed':
    case 'preparing':
      return '15-25 mins';
    case 'ready_for_pickup':
      return '10-20 mins';
    case 'picked_up':
    case 'on_the_way':
      return '5-15 mins';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
  }
}

function currentStageIndex(status: OrderStatus) {
  if (status === 'cancelled') return 0;
  return Math.max(
    0,
    PROGRESS_STAGES.findIndex((stage) => stage.statuses.includes(status))
  );
}

export default function OrderStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadOrder = async (showRefreshState = false) => {
    if (!id) return;

    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextOrder = await ordersService.getById(id);
      setOrder(nextOrder);
      try {
        setMessages(await orderMessagesService.list(id));
      } catch (chatError) {
        console.log('Order chat refresh failed:', chatError);
      }
    } catch (err: any) {
      Alert.alert('Unable to load order', err.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrder();

    const timer = setInterval(() => {
      loadOrder(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [id]);

  if (loading && !order) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafe}>
          <ActivityIndicator color="#FF8E00" />
          <ThemedText style={styles.loadingText}>Loading your order...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafe}>
          <ThemedText style={styles.emptyTitle}>Order unavailable</ThemedText>
          <Button
            label="Back to menu"
            variant="secondary"
            onPress={() => router.replace('/(user)/(tabs)/Home')}
            size="large"
            radius={20}
            style={{ paddingHorizontal: 0, width: '100%' }}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const riderAssigned = Boolean(order.riderId);
  const activeStageIndex = currentStageIndex(order.status);
  const sendMessage = async () => {
    const message = chatDraft.trim();
    if (!message || !id || !riderAssigned || sendingMessage) return;

    setSendingMessage(true);
    try {
      const created = await orderMessagesService.send(id, message);
      setMessages((current) => [...current, created]);
      setChatDraft('');
    } catch (err: any) {
      Alert.alert('Unable to send message', err.message || 'Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#0F2F57" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title}>Track Order</ThemedText>
              <ThemedText style={styles.orderNumber}>Order #{order.orderNumber}</ThemedText>
            </View>
            <Pressable style={styles.refreshButton} onPress={() => loadOrder(true)}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#0F2F57" />
              ) : (
                <Ionicons name="refresh" size={20} color="#0F2F57" />
              )}
            </Pressable>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeroRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.etaText}>{estimatedTime(order.status)}</ThemedText>
                <ThemedText style={styles.progressTitle}>{STATUS_LABELS[order.status]}</ThemedText>
                <ThemedText style={styles.progressCaption}>{STATUS_COPY[order.status]}</ThemedText>
              </View>
              <View style={styles.riderOrb}>
                <Ionicons name="restaurant" size={28} color="#FF8E00" />
              </View>
            </View>

            <View style={styles.stageRail}>
              {PROGRESS_STAGES.map((stage, index) => {
                const reached = order.status !== 'cancelled' && index <= activeStageIndex;
                const active = order.status !== 'cancelled' && index === activeStageIndex;

                return (
                  <View key={stage.key} style={styles.stageItem}>
                    <View style={styles.stageTopRow}>
                      <View
                        style={[
                          styles.stageDot,
                          reached && styles.stageDotReached,
                          active && styles.stageDotActive,
                        ]}
                      />
                      {index < PROGRESS_STAGES.length - 1 ? (
                        <View style={[styles.stageLine, index < activeStageIndex && styles.stageLineReached]} />
                      ) : null}
                    </View>
                    <ThemedText style={[styles.stageLabel, reached && styles.stageLabelReached]}>
                      {stage.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            <View style={styles.orderDetailRows}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Order number</ThemedText>
                <ThemedText style={styles.detailValue}>#{order.orderNumber}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Placed at</ThemedText>
                <ThemedText style={styles.detailValue}>{formatDate(order.placedAt)}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>
                  {order.deliveryStreet || order.deliveryCity ? 'Delivery address' : 'Fulfillment'}
                </ThemedText>
                <ThemedText style={[styles.detailValue, styles.detailAddress]}>
                  {order.deliveryStreet || order.deliveryCity
                    ? [order.deliveryStreet, order.deliveryBarangay, order.deliveryCity].filter(Boolean).join(', ')
                    : 'Pickup from store'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
            {order.items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.summaryItemName}>
                    {item.quantity}x {item.itemName}
                  </ThemedText>
                  {item.options.length > 0 ? (
                    <ThemedText style={styles.summaryItemMeta}>
                      {item.options.map((option) => option.choiceName).join(', ')}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText style={styles.summaryItemPrice}>{formatPeso(item.subtotal)}</ThemedText>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.totalValue}>{formatPeso(order.subtotal)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Delivery fee</ThemedText>
              <ThemedText style={styles.totalValue}>{formatPeso(order.deliveryFee)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.grandTotalLabel}>Total</ThemedText>
              <ThemedText style={styles.grandTotalValue}>{formatPeso(order.totalAmount)}</ThemedText>
            </View>
          </View>

          {riderAssigned ? (
            <View style={styles.riderCard}>
              <View style={styles.riderCardHeader}>
                <View style={styles.riderAvatar}>
                  <Ionicons name="bicycle" size={20} color="#0F2F57" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.riderCardEyebrow}>Your rider</ThemedText>
                  <ThemedText style={styles.riderCardName}>{order.rider?.fullName ?? 'Assigned rider'}</ThemedText>
                </View>
              </View>
              <View style={styles.riderMetaRow}>
                <View style={styles.riderMetaBlock}>
                  <ThemedText style={styles.riderMetaLabel}>Motor</ThemedText>
                  <ThemedText style={styles.riderMetaValue}>{order.rider?.motorModel ?? 'Not set yet'}</ThemedText>
                </View>
                <View style={styles.riderMetaBlock}>
                  <ThemedText style={styles.riderMetaLabel}>Contact</ThemedText>
                  <ThemedText style={styles.riderMetaValue}>{order.rider?.contactNumber ?? 'Not set yet'}</ThemedText>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>Chat with rider</ThemedText>
                <ThemedText style={styles.chatSubtitle}>
                  {riderAssigned ? 'Rider is available for messages' : 'Waiting for rider assignment'}
                </ThemedText>
              </View>
              <View style={[styles.chatStatusDot, riderAssigned && styles.chatStatusDotOnline]} />
            </View>

            <View style={styles.chatThread}>
              {messages.length === 0 ? (
                <View style={styles.systemBubble}>
                  <ThemedText style={styles.systemBubbleText}>
                    {riderAssigned
                      ? 'Your rider can now receive messages about this delivery.'
                      : 'A rider will appear here once one is assigned to your order.'}
                  </ThemedText>
                </View>
              ) : (
                messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.senderRole === 'customer' ? styles.customerBubble : styles.riderBubble,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.messageSender,
                        message.senderRole === 'customer' && styles.customerBubbleText,
                      ]}
                    >
                      {message.senderRole === 'customer' ? 'You' : message.senderName}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.messageBody,
                        message.senderRole === 'customer' && styles.customerBubbleText,
                      ]}
                    >
                      {message.message}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={styles.chatComposer}>
              <TextInput
                value={chatDraft}
                onChangeText={setChatDraft}
                editable={riderAssigned}
                placeholder={riderAssigned ? 'Message your rider...' : 'Chat opens after rider assignment'}
                placeholderTextColor="#94A3B8"
                style={styles.chatInput}
              />
              <Pressable
                style={[styles.sendButton, (!riderAssigned || !chatDraft.trim()) && styles.sendButtonDisabled]}
                disabled={!riderAssigned || !chatDraft.trim() || sendingMessage}
                onPress={sendMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <View style={styles.tipPanel}>
              <View>
                <ThemedText style={styles.tipTitle}>Tip your rider</ThemedText>
                <ThemedText style={styles.tipCaption}>
                  {riderAssigned ? 'Choose a quick tip amount.' : 'Tips unlock once a rider is assigned.'}
                </ThemedText>
              </View>
              <View style={styles.tipRow}>
                {TIP_OPTIONS.map((tip) => (
                  <Pressable
                    key={tip}
                    style={[
                      styles.tipPill,
                      selectedTip === tip && styles.tipPillSelected,
                      !riderAssigned && styles.tipPillDisabled,
                    ]}
                    disabled={!riderAssigned}
                    onPress={() => setSelectedTip(tip)}
                  >
                    <ThemedText style={[styles.tipText, selectedTip === tip && styles.tipTextSelected]}>
                      +P{tip}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
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
  loadingSafe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: FontSize.body,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: FontSize.heading,
    fontWeight: '800',
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
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  orderNumber: {
    color: '#6B7280',
    fontSize: FontSize.small,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    gap: 18,
  },
  progressHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  etaText: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  progressTitle: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '900',
    marginTop: 6,
  },
  progressCaption: {
    color: '#6B7280',
    fontSize: FontSize.small,
    lineHeight: 20,
    marginTop: 3,
  },
  riderOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E7',
  },
  stageRail: {
    flexDirection: 'row',
  },
  stageItem: {
    flex: 1,
  },
  stageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D6DEE8',
  },
  stageDotReached: {
    backgroundColor: '#FFB24C',
  },
  stageDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF8E00',
  },
  stageLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 5,
    borderRadius: 999,
    backgroundColor: '#D6DEE8',
  },
  stageLineReached: {
    backgroundColor: '#FF8E00',
  },
  stageLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  stageLabelReached: {
    color: '#111827',
  },
  orderDetailRows: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: FontSize.small,
  },
  detailValue: {
    color: '#111827',
    fontSize: FontSize.small,
    fontWeight: '800',
    textAlign: 'right',
  },
  detailAddress: {
    flex: 1,
    maxWidth: 210,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  riderCard: {
    backgroundColor: '#0F2F57',
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  riderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE8F4',
  },
  riderCardEyebrow: {
    color: '#9FC2E7',
    fontSize: FontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  riderCardName: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: '900',
    marginTop: 2,
  },
  riderMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riderMetaBlock: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  riderMetaLabel: {
    color: '#9FC2E7',
    fontSize: FontSize.xs,
  },
  riderMetaValue: {
    color: '#FFFFFF',
    fontSize: FontSize.small,
    fontWeight: '800',
    marginTop: 3,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '900',
  },
  summaryItem: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItemName: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  summaryItemMeta: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  summaryItemPrice: {
    color: '#0F2F57',
    fontSize: FontSize.body,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: '#6B7280',
    fontSize: FontSize.small,
  },
  totalValue: {
    color: '#111827',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  grandTotalLabel: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '900',
  },
  grandTotalValue: {
    color: '#0F2F57',
    fontSize: FontSize.heading,
    fontWeight: '900',
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatSubtitle: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  chatStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  chatStatusDotOnline: {
    backgroundColor: '#0F6E56',
  },
  chatThread: {
    minHeight: 72,
    justifyContent: 'center',
    gap: 10,
  },
  systemBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: '#F3F6FA',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  systemBubbleText: {
    color: '#374151',
    fontSize: FontSize.small,
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 3,
  },
  customerBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    backgroundColor: '#0F2F57',
  },
  riderBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    backgroundColor: '#F3F6FA',
  },
  messageSender: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  messageBody: {
    color: '#111827',
    fontSize: FontSize.small,
    lineHeight: 20,
  },
  customerBubbleText: {
    color: '#FFFFFF',
  },
  chatComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#111827',
    fontSize: FontSize.small,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F2F57',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  tipPanel: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tipTitle: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '900',
  },
  tipCaption: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
  },
  tipPillSelected: {
    backgroundColor: '#FFF4E7',
    borderWidth: 1,
    borderColor: '#FF8E00',
  },
  tipPillDisabled: {
    opacity: 0.55,
  },
  tipText: {
    color: '#6B7280',
    fontSize: FontSize.small,
    fontWeight: '800',
  },
  tipTextSelected: {
    color: '#FF8E00',
  },
});
