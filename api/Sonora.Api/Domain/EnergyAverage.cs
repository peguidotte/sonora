namespace Sonora.Api.Domain;

/// <summary>
/// Média energética ponderada pela duração:
/// LAeq = 10·log10( Σ(dᵢ·10^(Lᵢ/10)) / Σdᵢ ).
/// Decibéis são logarítmicos; média aritmética de dB subestimaria picos e é proibida pela arquitetura.
/// </summary>
public sealed class EnergyAverage
{
    private double weightedEnergy;

    public double Seconds { get; private set; }

    /// <summary>Nível equivalente; null quando nada foi observado (ausência nunca vira 0 dB).</summary>
    public double? Level => Seconds > 0 ? 10 * Math.Log10(weightedEnergy / Seconds) : null;

    public void Add(double laeqDbA, double seconds)
    {
        if (!double.IsFinite(laeqDbA) || laeqDbA is < AcousticSample.MinimumLevel or > AcousticSample.MaximumLevel)
            throw new ArgumentOutOfRangeException(nameof(laeqDbA));
        if (!double.IsFinite(seconds) || seconds <= 0)
            throw new ArgumentOutOfRangeException(nameof(seconds));
        weightedEnergy += seconds * Math.Pow(10, laeqDbA / 10);
        Seconds += seconds;
    }

    public static double? Of(IEnumerable<(double LaeqDbA, double Seconds)> windows)
    {
        var average = new EnergyAverage();
        foreach (var (level, seconds) in windows)
            average.Add(level, seconds);
        return average.Level;
    }
}
