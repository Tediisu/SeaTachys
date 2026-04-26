import { useTheme } from '@/hooks/use-theme';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FontSize } from '@/constants/theme';
import { ThemedText } from '../themed-text';

type ButtonVariant = 'dark' | 'light';

interface CategoryButtonProps {
    image: ImageSourcePropType;
    label: string;
    isSelected?: boolean;
    onPress?: () => void;
}

export default function CategoryButton({ image, label, isSelected = false, onPress}: CategoryButtonProps) {
    const colors = useTheme();
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

    return (
        <Animated.View style={{ transform: [{scale: scaleAnim }]}}>
            <Pressable 
                style={[
                    styles.button,
                    {
                        backgroundColor: isSelected ? colors.accent : '#0F2F57',
                    },
                ]}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={onPress}
            >
                <View style={styles.imageContainer}>
                    <Image source={image} style={styles.img}/>
                </View>
                <ThemedText style={styles.label}>{label}</ThemedText>
            </Pressable>
        </Animated.View>
    );

}

const styles = StyleSheet.create({
    button: {
        minHeight: 68,
        borderRadius: 22,
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'flex-start',
        paddingLeft: 10,
        gap: 10,
        shadowColor: '#00172F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 5,
        paddingVertical: 9,
        paddingRight: 18,
    },
    imageContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white', 
        overflow: 'hidden',
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    img: {
        width: 48,
        height: 48,
    },
    label: {
        color: '#FFFFFF',
        fontSize: FontSize.body,
        fontWeight: '700',
    },
});
