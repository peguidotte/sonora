using System.Net;
using System.Text.Json.Nodes;
using Sonora.Api.Data;
using Sonora.Api.Tests.Support;
using Xunit;

namespace Sonora.Api.Tests.Http;

/// <summary>
/// Executa a API real (rotas, validação, DI, serialização) sobre o estado descrito pelas fixtures públicas
/// e compara cada resposta com contracts/fixtures. Não substitui o teste em PostgreSQL real.
/// </summary>
public sealed class ContractTests : IClassFixture<SonoraApiFactory>
{
    private const string Location = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private const string Window = "from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z";
    private readonly SonoraApiFactory api;

    public ContractTests(SonoraApiFactory api) => this.api = api;

    private async Task<(HttpStatusCode Status, JsonNode? Body, string? ContentType)> Get(string path, string? key = SonoraApiFactory.OperatorKey)
    {
        using var client = api.Client(key);
        var response = await client.GetAsync(path);
        var text = await response.Content.ReadAsStringAsync();
        return (response.StatusCode, text.Length == 0 ? null : JsonNode.Parse(text), response.Content.Headers.ContentType?.MediaType);
    }

    private static void AssertJson(JsonNode expected, JsonNode? actual)
    {
        Assert.NotNull(actual);
        Assert.True(JsonNode.DeepEquals(Normalize(expected), Normalize(actual)),
            $"Expected:\n{expected.ToJsonString()}\nActual:\n{actual!.ToJsonString()}");
    }

    // Igualdade estrutural tolerando apenas o último dígito de ponto flutuante.
    private static JsonNode? Normalize(JsonNode? node) => node switch
    {
        JsonObject obj => new JsonObject(obj.OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => KeyValuePair.Create(p.Key, Normalize(p.Value)))),
        JsonArray array => new JsonArray(array.Select(Normalize).ToArray()),
        JsonValue value when value.TryGetValue<double>(out var number) => JsonValue.Create(Math.Round(number, 9)),
        _ => node?.DeepClone()
    };

    [Fact]
    public async Task LivenessIsAnonymousAndMatchesFixture()
    {
        var (status, body, _) = await Get("/api/sonora/v1/health/live", key: null);
        Assert.Equal(HttpStatusCode.OK, status);
        AssertJson(Repository.Fixture("health.json"), body);
    }

    [Fact]
    public async Task LocationsMatchFixtures()
    {
        var page = await Get("/api/sonora/v1/locations", SonoraApiFactory.ConsumerKey);
        Assert.Equal(HttpStatusCode.OK, page.Status);
        AssertJson(Repository.Fixture("locations.json"), page.Body);

        var single = await Get($"/api/sonora/v1/locations/{Location}", SonoraApiFactory.ConsumerKey);
        AssertJson(Repository.Fixture("location.json"), single.Body);
    }

    [Fact]
    public async Task NearbySearchAddsDistanceAndFiltersByRadius()
    {
        var near = await Get("/api/sonora/v1/locations?latitude=-23.561&longitude=-46.65&radiusMeters=200");
        var item = Assert.Single(near.Body!["items"]!.AsArray());
        Assert.InRange(item!["distanceMeters"]!.GetValue<double>(), 100, 125);

        var far = await Get("/api/sonora/v1/locations?latitude=-23.57&longitude=-46.65&radiusMeters=1000");
        Assert.Equal(0, far.Body!["total"]!.GetValue<int>());
        Assert.Empty(far.Body["items"]!.AsArray());
    }

    [Fact]
    public async Task ProfileMatchesFixtureIncludingEnergyAverage()
    {
        var (status, body, _) = await Get($"/api/sonora/v1/locations/{Location}/noise-profile?{Window}&origin=simulated");
        Assert.Equal(HttpStatusCode.OK, status);
        AssertJson(Repository.Fixture("profile.json"), body);
    }

    [Fact]
    public async Task EmptyPeriodReturnsNoDataFixture()
    {
        var (status, body, _) = await Get(
            $"/api/sonora/v1/locations/{Location}/noise-profile?from=2026-11-08T16:00:00Z&to=2026-11-08T16:01:00Z&origin=simulated&aggregation=hour");
        Assert.Equal(HttpStatusCode.OK, status);
        var expected = Repository.Fixture("profile-empty.json");
        expected["from"] = "2026-11-08T16:00:00Z";
        expected["to"] = "2026-11-08T16:01:00Z";
        AssertJson(expected, body);
        Assert.True(body!.AsObject().ContainsKey("laeqDbA"));
        Assert.Null(body["laeqDbA"]); // presente e nulo: ausência nunca vira 0 dB
    }

    [Fact]
    public async Task PublicDatasetIsNeverFilledWithSimulatedData()
    {
        var (_, body, _) = await Get($"/api/sonora/v1/locations/{Location}/noise-profile?{Window}&origin=public_dataset");
        Assert.Equal("no_data", body!["status"]!.GetValue<string>());
        Assert.Empty(body["series"]!.AsArray());
    }

    [Fact]
    public async Task ObservationsMatchFixture()
    {
        var (status, body, _) = await Get($"/api/sonora/v1/locations/{Location}/observations?{Window}&origin=simulated");
        Assert.Equal(HttpStatusCode.OK, status);
        AssertJson(Repository.Fixture("observations.json"), body);
    }

    [Fact]
    public async Task ObservationsArePaginated()
    {
        var (_, body, _) = await Get($"/api/sonora/v1/locations/{Location}/observations?{Window}&origin=simulated&page=2&pageSize=1");
        Assert.Equal(2, body!["total"]!.GetValue<int>());
        Assert.Equal("fixture-a-2", Assert.Single(body["items"]!.AsArray())!["externalId"]!.GetValue<string>());
    }

    [Fact]
    public async Task DevicesMatchFixtureWithComputedState()
    {
        var (status, body, _) = await Get("/api/sonora/v1/devices");
        Assert.Equal(HttpStatusCode.OK, status);
        AssertJson(Repository.Fixture("devices.json"), body);
    }

    [Fact]
    public async Task SummaryIsNoContentWithoutArtifactAndPayloadWhenImported()
    {
        var empty = await Get("/api/sonora/v1/analytics/summary", SonoraApiFactory.ConsumerKey);
        Assert.Equal(HttpStatusCode.NoContent, empty.Status);

        var fixture = Repository.Fixture("ml-summary.mock.json");
        api.Store.MlSummaries.Add(new MlSummaryRow { ModelVersion = "v1", CreatedAt = DateTime.UtcNow, Payload = fixture.ToJsonString() });
        try
        {
            var (status, body, contentType) = await Get("/api/sonora/v1/analytics/summary", SonoraApiFactory.ConsumerKey);
            Assert.Equal(HttpStatusCode.OK, status);
            Assert.Equal("application/json", contentType);
            AssertJson(fixture, body);
        }
        finally
        {
            api.Store.MlSummaries.Clear();
        }
    }

    [Theory]
    [InlineData("/api/sonora/v1/locations/not-a-uuid", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations?latitude=-23.5", "invalid_coordinates")]
    [InlineData("/api/sonora/v1/locations?latitude=-91&longitude=0", "invalid_coordinates")]
    [InlineData("/api/sonora/v1/locations?radiusMeters=100", "invalid_coordinates")]
    [InlineData("/api/sonora/v1/locations?radiusMeters=1001&latitude=0&longitude=0", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations?pageSize=101", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations?page=0", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?origin=simulated&to=2026-11-08T15:01:00Z", "missing_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?" + Window, "missing_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?" + Window + "&origin=wokwi", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?" + Window + "&origin=simulated&aggregation=week", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?from=2026-11-08T15:00:00-03:00&to=2026-11-08T19:00:00Z&origin=simulated", "invalid_parameter")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?from=2026-11-08T15:00:00Z&to=2026-11-08T15:00:00Z&origin=simulated", "invalid_window")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/noise-profile?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:01Z&origin=simulated", "invalid_window")]
    [InlineData("/api/sonora/v1/locations/" + Location + "/observations?" + Window + "&origin=simulated&pageSize=0", "invalid_parameter")]
    public async Task InvalidRequestsReturnContractError(string path, string code)
    {
        var (status, body, _) = await Get(path);
        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Equal(code, body!["code"]!.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(body["message"]!.GetValue<string>()));
    }

    [Fact]
    public async Task ThirtyOneDaysIsAccepted()
    {
        var (status, _, _) = await Get($"/api/sonora/v1/locations/{Location}/noise-profile?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z&origin=simulated&aggregation=day");
        Assert.Equal(HttpStatusCode.OK, status);
    }

    [Theory]
    [InlineData("/api/sonora/v1/locations/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")]
    [InlineData("/api/sonora/v1/locations/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/noise-profile?" + Window + "&origin=simulated")]
    [InlineData("/api/sonora/v1/locations/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/observations?" + Window + "&origin=simulated")]
    public async Task UnknownLocationIsNotFound(string path)
    {
        var (status, body, _) = await Get(path);
        Assert.Equal(HttpStatusCode.NotFound, status);
        Assert.Equal("not_found", body!["code"]!.GetValue<string>());
    }

    [Fact]
    public async Task ReadinessReportsUnavailableStore()
    {
        api.Store.Ready = false;
        try
        {
            var (status, body, _) = await Get("/api/sonora/v1/health/ready");
            Assert.Equal(HttpStatusCode.ServiceUnavailable, status);
            Assert.Equal("unavailable", body!["status"]!.GetValue<string>());
        }
        finally
        {
            api.Store.Ready = true;
        }
        Assert.Equal(HttpStatusCode.OK, (await Get("/api/sonora/v1/health/ready")).Status);
    }
}
