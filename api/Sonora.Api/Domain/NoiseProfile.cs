namespace Sonora.Api.Domain;

public sealed record ProfileRequest(Guid LocationId, TimeWindow Window, AcousticOrigin Origin, ProfileAggregation Aggregation);

public sealed record ProfileBin(
    TimeWindow Window,
    double LaeqDbA,
    int ObservationCount,
    int SessionCount,
    double ObservedSeconds,
    DateTime FirstObservedAt,
    DateTime LastObservedAt);

public sealed record ProfileSeries(SeriesKey Key, IReadOnlyList<ProfileBin> Bins, double LaeqDbA, double ObservedSeconds);

/// <summary>Resultado do cálculo. Nível do topo só existe quando há exatamente uma série comparável.</summary>
public sealed record NoiseProfile(
    ProfileRequest Request,
    IReadOnlyList<ProfileSeries> Series,
    IReadOnlyList<Guid> SourceIds,
    IReadOnlyList<string> Limitations)
{
    public bool HasData => Series.Count > 0;

    public double? LaeqDbA => Series.Count == 1 ? Series[0].LaeqDbA : null;
}

public interface INoiseProfileCalculator
{
    NoiseProfile Calculate(ProfileRequest request, IEnumerable<AcousticSample> samples);
}
