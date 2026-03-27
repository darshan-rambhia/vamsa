import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuthState } from "@/src/features/auth/use-auth-state";
import { createPerson } from "@/src/features/people/api";
import { PersonListItem } from "@/src/features/people/components/person-list-item";
import { usePeople } from "@/src/features/people/use-people";

export default function TabOneScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState<string>();
  const [createError, setCreateError] = useState<string>();
  const auth = useAuthState();
  const { people, loading, warning, source, refresh } = usePeople(query);
  const isAuthenticated = Boolean(auth.cookie || auth.user);
  const authBadgeText = isAuthenticated ? "Authenticated" : "Guest mode";
  const authBadgeStyle = {
    borderColor: isAuthenticated ? "#059669" : "#d97706",
    backgroundColor: isAuthenticated ? "#ecfdf5" : "#fffbeb",
  };
  const authBadgeTextStyle = {
    color: isAuthenticated ? "#065f46" : "#92400e",
  };

  const onCreatePerson = async () => {
    if (!isAuthenticated) {
      setCreateError("Sign in first to create people.");
      setCreateMessage(undefined);
      return;
    }

    setCreateBusy(true);
    setCreateError(undefined);
    setCreateMessage(undefined);

    try {
      await createPerson({
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        isLiving: true,
      });
      setCreateFirstName("");
      setCreateLastName("");
      setCreateMessage("Person created successfully.");
      await refresh();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create person."
      );
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={people}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Text
              selectable
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#111827",
              }}
            >
              Family members
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/two")}
              style={{
                alignSelf: "flex-start",
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                ...authBadgeStyle,
              }}
            >
              <Text
                selectable
                style={{ fontWeight: "600", ...authBadgeTextStyle }}
              >
                {authBadgeText}
              </Text>
            </Pressable>
            <Text selectable style={{ color: "#6b7280" }}>
              Mobile create/list flow: ready
            </Text>
            {loading ? (
              <Text selectable style={{ color: "#6b7280" }}>
                Loading people…
              </Text>
            ) : null}
            <Text selectable style={{ color: "#6b7280" }}>
              Data source: {source}
            </Text>
            {warning ? (
              <Text selectable style={{ color: "#b45309" }}>
                {warning}
              </Text>
            ) : null}
            <View
              style={{
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 12,
                padding: 12,
                gap: 8,
                backgroundColor: "#fff",
              }}
            >
              <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
                Quick add person
              </Text>
              <TextInput
                value={createFirstName}
                onChangeText={setCreateFirstName}
                placeholder="First name"
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: "#fff",
                }}
              />
              <TextInput
                value={createLastName}
                onChangeText={setCreateLastName}
                placeholder="Last name"
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: "#fff",
                }}
              />
              <Pressable
                disabled={createBusy}
                onPress={onCreatePerson}
                style={{
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: createBusy ? "#9ca3af" : "#2563eb",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {createBusy ? "Creating…" : "Create person"}
                </Text>
              </Pressable>
              {createMessage ? (
                <Text selectable style={{ color: "#065f46" }}>
                  {createMessage}
                </Text>
              ) : null}
              {createError ? (
                <Text selectable style={{ color: "#b91c1c" }}>
                  {createError}
                </Text>
              ) : null}
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search family members"
              style={{
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "#fff",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text selectable style={{ color: "#6b7280" }}>
                {query.trim()
                  ? `${people.length} result${people.length === 1 ? "" : "s"} for “${query.trim()}”`
                  : `${people.length} family member${people.length === 1 ? "" : "s"}`}
              </Text>
              {query.trim() ? (
                <Pressable
                  onPress={() => setQuery("")}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: "#fff",
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "600" }}>
                    Clear
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => <PersonListItem person={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 16,
              padding: 16,
              backgroundColor: "#fff",
            }}
          >
            <Text selectable style={{ color: "#6b7280" }}>
              No people matched your search.
            </Text>
          </View>
        }
      />
    </View>
  );
}
