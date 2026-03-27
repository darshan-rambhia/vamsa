import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { getDisplayName } from "../types";
import type { PersonSummary } from "../types";

type PersonListItemProps = {
  person: PersonSummary;
};

export function PersonListItem({ person }: PersonListItemProps) {
  return (
    <Link href={`/person/${person.id}`} asChild>
      <Pressable
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d1d5db",
          padding: 16,
          gap: 6,
          backgroundColor: "#ffffff",
        }}
      >
        <Text
          selectable
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {getDisplayName(person)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text selectable style={{ color: "#374151" }}>
            {person.relation}
          </Text>
          {person.birthYear ? (
            <Text style={{ color: "#9ca3af" }}>•</Text>
          ) : null}
          {person.birthYear ? (
            <Text
              selectable
              style={{ color: "#6b7280", fontVariant: ["tabular-nums"] }}
            >
              {person.birthYear}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
