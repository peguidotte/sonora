using Microsoft.EntityFrameworkCore;
using Npgsql;
using Sonora.Api;

var builder = WebApplication.CreateBuilder(args);
if (builder.Configuration["ASPNETCORE_URLS"] is null)
    builder.WebHost.UseUrls($"http://{builder.Configuration["SONORA_HTTP_HOST"] ?? "127.0.0.1"}:{builder.Configuration["SONORA_HTTP_PORT"] ?? "8080"}");

builder.Services.AddOpenApi();
builder.Services.AddDbContext<SonoraReadContext>((services, options) =>
{
    var config = services.GetRequiredService<IConfiguration>();
    var connection = config.GetConnectionString("Sonora") ?? new NpgsqlConnectionStringBuilder
    {
        Host = config["SONORA_DB_HOST"] ?? "127.0.0.1",
        Port = int.Parse(config["SONORA_DB_PORT"] ?? "55432"),
        Database = config["SONORA_DB_NAME"] ?? "sonora",
        Username = config["SONORA_DB_USER"] ?? "sonora_query",
        Password = config["SONORA_DB_PASSWORD"],
        Timeout = 3
    }.ConnectionString;
    options.UseNpgsql(connection).UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
});

var app = builder.Build();
app.UseRouting();
app.UseMiddleware<OperationalAccess>();
const string prefix = "/api/sonora/v1";
app.MapGet(prefix + "/health/live", () => Results.Ok(new Health("ok")))
    .AllowAnonymous();
app.MapGet(prefix + "/health/ready", async (SonoraReadContext database, CancellationToken cancellation) =>
    await database.Database.CanConnectAsync(cancellation)
        ? Results.Ok(new Health("ok"))
        : Results.Json(new Health("unavailable"), statusCode: 503))
    .Produces<Health>(200).Produces<Health>(503)
    .WithMetadata(new RequiredScope("operations:read"));
app.MapOpenApi(prefix + "/openapi.json")
    .WithMetadata(new RequiredScope("operations:read"));
app.Run();

public record Health(string Status);
public partial class Program;
