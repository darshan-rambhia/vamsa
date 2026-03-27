import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { updatePerson } from "@/src/features/people/api";
import { PersonDetailCard } from "@/src/features/people/components/person-detail-card";
import { usePerson } from "@/src/features/people/use-person";

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, loading, source, warning, refresh } = usePerson(id);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!person || editMode) {
      return;
    }

    setFirstName(person.firstName);
    setLastName(person.lastName);
    setCity(person.city ?? "");
  }, [editMode, person]);

  const startEdit = () => {
    if (!person) {
      return;
    }

    setFirstName(person.firstName);
    setLastName(person.lastName);
    setCity(person.city ?? "");
    setMessage(undefined);
    setError(undefined);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setMessage(undefined);
    setError(undefined);
  };

  const onSave = async () => {
    if (!person) {
      return;
    }

    setSaving(true);
    setError(undefined);
    setMessage(undefined);

    try {
      await updatePerson(person.id, {
        firstName,
        lastName,
        city,
      });
      await refresh();
      setEditMode(false);
      setMessage("Profile updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ title: person ? `${person.firstName}` : "Profile" }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          backgroundColor: "#f9fafb",
          flexGrow: 1,
          gap: 12,
        }}
      >
        {loading ? (
          <Text selectable style={{ color: "#6b7280" }}>
            Loading profile…
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
        {message ? (
          <Text selectable style={{ color: "#065f46" }}>
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text selectable style={{ color: "#b91c1c" }}>
            {error}
          </Text>
        ) : null}
        {person ? (
          <>
            {editMode ? (
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  padding: 16,
                  backgroundColor: "#fff",
                  gap: 10,
                }}
              >
                <Text
                  selectable
                  style={{ color: "#111827", fontWeight: "600", fontSize: 18 }}
                >
                  Edit profile
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
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
                  value={lastName}
                  onChangeText={setLastName}
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
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: "#fff",
                  }}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    disabled={saving}
                    onPress={onSave}
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: saving ? "#9ca3af" : "#2563eb",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {saving ? "Saving…" : "Save"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={saving}
                    onPress={cancelEdit}
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: "#e5e7eb",
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <PersonDetailCard person={person} />
                <Pressable
                  onPress={startEdit}
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: "#2563eb",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Edit profile
                  </Text>
                </Pressable>
              </>
            )}
          </>
        ) : (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#d1d5db",
              padding: 16,
              backgroundColor: "#fff",
            }}
          >
            <Text selectable style={{ color: "#6b7280" }}>
              Person not found.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
