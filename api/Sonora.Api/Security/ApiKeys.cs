using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Sonora.Api.Security;

/// <summary>Escopo exigido por um endpoint. Endpoint protegido sem escopo declarado é negado (403).</summary>
public sealed record RequiredScope(string Name)
{
    public const string AcousticsRead = "acoustics:read";
    public const string OperationsRead = "operations:read";
}

public sealed record ApiCredential(string Id, IReadOnlySet<string> Scopes);

public interface IApiKeyStore
{
    /// <summary>Credencial válida para a chave, ou null se ausente, desconhecida, expirada ou revogada.</summary>
    Task<ApiCredential?> FindAsync(string presentedKey, CancellationToken cancellation);
}

/// <summary>
/// Lê SONORA_KEYS_FILE a cada requisição: remover ou trocar o hash revoga/rotaciona sem reiniciar.
/// O arquivo guarda somente SHA-256 das chaves; a comparação é em tempo constante.
/// Chaves públicas do mock (prefixo mock-) nunca autenticam no serviço real.
/// </summary>
public sealed class FileApiKeyStore(IConfiguration configuration, TimeProvider clock, ILogger<FileApiKeyStore> logger) : IApiKeyStore
{
    public const int MaximumKeyLength = 512;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<ApiCredential?> FindAsync(string presentedKey, CancellationToken cancellation)
    {
        if (presentedKey.Length is 0 or > MaximumKeyLength || presentedKey.StartsWith("mock-", StringComparison.Ordinal))
            return null;
        var path = configuration["SONORA_KEYS_FILE"];
        if (string.IsNullOrWhiteSpace(path))
            return null;
        KeyFile? file;
        try
        {
            await using var stream = File.OpenRead(path);
            file = await JsonSerializer.DeserializeAsync<KeyFile>(stream, Json, cancellation);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException)
        {
            logger.LogWarning("API key file unavailable or invalid ({ErrorType}).", error.GetType().Name);
            return null;
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(presentedKey));
        var now = clock.GetUtcNow();
        foreach (var entry in file?.Keys ?? [])
        {
            if (entry.Sha256 is not { Length: 64 } || !TryHex(entry.Sha256, out var expected))
                continue;
            if (!CryptographicOperations.FixedTimeEquals(expected, hash))
                continue;
            if (entry.Revoked == true || entry.ExpiresAt is { } expiresAt && expiresAt <= now)
                return null;
            return new ApiCredential(entry.Id ?? "unnamed", new HashSet<string>(entry.Scopes ?? [], StringComparer.Ordinal));
        }
        return null;
    }

    private static bool TryHex(string value, out byte[] bytes)
    {
        try
        {
            bytes = Convert.FromHexString(value);
            return true;
        }
        catch (FormatException)
        {
            bytes = [];
            return false;
        }
    }

    private sealed record KeyFile(KeyEntry[]? Keys);

    private sealed record KeyEntry(string? Id, string? Sha256, string[]? Scopes, DateTimeOffset? ExpiresAt, bool? Revoked);
}
