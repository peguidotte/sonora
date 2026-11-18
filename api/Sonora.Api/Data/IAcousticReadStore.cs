using Sonora.Api.Domain;

namespace Sonora.Api.Data;

/// <summary>
/// Porta de leitura do domínio. A implementação real usa EF Core sobre as views;
/// os testes HTTP substituem por uma implementação em memória via DI.
/// </summary>
public interface IAcousticReadStore
{
    Task<bool> IsReadyAsync(CancellationToken cancellation);

    Task<LocationRow?> FindLocationAsync(Guid id, CancellationToken cancellation);

    Task<Page<LocationRow>> ListLocationsAsync(int page, int pageSize, CancellationToken cancellation);

    Task<IReadOnlyList<LocationRow>> ListLocationsInBoxAsync(GeoBox box, CancellationToken cancellation);

    /// <summary>Observações com início em [from, to), paginadas por início e id.</summary>
    Task<Page<ObservationRow>> ListObservationsAsync(Guid locationId, AcousticOrigin origin, TimeWindow window,
        int page, int pageSize, CancellationToken cancellation);

    /// <summary>Todas as observações que podem tocar a janela, inclusive as iniciadas até 1 h antes.</summary>
    Task<IReadOnlyList<ObservationRow>> ListObservationsTouchingAsync(Guid locationId, AcousticOrigin origin, TimeWindow window,
        CancellationToken cancellation);

    Task<IReadOnlyList<SourceRow>> ListSourcesAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellation);

    Task<IReadOnlyList<DeviceRow>> ListDevicesAsync(CancellationToken cancellation);

    Task<MlSummaryRow?> FindLatestMlSummaryAsync(CancellationToken cancellation);
}
