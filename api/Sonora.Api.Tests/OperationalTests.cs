using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

public sealed class OperationalTests : IDisposable
{
    private readonly string keyFile = Path.GetTempFileName();
    private readonly WebApplicationFactory<Program> application;
    private const string OperatorKey = "test-only-operational-key";

    public OperationalTests()
    {
        File.WriteAllText(keyFile, JsonSerializer.Serialize(new { keys = new[] {
            new { sha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(OperatorKey))), scopes = new[] { "operations:read" } },
            new { sha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("test-only-consumer"))), scopes = new[] { "acoustics:read" } }
        }}));
        application = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SONORA_KEYS_FILE"] = keyFile,
                ["ConnectionStrings:Sonora"] = "Host=127.0.0.1;Port=1;Database=absent;Username=absent;Password=absent;Timeout=1"
            })));
    }

    [Fact]
    public async Task LivenessDoesNotRequireDatabaseOrCredentials()
    {
        var response = await application.CreateClient().GetAsync("/api/sonora/v1/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("{\"status\":\"ok\"}", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("mock-operator-key", 401)]
    [InlineData("test-only-consumer", 403)]
    [InlineData(OperatorKey, 503)]
    public async Task ReadinessProtectsAccessAndReportsDatabaseFailure(string? key, int status)
    {
        using var client = application.CreateClient();
        if (key is not null) client.DefaultRequestHeaders.Add("X-Api-Key", key);
        var response = await client.GetAsync("/api/sonora/v1/health/ready");
        Assert.Equal(status, (int)response.StatusCode);
        if (status == 503) Assert.Equal("{\"status\":\"unavailable\"}", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task RuntimeDocumentationListsOnlyImplementedRoutesAndKeyRemovalRevokesAccess()
    {
        using var client = application.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", OperatorKey);
        var response = await client.GetAsync("/api/sonora/v1/openapi.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.False(document.RootElement.GetProperty("paths").TryGetProperty("/api/sonora/v1/locations", out _));
        File.WriteAllText(keyFile, "{\"keys\":[]}");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/sonora/v1/openapi.json")).StatusCode);
    }

    public void Dispose() { application.Dispose(); File.Delete(keyFile); }
}
