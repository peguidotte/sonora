using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Npgsql;
using Sonora.Api;
using Sonora.Api.Application;
using Sonora.Api.Data;
using Sonora.Api.Domain;
using Sonora.Api.Http;
using Sonora.Api.Security;

var builder = WebApplication.CreateBuilder(args);
if (builder.Configuration["ASPNETCORE_URLS"] is null)
    builder.WebHost.UseUrls($"http://{builder.Configuration["SONORA_HTTP_HOST"] ?? "127.0.0.1"}:{builder.Configuration["SONORA_HTTP_PORT"] ?? "8080"}");

// Persistência: PostgreSQL compartilhado, papel sonora_query (somente SELECT nas views sonora_read).
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
        Timeout = 3,
        CommandTimeout = 10
    }.ConnectionString;
    options.UseNpgsql(connection).UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
});
builder.Services.AddScoped<IAcousticReadStore, EfAcousticReadStore>();

// Domínio: regras acústicas sem dependência de infraestrutura.
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(_ => CalendarBinning.SaoPaulo());
builder.Services.AddSingleton<IBinningStrategy, HourlyBinning>();
builder.Services.AddSingleton<IBinningStrategy, DailyBinning>();
builder.Services.AddSingleton<INoiseProfileCalculator, NoiseProfileCalculator>();
builder.Services.AddSingleton<IDeviceStatePolicy>(services => new DeviceStatePolicy(
    services.GetRequiredService<TimeProvider>(),
    TimeSpan.FromSeconds(int.TryParse(builder.Configuration["SONORA_DEVICE_STALE_SECONDS"], out var seconds) && seconds > 0
        ? seconds
        : (int)DeviceStatePolicy.DefaultStaleAfter.TotalSeconds)));

// Aplicação e segurança.
builder.Services.AddScoped<IAcousticQueryService, AcousticQueryService>();
builder.Services.AddSingleton<IApiKeyStore, FileApiKeyStore>();

builder.Services.AddOpenApi(options => options.AddOperationTransformer((operation, context, _) =>
{
    // Rotas anônimas (liveness e shells do painel) sobrescrevem a exigência global com "security": [], como no contrato.
    if (context.Description.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any())
        operation.Security = [];
    return Task.CompletedTask;
}).AddDocumentTransformer((document, _, _) =>
{
    document.Info = new OpenApiInfo
    {
        Title = "Sonora | Query API",
        Version = "0.4.0",
        Description = "Private acoustic query API. Reads published PostgreSQL views with a read-only role. " +
                      "Send X-Api-Key; acoustics:read for queries and operations:read for operations."
    };
    document.Components ??= new OpenApiComponents();
    document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
    document.Components.SecuritySchemes["ApiKeyAuth"] = new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = ApiKeyMiddleware.HeaderName,
        Description = "Service-specific key. Missing/invalid/expired/revoked: 401. Missing scope: 403."
    };
    document.Security = [new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("ApiKeyAuth", document)] = [] }];
    return Task.CompletedTask;
}));

var app = builder.Build();

// Falhas inesperadas viram respostas sanitizadas: sem stack trace, SQL ou dados de conexão.
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var databaseDown = error is DbException or TimeoutException || error?.InnerException is DbException or TimeoutException;
    context.Response.StatusCode = databaseDown ? StatusCodes.Status503ServiceUnavailable : StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(databaseDown
        ? new ApiError("service_unavailable", "The database is unavailable.", context.TraceIdentifier)
        : new ApiError("internal_error", "Unexpected error.", context.TraceIdentifier));
}));
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers.CacheControl = "no-store";
    await next(context);
});
app.UseRouting();
app.UseMiddleware<ApiKeyMiddleware>();

app.MapSonoraApi();
app.MapOpenApi(SonoraEndpoints.Prefix + "/openapi.json")
    .WithMetadata(new RequiredScope(RequiredScope.OperationsRead));
app.MapDashboard();

app.Run();

public partial class Program;
