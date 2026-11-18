import contract from "../../contracts/openapi/csharp.openapi.json" with { type: "json" };

const labels = {
  getProfile: ["profile", "Perfil acústico"],
  listLocations: ["locations", "Locais cadastrados"],
  getLocation: ["location", "Detalhes do local"],
  listObservations: ["observations", "Observações por período"],
  listDevices: ["devices", "Estado dos dispositivos"],
  getMlSummary: ["summary", "Resumo de aprendizado de máquina"],
  healthLive: ["health", "Estado do processo"],
  healthReady: ["ready", "Disponibilidade do banco e das views"],
  getDashboard: ["dashboard", "Painel HTML"],
};

/** @type {Record<string, {path: string, label: string, parameters: Array<{name: string, required: boolean, in: string}>, scope?: string, responses: Record<string, any>}>} */
export const operations = Object.fromEntries(
  Object.entries(contract.paths).map(([path, { get }]) => {
    const [key, label] = labels[get.operationId];
    return [
      key,
      {
        path,
        label,
        parameters: get.parameters ?? [],
        scope: get["x-required-scopes"][0],
        responses: get.responses,
      },
    ];
  }),
);
const profile =
  operations.profile.responses[200].content["application/json"].examples;
const sample = profile.available.value;
const unknownLocation = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const laterEnd = "2026-11-08T15:02:00Z";
export const choices = {
  locationId: [sample.locationId, unknownLocation],
  from: [sample.from, sample.to],
  to: [sample.to, laterEnd],
  origin: ["simulated", "public_dataset"],
  aggregation: ["hour", "day"],
  page: ["1", "2"],
  pageSize: ["20", "1", "100"],
  latitude: ["", "-23.56"],
  longitude: ["", "-46.65"],
  radiusMeters: ["", "500", "1000"],
};
export const scenarioNames = {
  available: "Resposta disponível",
  empty: "Sem dados para a consulta",
  invalid: "400 · parâmetros inválidos",
  unauthorized: "401 · chave ausente",
  forbidden: "403 · escopo insuficiente",
  missing: "404 · local desconhecido",
  unavailable: "503 · dependência indisponível",
};
const errors = {
  invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  missing: 404,
  unavailable: 503,
};
export function scenarios(key) {
  const result = ["available"];
  if (["profile", "locations", "observations", "summary"].includes(key))
    result.push("empty");
  return result.concat(
    Object.keys(errors).filter(
      (name) => errors[name] in operations[key].responses,
    ),
  );
}
export function simulateQuery(
  key,
  origin = "simulated",
  scenario = "available",
  selected = {},
) {
  if (
    !Object.hasOwn(operations, key) ||
    !choices.origin.includes(origin) ||
    !Object.hasOwn(scenarioNames, scenario)
  )
    throw new Error("Unknown simulation");
  const op = operations[key];
  const params = Object.fromEntries(
    op.parameters.map(({ name }) => [
      name,
      selected[name] ?? (name === "origin" ? origin : choices[name][0]),
    ]),
  );
  let status =
    op.scope && errors[scenario] in op.responses ? errors[scenario] : 200;
  if (scenario === "missing" && status === 404)
    params.locationId = unknownLocation;
  if (scenario === "invalid" && status === 400) {
    if ("page" in params) params.page = "0";
    else params.locationId = "invalid";
  }
  if (
    status === 200 &&
    key === "locations" &&
    (Boolean(params.latitude) !== Boolean(params.longitude) ||
      (params.radiusMeters && !params.latitude))
  )
    status = 400;
  if (status === 200 && params.from && params.from >= params.to) status = 400;
  if (status === 200 && params.locationId === unknownLocation) status = 404;
  const query = new URLSearchParams();
  for (const { name, in: place } of op.parameters)
    if (place === "query" && params[name]) query.set(name, params[name]);
  const path =
    op.path.replace("{locationId}", params.locationId) +
    (query.size ? "?" + query : "");
  const curl =
    `curl --request GET '${contract.servers[0].url}${path}'` +
    (op.scope && status !== 401
      ? ' \\\n  --header "X-Api-Key: $SONORA_API_KEY"'
      : "");
  if (key === "summary" && scenario === "empty") status = 204;
  if (status === 204)
    return { path, curl, status, body: null, format: "sem corpo" };
  if (key === "dashboard")
    return {
      path,
      curl,
      status,
      format: "text/html",
      body: '<!doctype html>\n<html lang="pt-BR">\n  <title>Sonora</title>\n  <main><h1>Painel Sonora</h1></main>\n</html>',
    };
  const content = op.responses[status].content["application/json"];
  let body = structuredClone(content.example);
  const empty =
    scenario === "empty" ||
    params.origin === "public_dataset" ||
    params.from === sample.to;
  if (status === 200 && key === "profile") {
    body = structuredClone(empty ? profile.empty.value : sample);
    body.from = params.from;
    body.to = params.to;
    if (!empty) body.series[0].bins[0].to = params.to;
    body.origin = params.origin;
    body.aggregation = params.aggregation;
  }
  if (status === 200 && "page" in params) {
    const items = empty ? [] : body.items;
    if (key === "locations" && params.latitude)
      items.forEach((location) => {
        location.distanceMeters = 0;
      });
    const page = Number(params.page),
      pageSize = Number(params.pageSize);
    body = {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: items.length,
    };
  }
  return { path, curl, status, body, format: "application/json" };
}
