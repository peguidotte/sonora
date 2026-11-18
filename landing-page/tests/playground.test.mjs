import test from "node:test";
import assert from "node:assert/strict";
import { simulateQuery } from "../src/playground-model.mjs";
test("profile uses public synthetic contract example and proper request query", () => {
  const r = simulateQuery("profile");
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "available");
  assert.equal(r.body.laeqDbA, 67.40362689494243);
  assert.match(r.path, /origin=simulated/);
  assert.match(r.curl, /\$SONORA_API_KEY/);
  assert.equal(r.body.series[0].bins[0].observedSeconds, 10);
});
test("public dataset does not invent measurements", () => {
  const r = simulateQuery("profile", "public_dataset");
  assert.equal(r.body.status, "no_data");
  assert.equal(r.body.laeqDbA, null);
  assert.deepEqual(r.body.sources, []);
  assert.equal(r.body.origin, "public_dataset");
});
test("empty is not zero and cannot mutate fixtures", () => {
  const r = simulateQuery("profile", "simulated", "empty");
  assert.equal(r.body.laeqDbA, null);
  r.body.origin = "bad";
  assert.equal(simulateQuery("profile").body.origin, "simulated");
});
test("auth errors and public health are distinct", () => {
  assert.equal(
    simulateQuery("profile", "simulated", "unauthorized").status,
    401,
  );
  assert.equal(
    simulateQuery("locations", "simulated", "forbidden").status,
    403,
  );
  const r = simulateQuery("health", "simulated", "unauthorized");
  assert.equal(r.status, 200);
  assert.doesNotMatch(r.curl, /Api-Key/);
});
test("unknown input rejects rather than invents route", () => {
  assert.throws(() => simulateQuery("oops"));
  assert.throws(() => simulateQuery("profile", "oops"));
  assert.throws(() => simulateQuery("profile", "simulated", "oops"));
});

test("public fixtures match canonical OpenAPI examples", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fixtures } = await import("../src/playground-fixtures.mjs");
  const spec = JSON.parse(
    await readFile(
      new URL("../../contracts/openapi/csharp.openapi.json", import.meta.url),
      "utf8",
    ),
  );
  const examples =
    spec.paths["/api/sonora/v1/locations/{locationId}/noise-profile"].get
      .responses["200"].content["application/json"].examples;
  assert.deepEqual(fixtures.available, examples.available.value);
  assert.deepEqual(fixtures.empty, examples.empty.value);
  assert.deepEqual(
    fixtures.locations,
    spec.paths["/api/sonora/v1/locations"].get.responses["200"].content[
      "application/json"
    ].example,
  );
});
