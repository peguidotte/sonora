using Sonora.Api.Application;
using Sonora.Api.Data;
using Sonora.Api.Domain;
using Sonora.Api.Security;

namespace Sonora.Api.Http;

/// <summary>Rotas de /api/sonora/v1 conforme contracts/openapi/csharp.openapi.json. Somente GET.</summary>
public static class SonoraEndpoints
{
    public const string Prefix = "/api/sonora/v1";

    public static IEndpointRouteBuilder MapSonoraApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup(Prefix);

        api.MapGet("/health/live", () => TypedResults.Ok(new HealthResponse("ok")))
            .WithName("healthLive").WithSummary("Check process liveness").WithTags("Operations")
            .AllowAnonymous();

        api.MapGet("/health/ready", async (IAcousticReadStore store, CancellationToken cancellation) =>
                await store.IsReadyAsync(cancellation)
                    ? Results.Ok(new HealthResponse("ok"))
                    : Results.Json(new HealthResponse("unavailable"), statusCode: StatusCodes.Status503ServiceUnavailable))
            .WithName("healthReady").WithSummary("Check database and published views").WithTags("Operations")
            .Produces<HealthResponse>().Produces<HealthResponse>(StatusCodes.Status503ServiceUnavailable)
            .ProducesAuthErrors().WithMetadata(new RequiredScope(RequiredScope.OperationsRead));

        api.MapGet("/locations", ListLocations)
            .WithName("listLocations").WithSummary("List registered locations, optionally near a coordinate").WithTags("Locations")
            .Produces<PageResponse<LocationResponse>>().ProducesValidationError().ProducesAuthErrors()
            .WithMetadata(new RequiredScope(RequiredScope.AcousticsRead));

        api.MapGet("/locations/{locationId}", GetLocation)
            .WithName("getLocation").WithSummary("Get one location").WithTags("Locations")
            .Produces<LocationResponse>().ProducesValidationError().ProducesNotFound().ProducesAuthErrors()
            .WithMetadata(new RequiredScope(RequiredScope.AcousticsRead));

        api.MapGet("/locations/{locationId}/noise-profile", GetProfile)
            .WithName("getProfile").WithSummary("Energy-averaged acoustic profile by local hour or day").WithTags("Acoustics")
            .Produces<ProfileResponse>().ProducesValidationError().ProducesNotFound().ProducesAuthErrors()
            .WithMetadata(new RequiredScope(RequiredScope.AcousticsRead));

        api.MapGet("/locations/{locationId}/observations", ListObservations)
            .WithName("listObservations").WithSummary("List persisted observations of one origin").WithTags("Acoustics")
            .Produces<PageResponse<ObservationResponse>>().ProducesValidationError().ProducesNotFound().ProducesAuthErrors()
            .WithMetadata(new RequiredScope(RequiredScope.AcousticsRead));

        api.MapGet("/devices", async (IAcousticQueryService service, CancellationToken cancellation) =>
                TypedResults.Ok(await service.ListDevicesAsync(cancellation)))
            .WithName("listDevices").WithSummary("List devices with state computed from the last IoT reception").WithTags("Operations")
            .ProducesAuthErrors().WithMetadata(new RequiredScope(RequiredScope.OperationsRead));

        api.MapGet("/analytics/summary", async (IAcousticQueryService service, CancellationToken cancellation) =>
                await service.GetLatestMlSummaryAsync(cancellation) is { } payload
                    ? Results.Text(payload, "application/json")
                    : Results.NoContent())
            .WithName("getMlSummary").WithSummary("Latest imported ML summary; 204 when no real artifact exists").WithTags("Analytics")
            .Produces(StatusCodes.Status200OK, contentType: "application/json").Produces(StatusCodes.Status204NoContent)
            .ProducesAuthErrors().WithMetadata(new RequiredScope(RequiredScope.AcousticsRead));

        return app;
    }

    private static async Task<IResult> ListLocations([AsParameters] LocationQuery query, IAcousticQueryService service,
        CancellationToken cancellation)
    {
        var parser = new QueryParser();
        var (page, pageSize) = parser.Paging(query.Page, query.PageSize);
        var center = parser.Center(query.Latitude, query.Longitude);
        var radius = parser.Integer("radiusMeters", query.RadiusMeters, QueryParser.DefaultRadiusMeters, 1, QueryParser.MaximumRadiusMeters);
        if (parser.IsValid && center is null && query.RadiusMeters is not null)
            return BadRequest(new ApiError("invalid_coordinates", "radiusMeters requires latitude and longitude."));
        if (!parser.IsValid)
            return BadRequest(parser.Error!);
        return TypedResults.Ok(await service.ListLocationsAsync(new LocationSearch(page, pageSize, center, radius), cancellation));
    }

    private static async Task<IResult> GetLocation(string locationId, IAcousticQueryService service, CancellationToken cancellation)
    {
        var parser = new QueryParser();
        var id = parser.Id("locationId", locationId);
        if (!parser.IsValid)
            return BadRequest(parser.Error!);
        return await service.GetLocationAsync(id, cancellation) is { } location ? TypedResults.Ok(location) : LocationNotFound();
    }

    private static async Task<IResult> GetProfile(string locationId, [AsParameters] ProfileQuery query,
        IAcousticQueryService service, CancellationToken cancellation)
    {
        var parser = new QueryParser();
        var id = parser.Id("locationId", locationId);
        var window = parser.Window(query.From, query.To);
        var origin = parser.Origin(query.Origin);
        var aggregation = parser.Aggregation(query.Aggregation);
        if (!parser.IsValid)
            return BadRequest(parser.Error!);
        var profile = await service.GetProfileAsync(new ProfileRequest(id, window, origin, aggregation), cancellation);
        return profile is null ? LocationNotFound() : TypedResults.Ok(profile);
    }

    private static async Task<IResult> ListObservations(string locationId, [AsParameters] WindowQuery window,
        [AsParameters] PageQuery paging, IAcousticQueryService service, CancellationToken cancellation)
    {
        var parser = new QueryParser();
        var id = parser.Id("locationId", locationId);
        var period = parser.Window(window.From, window.To);
        var origin = parser.Origin(window.Origin);
        var (page, pageSize) = parser.Paging(paging.Page, paging.PageSize);
        if (!parser.IsValid)
            return BadRequest(parser.Error!);
        var result = await service.ListObservationsAsync(new ObservationSearch(id, origin, period, page, pageSize), cancellation);
        return result is null ? LocationNotFound() : TypedResults.Ok(result);
    }

    private static IResult BadRequest(ApiError error) => TypedResults.BadRequest(error);

    private static IResult LocationNotFound() =>
        TypedResults.NotFound(new ApiError("not_found", "Location not found."));

    private static RouteHandlerBuilder ProducesAuthErrors(this RouteHandlerBuilder builder) =>
        builder.Produces<ApiError>(StatusCodes.Status401Unauthorized).Produces<ApiError>(StatusCodes.Status403Forbidden);

    private static RouteHandlerBuilder ProducesValidationError(this RouteHandlerBuilder builder) =>
        builder.Produces<ApiError>(StatusCodes.Status400BadRequest);

    private static RouteHandlerBuilder ProducesNotFound(this RouteHandlerBuilder builder) =>
        builder.Produces<ApiError>(StatusCodes.Status404NotFound);
}
