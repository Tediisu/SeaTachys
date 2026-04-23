import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  Switch,
  Image,
  Dimensions,
  Modal,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = 'Fish' | 'Shellfish' | 'Crustacean' | 'Cephalopod';

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUri?: string;      // local URI from image picker
  image?: number;         // require() asset (from mock-data)
  category: Category;
  rating: number;
  isAvailable: boolean;
  isFeatured: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = ['Fish', 'Shellfish', 'Crustacean', 'Cephalopod'];

const CATEGORY_EMOJI: Record<Category, string> = {
  Fish: '🐟',
  Shellfish: '🦪',
  Crustacean: '🦀',
  Cephalopod: '🦑',
};

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const TEAL_MID = '#1D9E75';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#FAECE7';
const GRAY_BG = '#F7F6F2';
const GRAY_BORDER = '#D3D1C7';
const TEXT_PRIMARY = '#2C2C2A';
const TEXT_SECONDARY = '#888780';

const { width } = Dimensions.get('window');

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = (): Omit<Product, 'id' | 'rating'> => ({
  name: '',
  price: 0,
  description: '',
  imageUri: undefined,
  category: 'Fish',
  isAvailable: true,
  isFeatured: false,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color = TEAL }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CategoryPill({ cat, selected, onPress }: { cat: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {cat}
      </Text>
    </Pressable>
  );
}

function ProductRow({
  item,
  onToggleAvailable,
  onToggleFeatured,
  onDelete,
}: {
  item: Product;
  onToggleAvailable: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productImageWrap}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.productThumb} />
        ) : item.image ? (
          <Image source={item.image} style={styles.productThumb} />
        ) : (
          <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
            <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[item.category]}</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productMeta}>
          ₱{item.price.toFixed(2)} · {item.category}
        </Text>
        <View style={styles.productToggles}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Available</Text>
            <Switch
              value={item.isAvailable}
              onValueChange={() => onToggleAvailable(item.id)}
              trackColor={{ false: GRAY_BORDER, true: TEAL_MID }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Featured</Text>
            <Switch
              value={item.isFeatured}
              onValueChange={() => onToggleFeatured(item.id)}
              trackColor={{ false: GRAY_BORDER, true: CORAL }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert('Delete item', `Remove "${item.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
          ])
        }
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={CORAL} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'rating'>) => void;
}) {
  const [form, setForm] = useState(emptyForm());

    const pickImage = async () => {
    const ImagePicker = await import('expo-image-picker');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });
    if (!result.canceled) {
        setForm(f => ({ ...f, imageUri: result.assets[0].uri }));
    }
    };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('Missing field', 'Please enter a product name.');
      return;
    }
    if (!form.price || form.price <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return;
    }
    onSave(form);
    setForm(emptyForm());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.modalSafe}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Image Picker */}
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {form.imageUri ? (
                <Image source={{ uri: form.imageUri }} style={styles.imagePickerPreview} />
              ) : (
                <View style={styles.imagePickerEmpty}>
                  <Ionicons name="image-outline" size={32} color={TEXT_SECONDARY} />
                  <Text style={styles.imagePickerText}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Crispy Shrimp"
              placeholderTextColor={TEXT_SECONDARY}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            {/* Price */}
            <Text style={styles.fieldLabel}>Price (₱) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="decimal-pad"
              value={form.price > 0 ? String(form.price) : ''}
              onChangeText={v => setForm(f => ({ ...f, price: parseFloat(v) || 0 }))}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe the dish..."
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
            />

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                  style={[
                    styles.categoryOption,
                    form.category === cat && styles.categoryOptionSelected,
                  ]}
                >
                  <Text style={styles.categoryOptionEmoji}>{CATEGORY_EMOJI[cat]}</Text>
                  <Text
                    style={[
                      styles.categoryOptionText,
                      form.category === cat && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggles */}
            <View style={styles.formToggles}>
              <View style={styles.formToggleRow}>
                <View>
                  <Text style={styles.fieldLabel}>Available</Text>
                  <Text style={styles.toggleHint}>Show this item to customers</Text>
                </View>
                <Switch
                  value={form.isAvailable}
                  onValueChange={v => setForm(f => ({ ...f, isAvailable: v }))}
                  trackColor={{ false: GRAY_BORDER, true: TEAL_MID }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.formToggleRow}>
                <View>
                  <Text style={styles.fieldLabel}>Featured</Text>
                  <Text style={styles.toggleHint}>Highlight on the home screen</Text>
                </View>
                <Switch
                  value={form.isFeatured}
                  onValueChange={v => setForm(f => ({ ...f, isFeatured: v }))}
                  trackColor={{ false: GRAY_BORDER, true: CORAL }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<Category | 'All'>('All');
  const [modalVisible, setModalVisible] = useState(false);

  // Derived stats
  const totalItems = products.length;
  const available = products.filter(p => p.isAvailable).length;
  const featured = products.filter(p => p.isFeatured).length;

  // Filtered list
  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === 'All' || p.category === filterCat;
    return matchesSearch && matchesCat;
  });

  const handleAdd = (data: Omit<Product, 'id' | 'rating'>) => {
    const newProduct: Product = {
      ...data,
      id: Date.now().toString(),
      rating: 0,
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const toggleAvailable = (id: string) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isAvailable: !p.isAvailable } : p));

  const toggleFeatured = (id: string) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p));

  const deleteProduct = (id: string) =>
    setProducts(prev => prev.filter(p => p.id !== id));

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandName}>SeaTachys</Text>
            <Text style={styles.brandSub}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          stickyHeaderIndices={[1]}
        >
          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            <StatCard label="Total Items" value={totalItems} color={TEAL} />
            <StatCard label="Available" value={available} color={TEAL_MID} />
            <StatCard label="Featured" value={featured} color={CORAL} />
          </View>

          {/* ── Search + Filter (sticky) ── */}
          <View style={styles.stickySection}>
            <View style={styles.searchWrap}>
              <FontAwesome6 name="magnifying-glass" size={14} color={TEXT_SECONDARY} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items..."
                placeholderTextColor={TEXT_SECONDARY}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {(['All', ...CATEGORIES] as const).map(c => (
                <CategoryPill
                  key={c}
                  cat={c}
                  selected={filterCat === c}
                  onPress={() => setFilterCat(c)}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Product List ── */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
              {filterCat !== 'All' ? ` · ${filterCat}` : ''}
            </Text>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🌊</Text>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyBody}>
                  Tap "Add Item" to start building your menu.
                </Text>
              </View>
            ) : (
              filtered.map(item => (
                <ProductRow
                  key={item.id}
                  item={item}
                  onToggleAvailable={toggleAvailable}
                  onToggleFeatured={toggleFeatured}
                  onDelete={deleteProduct}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAdd}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GRAY_BG },
  safe: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  brandName: { fontSize: 22, fontWeight: '700', color: TEAL, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY },
  statLabel: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, fontWeight: '500' },

  // Sticky search + filter
  stickySection: {
    backgroundColor: GRAY_BG,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRIMARY },
  pillRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  pillSelected: { backgroundColor: TEAL_LIGHT, borderColor: TEAL_MID },
  pillText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  pillTextSelected: { color: TEAL, fontWeight: '600' },

  // List
  listSection: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10, fontWeight: '500' },

  // Product row
  productRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  productImageWrap: { marginRight: 12 },
  productThumb: { width: 64, height: 64, borderRadius: 8 },
  productThumbPlaceholder: {
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 2 },
  productMeta: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 8 },
  productToggles: { flexDirection: 'row', gap: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '500' },
  deleteBtn: { padding: 4, marginTop: 2 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', maxWidth: 240 },

  // ── Modal ──
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  modalBody: { padding: 20 },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    backgroundColor: '#fff',
  },

  // Image picker
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  imagePickerEmpty: {
    width: width - 40,
    height: 160,
    backgroundColor: GRAY_BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: GRAY_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerPreview: {
    width: width - 40,
    height: 200,
    borderRadius: 12,
  },
  imagePickerText: { fontSize: 13, color: TEXT_SECONDARY },

  // Form fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    backgroundColor: GRAY_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 11,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    backgroundColor: '#fff',
  },
  categoryOptionSelected: {
    backgroundColor: TEAL_LIGHT,
    borderColor: TEAL_MID,
  },
  categoryOptionEmoji: { fontSize: 16 },
  categoryOptionText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  categoryOptionTextSelected: { color: TEAL, fontWeight: '600' },

  // Form toggles
  formToggles: {
    backgroundColor: GRAY_BG,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    marginBottom: 8,
  },
  formToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  toggleHint: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 1 },

  // Save button
  saveBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});