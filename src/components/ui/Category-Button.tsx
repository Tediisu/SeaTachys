import { useTheme } from '@/hooks/use-theme';
import {
    Animated,
    Image,
    ImageSourcePropType,
    Pressable,
    StyleSheet, View
} from 'react-native';
import { ThemedText } from '../themed-text';

type ButtonVariant = 'dark' | 'light';

interface CategoryButtonProps {
    image: ImageSourcePropType;
    label: string;
    isSelected?: boolean;
    onPress?: () => void;
}

export default function CategoryButton({ image, label, isSelected = false, onPress}: CategoryButtonProps) {
    const  colors = useTheme();
    const scaleAnim = new Animated.Value(1);

    const onPressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const variantStyles = {
        dark: {
            backgroundColor: colors.primary,
        },
        light: {
            backgroundColor: colors.background,  
        },
    }

    return (
        <Animated.View style={{ transform: [{scale: scaleAnim }]}}>
            <Pressable 
                style={[styles.button, {backgroundColor: isSelected ? colors.primaryShade3 : colors.primary}]}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={onPress}
            >
                <View style={styles.imageContainer}>
                    <Image source={image} style={styles.img}/>
                </View>
                <ThemedText>{label}</ThemedText>
            </Pressable>
        </Animated.View>
    );

}

const styles = StyleSheet.create({
    button: {
        height: 70,
        borderRadius: 25,
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'flex-start',
        paddingLeft: 10,
        gap: 10,  
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
        padding: 20,
    },
    imageContainer: {
        width: 50,
        height: 50,
        borderRadius: 25, 
        backgroundColor: 'white', 
        overflow: 'hidden',
        justifyContent: 'center', 
        alignItems: 'center', 
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    img: {
        width: 50,
        height: 50,
    }
})