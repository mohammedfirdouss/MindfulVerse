import { useRouter, type Href } from "expo-router";
import { Pressable, type PressableProps } from "react-native";

/** A Pressable that navigates to `href`.
 *
 *  Use this instead of <Link asChild><Pressable style={fn}>: Link's Slot
 *  spreads the child's style into an object, so a ({ pressed }) => style
 *  function is silently dropped (no background, padding or row layout). */
export function LinkPressable({ href, onPress, ...rest }: PressableProps & { href: Href }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      {...rest}
      onPress={(e) => {
        onPress?.(e);
        router.push(href);
      }}
    />
  );
}
