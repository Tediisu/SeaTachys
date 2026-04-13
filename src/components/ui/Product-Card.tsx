import { View, Image, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, FontSize, } from '@/constants/theme';
import { Product } from '@/constants/mock-data';

interface ProductCardProps {
    item: Product;
    onPress: () => void;
}

export default function ProductCard({ item, onPress }: ProductCardProps) {
    const colors = useTheme();

    return (
        <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.backgroundElement}]}>
            <Image source={item.image} style={styles.image}/>
            <View style={styles.info}>
                <ThemedText type="smallBold">{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{item.name}</ThemedText>
                <View style={styles.bottom}>
                    <ThemedText type="smallBold">₱{item.price}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">₱{item.price}</ThemedText>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: Radius.large,
        marginBottom: Spacing.three,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 160,
    },
    info: {
        padding: Spacing.three,
        gap: Spacing.one,
    },
    bottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.two,
    }

})