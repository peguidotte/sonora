using System.Text.Json.Serialization;

namespace Sonora.Api.Application;

// DTOs HTTP espelhando contracts/openapi/csharp.openapi.json (JSON camelCase, instantes UTC com Z).

public sealed record HealthResponse(string Status);

public sealed record ApiError(
    string Code,
    string Message,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? TraceId = null);

public sealed record LocationResponse(
    Guid Id,
    string Name,
    string City,
    double Latitude,
    double Longitude,
    bool IsDemo,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] double? DistanceMeters = null);

public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public sealed record ObservationResponse(
    Guid Id,
    string ExternalId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? DeviceId,
    string SessionId,
    DateTime ObservedAt,
    double DurationSeconds,
    double LaeqDbA,
    Guid SourceId,
    Guid LocationId,
    string Origin,
    string Method,
    string CalibrationStatus,
    DateTime ReceivedAt);

public sealed record SourceResponse(
    Guid Id,
    string Name,
    string SourceUrl,
    DateOnly SnapshotDate,
    string License,
    string Origin,
    IReadOnlyList<string> Limitations);

public sealed record ProfileBinResponse(
    DateTime From,
    DateTime To,
    double LaeqDbA,
    int ObservationCount,
    int SessionCount,
    double ObservedSeconds,
    DateTime FirstObservedAt,
    DateTime LastObservedAt);

public sealed record ProfileSeriesResponse(string ProducerId, string Method, string CalibrationStatus, IReadOnlyList<ProfileBinResponse> Bins);

public sealed record ProfileResponse(
    Guid LocationId,
    DateTime From,
    DateTime To,
    string Timezone,
    string Origin,
    string Aggregation,
    string Status,
    double? LaeqDbA,
    IReadOnlyList<SourceResponse> Sources,
    IReadOnlyList<ProfileSeriesResponse> Series,
    IReadOnlyList<string> Limitations);

public sealed record DeviceResponse(Guid Id, Guid LocationId, string Name, bool Enabled, DateTime? LastReceivedAt, string State);

public sealed record DeviceListResponse(IReadOnlyList<DeviceResponse> Items);
