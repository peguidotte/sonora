using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace Sonora.Api;

public record RequiredScope(string Name);

// Base operacional. Cada futura rota de negócio precisa declarar seu próprio escopo.
public sealed class OperationalAccess(RequestDelegate next, IConfiguration configuration)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint is null || endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await next(context);
            return;
        }
        var key = context.Request.Headers["X-Api-Key"].ToString();
        Credential? credential = null;
        if (key.Length > 0 && key.Length <= 512 && !key.StartsWith("mock-", StringComparison.Ordinal))
        {
            try
            {
                var path = configuration["SONORA_KEYS_FILE"];
                if (!string.IsNullOrWhiteSpace(path))
                {
                    var file = JsonSerializer.Deserialize<KeyFile>(await File.ReadAllTextAsync(path, context.RequestAborted),
                        new JsonSerializerOptions(JsonSerializerDefaults.Web));
                    var hash = SHA256.HashData(Encoding.UTF8.GetBytes(key));
                    credential = file?.Keys?.FirstOrDefault(candidate => candidate.Sha256 is { Length: 64 }
                        && CryptographicOperations.FixedTimeEquals(Convert.FromHexString(candidate.Sha256), hash));
                }
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException or FormatException) { }
        }
        var required = endpoint.Metadata.GetMetadata<RequiredScope>();
        var status = credential is null ? 401
            : required is null || credential.Scopes?.Contains(required.Name) != true ? 403 : 200;
        if (status == 200)
            await next(context);
        else
        {
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new
            {
                code = status == 401 ? "unauthorized" : "forbidden",
                message = status == 401 ? "A valid API key is required." : "Insufficient scope."
            });
        }
    }

    private sealed record KeyFile(Credential[]? Keys);
    private sealed record Credential(string? Sha256, string[]? Scopes);
}
