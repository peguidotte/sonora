import { fixtures } from "./playground-fixtures.mjs";
export const endpointPaths = {
  profile:
    "/api/sonora/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile",
  locations: "/api/sonora/v1/locations",
  health: "/api/sonora/v1/health/live",
};
export function simulateQuery(
  endpoint,
  origin = "simulated",
  scenario = "available",
) {
  if (!(endpoint in endpointPaths)) throw new Error("Unknown endpoint");
  if (!["simulated", "public_dataset"].includes(origin))
    throw new Error("Unknown origin");
  if (!["available", "empty", "unauthorized", "forbidden"].includes(scenario))
    throw new Error("Unknown scenario");
  const query =
    endpoint === "profile"
      ? new URLSearchParams({
          from: fixtures.available.from,
          to: fixtures.available.to,
          origin,
          aggregation: "hour",
        }).toString()
      : endpoint === "locations"
        ? "page=1&pageSize=20"
        : "";
  const path = endpointPaths[endpoint] + (query ? "?" + query : "");
  const curl =
    `curl --request GET '${"http://localhost:8080"}${path}'` +
    (endpoint === "health"
      ? ""
      : ` \\\n  --header "X-Api-Key: $SONORA_API_KEY"`);
  let status = 200,
    body;
  if (endpoint !== "health" && scenario === "unauthorized") {
    status = 401;
    body = {
      code: "unauthorized",
      message: "Missing, invalid, revoked or expired API key.",
    };
  } else if (endpoint !== "health" && scenario === "forbidden") {
    status = 403;
    body = {
      code: "forbidden",
      message: "Authenticated credential lacks the required scope.",
    };
  } else if (endpoint === "health") body = { status: "ok" };
  else if (endpoint === "locations")
    body =
      scenario === "empty"
        ? { items: [], page: 1, pageSize: 20, total: 0 }
        : structuredClone(fixtures.locations);
  else {
    body = structuredClone(
      scenario === "empty" || origin === "public_dataset"
        ? fixtures.empty
        : fixtures.available,
    );
    body.origin = origin;
  }
  return { path, curl, status, body };
}
