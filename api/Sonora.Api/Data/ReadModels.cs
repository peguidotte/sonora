namespace Sonora.Api.Data;

// Linhas das views sonora_read definidas em contracts/database.json.
// Somente leitura: o C# nunca grava nem cria essas relações.

public sealed class LocationRow
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public string City { get; init; } = "";
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public bool IsDemo { get; init; }
}

public sealed class SourceRow
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public string SourceUrl { get; init; } = "";
    public DateOnly SnapshotDate { get; init; }
    public string License { get; init; } = "";
    public string Origin { get; init; } = "";

    /// <summary>Documento jsonb com um array de textos.</summary>
    public string Limitations { get; init; } = "[]";
}

public sealed class DeviceRow
{
    public Guid Id { get; init; }
    public Guid LocationId { get; init; }
    public string Name { get; init; } = "";
    public bool Enabled { get; init; }
    public DateTime? LastReceivedAt { get; init; }
}

public sealed class ObservationRow
{
    public Guid Id { get; init; }
    public Guid SourceId { get; init; }
    public Guid LocationId { get; init; }
    public Guid? DeviceId { get; init; }
    public string SessionId { get; init; } = "";
    public string ExternalId { get; init; } = "";
    public DateTime ObservedAt { get; init; }
    public DateTime ReceivedAt { get; init; }
    public double DurationSeconds { get; init; }
    public double LaeqDbA { get; init; }
    public string Origin { get; init; } = "";
    public string Method { get; init; } = "";
    public string CalibrationStatus { get; init; } = "";
}

public sealed class MlSummaryRow
{
    public string ModelVersion { get; init; } = "";
    public DateTime CreatedAt { get; init; }

    /// <summary>Documento jsonb já validado pelo comando administrativo do Java.</summary>
    public string Payload { get; init; } = "{}";
}

public sealed record Page<T>(IReadOnlyList<T> Items, int Total);
