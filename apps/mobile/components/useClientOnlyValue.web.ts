import React from "react";

// `useEffect` is not invoked during server rendering, meaning
// we can use this to determine if we're on the server or not.
export function useClientOnlyValue<TServer, TClient>(
  server: TServer,
  client: TClient
): TServer | TClient {
  const [value, setValue] = React.useState<TServer | TClient>(server);
  React.useEffect(() => {
    setValue(client);
  }, [client]);

  return value;
}
