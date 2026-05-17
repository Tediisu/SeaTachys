import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { riderOrdersService, type RiderOrder } from '@/services/rider-orders.services';
import { riderProfileService, type RiderProfile } from '@/services/rider-profile.services';
import { orderMessagesService, type OrderMessage } from '@/services/order-messages.services';

const STATUS_LABELS = {
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
} as const;

function formatPeso(value: number) {
  return `P${Number(value).toFixed(2)}`;
}

function formatAddress(order: RiderOrder) {
  return [order.deliveryStreet, order.deliveryBarangay, order.deliveryCity].filter(Boolean).join(', ');
}

function formatItems(order: RiderOrder) {
  return order.items.map((item) => `${item.quantity}x ${item.itemName}`).join(', ');
}

export default function RiderHomeScreen() {
  const { user, logout } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<RiderOrder[]>([]);
  const [myOrders, setMyOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [motorModel, setMotorModel] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [chatOrder, setChatOrder] = useState<RiderOrder | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const loadOrders = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [available, mine] = await Promise.all([
        riderOrdersService.listAvailable(),
        riderOrdersService.listMine(),
      ]);
      setAvailableOrders(available);
      setMyOrders(mine);
    } catch (error: any) {
      Alert.alert('Unable to load rider orders', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    riderProfileService.get()
      .then((nextProfile) => {
        setProfile(nextProfile);
        setMotorModel(nextProfile?.motorModel ?? '');
        setContactNumber(nextProfile?.contactNumber ?? '');
      })
      .catch((error: any) => {
        Alert.alert('Unable to load rider profile', error?.message || 'Please try again.');
      })
      .finally(() => setProfileChecked(true));
  }, []);

  useEffect(() => {
    if (!chatOrder) return;

    const loadMessages = async () => {
      try {
        setChatLoading(true);
        setChatMessages(await orderMessagesService.list(chatOrder.id));
      } catch (error: any) {
        Alert.alert('Unable to load chat', error?.message || 'Please try again.');
      } finally {
        setChatLoading(false);
      }
    };

    loadMessages();
    const timer = setInterval(loadMessages, 10000);
    return () => clearInterval(timer);
  }, [chatOrder]);

  const acceptOrder = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      await riderOrdersService.accept(orderId);
      await loadOrders(true);
    } catch (error: any) {
      Alert.alert('Unable to accept order', error?.message || 'Please try again.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const advanceOrder = async (order: RiderOrder) => {
    const nextStatus =
      order.status === 'ready_for_pickup'
        ? 'picked_up'
        : order.status === 'picked_up'
          ? 'on_the_way'
          : 'delivered';

    setBusyOrderId(order.id);
    try {
      await riderOrdersService.updateStatus(order.id, nextStatus);
      await loadOrders(true);
    } catch (error: any) {
      Alert.alert('Unable to update order', error?.message || 'Please try again.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const saveProfile = async () => {
    if (!motorModel.trim() || !contactNumber.trim()) {
      Alert.alert('Complete your rider info', 'Motor model and contact number are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const nextProfile = await riderProfileService.save({
        motorModel: motorModel.trim(),
        contactNumber: contactNumber.trim(),
      });
      setProfile(nextProfile);
    } catch (error: any) {
      Alert.alert('Unable to save rider info', error?.message || 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const sendChatMessage = async () => {
    const message = chatDraft.trim();
    if (!chatOrder || !message || chatSending) return;

    setChatSending(true);
    try {
      const created = await orderMessagesService.send(chatOrder.id, message);
      setChatMessages((current) => [...current, created]);
      setChatDraft('');
    } catch (error: any) {
      Alert.alert('Unable to send message', error?.message || 'Please try again.');
    } finally {
      setChatSending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />}
        >
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.kicker}>Rider hub</ThemedText>
              <ThemedText style={styles.title}>Hi, {user?.fullName?.split(' ')[0] ?? 'Rider'}</ThemedText>
            </View>
            <Pressable style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#0F2F57" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#FF8E00" />
              <ThemedText style={styles.loadingText}>Loading delivery parcels...</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>My deliveries</ThemedText>
                <ThemedText style={styles.sectionCount}>{myOrders.length}</ThemedText>
              </View>
              {myOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <ThemedText style={styles.emptyTitle}>No active deliveries</ThemedText>
                  <ThemedText style={styles.emptyText}>Accept a ready parcel below to begin a trip.</ThemedText>
                </View>
              ) : (
                myOrders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderTopRow}>
                      <ThemedText style={styles.orderNumber}>#{order.orderNumber}</ThemedText>
                      <View style={styles.statusPill}>
                        <ThemedText style={styles.statusText}>{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.address}>{formatAddress(order)}</ThemedText>
                    <ThemedText style={styles.items}>{formatItems(order)}</ThemedText>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => advanceOrder(order)}
                      disabled={busyOrderId === order.id}
                    >
                      {busyOrderId === order.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.primaryButtonText}>
                          {order.status === 'ready_for_pickup'
                            ? 'Mark picked up'
                            : order.status === 'picked_up'
                              ? 'Start delivery'
                              : 'Mark delivered'}
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => setChatOrder(order)}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0F2F57" />
                      <ThemedText style={styles.secondaryButtonText}>Chat with customer</ThemedText>
                    </Pressable>
                  </View>
                ))
              )}

              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Available parcels</ThemedText>
                <ThemedText style={styles.sectionCount}>{availableOrders.length}</ThemedText>
              </View>
              {availableOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <ThemedText style={styles.emptyTitle}>No parcels waiting</ThemedText>
                  <ThemedText style={styles.emptyText}>Pull to refresh when the kitchen marks an order ready.</ThemedText>
                </View>
              ) : (
                availableOrders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderTopRow}>
                      <ThemedText style={styles.orderNumber}>#{order.orderNumber}</ThemedText>
                      <ThemedText style={styles.total}>{formatPeso(order.totalAmount)}</ThemedText>
                    </View>
                    <ThemedText style={styles.address}>{formatAddress(order)}</ThemedText>
                    <ThemedText style={styles.items}>{formatItems(order)}</ThemedText>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => acceptOrder(order.id)}
                      disabled={busyOrderId === order.id}
                    >
                      {busyOrderId === order.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.primaryButtonText}>Accept parcel</ThemedText>
                      )}
                    </Pressable>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={profileChecked && !profile} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.profileModal}>
            <View style={styles.modalIcon}>
              <Ionicons name="bicycle" size={22} color="#0F2F57" />
            </View>
            <ThemedText style={styles.modalTitle}>Set up rider info</ThemedText>
            <ThemedText style={styles.modalText}>
              Customers will see this after you accept a delivery, so keep it accurate.
            </ThemedText>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Motor model</ThemedText>
              <TextInput
                value={motorModel}
                onChangeText={setMotorModel}
                placeholder="Honda Click 125"
                placeholderTextColor="#94A3B8"
                style={styles.fieldInput}
              />
            </View>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Contact number</ThemedText>
              <TextInput
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="09xx xxx xxxx"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.fieldInput}
              />
            </View>
            <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Save rider info</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(chatOrder)} transparent animationType="slide" onRequestClose={() => setChatOrder(null)}>
        <View style={styles.chatModalBackdrop}>
          <View style={styles.chatModal}>
            <View style={styles.chatModalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>Order chat</ThemedText>
                <ThemedText style={styles.modalText}>#{chatOrder?.orderNumber}</ThemedText>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setChatOrder(null)}>
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.chatThread}>
              {chatLoading && chatMessages.length === 0 ? (
                <ActivityIndicator color="#FF8E00" />
              ) : chatMessages.length === 0 ? (
                <View style={styles.systemBubble}>
                  <ThemedText style={styles.systemBubbleText}>No messages yet. Say hello if needed.</ThemedText>
                </View>
              ) : (
                chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.senderRole === 'rider' ? styles.riderBubble : styles.customerBubble,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.messageSender,
                        message.senderRole === 'rider' && styles.riderBubbleText,
                      ]}
                    >
                      {message.senderRole === 'rider' ? 'You' : message.senderName}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.messageBody,
                        message.senderRole === 'rider' && styles.riderBubbleText,
                      ]}
                    >
                      {message.message}
                    </ThemedText>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.chatComposer}>
              <TextInput
                value={chatDraft}
                onChangeText={setChatDraft}
                placeholder="Message customer..."
                placeholderTextColor="#94A3B8"
                style={styles.chatInput}
              />
              <Pressable
                style={[styles.sendButton, !chatDraft.trim() && styles.sendButtonDisabled]}
                onPress={sendChatMessage}
                disabled={!chatDraft.trim() || chatSending}
              >
                {chatSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 14,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kicker: {
    color: '#FF8E00',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    minHeight: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#0F2F57',
    backgroundColor: '#DDE8F4',
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    color: '#0F2F57',
    fontSize: 18,
    fontWeight: '900',
  },
  statusPill: {
    backgroundColor: '#FFF1DC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: '#9A5B00',
    fontSize: 12,
    fontWeight: '900',
  },
  total: {
    color: '#0F6E56',
    fontSize: 15,
    fontWeight: '900',
  },
  address: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  items: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: '#EEF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#0F2F57',
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileModal: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 14,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE8F4',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  modalText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  fieldInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    paddingHorizontal: 14,
    color: '#111827',
    backgroundColor: '#F8FAFC',
  },
  chatModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  chatModal: {
    minHeight: '55%',
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    gap: 14,
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FA',
  },
  chatThread: {
    flexGrow: 1,
    gap: 10,
    paddingVertical: 4,
    justifyContent: 'flex-end',
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
    fontSize: 14,
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 3,
  },
  riderBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    backgroundColor: '#0F2F57',
  },
  customerBubble: {
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
    fontSize: 14,
    lineHeight: 20,
  },
  riderBubbleText: {
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
    fontSize: 14,
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
});
