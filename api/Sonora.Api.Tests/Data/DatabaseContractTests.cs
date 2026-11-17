using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Sonora.Api.Data;
using Sonora.Api.Domain;
using Sonora.Api.Tests.Support;
using Xunit;

namespace Sonora.Api.Tests.Data;

/// <summary>O modelo EF precisa ler exatamente as views e colunas publicadas em contracts/database.json.</summary>
public sealed class DatabaseContractTests
{
    private static SonoraReadContext Context() => new(new DbContextOptionsBuilder<SonoraReadContext>()
        .UseNpgsql("Host=127.0.0.1;Database=unused").Options);

    [Fact]
    public void EveryReadViewIsMappedWithTheContractColumns()
    {
        using var context = Context();
        var contract = Repository.Contract("database.json");
        var schema = contract["readSchema"]!.GetValue<string>();
        foreach (var (view, definition) in contract["readViews"]!.AsObject())
        {
            var entity = context.Model.GetEntityTypes().SingleOrDefault(type => type.GetViewName() == view);
            Assert.True(entity is not null, $"View {view} is not mapped.");
            Assert.Equal(schema, entity.GetViewSchema());
            var expected = definition!["columns"]!.AsArray().Select(column => column!["name"]!.GetValue<string>()).Order().ToList();
            var mapped = entity.GetProperties().Select(property => property.GetColumnName()).Order().ToList();
            Assert.Equal(expected, mapped);
            foreach (var column in definition["columns"]!.AsArray())
            {
                var property = entity.GetProperties().Single(p => p.GetColumnName() == column!["name"]!.GetValue<string>());
                Assert.Equal(column!["nullable"]!.GetValue<bool>(), property.IsNullable);
            }
        }
    }

    [Fact]
    public void QueriesTargetOnlyThePublishedReadSchema()
    {
        using var context = Context();
        var window = new TimeWindow(new DateTime(2026, 11, 8, 15, 0, 0, DateTimeKind.Utc), new DateTime(2026, 11, 8, 16, 0, 0, DateTimeKind.Utc));
        var sql = context.Observations
            .Where(o => o.LocationId == Guid.Empty && o.Origin == "simulated" && o.ObservedAt >= window.From && o.ObservedAt < window.To)
            .OrderBy(o => o.ObservedAt).Skip(20).Take(20).ToQueryString();
        Assert.Contains("sonora_read.observations", sql);
        Assert.Contains("laeq_db_a", sql);
        Assert.Contains("LIMIT", sql);
        Assert.DoesNotContain("sonora.observations", sql.Replace("sonora_read.", ""));
    }

    [Fact]
    public async Task ContextRefusesToWrite()
    {
        await using var context = Context();
        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
    }
}

/// <summary>Executa somente com SONORA_DB_INTEGRATION=1; caso contrário aparece como pulado, nunca como aprovado.</summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("SONORA_DB_INTEGRATION") != "1")
            Skip = "Set SONORA_DB_INTEGRATION=1 and SONORA_DB_* (sonora_query) after applying database/ migrations and seed.";
    }
}

/// <summary>Leitura real pelo papel sonora_query nas views publicadas pelo módulo database/.</summary>
public sealed class PostgresIntegrationTests
{
    private static string ConnectionString() => new NpgsqlConnectionStringBuilder
    {
        Host = Environment.GetEnvironmentVariable("SONORA_DB_HOST") ?? "127.0.0.1",
        Port = int.Parse(Environment.GetEnvironmentVariable("SONORA_DB_PORT") ?? "55432"),
        Database = Environment.GetEnvironmentVariable("SONORA_DB_NAME") ?? "sonora",
        Username = Environment.GetEnvironmentVariable("SONORA_DB_USER") ?? "sonora_query",
        Password = Environment.GetEnvironmentVariable("SONORA_DB_PASSWORD"),
        Timeout = 5
    }.ConnectionString;

    private static SonoraReadContext Context() => new(new DbContextOptionsBuilder<SonoraReadContext>()
        .UseNpgsql(ConnectionString()).UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking).Options);

    [PostgresFact]
    public async Task StoreReadsPublishedViewsWithContractSemantics()
    {
        await using var context = Context();
        var store = new EfAcousticReadStore(context);
        Assert.True(await store.IsReadyAsync(CancellationToken.None));

        var page = await store.ListLocationsAsync(1, 100, CancellationToken.None);
        Assert.Equal(page.Total, await context.Locations.CountAsync());
        Assert.NotEmpty(page.Items);
        Assert.Equal(page.Items.OrderBy(l => l.Name, StringComparer.Ordinal).ThenBy(l => l.Id).Select(l => l.Id),
            page.Items.Select(l => l.Id));

        foreach (var observation in await context.Observations.Take(500).ToListAsync())
        {
            Assert.Equal(DateTimeKind.Utc, observation.ObservedAt.Kind);
            Assert.InRange(observation.LaeqDbA, 0, 140);
            Assert.Contains(observation.Origin, new[] { "simulated", "public_dataset" });
            _ = Application.AcousticQueryService.ToSample(observation); // valida invariantes de domínio
        }

        foreach (var source in await context.Sources.ToListAsync())
            Assert.NotNull(System.Text.Json.JsonSerializer.Deserialize<string[]>(source.Limitations));
        await store.ListDevicesAsync(CancellationToken.None);
        await store.FindLatestMlSummaryAsync(CancellationToken.None);
    }

    [PostgresFact]
    public async Task QueryRoleCannotWriteOrChangeSchema()
    {
        await using var connection = new NpgsqlConnection(ConnectionString());
        await connection.OpenAsync();
        foreach (var sql in new[]
                 {
                     "INSERT INTO sonora.locations (id) VALUES (gen_random_uuid())",
                     "DELETE FROM sonora.observations",
                     "CREATE TABLE sonora_read.intrusion (id int)",
                     "CREATE TABLE public.intrusion (id int)"
                 })
        {
            await using var command = new NpgsqlCommand(sql, connection);
            var error = await Assert.ThrowsAnyAsync<DbException>(() => command.ExecuteNonQueryAsync());
            Assert.Equal("42501", (error as PostgresException)?.SqlState); // insufficient_privilege
        }
    }
}
