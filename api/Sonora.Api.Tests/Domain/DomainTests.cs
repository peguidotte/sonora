using Sonora.Api.Domain;
using Xunit;

namespace Sonora.Api.Tests.Domain;

public sealed class EnergyAverageTests
{
    [Fact]
    public void EqualWindowsOf60And70DbAverageEnergeticallyTo67Point40()
    {
        var level = EnergyAverage.Of([(60, 5), (70, 5)]);
        Assert.Equal(67.40, level!.Value, precision: 2);
        Assert.NotEqual(65, level.Value, precision: 1); // média aritmética de dB seria errada
    }

    [Fact]
    public void LongerWindowsWeighMore()
    {
        var level = EnergyAverage.Of([(60, 50), (70, 10)]);
        Assert.Equal(10 * Math.Log10((50 * 1e6 + 10 * 1e7) / 60), level!.Value, precision: 10);
    }

    [Fact]
    public void AbsenceIsNullNeverZeroDecibels()
    {
        Assert.Null(new EnergyAverage().Level);
        Assert.Null(EnergyAverage.Of([]));
    }

    [Theory]
    [InlineData(-0.1, 1)]
    [InlineData(140.1, 1)]
    [InlineData(double.NaN, 1)]
    [InlineData(60, 0)]
    [InlineData(60, -1)]
    public void RejectsInvalidLevelsAndDurations(double level, double seconds) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new EnergyAverage().Add(level, seconds));
}

public sealed class TimeWindowTests
{
    private static readonly DateTime Start = new(2026, 11, 8, 15, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void RequiresUtcAndPositiveDuration()
    {
        Assert.Throws<ArgumentException>(() => new TimeWindow(Start, Start));
        Assert.Throws<ArgumentException>(() => new TimeWindow(Start, Start.AddSeconds(-1)));
        Assert.Throws<ArgumentException>(() => new TimeWindow(DateTime.SpecifyKind(Start, DateTimeKind.Local), Start.AddHours(1)));
    }

    [Fact]
    public void IntersectionIsHalfOpen()
    {
        var first = new TimeWindow(Start, Start.AddMinutes(10));
        Assert.Equal(new TimeWindow(Start.AddMinutes(5), Start.AddMinutes(10)), first.Intersect(new TimeWindow(Start.AddMinutes(5), Start.AddHours(1))));
        Assert.Null(first.Intersect(new TimeWindow(Start.AddMinutes(10), Start.AddMinutes(20))));
    }

    [Fact]
    public void QueryLimitIsThirtyOneDays()
    {
        Assert.True(new TimeWindow(Start, Start.AddDays(31)).IsWithinQueryLimit);
        Assert.False(new TimeWindow(Start, Start.AddDays(31).AddSeconds(1)).IsWithinQueryLimit);
    }
}

public sealed class BinningTests
{
    private static readonly TimeZoneInfo SaoPaulo = CalendarBinning.SaoPaulo();

    [Fact]
    public void HourlyBinsFollowLocalHour()
    {
        var bin = new HourlyBinning(SaoPaulo).BinContaining(new DateTime(2026, 11, 8, 15, 42, 0, DateTimeKind.Utc));
        Assert.Equal(new DateTime(2026, 11, 8, 15, 0, 0, DateTimeKind.Utc), bin.From);
        Assert.Equal(TimeSpan.FromHours(1), bin.Duration);
    }

    [Fact]
    public void DailyBinsStartAtSaoPauloMidnightNotUtcMidnight()
    {
        // 01:00 UTC de 09/11 ainda é 22:00 de 08/11 em São Paulo (UTC-3).
        var bin = new DailyBinning(SaoPaulo).BinContaining(new DateTime(2026, 11, 9, 1, 0, 0, DateTimeKind.Utc));
        Assert.Equal(new DateTime(2026, 11, 8, 3, 0, 0, DateTimeKind.Utc), bin.From);
        Assert.Equal(new DateTime(2026, 11, 9, 3, 0, 0, DateTimeKind.Utc), bin.To);
    }

    [Fact]
    public void HistoricalDaylightSavingDayIsShorterAndStillContiguous()
    {
        // 15/10/2017: relógios de São Paulo pularam de 00:00 para 01:00 (horário de verão histórico).
        var binning = new DailyBinning(SaoPaulo);
        var day = binning.BinContaining(new DateTime(2017, 10, 15, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(TimeSpan.FromHours(23), day.Duration);
        Assert.Equal(day.To, binning.BinContaining(day.To).From);
    }
}

public sealed class NoiseProfileCalculatorTests
{
    private static readonly DateTime Start = new(2026, 11, 8, 15, 0, 0, DateTimeKind.Utc);
    private static readonly Guid Location = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    private static readonly Guid Source = Guid.Parse("22222222-2222-4222-8222-222222222222");
    private static readonly SeriesKey DeviceA = new("11111111-1111-4111-8111-111111111111", "wokwi_linear_demo", "simulated");

    private static readonly NoiseProfileCalculator Calculator = new([new HourlyBinning(CalendarBinning.SaoPaulo()), new DailyBinning(CalendarBinning.SaoPaulo())]);

    private static ProfileRequest Request(TimeWindow window, ProfileAggregation aggregation = ProfileAggregation.Hour) =>
        new(Location, window, AcousticOrigin.Simulated, aggregation);

    private static AcousticSample Sample(DateTime at, double seconds, double level, SeriesKey? series = null, string session = "boot-1") =>
        new(at, seconds, level, session, Source, series ?? DeviceA);

    [Fact]
    public void FixtureScenarioMatchesContract()
    {
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddMinutes(1))),
            [Sample(Start, 5, 60), Sample(Start.AddSeconds(5), 5, 70)]);
        var bin = Assert.Single(Assert.Single(profile.Series).Bins);
        Assert.Equal(67.40362689494243, profile.LaeqDbA!.Value, precision: 10);
        Assert.Equal(new TimeWindow(Start, Start.AddMinutes(1)), bin.Window);
        Assert.Equal((2, 1, 10d), (bin.ObservationCount, bin.SessionCount, bin.ObservedSeconds));
        Assert.Equal((Start, Start.AddSeconds(5)), (bin.FirstObservedAt, bin.LastObservedAt));
        Assert.Equal(["Only 10 seconds observed; this does not represent the entire hour.", "Synthetic values."], profile.Limitations);
    }

    [Fact]
    public void NoObservationsMeansNoDataWithNullLevel()
    {
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddMinutes(1))), []);
        Assert.False(profile.HasData);
        Assert.Null(profile.LaeqDbA);
        Assert.Empty(profile.Series);
        Assert.Equal(["No observations in the requested period."], profile.Limitations);
    }

    [Fact]
    public void ObservationCrossingHourBoundaryIsSlicedPreservingDuration()
    {
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddHours(2))),
            [Sample(Start.AddMinutes(59), 120, 65)]);
        var bins = Assert.Single(profile.Series).Bins;
        Assert.Equal(2, bins.Count);
        Assert.Equal([60d, 60d], bins.Select(b => b.ObservedSeconds));
        Assert.All(bins, b => Assert.Equal(65, b.LaeqDbA, precision: 10));
        Assert.Equal(Start.AddHours(1), bins[1].FirstObservedAt);
    }

    [Fact]
    public void OverlapDoesNotCountAsAdditionalTime()
    {
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddHours(1))),
            [Sample(Start, 10, 60), Sample(Start.AddSeconds(5), 10, 60), Sample(Start.AddSeconds(2), 3, 90)]);
        var bin = Assert.Single(Assert.Single(profile.Series).Bins);
        Assert.Equal(15, bin.ObservedSeconds); // [0,10) ∪ [5,15) = 15 s; a amostra contida não soma tempo nem energia
        Assert.Equal(2, bin.ObservationCount);
        Assert.Equal(60, bin.LaeqDbA, precision: 10);
    }

    [Fact]
    public void ObservationsAreClippedToTheRequestedWindow()
    {
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddMinutes(1))),
            [Sample(Start.AddSeconds(-30), 60, 70), Sample(Start.AddSeconds(50), 60, 70)]);
        var bin = Assert.Single(Assert.Single(profile.Series).Bins);
        Assert.Equal(40, bin.ObservedSeconds);
        Assert.Equal(Start, bin.FirstObservedAt);
    }

    [Fact]
    public void DifferentProducersOrMethodsAreNeverMixed()
    {
        var phone = new SeriesKey("noisecapture-track-7", "noisecapture_1s", "unknown");
        var profile = Calculator.Calculate(Request(new TimeWindow(Start, Start.AddHours(1))),
            [Sample(Start, 60, 50), Sample(Start, 60, 80, phone, "track-7")]);
        Assert.Equal(2, profile.Series.Count);
        Assert.Null(profile.LaeqDbA);
        Assert.Equal([50d, 80d], profile.Series.Select(s => Math.Round(s.LaeqDbA)).Order());
        Assert.Contains(profile.Limitations, text => text.Contains("separate series"));
    }

    [Fact]
    public void DailyAggregationGroupsByLocalDayAndCountsSessions()
    {
        var day = new DateTime(2026, 11, 8, 3, 0, 0, DateTimeKind.Utc);
        var profile = Calculator.Calculate(Request(new TimeWindow(day, day.AddDays(2)), ProfileAggregation.Day),
            [Sample(day.AddHours(1), 5, 60, session: "boot-1"), Sample(day.AddHours(20), 5, 60, session: "boot-2"),
             Sample(day.AddHours(25), 5, 70, session: "boot-2")]);
        var bins = Assert.Single(profile.Series).Bins;
        Assert.Equal([2, 1], bins.Select(b => b.SessionCount));
        Assert.Equal([day, day.AddDays(1)], bins.Select(b => b.Window.From));
        Assert.Contains("the entire requested period", profile.Limitations[0]);
    }
}

public sealed class DeviceStatePolicyTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 14, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(null, DeviceState.NeverSeen)]
    [InlineData(10, DeviceState.Recent)]
    [InlineData(60, DeviceState.Recent)]
    [InlineData(61, DeviceState.Stale)]
    [InlineData(-5, DeviceState.Recent)]
    public void StateDependsOnLastIotReception(int? secondsAgo, DeviceState expected)
    {
        var policy = new DeviceStatePolicy(new Support.FixedClock(Now), TimeSpan.FromSeconds(60));
        DateTime? last = secondsAgo is null ? null : Now.UtcDateTime.AddSeconds(-secondsAgo.Value);
        Assert.Equal(expected, policy.Evaluate(last));
    }
}

public sealed class GeoPointTests
{
    [Fact]
    public void HaversineDistanceIsAccurateForShortRanges()
    {
        var paulista = new GeoPoint(-23.5614, -46.6559);
        var nearby = new GeoPoint(-23.5614, -46.6559 + 0.001);
        Assert.InRange(paulista.DistanceMetersTo(nearby), 101, 103); // ~102 m por milésimo de grau de longitude nessa latitude
        Assert.Equal(0, paulista.DistanceMetersTo(paulista), precision: 6);
    }

    [Fact]
    public void BoundingBoxContainsTheWholeRadius()
    {
        var center = new GeoPoint(-23.56, -46.65);
        var box = center.BoundingBox(1000);
        foreach (var bearing in Enumerable.Range(0, 36).Select(i => i * 10 * Math.PI / 180))
        {
            var point = new GeoPoint(center.Latitude + Math.Cos(bearing) * 0.0089, center.Longitude + Math.Sin(bearing) * 0.0097);
            if (center.DistanceMetersTo(point) <= 1000)
                Assert.True(point.Latitude >= box.MinLatitude && point.Latitude <= box.MaxLatitude &&
                            point.Longitude >= box.MinLongitude && point.Longitude <= box.MaxLongitude);
        }
    }

    [Theory]
    [InlineData(91, 0)]
    [InlineData(0, 181)]
    [InlineData(double.NaN, 0)]
    public void RejectsInvalidCoordinates(double latitude, double longitude) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new GeoPoint(latitude, longitude));
}
