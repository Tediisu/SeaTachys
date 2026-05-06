import { StyleSheet, View, Pressable, TextInput, ScrollView, FlatList, RefreshControl, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, MaxContentWidth, Spacing } from '@/constants/theme';
import Button from '@/components/ui/Button';
import { useTheme } from '@/hooks/use-theme';
import ProductCard from '@/components/ui/Product-Card';
import CategoryButton from '@/components/ui/Category-Button';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/use-auth';
import { type MenuCategoryDto, type MenuItemDto } from '@/services/menu.services';
import { useRouter } from 'expo-router';
import { useCart } from '@/hooks/use-cart';
import { useAppBootstrap } from '@/hooks/AppBootstrapContext';
import { optimizeImageUrl } from '@/utils/image';
import Skeleton from '@/components/ui/Skeleton';
import { HomeScreenSkeleton } from '@/components/ui/SkeletonScreens';

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

type TopBanner = {
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  accentText: string;
  image: ImageSourcePropType | string | null;
};

export default function Home() {
  const colors = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { itemCount } = useCart();
  const { publicData, publicLoading, refreshPublicData } = useAppBootstrap();
  const sliderRef = useRef<FlatList<PromoSlide>>(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [promoOverrides, setPromoOverrides] = useState<PromoSlide[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [promoImageReady, setPromoImageReady] = useState<Record<string, boolean>>({});
  const [topBannerImageReady, setTopBannerImageReady] = useState(false);

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
      heroHeight: isCompact ? 256 : 274,
      promoHeight: isCompact ? 154 : 164,
      heroSlideWidth: contentWidth - heroPadding * 2,
      topBannerHeight: isCompact ? 136 : 148,
      topBannerImageSize: isCompact ? 92 : 104,
    };
  }, [width]);

  useEffect(() => {
    const categoryById = new Map<string, MenuCategoryDto>(
      publicData.categories.map((category: MenuCategoryDto) => [category.id, category])
    );

    const mappedItems = publicData.items.map((item: MenuItemDto) => ({
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

    setCategories(publicData.categories);
    setItems(mappedItems);
    setPromoOverrides(
      publicData.promos
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
  }, [publicData]);

  const loading = publicLoading && items.length === 0 && categories.length === 0;

  const loadMenu = async (showRefresh = false) => {
    if (!showRefresh) {
      return;
    }

    setRefreshing(true);
    try {
      await refreshPublicData();
    } finally {
      setRefreshing(false);
    }
  };

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

  const topBanner = useMemo<TopBanner>(() => {
    const spotlightItem = featuredItems[0] ?? items[0] ?? null;
    const fallbackImage = require('@/assets/images/crispy-shrimp.jpg');

    if (publicData.banner) {
      return {
        badge: publicData.banner.badge,
        eyebrow: publicData.banner.eyebrow,
        title: publicData.banner.title,
        subtitle: publicData.banner.subtitle,
        ctaLabel: publicData.banner.ctaLabel,
        accentText: publicData.banner.accentText,
        image: publicData.banner.imageUrl ?? spotlightItem?.image ?? fallbackImage,
      };
    }

    return {
      badge: 'Fresh Drop',
      eyebrow: 'SEATACHYS EXPRESS',
      title: spotlightItem ? `Try ${spotlightItem.name} today` : 'Seafood cravings solved fast',
      subtitle: spotlightItem?.description ?? 'Campus favorites, bright promos, and quick seafood cravings in one tap.',
      ctaLabel: 'Order now',
      accentText: itemCount > 0 ? `${itemCount} in cart` : 'Open today',
      image: spotlightItem?.image ?? fallbackImage,
    };
  }, [featuredItems, itemCount, items, publicData.banner]);

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
        ? optimizeImageUrl(item.image, { width: 320, height: 320, fit: 'cover' }) ?? item.image
        : item.image || require('@/assets/images/icon.png');

    return (
      <View style={[styles.promoSlide, { width: ui.heroSlideWidth, height: ui.promoHeight }]}>
        <View style={styles.promoSlideGlow} />
        <View style={styles.promoCopy}>
          <View style={styles.promoBadge}>
            <ThemedText style={styles.promoBadgeText} numberOfLines={1}>{item.badge}</ThemedText>
          </View>
          <ThemedText style={styles.promoEyebrow} numberOfLines={1}>{item.eyebrow}</ThemedText>
          <ThemedText style={styles.promoTitle} numberOfLines={2}>{item.title}</ThemedText>
          <ThemedText style={styles.promoSubtitle} numberOfLines={1}>
            {item.subtitle}
          </ThemedText>

          <View style={styles.promoStatPill}>
            <ThemedText style={styles.promoStatLabel}>{item.statLabel}</ThemedText>
            <ThemedText style={styles.promoStatValue}>{item.statValue}</ThemedText>
          </View>
        </View>

        <View style={styles.promoImageWrap}>
          <Image
            source={imageSource}
            style={styles.promoImage}
            contentFit="cover"
            transition={120}
            cachePolicy="memory-disk"
            onLoadStart={() => setPromoImageReady((current) => ({ ...current, [item.id]: false }))}
            onLoadEnd={() => setPromoImageReady((current) => ({ ...current, [item.id]: true }))}
          />
          {!promoImageReady[item.id] ? <Skeleton style={styles.promoImage} radius={20} /> : null}
        </View>
      </View>
    );
  };

  const topBannerImageSource =
    typeof topBanner.image === 'string'
      ? optimizeImageUrl(topBanner.image, { width: 440, height: 360, fit: 'cover' }) ?? topBanner.image
      : topBanner.image || require('@/assets/images/icon.png');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loading ? (
          <HomeScreenSkeleton />
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
              paddingBottom: 20,
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
                <View
                  style={[
                    styles.topPromoShell,
                    {
                      marginHorizontal: -ui.pagePadding,
                      paddingHorizontal: ui.pagePadding + 4,
                      paddingTop: 10,
                    },
                  ]}>
                  <View style={styles.topPromoGlowLarge} />
                  <View style={styles.topPromoGlowSmall} />

                  <View style={styles.topPromoHeaderRow}>
                    <View style={styles.topAddressRow}>
                      <View style={styles.topAddressIconWrap}>
                        <Ionicons name="location-outline" size={18} color="#FFFFFF" />
                      </View>
                      <View style={styles.topAddressTextWrap}>
                        <ThemedText style={styles.topAddressTitle} numberOfLines={1}>Rawr Bldg</ThemedText>
                        <ThemedText style={styles.topAddressSubtitle} numberOfLines={1}>Delivered near your campus stop</ThemedText>
                      </View>
                    </View>
                    <Pressable style={styles.topPromoActionIcon} onPress={() => router.push('/(user)/Account')}>
                      <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>

                  <View style={[styles.topPromoBannerCard, { minHeight: ui.topBannerHeight }]}>
                    <View style={styles.topPromoBannerCopy}>
                      <View style={styles.topPromoBannerBadge}>
                        <ThemedText style={styles.topPromoBannerBadgeText} numberOfLines={1}>{topBanner.badge}</ThemedText>
                      </View>
                      <ThemedText style={styles.topPromoBannerEyebrow} numberOfLines={1}>{topBanner.eyebrow}</ThemedText>
                      <ThemedText style={styles.topPromoBannerTitle} numberOfLines={3}>{topBanner.title}</ThemedText>
                      <ThemedText style={styles.topPromoBannerSubtitle} numberOfLines={2}>{topBanner.subtitle}</ThemedText>

                      <View style={styles.topPromoBannerFooter}>
                        <View style={styles.topPromoBannerCta}>
                          <ThemedText style={styles.topPromoBannerCtaText}>{topBanner.ctaLabel}</ThemedText>
                          <Ionicons name="arrow-forward-circle" size={18} color="#8B1874" />
                        </View>
                        <ThemedText style={styles.topPromoBannerAccent}>{topBanner.accentText}</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.topPromoBannerImageWrap, { width: ui.topBannerImageSize, height: ui.topBannerImageSize }]}>
                      <Image
                        source={topBannerImageSource}
                        style={styles.topPromoBannerImage}
                        contentFit="cover"
                        transition={120}
                        cachePolicy="memory-disk"
                        onLoadStart={() => setTopBannerImageReady(false)}
                        onLoadEnd={() => setTopBannerImageReady(true)}
                      />
                      {!topBannerImageReady ? <Skeleton style={styles.topPromoBannerImage} radius={24} /> : null}
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.heroCard,
                    {
                      minHeight: ui.heroHeight,
                      backgroundColor: colors.primary,
                      padding: ui.heroPadding,
                      marginTop: 8,
                    },
                  ]}>
                  <View style={styles.heroGlowTop} />
                  <View style={styles.heroGlowBottom} />

                  <View style={styles.heroIntroRow}>
                    <View style={styles.heroIntroSpacer} />
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
                      <FontAwesome6 name="magnifying-glass" size={16} color="#7B8797" />
                      <TextInput
                        placeholder="Search dishes"
                        placeholderTextColor="#7B8797"
                        style={styles.searchInput}
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
  topPromoShell: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#8B1874',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 0,
    paddingBottom: 10,
  },
  topPromoGlowLarge: {
    position: 'absolute',
    top: -44,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topPromoGlowSmall: {
    position: 'absolute',
    bottom: 28,
    left: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,132,202,0.22)',
  },
  topPromoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  topAddressRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAddressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAddressTextWrap: {
    flex: 1,
  },
  topAddressTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  topAddressSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSize.xs,
    lineHeight: 15,
    marginTop: 1,
  },
  topPromoActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPromoBannerCard: {
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topPromoBannerCopy: {
    flex: 1,
  },
  topPromoBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 6,
  },
  topPromoBannerBadgeText: {
    color: '#8B1874',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  topPromoBannerEyebrow: {
    color: '#F8CAE9',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  topPromoBannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
  },
  topPromoBannerSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    maxWidth: 170,
  },
  topPromoBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  topPromoBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topPromoBannerCtaText: {
    color: '#8B1874',
    fontSize: 11,
    fontWeight: '900',
  },
  topPromoBannerAccent: {
    color: '#FCE7F5',
    fontSize: 11,
    fontWeight: '800',
  },
  topPromoBannerImageWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  topPromoBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroCard: {
    borderRadius: 28,
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
  heroIntroSpacer: {
    minHeight: 2,
  },
  promoSlider: {
    marginTop: 18,
    zIndex: 2,
  },
  promoSlide: {
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    lineHeight: 26,
    fontWeight: '900',
    marginBottom: 6,
    maxWidth: 168,
    paddingTop: 2,
    flexShrink: 1,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 152,
    flexShrink: 1,
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
    width: 128,
    height: 136,
    marginRight: 8,
    borderRadius: 20,
  },
  promoImageWrap: {
    position: 'relative',
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
    color: '#111827',
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
});
