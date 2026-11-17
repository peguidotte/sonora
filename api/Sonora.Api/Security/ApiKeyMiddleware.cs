using Microsoft.AspNetCore.Authorization;
using Sonora.Api.Application;

namespace Sonora.Api.Security;

/// <summary>
/// Autentica e autoriza antes de qualquer parsing de parâmetros ou acesso ao banco.
/// Ausente/inválida/expirada/revogada: 401. Válida sem o escopo do endpoint: 403.
/// Apenas endpoints marcados com AllowAnonymous (liveness e shells HTML) dispensam a chave.
/// </summary>
public sealed class ApiKeyMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Api-Key";

    public async Task InvokeAsync(HttpContext context, IApiKeyStore keys)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint is null || endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await next(context);
            return;
        }

        var presented = context.Request.Headers[HeaderName];
        var credential = presented.Count == 1 && presented[0] is { } key
            ? await keys.FindAsync(key, context.RequestAborted)
            : null;
        if (credential is null)
        {
            await Reject(context, StatusCodes.Status401Unauthorized, "unauthorized", "A valid API key is required.");
            return;
        }

        var required = endpoint.Metadata.GetMetadata<RequiredScope>();
        if (required is null || !credential.Scopes.Contains(required.Name))
        {
            await Reject(context, StatusCodes.Status403Forbidden, "forbidden", "Insufficient scope.");
            return;
        }
        await next(context);
    }

    private static Task Reject(HttpContext context, int status, string code, string message)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new ApiError(code, message));
    }
}
