import { StyleSheet, View, Pressable, Text, TextInput, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, FontSize } from '@/constants/theme';
import Button from '@/components/ui/Button';
import { Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { mockProducts, Product } from '@/constants/mock-data';
import ProductCard from '@/components/ui/Product-Card';
import { useProductFilter } from '@/hooks/product-filter';
// import { useProductFilter } from '@/hooks/product-filter';

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function Home() {

  const colors = useTheme();
  const { selectedCategory, setSelectedCategory, filteredProducts } = useProductFilter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <Button
            variant="primary"
            onPress={() => console.log('hehehePressed')}
            icon={<FontAwesome6 name="bars" size={24} color="white" />}
            size="boxSmall"
            radius={15}
            style={{ paddingHorizontal: 0 }}
          />
          <View style={styles.deliveryLoc}>
            <ThemedText type="small" themeColor="textSecondary">DELIVER TO</ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">Rawr Bldg</ThemedText>
            {/* <Text>DELIVER TO</Text>
            <Text>Rawr Bldg.</Text> */}
          </View>
          <View style={styles.cart}>
            <Button
              onPress={() => console.log('hehehePressed')}
              icon={<Ionicons name="bag-sharp" size={24} color="white" />}
              size="boxSmall"
              radius={50}
              style={{ paddingHorizontal: 0}}
            />
          </View>
        </View>
        <View style={styles.greetings}>
          <Text>Hello Guest! Greetings</Text>
        </View>
        <View style={styles.searchbar}>
          <View style={styles.sbar}>
            <FontAwesome6 name="magnifying-glass" size={16} color="gray"/>
            <TextInput
              placeholder='Search Dishes'
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        </View>
        <View style={styles.categories}>
          <View style={styles.categoriesHeader}>
            <ThemedText type="small" themeColor="textSecondary">All Categories</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">See all {'>'}</ThemedText>
          </View>
          <ScrollView 
            horizontal
            // showsHorizontalScrollIndicator={false}
             contentContainerStyle={styles.categories2}
          >
            {/* <Button
              onPress={() => console.log('hehehePressed')}
              size="small"
              radius={15}
              style={{ paddingHorizontal: 0 }}
            />
            <Button
              onPress={() => console.log('hehehePressed')}
              size="medium"
              radius={15}
              style={{ paddingHorizontal: 0 }}
            />
            <Button
              onPress={() => console.log('hehehePressed')}
              size="medium"
              radius={15}
              style={{ paddingHorizontal: 0 }}
            />
              <Button
              onPress={() => console.log('hehehePressed')}
              size="medium"
              radius={15}
              style={{ paddingHorizontal: 0 }}
            /> */}

          </ScrollView>
        </View>
        <View style={styles.categorylist}>
            <FlatList
              data={mockProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  onPress={() => console.log('pressed', item.name)}
                />
              )}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingBottom: Spacing.six + BottomTabInset, 
                paddingHorizontal: 15,
                paddingTop: 15,
              }}
            />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    // justifyContent: 'center',
    // flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    alignItems: 'stretch',
    paddingBottom: BottomTabInset + Spacing.three,
    // maxWidth: 'MaxContentWidth',
  },
  header: {
    width: width,        
    height: height * 0.12, 
    flexDirection: 'row',
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    gap: 10,  
  },
  deliveryLoc: {
    flex: 1,      
    height: height * 0.06, 
    backgroundColor: 'white',
    justifyContent: 'center',
    flexDirection: 'column',
    // fontSize: FontSize.body,
  },
  cart: {

  },
  greetings: {
    // width: width,        
    height: height * 0.05, 
    backgroundColor: 'white',
    padding: 10,
  },
  searchbar: {
    // width: width,        
    height: height * 0.06, 
    justifyContent: 'center',
    padding: 10,
  },
  sbar: {    
    height: height * 0.06, 
    backgroundColor: '#D8D8D8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
  flex: 1,
  // fontSize: FontSize.body,
  fontWeight: '500',
  },
  categories: {
    // width: width,        
    // height: height * 0.15, 
    backgroundColor: 'white',
    // padding: 10,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  categories2: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: 15,

  },
  categorylist: {
    // width: width,        
    // height: height * 1, 
    backgroundColor: 'white',
    flex: 1,
  }
});