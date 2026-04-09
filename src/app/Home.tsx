import { StyleSheet, View, Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, FontSize } from '@/constants/theme';
import Button from '@/components/ui/Button';
import { Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function Home() {

  const colors = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <Button
            onPress={() => console.log('hehehePressed')}
            icon={<FontAwesome6 name="bars" size={24} color="white" />}
            size="boxSmall"
            radius={15}
            style={{ paddingHorizontal: 0 }}
          />
          <View style={styles.deliveryLoc}>
            <ThemedText>DELIVER TO</ThemedText>
            <ThemedText>NIGGERIA</ThemedText>
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
          <View>
            <Text>All Categories</Text>
          </View>
          <View style={styles.categories2}>
            <Button
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
          </View>
        </View>
        <View style={styles.categorylist}>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    width: width,        
    height: height * 0.1, 
    backgroundColor: 'red',
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
    fontSize: FontSize.body,
  },
  cart: {

  },
  greetings: {
    width: width,        
    height: height * 0.05, 
    backgroundColor: 'white',
    padding: 10,
  },
  searchbar: {
    width: width,        
    height: height * 0.06, 
    backgroundColor: 'red',
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
  fontSize: FontSize.body,
  fontWeight: '500',
  },
  categories: {
    width: width,        
    height: height * 0.15, 
    backgroundColor: 'white',
    padding: 10,
  },
  categories2: {
    flex: 1,
    flexDirection: 'row',
    width: width,        
    height: height * 0.2, 
    gap: Spacing.three,
    padding: 20,
  },
  categorylist: {
    // width: width,        
    // height: height * 1, 
    // backgroundColor: 'red',
  }
});