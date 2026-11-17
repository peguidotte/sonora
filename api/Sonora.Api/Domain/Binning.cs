namespace Sonora.Api.Domain;

/// <summary>Divide o tempo em bins de calendário local; implementações trocáveis por DI.</summary>
public interface IBinningStrategy
{
    ProfileAggregation Aggregation { get; }

    /// <summary>Bin de calendário completo (em UTC) que contém o instante.</summary>
    TimeWindow BinContaining(DateTime utcInstant);
}

/// <summary>
/// Base para bins alinhados ao relógio local (America/Sao_Paulo). Converte limites locais para UTC,
/// pulando horários inexistentes em transições de horário de verão históricas.
/// </summary>
public abstract class CalendarBinning(TimeZoneInfo zone) : IBinningStrategy
{
    public const string TimeZoneId = "America/Sao_Paulo";

    public TimeZoneInfo Zone { get; } = zone;

    public abstract ProfileAggregation Aggregation { get; }

    protected abstract DateTime LocalFloor(DateTime local);

    protected abstract DateTime LocalNext(DateTime localStart);

    public TimeWindow BinContaining(DateTime utcInstant)
    {
        if (utcInstant.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Binning requires UTC instants.", nameof(utcInstant));
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcInstant, Zone);
        var start = ToUtc(LocalFloor(local));
        if (start > utcInstant)
            start = utcInstant; // horário local inexistente na virada: o bin começa no primeiro instante válido
        var end = ToUtc(LocalNext(LocalFloor(local)));
        return new TimeWindow(start, end);
    }

    private DateTime ToUtc(DateTime local)
    {
        var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        while (Zone.IsInvalidTime(unspecified))
            unspecified = unspecified.AddMinutes(30);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, Zone);
    }

    public static TimeZoneInfo SaoPaulo() => TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
}

public sealed class HourlyBinning(TimeZoneInfo zone) : CalendarBinning(zone)
{
    public override ProfileAggregation Aggregation => ProfileAggregation.Hour;

    protected override DateTime LocalFloor(DateTime local) =>
        new(local.Year, local.Month, local.Day, local.Hour, 0, 0, DateTimeKind.Unspecified);

    protected override DateTime LocalNext(DateTime localStart) => localStart.AddHours(1);
}

public sealed class DailyBinning(TimeZoneInfo zone) : CalendarBinning(zone)
{
    public override ProfileAggregation Aggregation => ProfileAggregation.Day;

    protected override DateTime LocalFloor(DateTime local) => local.Date;

    protected override DateTime LocalNext(DateTime localStart) => localStart.AddDays(1);
}
