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
      <Skeleton style={{ width: '100%', height: 92, marginBottom: 18 }} radius={24} />
      <Skeleton style={{ width: '100%', height: 296, marginBottom: 22 }} radius={30} />
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
            <Skeleton style={{ width: '100%', height: 236 }} radius={26} />
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
            <Skeleton style={{ width: '100%', height: 212 }} radius={24} />
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
      <Skeleton style={{ width: '100%', height: 170, marginTop: 18 }} radius={28} />
      <Skeleton style={{ width: '100%', height: 520, marginTop: 18 }} radius={28} />
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
});
