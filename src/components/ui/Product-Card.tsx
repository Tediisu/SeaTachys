import { View, StyleSheet, Pressable, ImageSourcePropType } from 'react-native';
import { useState } from 'react';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { optimizeImageUrl } from '@/utils/image';
import Skeleton from './Skeleton';

type ProductCardItem = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category: string;
  rating?: number;
  image?: ImageSourcePropType | string | null;
};

interface ProductCardProps {
  item: ProductCardItem;
  onPress: () => void;
  compact?: boolean;
}

export default function ProductCard({ item, onPress, compact = false }: ProductCardProps) {
  const [imageReady, setImageReady] = useState(typeof item.image !== 'string');

  const imageSource =
    typeof item.image === 'string'
      ? optimizeImageUrl(item.image, { width: compact ? 360 : 520, height: compact ? 300 : 420, fit: 'cover' }) ?? item.image
      : item.image || require('@/assets/images/icon.png');

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.imageWrap}>
        <Image
          source={imageSource}
          style={[styles.image, compact && styles.imageCompact]}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
          onLoadStart={() => setImageReady(false)}
          onLoadEnd={() => setImageReady(true)}
        />
        {!imageReady ? (
          <Skeleton style={[StyleSheet.absoluteFillObject, compact ? styles.imageCompact : styles.image]} radius={0} />
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.topMeta}>
          <View style={styles.categoryPill}>
            <ThemedText style={styles.categoryText}>
              {item.category}
            </ThemedText>
          </View>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={12} color="#FF8E00" />
            <ThemedText style={styles.ratingText}>{(item.rating ?? 4.5).toFixed(1)}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.name}>{item.name}</ThemedText>
        <ThemedText style={styles.description} numberOfLines={compact ? 2 : 3}>
          {item.description || 'Fresh seafood dish prepared for fast delivery.'}
        </ThemedText>

        <View style={styles.bottom}>
          <View>
            <ThemedText style={styles.priceLabel}>Starts at</ThemedText>
            <ThemedText style={styles.price}>P{item.price.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.addButton}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
    shadowColor: '#00172F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 184,
  },
  imageWrap: {
    position: 'relative',
  },
  imageCompact: {
    height: 136,
  },
  info: {
    padding: Spacing.three,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EEF3F8',
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#0F2F57',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  name: {
    color: '#111827',
    fontSize: FontSize.body,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    lineHeight: 18,
    minHeight: 36,
  },
  bottom: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: '#6B7280',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  price: {
    color: '#0F2F57',
    fontSize: FontSize.subtitle,
    fontWeight: '900',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8E00',
  },
});
