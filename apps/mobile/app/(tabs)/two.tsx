import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  loginWithEmail,
  logout,
  setManualAuthCookie,
} from "@/src/features/auth/api";
import { useAuthState } from "@/src/features/auth/use-auth-state";
import { useServerConfig } from "@/src/context/server-config-context";

type ProbeStatus = "idle" | "probing" | "ok" | "fail";

function ServerSection() {
  const { activeUrl, probeServer } = useServerConfig();
  const [status, setStatus] = useState<ProbeStatus>("idle");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setStatus("probing");
    probeServer(activeUrl).then((ok) => {
      if (!cancelled) setStatus(ok ? "ok" : "fail");
    });
    return () => {
      cancelled = true;
    };
  }, [activeUrl, probeServer]);

  const dotColor =
    status === "ok" ? "#16a34a" : status === "fail" ? "#dc2626" : "#9ca3af";

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#fff",
        padding: 16,
        gap: 10,
      }}
    >
      <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
        Server
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {status === "probing" ? (
          <ActivityIndicator size="small" color="#6b7280" />
        ) : (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: dotColor,
              marginTop: 1,
            }}
          />
        )}
        <Text
          selectable
          numberOfLines={1}
          style={{ color: "#374151", flex: 1, fontSize: 13 }}
        >
          {activeUrl}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/settings/servers" as never)}
        style={{
          borderRadius: 10,
          paddingVertical: 9,
          alignItems: "center",
          backgroundColor: "#2563eb",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Manage Servers</Text>
      </Pressable>
    </View>
  );
}

export default function TabTwoScreen() {
  const auth = useAuthState();
  const [email, setEmail] = useState("admin@vamsa.local");
  const [password, setPassword] = useState("password123");
  const [manualCookie, setManualCookie] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const onLogin = async () => {
    const trimmedEmail = email.trim();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isEmailValid || !password.trim()) {
      setError("Enter a valid email and password.");
      setMessage(undefined);
      return;
    }

    setBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const result = await loginWithEmail(trimmedEmail, password);
      setMessage(result.warning ?? "Login succeeded.");
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const onApplyCookie = () => {
    if (!manualCookie.trim()) {
      setError("Paste a cookie value first.");
      setMessage(undefined);
      return;
    }

    setManualAuthCookie(manualCookie);
    setError(undefined);
    setMessage(
      "Session cookie applied. Return to People tab to retry live API data."
    );
  };

  const onLogout = async () => {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await logout();
      setMessage("Logged out and local session cleared.");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Logout failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        backgroundColor: "#f9fafb",
        flexGrow: 1,
      }}
    >
      <Text
        selectable
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        Settings
      </Text>

      <ServerSection />

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d1d5db",
          backgroundColor: "#fff",
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
          Session status
        </Text>
        <Text selectable style={{ color: "#374151" }}>
          Source:{" "}
          {auth.source === "client" ? "secure-store/session" : auth.source}
        </Text>
        <Text selectable style={{ color: "#374151" }}>
          Cookie loaded: {auth.cookie ? "yes" : "no"}
        </Text>
        <Text selectable style={{ color: "#374151" }}>
          User: {auth.user?.email ?? "not authenticated"}
        </Text>
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d1d5db",
          backgroundColor: "#fff",
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
          Sign in
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#fff",
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#fff",
          }}
        />
        <Pressable
          disabled={busy}
          onPress={onLogin}
          style={{
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            backgroundColor: busy ? "#9ca3af" : "#2563eb",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {busy ? "Working…" : "Login"}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d1d5db",
          backgroundColor: "#fff",
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
          Manual session cookie
        </Text>
        <Text selectable style={{ color: "#6b7280" }}>
          If the runtime cannot read Set-Cookie headers, paste a value like{" "}
          better-auth.session_token=... and apply it.
        </Text>
        <TextInput
          value={manualCookie}
          onChangeText={setManualCookie}
          placeholder="better-auth.session_token=..."
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#fff",
          }}
        />
        <Pressable
          disabled={busy}
          onPress={onApplyCookie}
          style={{
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            backgroundColor: "#2563eb",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Apply cookie</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onLogout}
          style={{
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            backgroundColor: "#dc2626",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Logout</Text>
        </Pressable>
      </View>

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
    </ScrollView>
  );
}
