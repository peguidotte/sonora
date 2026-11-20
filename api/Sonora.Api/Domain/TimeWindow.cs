namespace Sonora.Api.Domain;

/// <summary>
/// Intervalo UTC semiaberto [From, To). Objeto de valor imutável: não existe janela vazia,
/// invertida ou com horário local ambíguo.
/// </summary>
public readonly record struct TimeWindow
{
    /// <summary>Limite de consulta definido na arquitetura (from inclusivo, to exclusivo, até 31 dias).</summary>
    public static readonly TimeSpan MaximumQueryPeriod = TimeSpan.FromDays(31);

    public DateTime From { get; }
    public DateTime To { get; }

    public TimeWindow(DateTime from, DateTime to)
    {
        if (from.Kind != DateTimeKind.Utc || to.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Time windows require UTC instants.");
        if (to <= from)
            throw new ArgumentException("The end of a time window must be after its start.");
        From = from;
        To = to;
    }

    public TimeSpan Duration => To - From;

    public double Seconds => Duration.TotalSeconds;

    public bool IsWithinQueryLimit => Duration <= MaximumQueryPeriod;

    /// <summary>Parte comum entre duas janelas, ou null quando elas não se tocam.</summary>
    public TimeWindow? Intersect(TimeWindow other)
    {
        var start = From > other.From ? From : other.From;
        var end = To < other.To ? To : other.To;
        return end > start ? new TimeWindow(start, end) : null;
    }

    public static TimeWindow StartingAt(DateTime from, double seconds) => new(from, from.AddSeconds(seconds));
}
