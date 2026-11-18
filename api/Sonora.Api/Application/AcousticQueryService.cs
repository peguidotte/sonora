using System.Text.Json;
using Sonora.Api.Data;
using Sonora.Api.Domain;

namespace Sonora.Api.Application;

public sealed record LocationSearch(int Page, int PageSize, GeoPoint? Center, int RadiusMeters);

public sealed record ObservationSearch(Guid LocationId, AcousticOrigin Origin, TimeWindow Window, int Page, int PageSize);

public interface IAcousticQueryService
{
    Task<PageResponse<LocationResponse>> ListLocationsAsync(LocationSearch search, CancellationToken cancellation);

    Task<LocationResponse?> GetLocationAsync(Guid locationId, CancellationToken cancellation);

    /// <summary>Null quando o local não existe; perfil no_data quando existe mas não há observações.</summary>
    Task<ProfileResponse?> GetProfileAsync(ProfileRequest request, CancellationToken cancellation);

    Task<PageResponse<ObservationResponse>?> ListObservationsAsync(ObservationSearch search, CancellationToken cancellation);

    Task<DeviceListResponse> ListDevicesAsync(CancellationToken cancellation);

    /// <summary>Documento JSON do resumo ML mais recente, ou null quando nenhum artefato real foi importado.</summary>
    Task<string?> GetLatestMlSummaryAsync(CancellationToken cancellation);
}

/// <summary>
/// Casos de uso da API: combina o repositório de leitura com as regras de domínio e projeta DTOs do contrato.
/// Não contém SQL nem detalhes HTTP.
/// </summary>
public sealed class AcousticQueryService(
    IAcousticReadStore store,
    INoiseProfileCalculator calculator,
    IDeviceStatePolicy deviceStates) : IAcousticQueryService
{
    public async Task<PageResponse<LocationResponse>> ListLocationsAsync(LocationSearch search, CancellationToken cancellation)
    {
        if (search.Center is not { } center)
        {
            var page = await store.ListLocationsAsync(search.Page, search.PageSize, cancellation);
            return new PageResponse<LocationResponse>(page.Items.Select(row => ToResponse(row)).ToList(),
                search.Page, search.PageSize, page.Total);
        }

        // Pré-filtro retangular no banco; raio exato e ordenação por distância em memória.
        var candidates = await store.ListLocationsInBoxAsync(center.BoundingBox(search.RadiusMeters), cancellation);
        var nearby = candidates
            .Select(row => (Row: row, Distance: center.DistanceMetersTo(new GeoPoint(row.Latitude, row.Longitude))))
            .Where(candidate => candidate.Distance <= search.RadiusMeters)
            .OrderBy(candidate => candidate.Distance).ThenBy(candidate => candidate.Row.Id)
            .ToList();
        var items = nearby
            .Skip((int)Math.Min(int.MaxValue, ((long)search.Page - 1) * search.PageSize)).Take(search.PageSize)
            .Select(candidate => ToResponse(candidate.Row, Math.Round(candidate.Distance, 1)))
            .ToList();
        return new PageResponse<LocationResponse>(items, search.Page, search.PageSize, nearby.Count);
    }

    public async Task<LocationResponse?> GetLocationAsync(Guid locationId, CancellationToken cancellation) =>
        await store.FindLocationAsync(locationId, cancellation) is { } row ? ToResponse(row) : null;

    public async Task<ProfileResponse?> GetProfileAsync(ProfileRequest request, CancellationToken cancellation)
    {
        if (await store.FindLocationAsync(request.LocationId, cancellation) is null)
            return null;
        var rows = await store.ListObservationsTouchingAsync(request.LocationId, request.Origin, request.Window, cancellation);
        var profile = calculator.Calculate(request, rows.Select(ToSample));
        var sources = await store.ListSourcesAsync(profile.SourceIds, cancellation);
        return ToResponse(profile, sources);
    }

    public async Task<PageResponse<ObservationResponse>?> ListObservationsAsync(ObservationSearch search, CancellationToken cancellation)
    {
        if (await store.FindLocationAsync(search.LocationId, cancellation) is null)
            return null;
        var page = await store.ListObservationsAsync(search.LocationId, search.Origin, search.Window,
            search.Page, search.PageSize, cancellation);
        var items = page.Items.Select(row => new ObservationResponse(row.Id, row.ExternalId, row.DeviceId, row.SessionId,
            row.ObservedAt, row.DurationSeconds, row.LaeqDbA, row.SourceId, row.LocationId, row.Origin, row.Method,
            row.CalibrationStatus, row.ReceivedAt)).ToList();
        return new PageResponse<ObservationResponse>(items, search.Page, search.PageSize, page.Total);
    }

    public async Task<DeviceListResponse> ListDevicesAsync(CancellationToken cancellation)
    {
        var devices = await store.ListDevicesAsync(cancellation);
        return new DeviceListResponse(devices.Select(device => new DeviceResponse(device.Id, device.LocationId, device.Name,
            device.Enabled, device.LastReceivedAt, deviceStates.Evaluate(device.LastReceivedAt).ToContract())).ToList());
    }

    public async Task<string?> GetLatestMlSummaryAsync(CancellationToken cancellation) =>
        (await store.FindLatestMlSummaryAsync(cancellation))?.Payload;

    /// <summary>
    /// Produtor da série: o dispositivo quando existe (IoT); senão a sessão de coleta (ex.: uma trilha NoiseCapture),
    /// para que celulares simultâneos não sejam fundidos numa única média.
    /// </summary>
    public static AcousticSample ToSample(ObservationRow row) =>
        new(row.ObservedAt, row.DurationSeconds, row.LaeqDbA, row.SessionId, row.SourceId,
            new SeriesKey(row.DeviceId?.ToString() ?? row.SessionId, row.Method, row.CalibrationStatus));

    private static LocationResponse ToResponse(LocationRow row, double? distance = null) =>
        new(row.Id, row.Name, row.City, row.Latitude, row.Longitude, row.IsDemo, distance);

    private static ProfileResponse ToResponse(NoiseProfile profile, IReadOnlyList<SourceRow> sources)
    {
        var request = profile.Request;
        var series = profile.Series.Select(item => new ProfileSeriesResponse(item.Key.ProducerId, item.Key.Method,
            item.Key.CalibrationStatus, item.Bins.Select(bin => new ProfileBinResponse(bin.Window.From, bin.Window.To,
                bin.LaeqDbA, bin.ObservationCount, bin.SessionCount, bin.ObservedSeconds, bin.FirstObservedAt,
                bin.LastObservedAt)).ToList())).ToList();
        var sourceResponses = sources.Select(source => new SourceResponse(source.Id, source.Name, source.SourceUrl,
            source.SnapshotDate, source.License, source.Origin,
            JsonSerializer.Deserialize<string[]>(source.Limitations) ?? [])).ToList();
        return new ProfileResponse(request.LocationId, request.Window.From, request.Window.To, CalendarBinning.TimeZoneId,
            request.Origin.ToContract(), request.Aggregation.ToContract(), profile.HasData ? "available" : "no_data",
            profile.LaeqDbA, sourceResponses, series, profile.Limitations);
    }
}
