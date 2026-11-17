namespace Sonora.Api.Domain;

/// <summary>
/// Procedência que separa séries: mesmo produtor, método e calibração.
/// Séries diferentes nunca são combinadas num único nível.
/// </summary>
public sealed record SeriesKey(string ProducerId, string Method, string CalibrationStatus);

/// <summary>Uma observação acústica já persistida, com início em ObservedAt e duração em segundos.</summary>
public sealed record AcousticSample
{
    public const double MinimumLevel = 0;
    public const double MaximumLevel = 140;
    public const double MaximumDurationSeconds = 3600;

    public AcousticSample(DateTime observedAt, double durationSeconds, double laeqDbA, string sessionId, Guid sourceId, SeriesKey series)
    {
        if (observedAt.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Observation instants must be UTC.", nameof(observedAt));
        if (!double.IsFinite(durationSeconds) || durationSeconds is <= 0 or > MaximumDurationSeconds)
            throw new ArgumentOutOfRangeException(nameof(durationSeconds));
        if (!double.IsFinite(laeqDbA) || laeqDbA is < MinimumLevel or > MaximumLevel)
            throw new ArgumentOutOfRangeException(nameof(laeqDbA));
        ArgumentException.ThrowIfNullOrWhiteSpace(sessionId);
        ArgumentNullException.ThrowIfNull(series);
        ObservedAt = observedAt;
        DurationSeconds = durationSeconds;
        LaeqDbA = laeqDbA;
        SessionId = sessionId;
        SourceId = sourceId;
        Series = series;
    }

    public DateTime ObservedAt { get; }
    public double DurationSeconds { get; }
    public double LaeqDbA { get; }
    public string SessionId { get; }
    public Guid SourceId { get; }
    public SeriesKey Series { get; }

    public TimeWindow Interval => TimeWindow.StartingAt(ObservedAt, DurationSeconds);
}
