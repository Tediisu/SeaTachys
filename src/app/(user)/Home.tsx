import { ActivityIndicator, StyleSheet, View, Pressable, TextInput, ScrollView, FlatList, Image, RefreshControl, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { homePromoService, type HomePromoSlide as HomePromoSlideDto } from '@/services/home-promo.services';
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

type PromoSlide = {
  id: string;
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statLabel: string;
  statValue: string;
  image: ImageSourcePropType | string | null;
};

export default function Home() {
  const colors = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { itemCount } = useCart();
  const sliderRef = useRef<FlatList<PromoSlide>>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [promoOverrides, setPromoOverrides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const ui = useMemo(() => {
    const isCompact = width < 390;
    const pagePadding = isCompact ? 16 : 20;
    const gap = isCompact ? 12 : 14;
    const contentWidth = Math.min(width - pagePadding * 2, MaxContentWidth);
    const cardWidth = (contentWidth - gap) / 2;
    const heroPadding = isCompact ? 18 : 22;

    return {
      pagePadding,
      gap,
      contentWidth,
      cardWidth,
      heroPadding,
      heroHeight: isCompact ? 272 : 292,
      promoHeight: isCompact ? 146 : 156,
      heroSlideWidth: contentWidth - heroPadding * 2,
    };
  }, [width]);

  const loadMenu = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [categoryData, itemData, promoData] = await Promise.all([
        menuService.getCategories(),
        menuService.getItems(),
        homePromoService.getPublicPromos().catch(() => [] as HomePromoSlideDto[]),
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
      setPromoOverrides(
        promoData
          .sort((a, b) => a.position - b.position)
          .map((slide) => ({
            id: `remote-${slide.position}`,
            badge: slide.badge,
            eyebrow: slide.eyebrow,
            title: slide.title,
            subtitle: slide.subtitle,
            statLabel: slide.statLabel,
            statValue: slide.statValue,
            image: slide.imageUrl ?? null,
          }))
      );
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
  const featuredItems = useMemo(
    () =>
      [...items]
        .filter((item) => item.isFeatured)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [items]
  );

  const fallbackPromoSlides = useMemo<PromoSlide[]>(() => {
    const heroDefaults = {
      discount: require('@/assets/images/crispy-shrimp.jpg'),
      limited: require('@/assets/images/sisig-pusit.jpg'),
      featured: require('@/assets/images/teryaki-salmon.jpg'),
    } as const;

    const spotlightItem = featuredItems[0] ?? items[0] ?? null;
    const limitedItem = items.find((item) => item.category !== 'Uncategorized') ?? items[1] ?? spotlightItem;

    return [
      {
        id: 'discounts',
        badge: 'Discounts',
        eyebrow: 'TODAY',
        title: 'Fresh seafood deals',
        subtitle: 'Hot picks at lighter prices.',
        statLabel: 'Savings',
        statValue: 'Up to 20%',
        image: heroDefaults.discount,
      },
      {
        id: 'limited',
        badge: 'Limited',
        eyebrow: limitedItem?.category?.toUpperCase() ?? 'SMALL BATCH',
        title: limitedItem?.name ?? 'Fresh picks landed today',
        subtitle:
          limitedItem?.description ??
          'Small-batch menu for today.',
        statLabel: 'Starts at',
        statValue: limitedItem ? `P${limitedItem.price.toFixed(0)}` : 'P199',
        image: limitedItem?.image ?? heroDefaults.limited,
      },
      {
        id: 'featured',
        badge: `Hello, ${firstName}`,
        eyebrow: 'FEATURED',
        title: spotlightItem ? `Try ${spotlightItem.name}` : 'Chef favorites',
        subtitle:
          spotlightItem?.description ??
          'Popular picks ready to order.',
        statLabel: 'Featured',
        statValue: `${Math.max(featuredItems.length, 1)} live`,
        image: spotlightItem?.image ?? heroDefaults.featured,
      },
    ];
  }, [featuredItems, firstName, items]);

  const promoSlides = useMemo(
    () => (promoOverrides.length > 0 ? promoOverrides : fallbackPromoSlides),
    [fallbackPromoSlides, promoOverrides]
  );

  useEffect(() => {
    setCurrentSlideIndex((prev) => Math.min(prev, Math.max(promoSlides.length - 1, 0)));
  }, [promoSlides.length]);

  useEffect(() => {
    if (promoSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = (prev + 1) % promoSlides.length;
        sliderRef.current?.scrollToOffset({ offset: next * ui.heroSlideWidth, animated: true });
        return next;
      });
    }, 4200);

    return () => clearInterval(interval);
  }, [promoSlides.length, ui.heroSlideWidth]);

  const handleSliderMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / ui.heroSlideWidth);
    setCurrentSlideIndex(Math.max(0, Math.min(nextIndex, promoSlides.length - 1)));
  };

  const renderPromoSlide = ({ item }: { item: PromoSlide }) => {
    const imageSource =
      typeof item.image === 'string'
        ? { uri: item.image }
        : item.image || require('@/assets/images/icon.png');

    return (
      <View style={[styles.promoSlide, { width: ui.heroSlideWidth, height: ui.promoHeight }]}>
        <View style={styles.promoSlideGlow} />
        <View style={styles.promoCopy}>
          <View style={styles.promoBadge}>
            <ThemedText style={styles.promoBadgeText}>{item.badge}</ThemedText>
          </View>
          <ThemedText style={styles.promoEyebrow}>{item.eyebrow}</ThemedText>
          <ThemedText style={styles.promoTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.promoSubtitle} numberOfLines={2}>
            {item.subtitle}
          </ThemedText>

          <View style={styles.promoStatPill}>
            <ThemedText style={styles.promoStatLabel}>{item.statLabel}</ThemedText>
            <ThemedText style={styles.promoStatValue}>{item.statValue}</ThemedText>
          </View>
        </View>

        <Image source={imageSource} style={styles.promoImage} />
      </View>
    );
  };

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

                <View style={[styles.heroCard, { minHeight: ui.heroHeight, backgroundColor: colors.primary, padding: ui.heroPadding }]}>
                  <View style={styles.heroGlowTop} />
                  <View style={styles.heroGlowBottom} />

                  <View style={styles.heroIntroRow}>
                    <View>
                      <ThemedText style={styles.heroKicker}>Fresh for {firstName}</ThemedText>
                      <ThemedText style={styles.heroHeading}>Today&apos;s seafood picks</ThemedText>
                    </View>
                    <View style={styles.heroCounterPill}>
                      <ThemedText style={styles.heroCounterValue}>{promoSlides.length}</ThemedText>
                      <ThemedText style={styles.heroCounterLabel}>slides</ThemedText>
                    </View>
                  </View>

                  <FlatList
                    ref={sliderRef}
                    data={promoSlides}
                    renderItem={renderPromoSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleSliderMomentumEnd}
                    style={styles.promoSlider}
                  />

                  <View style={styles.heroPagination}>
                    {promoSlides.map((slide, index) => (
                      <View
                        key={slide.id}
                        style={[
                          styles.heroDot,
                          index === currentSlideIndex ? styles.heroDotActive : null,
                        ]}
                      />
                    ))}
                  </View>

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
    right: 70,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,142,0,0.18)',
  },
  heroIntroRow: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroKicker: {
    color: '#9DD3FF',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroHeading: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
    maxWidth: 190,
  },
  heroCounterPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 66,
    alignItems: 'center',
  },
  heroCounterValue: {
    color: '#FFFFFF',
    fontSize: FontSize.subtitle,
    fontWeight: '900',
  },
  heroCounterLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  promoSlider: {
    marginTop: 18,
    zIndex: 2,
  },
  promoSlide: {
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
  },
  promoSlideGlow: {
    position: 'absolute',
    right: -10,
    top: -8,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  promoCopy: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'center',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,142,0,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  promoBadgeText: {
    color: '#FFDCA8',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  promoEyebrow: {
    color: '#9DD3FF',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 6,
    maxWidth: 170,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 164,
  },
  promoStatPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promoStatLabel: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  promoStatValue: {
    color: '#0F2F57',
    fontSize: 15,
    fontWeight: '900',
  },
  promoImage: {
    width: 108,
    height: 128,
    marginRight: 10,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  heroPagination: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  heroDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  heroDotActive: {
    width: 28,
    backgroundColor: '#FF8E00',
  },
  searchWrap: {
    marginTop: 'auto',
    paddingTop: 16,
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
