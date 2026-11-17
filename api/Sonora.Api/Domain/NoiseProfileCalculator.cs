using System.Globalization;

namespace Sonora.Api.Domain;

/// <summary>
/// Calcula o perfil acústico de um local:
/// 1. separa as amostras por série (produtor + método + calibração), sem misturar procedências;
/// 2. recorta cada observação à janela pedida e ao trecho ainda não coberto pela mesma série,
///    para que sobreposição não conte como tempo adicional;
/// 3. fatia o trecho nos limites dos bins locais, preservando a duração de cada pedaço;
/// 4. agrega por média energética ponderada pela duração.
/// </summary>
public sealed class NoiseProfileCalculator : INoiseProfileCalculator
{
    private readonly IReadOnlyDictionary<ProfileAggregation, IBinningStrategy> strategies;

    public NoiseProfileCalculator(IEnumerable<IBinningStrategy> strategies)
    {
        this.strategies = strategies.ToDictionary(strategy => strategy.Aggregation);
    }

    public NoiseProfile Calculate(ProfileRequest request, IEnumerable<AcousticSample> samples)
    {
        if (!strategies.TryGetValue(request.Aggregation, out var binning))
            throw new InvalidOperationException($"No binning strategy registered for {request.Aggregation}.");

        var series = samples
            .GroupBy(sample => sample.Series)
            .OrderBy(group => group.Key.ProducerId, StringComparer.Ordinal)
            .ThenBy(group => group.Key.Method, StringComparer.Ordinal)
            .ThenBy(group => group.Key.CalibrationStatus, StringComparer.Ordinal)
            .Select(group => BuildSeries(group.Key, group, request.Window, binning))
            .OfType<SeriesResult>()
            .ToList();

        var sourceIds = series.SelectMany(result => result.SourceIds).Distinct().Order().ToList();
        var profileSeries = series.Select(result => result.Series).ToList();
        return new NoiseProfile(request, profileSeries, sourceIds, Limitations(request, profileSeries));
    }

    private static SeriesResult? BuildSeries(SeriesKey key, IEnumerable<AcousticSample> samples, TimeWindow window, IBinningStrategy binning)
    {
        var bins = new SortedDictionary<DateTime, BinAccumulator>();
        var total = new EnergyAverage();
        var sources = new HashSet<Guid>();
        var coveredUntil = DateTime.MinValue;

        foreach (var sample in samples.OrderBy(s => s.ObservedAt).ThenByDescending(s => s.DurationSeconds))
        {
            if (sample.Interval.Intersect(window) is not { } visible || visible.To <= coveredUntil)
                continue;
            var start = visible.From > coveredUntil ? visible.From : coveredUntil;
            coveredUntil = visible.To;
            sources.Add(sample.SourceId);

            while (start < visible.To)
            {
                var calendarBin = binning.BinContaining(start);
                var end = calendarBin.To < visible.To ? calendarBin.To : visible.To;
                var seconds = (end - start).TotalSeconds;
                if (!bins.TryGetValue(calendarBin.From, out var bin))
                    bins[calendarBin.From] = bin = new BinAccumulator(calendarBin.Intersect(window)!.Value);
                bin.Add(sample, start, seconds);
                total.Add(sample.LaeqDbA, seconds);
                start = end;
            }
        }

        if (total.Level is not { } level)
            return null;
        var result = new ProfileSeries(key, bins.Values.Select(bin => bin.ToBin()).ToList(), level, total.Seconds);
        return new SeriesResult(result, sources);
    }

    private static List<string> Limitations(ProfileRequest request, IReadOnlyList<ProfileSeries> series)
    {
        var limitations = new List<string>();
        if (series.Count == 0)
        {
            limitations.Add("No observations in the requested period.");
            return limitations;
        }
        if (series.Count > 1)
            limitations.Add("Multiple producers or methods are reported as separate series; no combined level is given.");
        else if (series[0].ObservedSeconds < request.Window.Seconds)
        {
            var unit = request.Aggregation == ProfileAggregation.Hour ? TimeSpan.FromHours(1) : TimeSpan.FromDays(1);
            var period = request.Window.Duration <= unit ? $"the entire {request.Aggregation.ToContract()}" : "the entire requested period";
            var seconds = series[0].ObservedSeconds.ToString("0.##", CultureInfo.InvariantCulture);
            limitations.Add($"Only {seconds} seconds observed; this does not represent {period}.");
        }
        if (request.Origin == AcousticOrigin.Simulated)
            limitations.Add("Synthetic values.");
        return limitations;
    }

    private sealed record SeriesResult(ProfileSeries Series, IReadOnlyCollection<Guid> SourceIds);

    private sealed class BinAccumulator(TimeWindow window)
    {
        private readonly EnergyAverage energy = new();
        private readonly HashSet<string> sessions = new(StringComparer.Ordinal);
        private int observations;
        private DateTime first = DateTime.MaxValue;
        private DateTime last = DateTime.MinValue;

        public void Add(AcousticSample sample, DateTime portionStart, double seconds)
        {
            energy.Add(sample.LaeqDbA, seconds);
            sessions.Add(sample.SessionId);
            observations++;
            if (portionStart < first) first = portionStart;
            if (portionStart > last) last = portionStart;
        }

        public ProfileBin ToBin() =>
            new(window, energy.Level!.Value, observations, sessions.Count, energy.Seconds, first, last);
    }
}
