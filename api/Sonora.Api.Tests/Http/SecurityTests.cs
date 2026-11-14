using System.Net;
using System.Text.Json;
using Sonora.Api.Tests.Support;
using Xunit;

namespace Sonora.Api.Tests.Http;

public sealed class SecurityTests : IClassFixture<SonoraApiFactory>
{
    private const string Location = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private readonly SonoraApiFactory api;

    public SecurityTests(SonoraApiFactory api) => this.api = api;

    public static TheoryData<string> AcousticRoutes =>
    [
        "/api/sonora/v1/locations",
        $"/api/sonora/v1/locations/{Location}",
        $"/api/sonora/v1/locations/{Location}/noise-profile?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated",
        $"/api/sonora/v1/locations/{Location}/observations?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated",
        "/api/sonora/v1/analytics/summary"
    ];

    public static TheoryData<string> OperationRoutes =>
    [
        "/api/sonora/v1/health/ready",
        "/api/sonora/v1/devices",
        "/api/sonora/v1/openapi.json"
    ];

    private async Task<HttpResponseMessage> Get(string path, string? key)
    {
        using var client = api.Client(key);
        return await client.GetAsync(path);
    }

    [Theory]
    [MemberData(nameof(AcousticRoutes))]
    [MemberData(nameof(OperationRoutes))]
    public async Task MissingInvalidExpiredRevokedOrMockKeysAreUnauthorized(string path)
    {
        foreach (var key in new[] { null, "wrong-key", "mock-consumer-key", "mock-operator-key", SonoraApiFactory.ExpiredKey, SonoraApiFactory.RevokedKey })
        {
            var response = await Get(path, key);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("unauthorized", body.RootElement.GetProperty("code").GetString());
        }
    }

    [Theory]
    [MemberData(nameof(AcousticRoutes))]
    public async Task AcousticRoutesRequireAcousticsScope(string path)
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await Get(path, SonoraApiFactory.NoScopeKey)).StatusCode);
        Assert.True((await Get(path, SonoraApiFactory.ConsumerKey)).IsSuccessStatusCode);
    }

    [Theory]
    [MemberData(nameof(OperationRoutes))]
    public async Task OperationRoutesRequireOperationsScope(string path)
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await Get(path, SonoraApiFactory.ConsumerKey)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Get(path, SonoraApiFactory.OperatorKey)).StatusCode);
    }

    [Fact]
    public async Task AuthenticationHappensBeforeValidation()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Get("/api/sonora/v1/locations/not-a-uuid", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Get("/api/sonora/v1/locations/not-a-uuid", SonoraApiFactory.NoScopeKey)).StatusCode);
    }

    [Fact]
    public async Task RemovingKeyFromFileRevokesImmediately()
    {
        const string key = "test-only-rotating-key";
        api.WriteKeys([SonoraApiFactory.Entry("rotating", key, ["acoustics:read"])]);
        try
        {
            Assert.Equal(HttpStatusCode.OK, (await Get("/api/sonora/v1/locations", key)).StatusCode);
            api.WriteKeys([]);
            Assert.Equal(HttpStatusCode.Unauthorized, (await Get("/api/sonora/v1/locations", key)).StatusCode);
        }
        finally
        {
            api.WriteKeys([
                SonoraApiFactory.Entry("consumer", SonoraApiFactory.ConsumerKey, ["acoustics:read"]),
                SonoraApiFactory.Entry("operator", SonoraApiFactory.OperatorKey, ["acoustics:read", "operations:read"]),
                SonoraApiFactory.Entry("expired", SonoraApiFactory.ExpiredKey, ["acoustics:read"], expiresAt: "2026-01-01T00:00:00Z"),
                SonoraApiFactory.Entry("revoked", SonoraApiFactory.RevokedKey, ["acoustics:read"], revoked: true),
                SonoraApiFactory.Entry("no-scope", SonoraApiFactory.NoScopeKey, [])
            ]);
        }
    }

    [Theory]
    [InlineData("/dashboard", "text/html")]
    [InlineData("/dashboard/app.js", "text/javascript")]
    [InlineData("/dashboard/docs", "text/html")]
    public async Task DashboardShellIsAnonymousAndContainsNoData(string path, string mediaType)
    {
        var response = await Get(path, null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(mediaType, response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("default-src 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        var html = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Demo location A", html);
        Assert.DoesNotContain("test-only", html);
    }

    [Fact]
    public async Task RuntimeDocumentationDescribesImplementedContractRoutes()
    {
        var response = await Get("/api/sonora/v1/openapi.json", SonoraApiFactory.OperatorKey);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var paths = document.RootElement.GetProperty("paths");
        var contract = Repository.Contract("openapi/csharp.openapi.json")["paths"]!.AsObject();
        foreach (var (path, _) in contract)
            Assert.True(paths.TryGetProperty(path, out _), $"Runtime OpenAPI is missing {path}");
        Assert.Equal("X-Api-Key", document.RootElement.GetProperty("components").GetProperty("securitySchemes")
            .GetProperty("ApiKeyAuth").GetProperty("name").GetString());
    }
}
