import { ActivityIndicator, StyleSheet, View, Pressable, TextInput, ScrollView, FlatList, Image, RefreshControl, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontSize, MaxContentWidth, Spacing } from '@/constants/theme';
import Button from '@/components/ui/Button';
import { useTheme } from '@/hooks/use-theme';
import ProductCard from '@/components/ui/Product-Card';
import CategoryButton from '@/components/ui/Category-Button';
import SideBar from '@/components/ui/Side-Bar';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/use-auth';
import { menuService, type MenuCategoryDto, type MenuItemDto } from '@/services/menu.services';
import { useRouter } from 'expo-router';
import { useCart } from '@/hooks/use-cart';

const categoryImageMap: Record<string, number> = {
  All: require('@/assets/imgs/wave.png'),
  Fish: require('@/assets/imgs/fish.png'),
  Crustacean: require('@/assets/imgs/shrimp.png'),
  Shellfish: require('@/assets/imgs/shellfish.png'),
  Cephalopod: require('@/assets/imgs/squid.png'),
};

type HomeProduct = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | number | null;
  category: string;
  rating?: number;
  isFeatured: boolean;
  displayOrder: number;
};

export default function Home() {
  const colors = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { itemCount } = useCart();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ui = useMemo(() => {
    const isCompact = width < 390;
    const pagePadding = isCompact ? 16 : 20;
    const gap = isCompact ? 12 : 14;
    const contentWidth = Math.min(width - pagePadding * 2, MaxContentWidth);
    const cardWidth = (contentWidth - gap) / 2;

    return {
      pagePadding,
      gap,
      contentWidth,
      cardWidth,
      heroHeight: isCompact ? 220 : 244,
    };
  }, [width]);

  const loadMenu = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [categoryData, itemData] = await Promise.all([
        menuService.getCategories(),
        menuService.getItems(),
      ]);

      const categoryById = new Map<string, MenuCategoryDto>(
        categoryData.map((category: MenuCategoryDto) => [category.id, category])
      );

      const mappedItems = itemData.map((item: MenuItemDto) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        description: item.description,
        image: item.imageUrl || null,
        category: item.categoryId ? categoryById.get(item.categoryId)?.name ?? 'Uncategorized' : 'Uncategorized',
        rating: 4.5,
        isFeatured: item.isFeatured,
        displayOrder: item.displayOrder,
      }));

      setCategories(categoryData);
      setItems(mappedItems);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const categoryButtons = useMemo(
    () => [
      { label: 'All', image: categoryImageMap.All },
      ...categories.map((category) => ({
        label: category.name,
        image: categoryImageMap[category.name] || categoryImageMap.All,
      })),
    ],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, search, selectedCategory]);

  const firstName = user?.fullname?.split(' ')[0] ?? 'Seafood Lover';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading the latest menu...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadMenu(true)} tintColor={colors.primary} />
            }
            columnWrapperStyle={{
              gap: ui.gap,
              marginBottom: ui.gap,
            }}
            contentContainerStyle={{
              paddingHorizontal: ui.pagePadding,
              paddingTop: 8,
              paddingBottom: BottomTabInset + Spacing.four,
            }}
            renderItem={({ item }) => (
              <View style={{ width: ui.cardWidth }}>
                <ProductCard
                  item={item}
                  compact
                  onPress={() => router.push(`/(user)/product/${item.id}`)}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyTitle}>No dishes yet</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Once the admin adds menu items, they will appear here automatically.
                </ThemedText>
              </View>
            }
            ListHeaderComponent={
              <View style={[styles.pageContent, { width: ui.contentWidth, alignSelf: 'center' }]}>
                <View style={styles.headerRow}>
                  <Button
                    variant="primary"
                    onPress={() => setIsSidebarOpen(true)}
                    icon={<FontAwesome6 name="bars" size={20} color="white" />}
                    size="boxSmall"
                    radius={50}
                    style={{ paddingHorizontal: 0 }}
                  />

                  <View style={styles.locationCard}>
                    <ThemedText style={styles.locationLabel}>DELIVER TO</ThemedText>
                    <ThemedText style={styles.locationValue}>Rawr Bldg</ThemedText>
                  </View>

                  <View>
                    <Button
                      onPress={() => router.push('/(user)/Cart')}
                      icon={<Ionicons name="bag-sharp" size={20} color="white" />}
                      size="boxSmall"
                      radius={50}
                      style={{ paddingHorizontal: 0 }}
                    />
                    {itemCount > 0 ? (
                      <View style={styles.cartBadge}>
                        <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.heroCard, { minHeight: ui.heroHeight, backgroundColor: colors.primary }]}>
                  <View style={styles.heroGlowTop} />
                  <View style={styles.heroGlowBottom} />

                  <View style={styles.heroTextBlock}>
                    <View style={styles.heroBadge}>
                      <ThemedText style={styles.heroBadgeText}>Fresh catch today</ThemedText>
                    </View>
                    <ThemedText style={styles.heroTitle}>Hello, {firstName}</ThemedText>
                    <ThemedText style={styles.heroSubtitle}>
                      Craving seafood? Pick from best-sellers, crispy bites, and savory specialties.
                    </ThemedText>
                  </View>

                  <Image source={categoryImageMap.All} style={styles.heroImage} />

                  <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                      <FontAwesome6 name="magnifying-glass" size={16} color={colors.textSecondary} />
                      <TextInput
                        placeholder="Search dishes"
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={search}
                        onChangeText={setSearch}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <View>
                    <ThemedText style={styles.sectionTitle}>Browse by Category</ThemedText>
                    <ThemedText style={styles.sectionCaption}>Choose your seafood mood</ThemedText>
                  </View>
                  <Pressable onPress={() => setSelectedCategory('All')}>
                    <ThemedText style={styles.sectionAction}>See all</ThemedText>
                  </Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                  {categoryButtons.map((category) => (
                    <CategoryButton
                      key={category.label}
                      image={category.image}
                      label={category.label}
                      isSelected={selectedCategory === category.label}
                      onPress={() => setSelectedCategory(category.label)}
                    />
                  ))}
                </ScrollView>

                <View style={styles.sectionHeader}>
                  <View>
                    <ThemedText style={styles.sectionTitle}>Popular Picks</ThemedText>
                    <ThemedText style={styles.sectionCaption}>Live menu from the admin dashboard</ThemedText>
                  </View>
                  <View style={styles.counterPill}>
                    <ThemedText style={styles.counterText}>{filteredProducts.length} items</ThemedText>
                  </View>
                </View>
              </View>
            }
          />
        )}

        <SideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#0F2F57',
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    color: '#0F2F57',
    fontSize: FontSize.title,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: FontSize.small,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  pageContent: {
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  locationCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#00172F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  locationLabel: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  locationValue: {
    color: '#111827',
    fontSize: FontSize.subtitle,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 30,
    overflow: 'hidden',
    padding: 22,
    marginBottom: 22,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: 20,
    right: 90,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,142,0,0.14)',
  },
  heroTextBlock: {
    maxWidth: '62%',
    zIndex: 2,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#FFE4BD',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.small,
    lineHeight: 22,
  },
  heroImage: {
    position: 'absolute',
    right: 14,
    top: 22,
    width: 122,
    height: 122,
    resizeMode: 'contain',
    opacity: 0.92,
  },
  searchWrap: {
    marginTop: 'auto',
    paddingTop: 18,
    zIndex: 2,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  sectionCaption: {
    color: '#6B7280',
    fontSize: FontSize.small,
    lineHeight: 20,
  },
  sectionAction: {
    color: '#FF8E00',
    fontSize: FontSize.small,
    fontWeight: '800',
  },
  categoriesRow: {
    gap: 12,
    paddingBottom: 24,
  },
  counterPill: {
    backgroundColor: '#DDE8F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterText: {
    color: '#0F2F57',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF8E00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
});
