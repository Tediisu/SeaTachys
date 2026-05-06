import { ScrollView, StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';

export function AppBootSkeleton() {
  return (
    <View style={styles.appBoot}>
      <Skeleton style={{ width: 82, height: 82, borderRadius: 28 }} radius={28} />
      <Skeleton style={{ width: 170, height: 18, marginTop: 18 }} />
      <Skeleton style={{ width: 120, height: 14, marginTop: 10 }} />
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.homeLocationCard}>
        <View style={styles.rowGap}>
          <Skeleton style={{ width: 40, height: 40 }} radius={14} />
          <View style={{ flex: 1 }}>
            <Skeleton style={{ width: 108, height: 12, marginBottom: 8 }} radius={6} />
            <Skeleton style={{ width: 156, height: 18, marginBottom: 6 }} radius={8} />
            <Skeleton style={{ width: 188, height: 12 }} radius={6} />
          </View>
          <Skeleton style={{ width: 42, height: 24 }} radius={999} />
        </View>
      </View>
      <View style={styles.homeHeroCard}>
        <View style={styles.homeHeroTop}>
          <View>
            <Skeleton style={{ width: 116, height: 12, marginBottom: 8 }} radius={6} />
            <Skeleton style={{ width: 172, height: 22 }} radius={10} />
          </View>
          <Skeleton style={{ width: 62, height: 46 }} radius={18} />
        </View>
        <View style={styles.homeHeroSlide}>
          <View style={{ flex: 1 }}>
            <Skeleton style={{ width: 72, height: 24, marginBottom: 10 }} radius={999} />
            <Skeleton style={{ width: 88, height: 12, marginBottom: 8 }} radius={6} />
            <Skeleton style={{ width: '88%', height: 18, marginBottom: 8 }} radius={8} />
            <Skeleton style={{ width: '72%', height: 14, marginBottom: 14 }} radius={6} />
            <Skeleton style={{ width: 82, height: 34 }} radius={16} />
          </View>
          <Skeleton style={{ width: 128, height: 136 }} radius={20} />
        </View>
        <View style={styles.homeHeroDots}>
          <Skeleton style={{ width: 28, height: 9 }} radius={999} />
          <Skeleton style={{ width: 9, height: 9 }} radius={999} />
          <Skeleton style={{ width: 9, height: 9 }} radius={999} />
        </View>
        <Skeleton style={{ width: '100%', height: 56, marginTop: 16 }} radius={18} />
      </View>
      <View style={styles.sectionHeader}>
        <View>
          <Skeleton style={{ width: 170, height: 20, marginBottom: 8 }} />
          <Skeleton style={{ width: 130, height: 14 }} />
        </View>
        <Skeleton style={{ width: 58, height: 14 }} radius={8} />
      </View>
      <View style={styles.rowGap}>
        <Skeleton style={{ width: 96, height: 88 }} radius={22} />
        <Skeleton style={{ width: 96, height: 88 }} radius={22} />
        <Skeleton style={{ width: 96, height: 88 }} radius={22} />
      </View>
      <View style={[styles.sectionHeader, { marginTop: 22 }]}>
        <View>
          <Skeleton style={{ width: 150, height: 20, marginBottom: 8 }} />
          <Skeleton style={{ width: 190, height: 14 }} />
        </View>
        <Skeleton style={{ width: 78, height: 28 }} radius={999} />
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.gridItem}>
            <View style={styles.productSkeletonCard}>
              <Skeleton style={{ width: '100%', height: 136, marginBottom: 12 }} radius={20} />
              <View style={styles.productMetaRow}>
                <Skeleton style={{ width: 68, height: 20 }} radius={999} />
                <Skeleton style={{ width: 34, height: 14 }} radius={6} />
              </View>
              <Skeleton style={{ width: '82%', height: 16, marginBottom: 8 }} radius={8} />
              <Skeleton style={{ width: '100%', height: 12, marginBottom: 6 }} radius={6} />
              <Skeleton style={{ width: '76%', height: 12, marginBottom: 14 }} radius={6} />
              <View style={styles.productMetaRow}>
                <View>
                  <Skeleton style={{ width: 46, height: 10, marginBottom: 6 }} radius={4} />
                  <Skeleton style={{ width: 72, height: 18 }} radius={8} />
                </View>
                <Skeleton style={{ width: 36, height: 36 }} radius={18} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function SearchScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Skeleton style={{ width: 190, height: 30, marginBottom: 10 }} />
      <Skeleton style={{ width: 220, height: 16, marginBottom: 22 }} />
      <Skeleton style={{ width: '100%', height: 56, marginBottom: 22 }} radius={18} />
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={styles.gridItem}>
            <View style={styles.productSkeletonCard}>
              <Skeleton style={{ width: '100%', height: 136, marginBottom: 12 }} radius={20} />
              <View style={styles.productMetaRow}>
                <Skeleton style={{ width: 68, height: 20 }} radius={999} />
                <Skeleton style={{ width: 34, height: 14 }} radius={6} />
              </View>
              <Skeleton style={{ width: '82%', height: 16, marginBottom: 8 }} radius={8} />
              <Skeleton style={{ width: '100%', height: 12, marginBottom: 6 }} radius={6} />
              <Skeleton style={{ width: '76%', height: 12, marginBottom: 14 }} radius={6} />
              <View style={styles.productMetaRow}>
                <View>
                  <Skeleton style={{ width: 46, height: 10, marginBottom: 6 }} radius={4} />
                  <Skeleton style={{ width: 72, height: 18 }} radius={8} />
                </View>
                <Skeleton style={{ width: 36, height: 36 }} radius={18} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function ProductDetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Skeleton style={{ width: 44, height: 44, marginBottom: 18 }} radius={22} />
      <Skeleton style={{ width: '100%', height: 260, marginBottom: 18 }} radius={28} />
      <View style={styles.detailCard}>
        <Skeleton style={{ width: '68%', height: 30, marginBottom: 12 }} radius={10} />
        <Skeleton style={{ width: '100%', height: 14, marginBottom: 8 }} radius={8} />
        <Skeleton style={{ width: '88%', height: 14, marginBottom: 8 }} radius={8} />
        <Skeleton style={{ width: '52%', height: 14, marginBottom: 18 }} radius={8} />
        <Skeleton style={{ width: 96, height: 28, marginBottom: 22 }} radius={10} />

        <View style={styles.detailSection}>
          <Skeleton style={{ width: 120, height: 18, marginBottom: 6 }} radius={8} />
          <Skeleton style={{ width: 112, height: 12, marginBottom: 12 }} radius={6} />
          <Skeleton style={{ width: '100%', height: 56, marginBottom: 10 }} radius={18} />
          <Skeleton style={{ width: '100%', height: 56, marginBottom: 10 }} radius={18} />
          <Skeleton style={{ width: '100%', height: 56 }} radius={18} />
        </View>

        <View style={styles.detailSection}>
          <Skeleton style={{ width: 132, height: 18, marginBottom: 10 }} radius={8} />
          <Skeleton style={{ width: '100%', height: 96 }} radius={18} />
        </View>

        <View style={[styles.detailSection, styles.detailQuantityRow]}>
          <Skeleton style={{ width: 92, height: 18 }} radius={8} />
          <View style={styles.detailStepper}>
            <Skeleton style={{ width: 38, height: 38 }} radius={19} />
            <Skeleton style={{ width: 28, height: 18 }} radius={8} />
            <Skeleton style={{ width: 38, height: 38 }} radius={19} />
          </View>
        </View>

        <Skeleton style={{ width: '100%', height: 54, marginTop: 8 }} radius={20} />
      </View>
    </ScrollView>
  );
}

export function DashboardSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.dashboardPage} showsVerticalScrollIndicator={false}>
      <View style={styles.dashboardTop}>
        <View>
          <Skeleton style={{ width: 140, height: 24, marginBottom: 8 }} />
          <Skeleton style={{ width: 120, height: 14 }} />
        </View>
        <View style={styles.rowGap}>
          <Skeleton style={{ width: 92, height: 40 }} radius={16} />
          <Skeleton style={{ width: 110, height: 40 }} radius={16} />
        </View>
      </View>
      <View style={styles.rowGap}>
        <Skeleton style={{ flex: 1, height: 96 }} radius={26} />
        <Skeleton style={{ flex: 1, height: 96 }} radius={26} />
        <Skeleton style={{ flex: 1, height: 96 }} radius={26} />
      </View>
      <View style={styles.dashboardPanel}>
        <View style={styles.dashboardPanelHeader}>
          <Skeleton style={{ width: 120, height: 20 }} radius={8} />
          <Skeleton style={{ width: 118, height: 34 }} radius={12} />
        </View>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.dashboardPromoRow}>
            <Skeleton style={{ width: 30, height: 30 }} radius={15} />
            <View style={{ flex: 1 }}>
              <Skeleton style={{ width: 64, height: 12, marginBottom: 7 }} radius={6} />
              <Skeleton style={{ width: '72%', height: 15, marginBottom: 6 }} radius={7} />
              <Skeleton style={{ width: '56%', height: 12 }} radius={6} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.dashboardPanel}>
        <View style={styles.dashboardPanelHeader}>
          <Skeleton style={{ width: 104, height: 20 }} radius={8} />
          <Skeleton style={{ width: 124, height: 34 }} radius={12} />
        </View>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.dashboardCategoryRow}>
            <View style={{ flex: 1 }}>
              <Skeleton style={{ width: '44%', height: 16, marginBottom: 7 }} radius={7} />
              <Skeleton style={{ width: '36%', height: 12 }} radius={6} />
            </View>
            <Skeleton style={{ width: 34, height: 34 }} radius={10} />
            <Skeleton style={{ width: 34, height: 34 }} radius={10} />
          </View>
        ))}
      </View>
      <View style={styles.dashboardStickyBlock}>
        <Skeleton style={{ width: '100%', height: 44, marginBottom: 14 }} radius={14} />
        <View style={styles.rowGap}>
          <Skeleton style={{ width: 72, height: 30 }} radius={999} />
          <Skeleton style={{ width: 92, height: 30 }} radius={999} />
          <Skeleton style={{ width: 84, height: 30 }} radius={999} />
        </View>
      </View>
      <View style={styles.dashboardPanel}>
        <Skeleton style={{ width: 138, height: 20, marginBottom: 14 }} radius={8} />
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.dashboardProductRow}>
            <Skeleton style={{ width: 64, height: 64 }} radius={16} />
            <View style={{ flex: 1 }}>
              <Skeleton style={{ width: '48%', height: 16, marginBottom: 8 }} radius={7} />
              <Skeleton style={{ width: '68%', height: 12, marginBottom: 6 }} radius={6} />
              <Skeleton style={{ width: '32%', height: 12 }} radius={6} />
            </View>
            <View style={styles.dashboardActionStack}>
              <Skeleton style={{ width: 42, height: 22 }} radius={999} />
              <Skeleton style={{ width: 42, height: 22 }} radius={999} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function CartScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Skeleton style={{ width: 132, height: 28, marginBottom: 16 }} radius={10} />
      {Array.from({ length: 2 }).map((_, index) => (
        <View key={index} style={styles.cartRow}>
          <Skeleton style={{ width: 88, height: 88 }} radius={18} />
          <View style={{ flex: 1 }}>
            <Skeleton style={{ width: '58%', height: 16, marginBottom: 8 }} radius={7} />
            <Skeleton style={{ width: '32%', height: 12, marginBottom: 8 }} radius={6} />
            <Skeleton style={{ width: '66%', height: 12, marginBottom: 6 }} radius={6} />
            <Skeleton style={{ width: '42%', height: 18, marginTop: 10 }} radius={8} />
          </View>
          <View style={styles.cartActionStack}>
            <Skeleton style={{ width: 30, height: 30 }} radius={15} />
            <Skeleton style={{ width: 16, height: 18 }} radius={6} />
            <Skeleton style={{ width: 30, height: 30 }} radius={15} />
          </View>
        </View>
      ))}
      <View style={styles.summarySkeletonCard}>
        <View style={styles.productMetaRow}>
          <Skeleton style={{ width: 68, height: 14 }} radius={6} />
          <Skeleton style={{ width: 84, height: 18 }} radius={8} />
        </View>
        <Skeleton style={{ width: '72%', height: 12, marginTop: 8, marginBottom: 18 }} radius={6} />
        <Skeleton style={{ width: '100%', height: 54 }} radius={20} />
      </View>
    </ScrollView>
  );
}

export function AccountScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.accountHeaderSkeleton}>
        <Skeleton style={{ width: 78, height: 78 }} radius={39} />
        <View style={{ flex: 1 }}>
          <Skeleton style={{ width: '58%', height: 22, marginBottom: 10 }} radius={8} />
          <Skeleton style={{ width: '82%', height: 14, marginBottom: 10 }} radius={6} />
          <Skeleton style={{ width: 72, height: 24 }} radius={999} />
        </View>
      </View>
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.accountSectionSkeleton}>
          <Skeleton style={{ width: 96, height: 18, marginBottom: 14 }} radius={8} />
          {Array.from({ length: sectionIndex === 0 ? 3 : 2 }).map((__, rowIndex) => (
            <View key={rowIndex} style={styles.accountRowSkeleton}>
              <Skeleton style={{ width: 40, height: 40 }} radius={20} />
              <View style={{ flex: 1 }}>
                <Skeleton style={{ width: '42%', height: 15, marginBottom: 7 }} radius={7} />
                <Skeleton style={{ width: '68%', height: 12 }} radius={6} />
              </View>
              <Skeleton style={{ width: 18, height: 18 }} radius={9} />
            </View>
          ))}
        </View>
      ))}
      <Skeleton style={{ width: '100%', height: 54 }} radius={18} />
    </ScrollView>
  );
}

export function QuoteSummarySkeleton() {
  return (
    <View style={styles.quoteBlock}>
      <Skeleton style={{ width: '100%', height: 18, marginBottom: 14 }} />
      <Skeleton style={{ width: '100%', height: 18, marginBottom: 14 }} />
      <Skeleton style={{ width: '72%', height: 22 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  appBoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F8',
    paddingHorizontal: 24,
  },
  page: {
    padding: 18,
    paddingBottom: 34,
  },
  dashboardPage: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  dashboardTop: {
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rowGap: {
    flexDirection: 'row',
    gap: 12,
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
  quoteBlock: {
    gap: 0,
  },
  homeLocationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
  },
  homeHeroCard: {
    backgroundColor: '#0F2F57',
    borderRadius: 30,
    padding: 20,
    marginBottom: 22,
  },
  homeHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  homeHeroSlide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 26,
    padding: 18,
  },
  homeHeroDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  productSkeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    overflow: 'hidden',
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
  },
  detailSection: {
    marginTop: 8,
    marginBottom: 18,
  },
  detailQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  detailStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dashboardPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },
  dashboardPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  dashboardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dashboardStickyBlock: {
    backgroundColor: '#F7F6F2',
    paddingTop: 18,
    marginTop: 4,
  },
  dashboardProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  dashboardActionStack: {
    gap: 8,
    alignItems: 'flex-end',
  },
  cartRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cartActionStack: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summarySkeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginTop: 4,
  },
  accountHeaderSkeleton: {
    backgroundColor: '#0F2F57',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  accountSectionSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
  },
  accountRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
});
