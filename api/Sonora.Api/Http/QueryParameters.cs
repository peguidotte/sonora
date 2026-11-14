using System.ComponentModel;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Sonora.Api.Application;
using Sonora.Api.Domain;

namespace Sonora.Api.Http;

// Parâmetros chegam como texto para que toda validação devolva o Error do contrato (e não um 400 genérico do framework).
// As descrições aparecem na documentação automática.

public sealed record PageQuery(
    [property: FromQuery(Name = "page"), Description("Page number, starting at 1. Default 1.")] string? Page,
    [property: FromQuery(Name = "pageSize"), Description("Items per page, 1–100. Default 20.")] string? PageSize);

public sealed record LocationQuery(
    [property: FromQuery(Name = "page"), Description("Page number, starting at 1. Default 1.")] string? Page,
    [property: FromQuery(Name = "pageSize"), Description("Items per page, 1–100. Default 20.")] string? PageSize,
    [property: FromQuery(Name = "latitude"), Description("WGS84 latitude; must be sent together with longitude.")] string? Latitude,
    [property: FromQuery(Name = "longitude"), Description("WGS84 longitude; must be sent together with latitude.")] string? Longitude,
    [property: FromQuery(Name = "radiusMeters"), Description("Search radius in meters, 1–1000. Default 500. Finds registered locations; not acoustic coverage.")] string? RadiusMeters);

public sealed record WindowQuery(
    [property: FromQuery(Name = "from"), Description("Inclusive UTC timestamp ending in Z.")] string? From,
    [property: FromQuery(Name = "to"), Description("Exclusive UTC timestamp ending in Z; after from; maximum period 31 days.")] string? To,
    [property: FromQuery(Name = "origin"), Description("simulated or public_dataset. Origins are never mixed.")] string? Origin);

public sealed record ProfileQuery(
    [property: FromQuery(Name = "from"), Description("Inclusive UTC timestamp ending in Z.")] string? From,
    [property: FromQuery(Name = "to"), Description("Exclusive UTC timestamp ending in Z; after from; maximum period 31 days.")] string? To,
    [property: FromQuery(Name = "origin"), Description("simulated or public_dataset. Origins are never mixed.")] string? Origin,
    [property: FromQuery(Name = "aggregation"), Description("hour or day, in America/Sao_Paulo. Default hour.")] string? Aggregation);

/// <summary>Converte texto em valores de domínio; o primeiro erro encontrado vira resposta 400.</summary>
public sealed class QueryParser
{
    public const int DefaultPageSize = 20;
    public const int MaximumPageSize = 100;
    public const int DefaultRadiusMeters = 500;
    public const int MaximumRadiusMeters = 1000;

    public ApiError? Error { get; private set; }

    public bool IsValid => Error is null;

    public Guid Id(string name, string? value)
    {
        if (Guid.TryParseExact(value, "D", out var id))
            return id;
        return Fail<Guid>("invalid_parameter", $"Parameter {name} must be a UUID.");
    }

    public int Integer(string name, string? value, int fallback, int minimum, int maximum)
    {
        if (value is null)
            return fallback;
        if (int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var number) && number >= minimum && number <= maximum)
            return number;
        return Fail<int>("invalid_parameter", $"Parameter {name} must be an integer between {minimum} and {maximum}.");
    }

    public (int Page, int PageSize) Paging(string? page, string? pageSize) =>
        (Integer("page", page, 1, 1, int.MaxValue), Integer("pageSize", pageSize, DefaultPageSize, 1, MaximumPageSize));

    public GeoPoint? Center(string? latitude, string? longitude)
    {
        if (latitude is null && longitude is null)
            return null;
        if (latitude is null || longitude is null)
            return Fail<GeoPoint?>("invalid_coordinates", "Latitude and longitude must be provided together.");
        if (Number(latitude) is { } lat and >= -90 and <= 90 && Number(longitude) is { } lon and >= -180 and <= 180)
            return new GeoPoint(lat, lon);
        return Fail<GeoPoint?>("invalid_coordinates", "Latitude must be between -90 and 90 and longitude between -180 and 180.");
    }

    public TimeWindow Window(string? from, string? to)
    {
        var start = Instant("from", from);
        var end = Instant("to", to);
        if (!IsValid)
            return default;
        if (end <= start || end - start > TimeWindow.MaximumQueryPeriod)
            return Fail<TimeWindow>("invalid_window", "Parameter to must be after from and the period at most 31 days.");
        return new TimeWindow(start, end);
    }

    public AcousticOrigin Origin(string? value)
    {
        if (value is null)
            return Fail<AcousticOrigin>("missing_parameter", "Missing required parameter: origin");
        return ContractNames.TryParseOrigin(value, out var origin)
            ? origin
            : Fail<AcousticOrigin>("invalid_parameter", "Parameter origin must be simulated or public_dataset.");
    }

    public ProfileAggregation Aggregation(string? value)
    {
        if (value is null)
            return ProfileAggregation.Hour;
        return ContractNames.TryParseAggregation(value, out var aggregation)
            ? aggregation
            : Fail<ProfileAggregation>("invalid_parameter", "Parameter aggregation must be hour or day.");
    }

    private DateTime Instant(string name, string? value)
    {
        if (value is null)
            return Fail<DateTime>("missing_parameter", $"Missing required parameter: {name}");
        string[] formats = ["yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'"];
        if (DateTime.TryParseExact(value, formats, CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var instant))
            return DateTime.SpecifyKind(instant, DateTimeKind.Utc);
        return Fail<DateTime>("invalid_parameter", $"Parameter {name} must be a UTC ISO 8601 timestamp ending in Z.");
    }

    private static double? Number(string value) =>
        double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number) ? number : null;

    private T Fail<T>(string code, string message)
    {
        Error ??= new ApiError(code, message);
        return default!;
    }
}
