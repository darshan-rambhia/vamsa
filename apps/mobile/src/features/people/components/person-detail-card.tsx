import { Text, View } from "react-native";

import { getDisplayName } from "../types";
import type { PersonSummary } from "../types";

type PersonDetailCardProps = {
  person: PersonSummary;
};

export function PersonDetailCard({ person }: PersonDetailCardProps) {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#d1d5db",
        padding: 20,
        backgroundColor: "#ffffff",
        gap: 8,
      }}
    >
      <Text
        selectable
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        {getDisplayName(person)}
      </Text>
      <Text selectable style={{ color: "#374151", fontSize: 16 }}>
        Relationship: {person.relation}
      </Text>
      {person.birthYear ? (
        <Text
          selectable
          style={{
            color: "#374151",
            fontSize: 16,
            fontVariant: ["tabular-nums"],
          }}
        >
          Birth year: {person.birthYear}
        </Text>
      ) : null}
      {person.city ? (
        <Text selectable style={{ color: "#374151", fontSize: 16 }}>
          City: {person.city}
        </Text>
      ) : null}
    </View>
  );
}
