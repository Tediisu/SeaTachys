import { Animated, StyleSheet, View, Text, Pressable, TextInput, ScrollView, FlatList, RefreshControl, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType } from 'react-native';
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
  title: string;
  ctaLabel: string;
  accentText: string;
  endsAt?: string | null;
  image: ImageSourcePropType | string | null;
};

function formatPromoCountdown(endsAt?: string | null, now = Date.now(), compact = false) {
  if (!endsAt) return null;

  const remainingMs = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(remainingMs)) return null;
  if (remainingMs <= 0) return 'Promo ended';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return compact ? `${days}d ${hours}h` : `${days}d ${hours}h left`;
  if (hours > 0) return compact ? `${hours}h ${minutes}m` : `${hours}h ${minutes}m left`;
  return compact ? `${minutes}m ${seconds}s` : `${minutes}m ${seconds}s left`;
}

export default function Home() {
  const colors = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { itemCount } = useCart();
  const { publicData, publicLoading, refreshPublicData } = useAppBootstrap();
  const sliderRef = useRef<FlatList<PromoSlide>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [promoOverrides, setPromoOverrides] = useState<PromoSlide[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [promoImageReady, setPromoImageReady] = useState<Record<string, boolean>>({});
  const [topBannerImageReady, setTopBannerImageReady] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());

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
      heroHeight: isCompact ? 292 : 308,
      promoHeight: isCompact ? 188 : 198,
      heroSlideWidth: contentWidth - heroPadding * 2,
      topBannerHeight: isCompact ? 184 : 198,
      topBannerCollapsedHeight: isCompact ? 52 : 56,
      topPromoShellExpandedHeight: isCompact ? 234 : 248,
      topPromoShellCollapsedHeight: isCompact ? 64 : 68,
      topBannerImageSize: isCompact ? 92 : 104,
      topBannerTitleSize: isCompact ? 20 : 22,
      topBannerTitleLineHeight: isCompact ? 22 : 24,
      topBannerCollapsedTitleSize: isCompact ? 15 : 16,
      topBannerCollapsedTitleLineHeight: isCompact ? 18 : 19,
    };
  }, [width]);

  const bannerCollapseDistance = 130;
  const bannerCollapseProgress = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const topBannerCardHeight = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [ui.topBannerHeight, ui.topBannerCollapsedHeight],
    extrapolate: 'clamp',
  });
  const topPromoShellHeight = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [ui.topPromoShellExpandedHeight, ui.topPromoShellCollapsedHeight],
    extrapolate: 'clamp',
  });
  const topPromoListGap = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance * 0.55, bannerCollapseDistance],
    outputRange: [12, 24, 0],
    extrapolate: 'clamp',
  });
  const topPromoCollapsePush = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance * 0.55, bannerCollapseDistance],
    outputRange: [0, 56, 0],
    extrapolate: 'clamp',
  });
  const topPromoSpacerHeight = Animated.add(
    Animated.add(topPromoShellHeight, topPromoListGap),
    topPromoCollapsePush
  );
  const topBannerCardTranslateY = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  const topBannerShellPaddingBottom = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [10, 4],
    extrapolate: 'clamp',
  });
  const topBannerShellPaddingTop = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [2, 4],
    extrapolate: 'clamp',
  });
  const topBannerShellMarginBottom = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  const topBannerContentTranslateY = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  const topPromoHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 35, 90],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const topPromoHeaderHeight = scrollY.interpolate({
    inputRange: [0, 70, bannerCollapseDistance],
    outputRange: [54, 22, 0],
    extrapolate: 'clamp',
  });
  const topPromoHeaderMarginBottom = scrollY.interpolate({
    inputRange: [0, 70, bannerCollapseDistance],
    outputRange: [12, 6, 0],
    extrapolate: 'clamp',
  });
  const topBannerBadgeOpacity = scrollY.interpolate({
    inputRange: [0, 35, 90],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const topBannerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 45, 95],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const topBannerLeadHeight = scrollY.interpolate({
    inputRange: [0, 70, bannerCollapseDistance],
    outputRange: [94, 42, 0],
    extrapolate: 'clamp',
  });
  const topBannerFooterOpacity = scrollY.interpolate({
    inputRange: [0, 60, bannerCollapseDistance],
    outputRange: [1, 1, 1],
    extrapolate: 'clamp',
  });
  const topBannerFooterMarginTop = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [8, 8],
    extrapolate: 'clamp',
  });
  const topBannerFooterTranslateY = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  const topBannerExpandedCountdownOpacity = scrollY.interpolate({
    inputRange: [0, 70, bannerCollapseDistance],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });
  const topBannerCollapsedCountdownOpacity = scrollY.interpolate({
    inputRange: [0, 70, bannerCollapseDistance],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });
  const topBannerImageOpacity = scrollY.interpolate({
    inputRange: [0, 45, bannerCollapseDistance],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });
  const topBannerImageTranslateY = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [0, -24],
    extrapolate: 'clamp',
  });
  const topBannerImageScale = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  const topBannerVisualLaneWidth = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [ui.topBannerImageSize + 20, 0],
    extrapolate: 'clamp',
  });
  const topBannerImageWidth = scrollY.interpolate({
    inputRange: [0, bannerCollapseDistance],
    outputRange: [ui.topBannerImageSize, 0],
    extrapolate: 'clamp',
  });

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

  const hasShellContent =
    promoOverrides.length > 0 ||
    !!publicData.banner;

  const loading =
    publicLoading &&
    !publicData.updatedAt &&
    items.length === 0 &&
    categories.length === 0 &&
    !hasShellContent;

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

  const firstName = user?.fullName?.split(' ')[0] ?? 'Seafood Lover';
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
    const fallbackImage = require('@/assets/images/crispy-shrimp.jpg');

    if (publicData.banner) {
      return {
        badge: publicData.banner.badge,
        title: publicData.banner.title,
        ctaLabel: publicData.banner.ctaLabel,
        accentText: publicData.banner.accentText,
        endsAt: publicData.banner.endsAt,
        image: publicData.banner.imageUrl ?? fallbackImage,
      };
    }

    return {
      badge: 'PROMO',
      title: '30% off 12-month plan',
      ctaLabel: 'Subscribe now!',
      accentText: 'Premium',
      endsAt: null,
      image: fallbackImage,
    };
  }, [publicData.banner]);

  const promoCountdown = useMemo(
    () => formatPromoCountdown(topBanner.endsAt, countdownNow),
    [countdownNow, topBanner.endsAt]
  );
  const compactPromoCountdown = useMemo(
    () => formatPromoCountdown(topBanner.endsAt, countdownNow, true),
    [countdownNow, topBanner.endsAt]
  );

  useEffect(() => {
    if (!topBanner.endsAt) return;

    const interval = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [topBanner.endsAt]);

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
            <Text style={styles.promoBadgeText} numberOfLines={1}>{item.badge}</Text>
          </View>
          <Text style={styles.promoEyebrow} numberOfLines={1}>{item.eyebrow}</Text>
          <Text style={styles.promoTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.promoSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>

          <View style={styles.promoStatPill}>
            <Text style={styles.promoStatLabel}>{item.statLabel}</Text>
            <Text style={styles.promoStatValue}>{item.statValue}</Text>
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
          <View style={styles.screenBody}>
            <Animated.View
              pointerEvents="box-none"
              style={[
                styles.topPromoStickyWrap,
              ]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.topPromoSeparationGap,
                  {
                    top: topPromoShellHeight,
                    height: topPromoListGap,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.topPromoShell,
                  {
                    paddingTop: topBannerShellPaddingTop,
                    paddingHorizontal: ui.pagePadding + 4,
                    paddingBottom: topBannerShellPaddingBottom,
                    marginBottom: topBannerShellMarginBottom,
                    height: topPromoShellHeight,
                  },
                ]}>
                <View style={styles.topPromoGlowLarge} />
                <View style={styles.topPromoGlowSmall} />

                <Animated.View
                  style={[
                    styles.topPromoHeaderRow,
                    {
                      opacity: topPromoHeaderOpacity,
                      height: topPromoHeaderHeight,
                      marginBottom: topPromoHeaderMarginBottom,
                    },
                  ]}>
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
                </Animated.View>

                <Animated.View
                  style={[
                    styles.topPromoBannerCard,
                    {
                      height: topBannerCardHeight,
                      transform: [{ translateY: topBannerCardTranslateY }],
                    },
                  ]}>
                  <Animated.View
                    style={[
                      styles.topPromoBannerBody,
                      {
                        transform: [{ translateY: topBannerContentTranslateY }],
                      },
                    ]}>
                    <Animated.View
                      style={[
                        styles.topPromoBannerCopy,
                      ]}>
                      <Animated.View
                        style={[
                          styles.topPromoBannerLead,
                          {
                            opacity: topBannerTitleOpacity,
                            height: topBannerLeadHeight,
                          },
                        ]}>
                        <Animated.View style={{ opacity: topBannerBadgeOpacity }}>
                          <View style={styles.topPromoBannerBadge}>
                            <ThemedText style={styles.topPromoBannerBadgeText} numberOfLines={1}>{topBanner.badge}</ThemedText>
                          </View>
                        </Animated.View>
                        <Animated.Text
                          numberOfLines={2}
                          style={[
                            styles.topPromoBannerTitle,
                            {
                              fontSize: scrollY.interpolate({
                                inputRange: [0, bannerCollapseDistance],
                                outputRange: [ui.topBannerTitleSize, ui.topBannerCollapsedTitleSize],
                                extrapolate: 'clamp',
                              }),
                              lineHeight: scrollY.interpolate({
                                inputRange: [0, bannerCollapseDistance],
                                outputRange: [ui.topBannerTitleLineHeight, ui.topBannerCollapsedTitleLineHeight],
                                extrapolate: 'clamp',
                              }),
                            },
                          ]}>
                          {topBanner.title}
                        </Animated.Text>
                      </Animated.View>

                      <Animated.View
                        style={[
                          styles.topPromoBannerFooter,
                          {
                            opacity: topBannerFooterOpacity,
                            marginTop: topBannerFooterMarginTop,
                            transform: [{ translateY: topBannerFooterTranslateY }],
                          },
                        ]}>
                        <View style={styles.topPromoBannerCta}>
                          <ThemedText style={styles.topPromoBannerCtaText}>{topBanner.ctaLabel}</ThemedText>
                          <Ionicons name="arrow-forward-circle" size={18} color="#8B1874" />
                        </View>
                        <ThemedText style={styles.topPromoBannerAccent} numberOfLines={1}>
                          {topBanner.accentText}
                        </ThemedText>
                        {compactPromoCountdown ? (
                          <Animated.View
                            style={[
                              styles.topPromoBannerCompactCountdown,
                              { opacity: topBannerCollapsedCountdownOpacity },
                            ]}>
                            <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                            <ThemedText style={styles.topPromoBannerCompactCountdownText}>
                              {compactPromoCountdown}
                            </ThemedText>
                          </Animated.View>
                        ) : null}
                      </Animated.View>
                    </Animated.View>

                    <Animated.View
                      style={[
                        styles.topPromoBannerVisualLane,
                        {
                          width: topBannerVisualLaneWidth,
                          opacity: topBannerImageOpacity,
                        },
                      ]}>
                      <Animated.View
                        style={[
                          styles.topPromoBannerImageWrap,
                          {
                            width: topBannerImageWidth,
                            height: ui.topBannerImageSize,
                            transform: [
                              { translateY: topBannerImageTranslateY },
                              { scale: topBannerImageScale },
                            ],
                          },
                        ]}>
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
                      </Animated.View>
                    </Animated.View>
                    {promoCountdown ? (
                      <Animated.View
                        style={[
                          styles.topPromoBannerCountdown,
                          {
                            opacity: topBannerExpandedCountdownOpacity,
                            top: ui.topBannerImageSize + 24,
                          },
                        ]}>
                        <Ionicons name="time-outline" size={13} color="#8B1874" />
                        <ThemedText style={styles.topPromoBannerCountdownText}>{promoCountdown}</ThemedText>
                      </Animated.View>
                    ) : null}
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Animated.View>

            <Animated.FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              style={styles.productList}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadMenu(true)} tintColor={colors.primary} />
              }
              columnWrapperStyle={{
                gap: ui.gap,
                marginBottom: ui.gap,
              }}
              contentContainerStyle={{
                paddingHorizontal: ui.pagePadding,
                paddingTop: 0,
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
                  <Animated.View style={{ height: topPromoSpacerHeight }} />

                  <View style={[styles.mainContentSurface, { marginHorizontal: -ui.pagePadding, paddingHorizontal: ui.pagePadding, marginTop: 0 }]}>
                  <View
                    style={[
                      styles.heroCard,
                      {
                        minHeight: ui.heroHeight,
                        backgroundColor: colors.primary,
                        padding: ui.heroPadding,
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
                </View>
              }
            />
          </View>
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
    backgroundColor: '#8B1874',
  },
  productList: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  screenBody: {
    flex: 1,
    position: 'relative',
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
  mainContentSurface: {
    backgroundColor: '#EEF3F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingBottom: 4,
  },
  topPromoShell: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#8B1874',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 0,
  },
  topPromoStickyWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 10,
  },
  topPromoSeparationGap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#EEF3F8',
    zIndex: 1,
  },
  topPromoGlowLarge: {
    position: 'absolute',
    top: 10,
    right: -18,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topPromoGlowSmall: {
    position: 'absolute',
    top: 128,
    left: -18,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,132,202,0.18)',
  },
  topPromoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    overflow: 'hidden',
    paddingTop: 2,
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
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 10,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  },
  topPromoBannerBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    position: 'relative',
  },
  topPromoBannerCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 2,
    minHeight: '100%',
  },
  topPromoBannerLead: {
    gap: 2,
  },
  topPromoBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 2,
  },
  topPromoBannerBadgeText: {
    color: '#8B1874',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  topPromoBannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    flexShrink: 1,
  },
  topPromoBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    position: 'relative',
  },
  topPromoBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    flexShrink: 1,
    minWidth: 0,
  },
  topPromoBannerCompactCountdown: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  topPromoBannerCompactCountdownText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  topPromoBannerVisualLane: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  topPromoBannerImageWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexShrink: 0,
    shadowColor: '#2B0626',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  topPromoBannerImage: {
    width: '100%',
    height: '100%',
  },
  topPromoBannerCountdown: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  topPromoBannerCountdownText: {
    color: '#8B1874',
    fontSize: 10,
    fontWeight: '900',
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
    marginTop: 14,
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
    paddingVertical: 10,
    paddingRight: 10,
    justifyContent: 'center',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,142,0,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
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
    marginBottom: 4,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    marginBottom: 4,
    maxWidth: 188,
    flexShrink: 1,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 184,
    flexShrink: 1,
  },
  promoStatPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    width: 124,
    height: 150,
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
