// A short arrival for each step of the check-in: opacity plus a 6dp rise in
// 220ms (web: .ci-reveal). Reduced motion: content simply appears.
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Easing } from "react-native";
import type { ViewStyle } from "react-native";

export function Reveal({
  reduce,
  delay = 0,
  style,
  children,
}: {
  reduce: boolean;
  delay?: number;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      t.setValue(1);
      return;
    }
    const anim = Animated.timing(t, {
      delay,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay, reduce]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
