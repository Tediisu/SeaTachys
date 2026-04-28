import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import {
  adminMenuService,
  type AdminCategory,
  type AdminMenuItem,
} from '@/services/admin-menu.services';
import { authService } from '@/services/auth.services';
import { homePromoService, type HomePromoSlide } from '@/services/home-promo.services';
import { imageUploadService } from '@/services/image-upload.services';

const CATEGORY_EMOJI: Record<string, string> = {
  Fish: '🐟',
  Shellfish: '🦪',
  Crustacean: '🦀',
  Cephalopod: '🦑',
};

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const TEAL_MID = '#1D9E75';
const CORAL = '#D85A30';
const GRAY_BG = '#F7F6F2';
const GRAY_BORDER = '#D3D1C7';
const TEXT_PRIMARY = '#2C2C2A';
const TEXT_SECONDARY = '#888780';

type DashboardProduct = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUri?: string;
  category: string;
  categoryId?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

type ProductForm = {
  name: string;
  price: number;
  description: string;
  imageUri?: string;
  categoryId?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
};

type CategoryForm = {
  name: string;
  description: string;
  imageUri?: string;
  displayOrder: number;
  isActive: boolean;
};

type HomePromoFormSlide = {
  position: number;
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statLabel: string;
  statValue: string;
  imageUri?: string;
};

const emptyForm = (): ProductForm => ({
  name: '',
  price: 0,
  description: '',
  imageUri: undefined,
  categoryId: null,
  isAvailable: true,
  isFeatured: false,
});

const emptyCategoryForm = (): CategoryForm => ({
  name: '',
  description: '',
  imageUri: undefined,
  displayOrder: 0,
  isActive: true,
});

const defaultHomePromos = (): HomePromoFormSlide[] => ([
  {
    position: 1,
    badge: 'Discounts',
    eyebrow: 'TODAY',
    title: 'Fresh seafood deals',
    subtitle: 'Hot picks at lighter prices.',
    statLabel: 'Savings',
    statValue: 'Up to 20%',
    imageUri: undefined,
  },
  {
    position: 2,
    badge: 'Limited',
    eyebrow: 'SMALL BATCH',
    title: 'Fresh picks',
    subtitle: 'Small-batch menu for today.',
    statLabel: 'Starts at',
    statValue: 'P199',
    imageUri: undefined,
  },
  {
    position: 3,
    badge: 'Featured',
    eyebrow: 'CHEF PICK',
    title: 'Chef favorites',
    subtitle: 'Popular picks ready to order.',
    statLabel: 'Featured',
    statValue: '1 live',
    imageUri: undefined,
  },
]);

function mapMenuItem(item: AdminMenuItem): DashboardProduct {
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    description: item.description ?? '',
    imageUri: item.imageUrl ?? undefined,
    category: item.category?.name ?? 'Uncategorized',
    categoryId: item.categoryId ?? null,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    displayOrder: item.displayOrder,
  };
}

function mapHomePromoSlide(slide: HomePromoSlide): HomePromoFormSlide {
  return {
    position: slide.position,
    badge: slide.badge,
    eyebrow: slide.eyebrow,
    title: slide.title,
    subtitle: slide.subtitle,
    statLabel: slide.statLabel,
    statValue: slide.statValue,
    imageUri: slide.imageUrl ?? undefined,
  };
}

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
    <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{cat}</Text>
    </Pressable>
  );
}

function HomePromoModal({
  visible,
  onClose,
  onSave,
  initialSlides,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (slides: HomePromoFormSlide[]) => Promise<void>;
  initialSlides: HomePromoFormSlide[];
  saving: boolean;
}) {
  const [slides, setSlides] = useState<HomePromoFormSlide[]>(defaultHomePromos());

  useEffect(() => {
    if (visible) {
      setSlides(initialSlides.length > 0 ? initialSlides : defaultHomePromos());
    }
  }, [initialSlides, visible]);

  const updateSlide = (position: number, patch: Partial<HomePromoFormSlide>) => {
    setSlides((current) =>
      current.map((slide) => (slide.position === position ? { ...slide, ...patch } : slide))
    );
  };

  const pickImage = async (position: number) => {
    const ImagePicker = await import('expo-image-picker');

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateSlide(position, { imageUri: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (slides.some((slide) => !slide.badge.trim() || !slide.title.trim() || !slide.statLabel.trim() || !slide.statValue.trim())) {
      Alert.alert('Missing fields', 'Each slide needs a badge, title, stat label, and stat value.');
      return;
    }

    try {
      await onSave(slides);
      onClose();
    } catch (err: any) {
      Alert.alert('Unable to save promos', err.message || 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Home Slider</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {slides.map((slide) => (
              <View key={slide.position} style={styles.promoEditorCard}>
                <View style={styles.promoEditorHeader}>
                  <Text style={styles.promoEditorTitle}>Slide {slide.position}</Text>
                  <Text style={styles.promoEditorHint}>Shown on the customer home slider</Text>
                </View>

                <TouchableOpacity onPress={() => pickImage(slide.position)} style={styles.promoEditorImagePicker}>
                  {slide.imageUri ? (
                    <Image source={{ uri: slide.imageUri }} style={styles.promoEditorImagePreview} />
                  ) : (
                    <View style={styles.promoEditorImageEmpty}>
                      <Ionicons name="image-outline" size={24} color={TEXT_SECONDARY} />
                      <Text style={styles.imagePickerText}>Tap to add slide image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Badge</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Discounts"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={slide.badge}
                  onChangeText={(value) => updateSlide(slide.position, { badge: value })}
                />

                <Text style={styles.fieldLabel}>Eyebrow</Text>
                <TextInput
                  style={styles.input}
                  placeholder="TODAY"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={slide.eyebrow}
                  onChangeText={(value) => updateSlide(slide.position, { eyebrow: value })}
                />

                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Fresh seafood deals"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={slide.title}
                  onChangeText={(value) => updateSlide(slide.position, { title: value })}
                />

                <Text style={styles.fieldLabel}>Subtitle</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Short supporting copy"
                  placeholderTextColor={TEXT_SECONDARY}
                  multiline
                  numberOfLines={3}
                  value={slide.subtitle}
                  onChangeText={(value) => updateSlide(slide.position, { subtitle: value })}
                />

                <View style={styles.promoEditorStatRow}>
                  <View style={styles.promoEditorStatField}>
                    <Text style={styles.fieldLabel}>Stat Label</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Savings"
                      placeholderTextColor={TEXT_SECONDARY}
                      value={slide.statLabel}
                      onChangeText={(value) => updateSlide(slide.position, { statLabel: value })}
                    />
                  </View>
                  <View style={styles.promoEditorStatField}>
                    <Text style={styles.fieldLabel}>Stat Value</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Up to 20%"
                      placeholderTextColor={TEXT_SECONDARY}
                      value={slide.statValue}
                      onChangeText={(value) => updateSlide(slide.position, { statValue: value })}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Slider</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ProductRow({
  item,
  onToggleAvailable,
  onToggleFeatured,
  onDelete,
}: {
  item: DashboardProduct;
  onToggleAvailable: (item: DashboardProduct) => void;
  onToggleFeatured: (item: DashboardProduct) => void;
  onDelete: (item: DashboardProduct) => void;
}) {
  const emoji = CATEGORY_EMOJI[item.category] ?? '🍽️';

  return (
    <View style={styles.productRow}>
      <View style={styles.productImageWrap}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.productThumb} />
        ) : (
          <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productMeta}>
          P{item.price.toFixed(2)} · {item.category}
        </Text>
        <View style={styles.productToggles}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Available</Text>
            <Switch
              value={item.isAvailable}
              onValueChange={() => onToggleAvailable(item)}
              trackColor={{ false: GRAY_BORDER, true: TEAL_MID }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Featured</Text>
            <Switch
              value={item.isFeatured}
              onValueChange={() => onToggleFeatured(item)}
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
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(item) },
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

function AddItemModal({
  visible,
  onClose,
  onSave,
  categories,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (product: ProductForm) => Promise<void>;
  categories: AdminCategory[];
  saving: boolean;
}) {
  const [form, setForm] = useState<ProductForm>(emptyForm());

  useEffect(() => {
    if (visible) {
      setForm((prev) => ({
        ...emptyForm(),
        categoryId: categories[0]?.id ?? null,
      }));
    }
  }, [categories, visible]);

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
      setForm((current) => ({ ...current, imageUri: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing field', 'Please enter a product name.');
      return;
    }

    if (!form.price || form.price <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return;
    }

    try {
      await onSave(form);
      setForm(emptyForm());
      onClose();
    } catch (err: any) {
      Alert.alert('Unable to save item', err.message || 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
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

            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Crispy Shrimp"
              placeholderTextColor={TEXT_SECONDARY}
              value={form.name}
              onChangeText={(v) => setForm((current) => ({ ...current, name: v }))}
            />

            <Text style={styles.fieldLabel}>Price (P) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="decimal-pad"
              value={form.price > 0 ? String(form.price) : ''}
              onChangeText={(v) => setForm((current) => ({ ...current, price: parseFloat(v) || 0 }))}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe the dish..."
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={(v) => setForm((current) => ({ ...current, description: v }))}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const emoji = CATEGORY_EMOJI[cat.name] ?? '🍽️';

                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setForm((current) => ({ ...current, categoryId: cat.id }))}
                    style={[
                      styles.categoryOption,
                      form.categoryId === cat.id && styles.categoryOptionSelected,
                    ]}
                  >
                    <Text style={styles.categoryOptionEmoji}>{emoji}</Text>
                    <Text
                      style={[
                        styles.categoryOptionText,
                        form.categoryId === cat.id && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formToggles}>
              <View style={styles.formToggleRow}>
                <View>
                  <Text style={styles.fieldLabel}>Available</Text>
                  <Text style={styles.toggleHint}>Show this item to customers</Text>
                </View>
                <Switch
                  value={form.isAvailable}
                  onValueChange={(v) => setForm((current) => ({ ...current, isAvailable: v }))}
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
                  onValueChange={(v) => setForm((current) => ({ ...current, isFeatured: v }))}
                  trackColor={{ false: GRAY_BORDER, true: CORAL }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Item</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategoryModal({
  visible,
  onClose,
  onSave,
  initialCategory,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CategoryForm, existingId?: string) => Promise<void>;
  initialCategory?: AdminCategory | null;
  saving: boolean;
}) {
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm());

  useEffect(() => {
    if (!visible) return;

    if (initialCategory) {
      setForm({
        name: initialCategory.name,
        description: initialCategory.description ?? '',
        imageUri: initialCategory.imageUrl ?? undefined,
        displayOrder: initialCategory.displayOrder,
        isActive: initialCategory.isActive,
      });
    } else {
      setForm(emptyCategoryForm());
    }
  }, [initialCategory, visible]);

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
      setForm((current) => ({ ...current, imageUri: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing field', 'Please enter a category name.');
      return;
    }

    try {
      await onSave(form, initialCategory?.id);
      onClose();
    } catch (err: any) {
      Alert.alert('Unable to save category', err.message || 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initialCategory ? 'Edit Category' : 'Add Category'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Category Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fish"
              placeholderTextColor={TEXT_SECONDARY}
              value={form.name}
              onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Short category description"
              placeholderTextColor={TEXT_SECONDARY}
              value={form.description}
              onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Category Image</Text>
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

            <Text style={styles.fieldLabel}>Display Order</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="number-pad"
              value={String(form.displayOrder)}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, displayOrder: parseInt(value || '0', 10) || 0 }))
              }
            />

            <View style={styles.formToggleRow}>
              <View>
                <Text style={styles.fieldLabel}>Active</Text>
                <Text style={styles.toggleHint}>Visible in the customer menu</Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
                trackColor={{ false: GRAY_BORDER, true: TEAL_MID }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Category</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [homePromos, setHomePromos] = useState<HomePromoFormSlide[]>(defaultHomePromos());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [categoryData, itemData] = await Promise.all([
        adminMenuService.getCategories(),
        adminMenuService.getItems(),
      ]);

      setCategories(categoryData);
      setProducts(itemData.map(mapMenuItem));

      try {
        const promoData = await homePromoService.getAdminPromos();
        setHomePromos(promoData.length > 0 ? promoData.map(mapHomePromoSlide) : defaultHomePromos());
      } catch {
        setHomePromos(defaultHomePromos());
      }
    } catch (err: any) {
      Alert.alert('Unable to load dashboard', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalItems = products.length;
  const available = products.filter((p) => p.isAvailable).length;
  const featured = products.filter((p) => p.isFeatured).length;

  const categoryFilters = useMemo(() => ['All', ...categories.map((c) => c.name)], [categories]);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === 'All' || p.category === filterCat;
    return matchesSearch && matchesCat;
  });

  const handleAdd = async (data: ProductForm) => {
    setSaving(true);
    try {
      const imageUrl = data.imageUri
        ? await imageUploadService.uploadToCloudinary(data.imageUri, 'product')
        : null;

      const created = await adminMenuService.createItem({
        categoryId: data.categoryId ?? null,
        name: data.name.trim(),
        description: data.description.trim() || null,
        price: data.price,
        imageUrl,
        isAvailable: data.isAvailable,
        isFeatured: data.isFeatured,
        displayOrder: products.length + 1,
      });

      const category = categories.find((item) => item.id === created.categoryId) ?? null;
      setProducts((prev) => [mapMenuItem({ ...created, category }), ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (item: DashboardProduct, patch: Partial<DashboardProduct>) => {
    const next = { ...item, ...patch };
    const updated = await adminMenuService.updateItem(item.id, {
      categoryId: next.categoryId ?? null,
      name: next.name,
      description: next.description,
      price: next.price,
      imageUrl: next.imageUri ?? null,
      isAvailable: next.isAvailable,
      isFeatured: next.isFeatured,
      displayOrder: next.displayOrder,
    });

    const category = categories.find((entry) => entry.id === updated.categoryId) ?? null;
    setProducts((prev) => prev.map((product) => (product.id === item.id ? mapMenuItem({ ...updated, category }) : product)));
  };

  const toggleAvailable = async (item: DashboardProduct) => {
    try {
      await updateProduct(item, { isAvailable: !item.isAvailable });
    } catch (err: any) {
      Alert.alert('Unable to update item', err.message || 'Please try again.');
    }
  };

  const toggleFeatured = async (item: DashboardProduct) => {
    try {
      await updateProduct(item, { isFeatured: !item.isFeatured });
    } catch (err: any) {
      Alert.alert('Unable to update item', err.message || 'Please try again.');
    }
  };

  const deleteProduct = async (item: DashboardProduct) => {
    try {
      await adminMenuService.deleteItem(item.id);
      setProducts((prev) => prev.filter((product) => product.id !== item.id));
    } catch (err: any) {
      Alert.alert('Unable to delete item', err.message || 'Please try again.');
    }
  };

  const handleSaveCategory = async (input: CategoryForm, existingId?: string) => {
    setSaving(true);
    try {
      const imageUrl = input.imageUri
        ? await imageUploadService.uploadToCloudinary(input.imageUri, 'category')
        : null;

      if (existingId) {
        const updated = await adminMenuService.updateCategory(existingId, {
          name: input.name.trim(),
          description: input.description.trim() || null,
          imageUrl,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
        });
        setCategories((prev) => prev.map((category) => (category.id === existingId ? updated : category)));
      } else {
        const created = await adminMenuService.createCategory({
          name: input.name.trim(),
          description: input.description.trim() || null,
          imageUrl,
          displayOrder: input.displayOrder || categories.length + 1,
          isActive: input.isActive,
        });
        setCategories((prev) => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
      }
    } finally {
      setSaving(false);
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (category: AdminCategory) => {
    try {
      await adminMenuService.deleteCategory(category.id);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
    } catch (err: any) {
      Alert.alert('Unable to delete category', err.message || 'Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Unable to logout', err.message || 'Please try again.');
    }
  };

  const handleSavePromos = async (slides: HomePromoFormSlide[]) => {
    setSaving(true);
    try {
      const payload = await Promise.all(
        slides.map(async (slide) => ({
          position: slide.position,
          badge: slide.badge.trim(),
          eyebrow: slide.eyebrow.trim(),
          title: slide.title.trim(),
          subtitle: slide.subtitle.trim(),
          statLabel: slide.statLabel.trim(),
          statValue: slide.statValue.trim(),
          imageUrl: slide.imageUri
            ? await imageUploadService.uploadToCloudinary(slide.imageUri, 'promo')
            : null,
        }))
      );

      const updated = await homePromoService.updatePromos(payload);
      setHomePromos(updated.map(mapHomePromoSlide));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandName}>SeaTachys</Text>
            <Text style={styles.brandSub}>Admin Dashboard</Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color={TEXT_PRIMARY} />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading menu dashboard...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} stickyHeaderIndices={[1]}>
            <View style={styles.statsRow}>
              <StatCard label="Total Items" value={totalItems} color={TEAL} />
              <StatCard label="Available" value={available} color={TEAL_MID} />
              <StatCard label="Featured" value={featured} color={CORAL} />
            </View>

            <View style={styles.listSection}>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.sectionTitle}>Home Slider</Text>
                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={() => setPromoModalVisible(true)}
                >
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text style={styles.smallActionBtnText}>Manage Slider</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.promoSummaryCard}>
                {homePromos.map((slide) => (
                  <View key={slide.position} style={styles.promoSummaryRow}>
                    <View style={styles.promoSummaryIndex}>
                      <Text style={styles.promoSummaryIndexText}>{slide.position}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoSummaryBadge}>{slide.badge || `Slide ${slide.position}`}</Text>
                      <Text style={styles.promoSummaryTitleText} numberOfLines={1}>
                        {slide.title || 'Untitled slide'}
                      </Text>
                      <Text style={styles.promoSummaryMeta} numberOfLines={1}>
                        {slide.statLabel}: {slide.statValue}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.listSection}>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={() => {
                    setEditingCategory(null);
                    setCategoryModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.smallActionBtnText}>Add Category</Text>
                </TouchableOpacity>
              </View>

              {categories.map((category) => (
                <View key={category.id} style={styles.categoryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryMeta}>
                      Order {category.displayOrder} · {category.isActive ? 'Active' : 'Hidden'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.categoryIconBtn}
                    onPress={() => {
                      setEditingCategory(category);
                      setCategoryModalVisible(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color={TEAL} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.categoryIconBtn}
                    onPress={() =>
                      Alert.alert('Delete category', `Delete "${category.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteCategory(category) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={CORAL} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {categoryFilters.map((cat) => (
                  <CategoryPill
                    key={cat}
                    cat={cat}
                    selected={filterCat === cat}
                    onPress={() => setFilterCat(cat)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
                {filterCat !== 'All' ? ` · ${filterCat}` : ''}
              </Text>

              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🌊</Text>
                  <Text style={styles.emptyTitle}>No items yet</Text>
                  <Text style={styles.emptyBody}>Tap "Add Item" to start building your menu.</Text>
                </View>
              ) : (
                filtered.map((item) => (
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
        )}
      </SafeAreaView>

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAdd}
        categories={categories}
        saving={saving}
      />
      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        initialCategory={editingCategory}
        saving={saving}
      />
      <HomePromoModal
        visible={promoModalVisible}
        onClose={() => setPromoModalVisible(false)}
        onSave={handleSavePromos}
        initialSlides={homePromos}
        saving={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GRAY_BG },
  safe: { flex: 1 },

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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: { fontSize: 22, fontWeight: '700', color: TEAL, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  logoutBtnText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
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

  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },

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
  promoSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 14,
    gap: 12,
  },
  promoSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoSummaryIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoSummaryIndexText: {
    color: TEAL,
    fontSize: 13,
    fontWeight: '800',
  },
  promoSummaryBadge: {
    fontSize: 11,
    color: TEAL_MID,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  promoSummaryTitleText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
  promoSummaryMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

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

  listSection: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10, fontWeight: '500' },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  categoryMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  categoryIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', maxWidth: 240 },

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
  promoEditorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 16,
    marginBottom: 16,
  },
  promoEditorHeader: {
    marginBottom: 12,
  },
  promoEditorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  promoEditorHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  promoEditorImagePicker: {
    marginBottom: 16,
  },
  promoEditorImageEmpty: {
    height: 132,
    borderRadius: 12,
    backgroundColor: GRAY_BG,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: GRAY_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  promoEditorImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  promoEditorStatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promoEditorStatField: {
    flex: 1,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  imagePickerEmpty: {
    width: '100%',
    minWidth: 320,
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
    width: 320,
    height: 200,
    borderRadius: 12,
  },
  imagePickerText: { fontSize: 13, color: TEXT_SECONDARY },
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
  saveBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
