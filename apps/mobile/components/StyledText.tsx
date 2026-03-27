import { Text } from "./Themed";
import type { TextProps } from "./Themed";
import Tokens from "@/constants/Tokens";

export function MonoText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[props.style, { fontFamily: Tokens.typography.fontFamily.mono }]}
    />
  );
}

export function DisplayText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[
        props.style,
        { fontFamily: Tokens.typography.fontFamily.display },
      ]}
    />
  );
}

export function BodyText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[props.style, { fontFamily: Tokens.typography.fontFamily.body }]}
    />
  );
}
