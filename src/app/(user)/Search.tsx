import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ProductCard from '@/components/ui/Product-Card';
import { FontSize } from '@/constants/theme';
import { menuService, type MenuCategoryDto, type MenuItemDto } from '@/services/menu.services';

type SearchProduct = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | number | null;
  category: string;
  rating?: number;
};

export default function SearchScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [categoryData, itemData] = await Promise.all([
          menuService.getCategories(),
          menuService.getItems(),
        ]);

        const categoryById = new Map<string, MenuCategoryDto>(
          categoryData.map((category: MenuCategoryDto) => [category.id, category])
        );

        setItems(
          itemData.map((item: MenuItemDto) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            description: item.description,
            image: item.imageUrl || null,
            category: item.categoryId ? categoryById.get(item.categoryId)?.name ?? 'Uncategorized' : 'Uncategorized',
            rating: 4.5,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      (item.description ?? '').toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [items, search]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Search food</ThemedText>
            <ThemedText style={styles.subtitle}>Find dishes, flavors, and categories fast.</ThemedText>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search seafood dishes"
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#0F2F57" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>No matches found</ThemedText>
              <ThemedText style={styles.emptyText}>Try another keyword or browse the Food tab.</ThemedText>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <ProductCard item={item} compact onPress={() => router.push(`/(user)/product/${item.id}`)} />
                </View>
              ))}
            </View>
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
    paddingBottom: 34,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    paddingTop: 2,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: FontSize.body,
    lineHeight: 23,
    marginTop: 6,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '500',
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: FontSize.title,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: FontSize.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridItem: {
    width: '48.5%',
  },
});
