import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ServerConfig } from "@/src/lib/server-config";
import { useServerConfig } from "@/src/context/server-config-context";

type ProbeStatus = "idle" | "probing" | "ok" | "fail";

function StatusDot({ status }: { status: ProbeStatus }) {
  if (status === "probing") {
    return <ActivityIndicator size="small" color="#6b7280" />;
  }
  const color =
    status === "ok" ? "#16a34a" : status === "fail" ? "#dc2626" : "#9ca3af";
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
        marginTop: 2,
      }}
    />
  );
}

function CurrentServerCard() {
  const { activeUrl, probeServer } = useServerConfig();
  const [status, setStatus] = useState<ProbeStatus>("idle");

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

  const onProbe = () => {
    setStatus("probing");
    probeServer(activeUrl).then((ok) => setStatus(ok ? "ok" : "fail"));
  };

  return (
    <View style={cardStyle}>
      <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
        Current server
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <StatusDot status={status} />
        <Text
          selectable
          numberOfLines={1}
          style={{ color: "#374151", flex: 1 }}
        >
          {activeUrl}
        </Text>
      </View>
      <Text style={{ color: "#6b7280", fontSize: 13 }}>
        {status === "ok"
          ? "Server is reachable"
          : status === "fail"
            ? "Server is not reachable"
            : status === "probing"
              ? "Checking connection..."
              : "Connection not checked"}
      </Text>
      <Pressable
        onPress={onProbe}
        disabled={status === "probing"}
        style={{
          borderRadius: 10,
          paddingVertical: 8,
          paddingHorizontal: 16,
          alignSelf: "flex-start",
          backgroundColor: status === "probing" ? "#9ca3af" : "#2563eb",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
          {status === "probing" ? "Checking..." : "Probe"}
        </Text>
      </Pressable>
    </View>
  );
}

function ServerCard({
  server,
  isActive,
}: {
  server: ServerConfig;
  isActive: boolean;
}) {
  const { switchServer, removeServer, probeServer } = useServerConfig();
  const [probeStatus, setProbeStatus] = useState<ProbeStatus>("idle");
  const [switching, setSwitching] = useState(false);
  const [removing, setRemoving] = useState(false);

  const onUse = async () => {
    setSwitching(true);
    try {
      await switchServer(server.url);
    } finally {
      setSwitching(false);
    }
  };

  const onProbe = () => {
    setProbeStatus("probing");
    probeServer(server.url).then((ok) => setProbeStatus(ok ? "ok" : "fail"));
  };

  const onDelete = () => {
    Alert.alert("Remove server", `Remove "${server.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemoving(true);
          try {
            await removeServer(server.id);
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ ...cardStyle, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <StatusDot status={probeStatus} />
        <Text
          selectable
          style={{ fontWeight: "600", color: "#111827", flex: 1 }}
        >
          {server.name}
        </Text>
        {isActive && (
          <View
            style={{
              backgroundColor: "#dcfce7",
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: "#15803d", fontSize: 12, fontWeight: "600" }}>
              Active
            </Text>
          </View>
        )}
      </View>
      <Text
        selectable
        numberOfLines={1}
        style={{ color: "#6b7280", fontSize: 13 }}
      >
        {server.url}
      </Text>
      {server.localIpPrefix ? (
        <Text selectable style={{ color: "#9ca3af", fontSize: 12 }}>
          Auto-select prefix: {server.localIpPrefix}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {!isActive && (
          <Pressable
            onPress={onUse}
            disabled={switching}
            style={{
              borderRadius: 8,
              paddingVertical: 7,
              paddingHorizontal: 14,
              backgroundColor: switching ? "#9ca3af" : "#2563eb",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              {switching ? "Switching..." : "Use"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onProbe}
          disabled={probeStatus === "probing"}
          style={{
            borderRadius: 8,
            paddingVertical: 7,
            paddingHorizontal: 14,
            backgroundColor: probeStatus === "probing" ? "#9ca3af" : "#e5e7eb",
          }}
        >
          <Text style={{ color: "#374151", fontWeight: "600", fontSize: 13 }}>
            {probeStatus === "probing" ? "Checking..." : "Probe"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={removing}
          style={{
            borderRadius: 8,
            paddingVertical: 7,
            paddingHorizontal: 14,
            backgroundColor: removing ? "#9ca3af" : "#fee2e2",
          }}
        >
          <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 13 }}>
            {removing ? "Removing..." : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddServerForm() {
  const { addServer, probeServer } = useServerConfig();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [prefix, setPrefix] = useState("");
  const [probeStatus, setProbeStatus] = useState<ProbeStatus>("idle");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const onAdd = async () => {
    const trimmedUrl = url.trim().replace(/\/+$/, "");
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a name.");
      return;
    }
    if (!trimmedUrl) {
      setError("Please enter a URL.");
      return;
    }

    setError(undefined);
    setMessage(undefined);
    setProbeStatus("probing");

    const reachable = await probeServer(trimmedUrl);
    setProbeStatus(reachable ? "ok" : "fail");

    if (!reachable) {
      setError(
        "Could not reach server. It has been saved anyway — you can switch to it later when it's accessible."
      );
    } else {
      setMessage("Server is reachable.");
    }

    addServer({
      name: trimmedName,
      url: trimmedUrl,
      localIpPrefix: prefix.trim() || undefined,
    });

    setName("");
    setUrl("");
    setPrefix("");
  };

  return (
    <View style={cardStyle}>
      <Text selectable style={{ color: "#111827", fontWeight: "600" }}>
        Add server
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name (e.g., Home, Remote)"
        autoCapitalize="words"
        style={inputStyle}
      />
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="URL (e.g., http://192.168.1.100:3000)"
        autoCapitalize="none"
        keyboardType="url"
        style={inputStyle}
      />
      <TextInput
        value={prefix}
        onChangeText={setPrefix}
        placeholder="Local IP prefix (optional, e.g., 192.168.1)"
        autoCapitalize="none"
        keyboardType="decimal-pad"
        style={inputStyle}
      />
      <Text style={{ color: "#9ca3af", fontSize: 12 }}>
        IP prefix is used to auto-select this server when your device is on the
        matching network.
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={onAdd}
          disabled={probeStatus === "probing"}
          style={{
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 20,
            backgroundColor: probeStatus === "probing" ? "#9ca3af" : "#2563eb",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {probeStatus === "probing" ? "Checking..." : "Add"}
          </Text>
        </Pressable>
        {probeStatus !== "idle" && probeStatus !== "probing" && (
          <StatusDot status={probeStatus} />
        )}
      </View>
      {message ? (
        <Text selectable style={{ color: "#065f46", fontSize: 13 }}>
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text selectable style={{ color: "#b91c1c", fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const cardStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#d1d5db",
  backgroundColor: "#fff",
  padding: 16,
  gap: 10,
} as const;

const inputStyle = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "#fff",
} as const;

export default function ServersScreen() {
  const { servers, activeUrl, autoResolving } = useServerConfig();

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
        Servers
      </Text>

      {autoResolving && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 4,
          }}
        >
          <ActivityIndicator size="small" color="#6b7280" />
          <Text style={{ color: "#6b7280", fontSize: 13 }}>
            Auto-detecting best server...
          </Text>
        </View>
      )}

      <CurrentServerCard />

      {servers.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: "#6b7280", fontSize: 13, fontWeight: "600" }}>
            CONFIGURED SERVERS
          </Text>
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              isActive={server.url === activeUrl}
            />
          ))}
        </View>
      )}

      <AddServerForm />
    </ScrollView>
  );
}
