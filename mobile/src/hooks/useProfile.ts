import { useCallback, useEffect, useState } from "react";
import { useSession } from "../session/SessionContext";
import {
  SonoraApiError,
  SonoraNetworkError,
  type GetProfileParams,
  type Profile,
} from "../api/types";
import { loadProfileCache, saveProfileCache } from "../storage/cache";

export type ProfileResult =
  | { status: "loading" }
  | { status: "ready"; profile: Profile }
  | { status: "offline-cache"; profile: Profile; fetchedAt: string }
  | { status: "auth-error"; message: string }
  | { status: "error"; message: string };

export function authErrorMessage(statusCode: number): string {
  if (statusCode === 401) {
    return "Your session key is missing or no longer valid. Enter it again in Settings.";
  }
  return "Your session key does not have access to this location.";
}

export function useProfile(params: GetProfileParams) {
  const { client } = useSession();
  const [result, setResult] = useState<ProfileResult>({ status: "loading" });

  const load = useCallback(async () => {
    setResult({ status: "loading" });
    try {
      const profile = await client.getProfile(params);
      saveProfileCache(params, profile);
      setResult({ status: "ready", profile });
    } catch (error) {
      if (error instanceof SonoraNetworkError) {
        const cached = loadProfileCache(params);
        if (cached) {
          setResult({
            status: "offline-cache",
            profile: cached.profile,
            fetchedAt: cached.fetchedAt,
          });
          return;
        }
        setResult({
          status: "error",
          message: "Offline and no cached data for this location yet.",
        });
        return;
      }
      if (
        error instanceof SonoraApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        setResult({
          status: "auth-error",
          message: authErrorMessage(error.status),
        });
        return;
      }
      setResult({
        status: "error",
        message: "Could not load the noise profile.",
      });
    }
    // params is a plain object rebuilt by the caller on every relevant change;
    // intentionally depending on its serialized form, not identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { result, reload: load };
}
