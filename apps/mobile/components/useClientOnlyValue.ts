// This function is web-only as native doesn't currently support server (or build-time) rendering.
export function useClientOnlyValue<TServer, TClient>(
  server: TServer,
  client: TClient
): TServer | TClient {
  return client;
}
