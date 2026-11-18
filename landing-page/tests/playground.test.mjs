import test from "node:test";
import assert from "node:assert/strict";
import {
  simulateQuery,
  operations,
  scenarios,
} from "../src/playground-model.mjs";
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

test("every contract route, scope and response is reachable", async () => {
  const { default: spec } = await import(
    "../../contracts/openapi/csharp.openapi.json",
    { with: { type: "json" } }
  );
  assert.deepEqual(
    Object.values(operations)
      .map((op) => op.path)
      .sort(),
    Object.keys(spec.paths).sort(),
  );
  for (const [key, op] of Object.entries(operations)) {
    const route = spec.paths[op.path].get;
    const statuses = new Set();
    for (const scenario of scenarios(key)) {
      const result = simulateQuery(key, "simulated", scenario);
      statuses.add(String(result.status));
      const content = route.responses[result.status].content;
      assert.equal(
        result.curl.includes("X-Api-Key"),
        !!op.scope && result.status !== 401,
      );
      if (!content) assert.equal(result.body, null);
      else if (content["text/html"])
        assert.match(result.body, /^<!doctype html>/);
      else {
        const { example, examples } = content["application/json"];
        if (examples) assert.deepEqual(result.body, examples[scenario].value);
        else if (scenario !== "empty") assert.deepEqual(result.body, example);
      }
    }
    assert.deepEqual([...statuses].sort(), Object.keys(route.responses).sort());
  }
});

test("sample pagination, proximity and origin filters agree with the request", () => {
  const page = simulateQuery("observations", "simulated", "available", {
    page: "2",
    pageSize: "1",
  }).body;
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].externalId, "fixture-a-2");
  assert.equal(page.total, 2);
  assert.deepEqual(
    simulateQuery("observations", "public_dataset").body.items,
    [],
  );
  assert.equal(
    simulateQuery("locations", "simulated", "available", { latitude: "-23.56" })
      .status,
    400,
  );
  const nearby = simulateQuery("locations", "simulated", "available", {
    latitude: "-23.56",
    longitude: "-46.65",
  });
  assert.equal(nearby.body.items[0].distanceMeters, 0);
});

test("synthetic window controls distinguish empty, invalid and unknown location", () => {
  const from = "2026-11-08T15:01:00Z";
  const to = "2026-11-08T15:02:00Z";
  const empty = simulateQuery("profile", "simulated", "available", {
    from,
    to,
  });
  assert.equal(empty.body.status, "no_data");
  assert.equal(empty.body.from, from);
  assert.equal(empty.body.to, to);
  assert.equal(
    simulateQuery("observations", "simulated", "available", { from }).status,
    400,
  );
  const missing = { locationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };
  assert.equal(
    simulateQuery("location", "simulated", "available", missing).status,
    404,
  );
  assert.equal(
    simulateQuery("location", "simulated", "unauthorized", missing).status,
    401,
  );
});
