using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sonora.Api.Data;
using Sonora.Api.Domain;

namespace Sonora.Api.Tests.Support;

public static class Repository
{
    public static string Root { get; } = FindRoot();

    public static JsonNode Fixture(string name) =>
        JsonNode.Parse(File.ReadAllText(Path.Combine(Root, "contracts", "fixtures", name)))!;

    public static JsonNode Contract(string relativePath) =>
        JsonNode.Parse(File.ReadAllText(Path.Combine(Root, "contracts", relativePath)))!;

    private static string FindRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
            if (File.Exists(Path.Combine(directory.FullName, "AGENTS.md")) && Directory.Exists(Path.Combine(directory.FullName, "contracts")))
                return directory.FullName;
        throw new InvalidOperationException("Repository root not found.");
    }
}

public sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;

    public override DateTimeOffset GetUtcNow() => Now;
}

/// <summary>Implementação em memória da porta de leitura, com a mesma semântica de filtros/ordenação do EF.</summary>
public sealed class InMemoryReadStore : IAcousticReadStore
{
    public List<LocationRow> Locations { get; } = [];
    public List<SourceRow> Sources { get; } = [];
    public List<DeviceRow> Devices { get; } = [];
    public List<ObservationRow> Observations { get; } = [];
    public List<MlSummaryRow> MlSummaries { get; } = [];
    public bool Ready { get; set; } = true;

    public Task<bool> IsReadyAsync(CancellationToken cancellation) => Task.FromResult(Ready);

    public Task<LocationRow?> FindLocationAsync(Guid id, CancellationToken cancellation) =>
        Task.FromResult(Locations.FirstOrDefault(location => location.Id == id));

    public Task<Page<LocationRow>> ListLocationsAsync(int page, int pageSize, CancellationToken cancellation) =>
        Task.FromResult(new Page<LocationRow>(Locations.OrderBy(l => l.Name, StringComparer.Ordinal).ThenBy(l => l.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToList(), Locations.Count));

    public Task<IReadOnlyList<LocationRow>> ListLocationsInBoxAsync(GeoBox box, CancellationToken cancellation) =>
        Task.FromResult<IReadOnlyList<LocationRow>>(Locations.Where(l => l.Latitude >= box.MinLatitude && l.Latitude <= box.MaxLatitude &&
            (box.CrossesAntimeridian || l.Longitude >= box.MinLongitude && l.Longitude <= box.MaxLongitude)).ToList());

    public Task<Page<ObservationRow>> ListObservationsAsync(Guid locationId, AcousticOrigin origin, TimeWindow window, int page,
        int pageSize, CancellationToken cancellation)
    {
        var matches = Observations.Where(o => o.LocationId == locationId && o.Origin == origin.ToContract() &&
                                             o.ObservedAt >= window.From && o.ObservedAt < window.To)
            .OrderBy(o => o.ObservedAt).ThenBy(o => o.Id).ToList();
        return Task.FromResult(new Page<ObservationRow>(matches.Skip((page - 1) * pageSize).Take(pageSize).ToList(), matches.Count));
    }

    public Task<IReadOnlyList<ObservationRow>> ListObservationsTouchingAsync(Guid locationId, AcousticOrigin origin, TimeWindow window,
        CancellationToken cancellation) =>
        Task.FromResult<IReadOnlyList<ObservationRow>>(Observations.Where(o => o.LocationId == locationId &&
            o.Origin == origin.ToContract() && o.ObservedAt > window.From.AddHours(-1) && o.ObservedAt < window.To).ToList());

    public Task<IReadOnlyList<SourceRow>> ListSourcesAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellation) =>
        Task.FromResult<IReadOnlyList<SourceRow>>(Sources.Where(s => ids.Contains(s.Id)).OrderBy(s => s.Id).ToList());

    public Task<IReadOnlyList<DeviceRow>> ListDevicesAsync(CancellationToken cancellation) =>
        Task.FromResult<IReadOnlyList<DeviceRow>>(Devices.OrderBy(d => d.Name, StringComparer.Ordinal).ThenBy(d => d.Id).ToList());

    public Task<MlSummaryRow?> FindLatestMlSummaryAsync(CancellationToken cancellation) =>
        Task.FromResult(MlSummaries.OrderByDescending(s => s.CreatedAt).FirstOrDefault());

    /// <summary>Estado equivalente ao seed sintético que as fixtures públicas descrevem.</summary>
    public static InMemoryReadStore FromContractFixtures()
    {
        var store = new InMemoryReadStore();
        var web = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        store.Locations.Add(Repository.Fixture("location.json").Deserialize<LocationRow>(web)!);
        foreach (var item in Repository.Fixture("observations.json")["items"]!.AsArray())
            store.Observations.Add(Utc(item.Deserialize<ObservationRow>(web)!));
        foreach (var item in Repository.Fixture("devices.json")["items"]!.AsArray())
        {
            var device = item.Deserialize<DeviceRow>(web)!;
            store.Devices.Add(new DeviceRow
            {
                Id = device.Id, LocationId = device.LocationId, Name = device.Name, Enabled = device.Enabled,
                LastReceivedAt = device.LastReceivedAt?.ToUniversalTime()
            });
        }
        var source = Repository.Fixture("profile.json")["sources"]![0]!;
        store.Sources.Add(new SourceRow
        {
            Id = source["id"]!.GetValue<Guid>(), Name = source["name"]!.GetValue<string>(),
            SourceUrl = source["sourceUrl"]!.GetValue<string>(), SnapshotDate = DateOnly.Parse(source["snapshotDate"]!.GetValue<string>()),
            License = source["license"]!.GetValue<string>(), Origin = source["origin"]!.GetValue<string>(),
            Limitations = source["limitations"]!.ToJsonString()
        });
        return store;
    }

    private static ObservationRow Utc(ObservationRow row) => new()
    {
        Id = row.Id, SourceId = row.SourceId, LocationId = row.LocationId, DeviceId = row.DeviceId, SessionId = row.SessionId,
        ExternalId = row.ExternalId, ObservedAt = row.ObservedAt.ToUniversalTime(), ReceivedAt = row.ReceivedAt.ToUniversalTime(),
        DurationSeconds = row.DurationSeconds, LaeqDbA = row.LaeqDbA, Origin = row.Origin, Method = row.Method,
        CalibrationStatus = row.CalibrationStatus
    };
}

/// <summary>API real (rotas, middleware, DI, serialização) com banco substituído pelo repositório em memória.</summary>
public sealed class SonoraApiFactory : WebApplicationFactory<Program>
{
    public const string ConsumerKey = "test-only-consumer-key";
    public const string OperatorKey = "test-only-operator-key";
    public const string ExpiredKey = "test-only-expired-key";
    public const string RevokedKey = "test-only-revoked-key";
    public const string NoScopeKey = "test-only-no-scope-key";

    private readonly string keyFile = Path.GetTempFileName();

    public InMemoryReadStore Store { get; } = InMemoryReadStore.FromContractFixtures();

    public FixedClock Clock { get; } = new(new DateTimeOffset(2026, 11, 14, 12, 0, 0, TimeSpan.Zero));

    public SonoraApiFactory()
    {
        WriteKeys(new object[]
        {
            Entry("consumer", ConsumerKey, ["acoustics:read"]),
            Entry("operator", OperatorKey, ["acoustics:read", "operations:read"]),
            Entry("expired", ExpiredKey, ["acoustics:read"], expiresAt: "2026-01-01T00:00:00Z"),
            Entry("revoked", RevokedKey, ["acoustics:read"], revoked: true),
            Entry("no-scope", NoScopeKey, [])
        });
    }

    public void WriteKeys(object[] keys) => File.WriteAllText(keyFile, JsonSerializer.Serialize(new { keys }));

    public static object Entry(string id, string key, string[] scopes, string? expiresAt = null, bool revoked = false) => new
    {
        id,
        sha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLowerInvariant(),
        scopes,
        expiresAt,
        revoked
    };

    public HttpClient Client(string? key)
    {
        var client = CreateClient();
        if (key is not null)
            client.DefaultRequestHeaders.Add("X-Api-Key", key);
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["SONORA_KEYS_FILE"] = keyFile,
            ["ConnectionStrings:Sonora"] = "Host=127.0.0.1;Port=1;Database=absent;Username=absent;Password=absent;Timeout=1"
        }));
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IAcousticReadStore>(Store);
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        File.Delete(keyFile);
    }
}
