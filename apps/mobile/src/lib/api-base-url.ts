import { getActiveServerUrl } from "./server-config";

export function getServerBaseUrl(): string {
  return getActiveServerUrl();
}

export function getApiBaseUrl(): string {
  return `${getActiveServerUrl()}/api/v1`;
}
