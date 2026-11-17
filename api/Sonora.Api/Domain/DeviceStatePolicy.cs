namespace Sonora.Api.Domain;

public interface IDeviceStatePolicy
{
    DeviceState Evaluate(DateTime? lastReceivedAt);
}

/// <summary>
/// Estado calculado na consulta a partir do último recebimento IoT (não da data de importação histórica).
/// O relógio é injetado para que a regra seja testável.
/// </summary>
public sealed class DeviceStatePolicy : IDeviceStatePolicy
{
    public static readonly TimeSpan DefaultStaleAfter = TimeSpan.FromSeconds(60);

    private readonly TimeProvider clock;
    private readonly TimeSpan staleAfter;

    public DeviceStatePolicy(TimeProvider clock, TimeSpan staleAfter)
    {
        if (staleAfter <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(staleAfter));
        this.clock = clock;
        this.staleAfter = staleAfter;
    }

    public DeviceState Evaluate(DateTime? lastReceivedAt)
    {
        if (lastReceivedAt is null)
            return DeviceState.NeverSeen;
        var age = clock.GetUtcNow().UtcDateTime - lastReceivedAt.Value;
        return age <= staleAfter ? DeviceState.Recent : DeviceState.Stale;
    }
}
