namespace Sonora.Api.Domain;

/// <summary>Origem resolvida pela ingestão. Origens nunca são misturadas num agregado.</summary>
public enum AcousticOrigin
{
    Simulated,
    PublicDataset
}

/// <summary>Granularidade dos bins do perfil, sempre no fuso America/Sao_Paulo.</summary>
public enum ProfileAggregation
{
    Hour,
    Day
}

public enum DeviceState
{
    Recent,
    Stale,
    NeverSeen
}

/// <summary>Tradução entre o domínio e os valores textuais dos contratos (OpenAPI e database.json).</summary>
public static class ContractNames
{
    public static string ToContract(this AcousticOrigin origin) => origin switch
    {
        AcousticOrigin.Simulated => "simulated",
        AcousticOrigin.PublicDataset => "public_dataset",
        _ => throw new ArgumentOutOfRangeException(nameof(origin))
    };

    public static string ToContract(this ProfileAggregation aggregation) => aggregation switch
    {
        ProfileAggregation.Hour => "hour",
        ProfileAggregation.Day => "day",
        _ => throw new ArgumentOutOfRangeException(nameof(aggregation))
    };

    public static string ToContract(this DeviceState state) => state switch
    {
        DeviceState.Recent => "recent",
        DeviceState.Stale => "stale",
        DeviceState.NeverSeen => "never_seen",
        _ => throw new ArgumentOutOfRangeException(nameof(state))
    };

    public static bool TryParseOrigin(string? value, out AcousticOrigin origin)
    {
        (var valid, origin) = value switch
        {
            "simulated" => (true, AcousticOrigin.Simulated),
            "public_dataset" => (true, AcousticOrigin.PublicDataset),
            _ => (false, default)
        };
        return valid;
    }

    public static bool TryParseAggregation(string? value, out ProfileAggregation aggregation)
    {
        (var valid, aggregation) = value switch
        {
            "hour" => (true, ProfileAggregation.Hour),
            "day" => (true, ProfileAggregation.Day),
            _ => (false, default)
        };
        return valid;
    }
}
