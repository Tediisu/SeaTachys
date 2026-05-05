import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEffect, useRef } from 'react';

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
  radius?: number;
};

export default function Skeleton({ style, radius = 16 }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  return (
    <View style={[styles.base, { borderRadius: radius }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: '#E7EDF3',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
