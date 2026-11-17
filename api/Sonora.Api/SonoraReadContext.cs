using System.Text;
using Microsoft.EntityFrameworkCore;
using Sonora.Api.Data;

namespace Sonora.Api;

/// <summary>
/// Mapeamento EF Core das views publicadas em sonora_read (contracts/database.json).
/// Sem migrations, EnsureCreated ou DDL: o schema pertence ao módulo database/ e o papel sonora_query só tem SELECT.
/// </summary>
public sealed class SonoraReadContext(DbContextOptions<SonoraReadContext> options) : DbContext(options)
{
    public const string ReadSchema = "sonora_read";

    public IQueryable<LocationRow> Locations => Set<LocationRow>();
    public IQueryable<SourceRow> Sources => Set<SourceRow>();
    public IQueryable<DeviceRow> Devices => Set<DeviceRow>();
    public IQueryable<ObservationRow> Observations => Set<ObservationRow>();
    public IQueryable<MlSummaryRow> MlSummaries => Set<MlSummaryRow>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<LocationRow>(view => view.ToView("locations", ReadSchema).HasKey(row => row.Id));
        model.Entity<SourceRow>(view =>
        {
            view.ToView("sources", ReadSchema).HasKey(row => row.Id);
            view.Property(row => row.Limitations).HasColumnType("jsonb");
        });
        model.Entity<DeviceRow>(view => view.ToView("devices", ReadSchema).HasKey(row => row.Id));
        model.Entity<ObservationRow>(view => view.ToView("observations", ReadSchema).HasKey(row => row.Id));
        model.Entity<MlSummaryRow>(view =>
        {
            view.ToView("ml_summaries", ReadSchema).HasNoKey();
            view.Property(row => row.Payload).HasColumnType("jsonb");
        });

        // Convenção do contrato: propriedades PascalCase em C#, colunas snake_case no PostgreSQL.
        foreach (var property in model.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
            property.SetColumnName(SnakeCase(property.Name));
    }

    public static string SnakeCase(string name)
    {
        var builder = new StringBuilder(name.Length + 8);
        for (var index = 0; index < name.Length; index++)
        {
            if (char.IsUpper(name[index]) && index > 0)
                builder.Append('_');
            builder.Append(char.ToLowerInvariant(name[index]));
        }
        return builder.ToString();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess) =>
        throw new InvalidOperationException("Sonora query API is read-only.");

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default) =>
        throw new InvalidOperationException("Sonora query API is read-only.");
}
