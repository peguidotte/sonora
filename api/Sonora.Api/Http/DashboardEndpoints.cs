using System.Reflection;
using Scalar.AspNetCore;

namespace Sonora.Api.Http;

/// <summary>
/// Painel demonstrativo: arquivos estáticos embutidos no assembly, sem dados privados.
/// O navegador pede a chave ao usuário, guarda só em memória e consulta a API com X-Api-Key.
/// </summary>
public static class DashboardEndpoints
{
    private const string ContentSecurityPolicy =
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; " +
        "font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

    // O Scalar injeta estilos em tempo de execução; somente a página de documentação aceita estilos inline.
    private const string DocsContentSecurityPolicy =
        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; " +
        "img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

    private static readonly (string Route, string Resource, string ContentType)[] Assets =
    [
        ("/dashboard", "index.html", "text/html; charset=utf-8"),
        ("/dashboard/app.js", "app.js", "text/javascript; charset=utf-8"),
        ("/dashboard/app.css", "app.css", "text/css; charset=utf-8"),
        ("/dashboard/docs", "docs.html", "text/html; charset=utf-8"),
        ("/dashboard/docs.js", "docs.js", "text/javascript; charset=utf-8")
    ];

    public static IEndpointRouteBuilder MapDashboard(this IEndpointRouteBuilder app)
    {
        var assembly = Assembly.GetExecutingAssembly();
        foreach (var (route, resource, contentType) in Assets)
        {
            var name = $"Sonora.Api.Dashboard.{resource}";
            using var stream = assembly.GetManifestResourceStream(name)
                ?? throw new InvalidOperationException($"Missing embedded dashboard asset {name}.");
            using var reader = new MemoryStream();
            stream.CopyTo(reader);
            var bytes = reader.ToArray();
            var endpoint = app.MapGet(route, (HttpContext context) =>
            {
                context.Response.Headers.ContentSecurityPolicy =
                    route == "/dashboard/docs" ? DocsContentSecurityPolicy : ContentSecurityPolicy;
                return Results.Bytes(bytes, contentType);
            }).AllowAnonymous();
            if (route == "/dashboard")
                endpoint.WithName("getDashboard").WithSummary("Static dashboard shell; data access requires an API key").WithTags("Dashboard");
            else
                endpoint.ExcludeFromDescription();
        }
        // Somente o bundle JavaScript do Scalar é usado (servido localmente pelo pacote, sem CDN).
        // Sua página padrão aponta para o OpenAPI protegido e, sem chave, recebe 401.
        app.MapScalarApiReference("/dashboard/scalar", options => options
                .WithOpenApiRoutePattern(SonoraEndpoints.Prefix + "/openapi.json")
                .WithTitle("Sonora | Query API"))
            .AllowAnonymous();
        return app;
    }
}
