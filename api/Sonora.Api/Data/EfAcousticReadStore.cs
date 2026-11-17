using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Sonora.Api.Domain;

namespace Sonora.Api.Data;

/// <summary>Consultas LINQ assíncronas traduzidas para SQL pelo EF Core/Npgsql.</summary>
public sealed class EfAcousticReadStore(SonoraReadContext database) : IAcousticReadStore
{
    private static readonly TimeSpan MaximumObservationDuration = TimeSpan.FromSeconds(AcousticSample.MaximumDurationSeconds);

    public async Task<bool> IsReadyAsync(CancellationToken cancellation)
    {
        try
        {
            // Pronto significa conexão aceita e views publicadas legíveis pelo papel de consulta.
            await database.Locations.AnyAsync(cancellation);
            await database.Sources.AnyAsync(cancellation);
            await database.Devices.AnyAsync(cancellation);
            await database.Observations.AnyAsync(cancellation);
            await database.MlSummaries.AnyAsync(cancellation);
            return true;
        }
        catch (Exception error) when (error is DbException or InvalidOperationException or TimeoutException)
        {
            return false;
        }
    }

    public Task<LocationRow?> FindLocationAsync(Guid id, CancellationToken cancellation) =>
        database.Locations.FirstOrDefaultAsync(location => location.Id == id, cancellation);

    public async Task<Page<LocationRow>> ListLocationsAsync(int page, int pageSize, CancellationToken cancellation)
    {
        var total = await database.Locations.CountAsync(cancellation);
        var items = await database.Locations
            .OrderBy(location => location.Name).ThenBy(location => location.Id)
            .Skip(Offset(page, pageSize)).Take(pageSize)
            .ToListAsync(cancellation);
        return new Page<LocationRow>(items, total);
    }

    public async Task<IReadOnlyList<LocationRow>> ListLocationsInBoxAsync(GeoBox box, CancellationToken cancellation)
    {
        var query = database.Locations.Where(location =>
            location.Latitude >= box.MinLatitude && location.Latitude <= box.MaxLatitude);
        if (!box.CrossesAntimeridian)
            query = query.Where(location => location.Longitude >= box.MinLongitude && location.Longitude <= box.MaxLongitude);
        return await query.ToListAsync(cancellation);
    }

    public async Task<Page<ObservationRow>> ListObservationsAsync(Guid locationId, AcousticOrigin origin, TimeWindow window,
        int page, int pageSize, CancellationToken cancellation)
    {
        var originName = origin.ToContract();
        var query = database.Observations.Where(observation =>
            observation.LocationId == locationId && observation.Origin == originName &&
            observation.ObservedAt >= window.From && observation.ObservedAt < window.To);
        var total = await query.CountAsync(cancellation);
        var items = await query
            .OrderBy(observation => observation.ObservedAt).ThenBy(observation => observation.Id)
            .Skip(Offset(page, pageSize)).Take(pageSize)
            .ToListAsync(cancellation);
        return new Page<ObservationRow>(items, total);
    }

    public async Task<IReadOnlyList<ObservationRow>> ListObservationsTouchingAsync(Guid locationId, AcousticOrigin origin,
        TimeWindow window, CancellationToken cancellation)
    {
        var originName = origin.ToContract();
        var earliestStart = window.From - MaximumObservationDuration;
        return await database.Observations
            .Where(observation => observation.LocationId == locationId && observation.Origin == originName &&
                                  observation.ObservedAt > earliestStart && observation.ObservedAt < window.To)
            .OrderBy(observation => observation.ObservedAt)
            .ToListAsync(cancellation);
    }

    public async Task<IReadOnlyList<SourceRow>> ListSourcesAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellation) =>
        ids.Count == 0
            ? []
            : await database.Sources.Where(source => ids.Contains(source.Id)).OrderBy(source => source.Id).ToListAsync(cancellation);

    public async Task<IReadOnlyList<DeviceRow>> ListDevicesAsync(CancellationToken cancellation) =>
        await database.Devices.OrderBy(device => device.Name).ThenBy(device => device.Id).ToListAsync(cancellation);

    public Task<MlSummaryRow?> FindLatestMlSummaryAsync(CancellationToken cancellation) =>
        database.MlSummaries.OrderByDescending(summary => summary.CreatedAt).FirstOrDefaultAsync(cancellation);

    private static int Offset(int page, int pageSize) =>
        (int)Math.Min(int.MaxValue, ((long)page - 1) * pageSize);
}
