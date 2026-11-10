using Microsoft.EntityFrameworkCore;

namespace Sonora.Api;

// Leonardo adiciona somente mapeamentos ToView(..., "sonora_read"). Sem migrations/DDL.
public sealed class SonoraReadContext(DbContextOptions<SonoraReadContext> options) : DbContext(options);
