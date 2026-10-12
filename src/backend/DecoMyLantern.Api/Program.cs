using System.Security.Claims;
using DecoMyLantern.Api.Domain.Entities;
using DecoMyLantern.Api.Features.Messages;
using DecoMyLantern.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

app.MapGet("/api/designs", async (ApplicationDbContext db, CancellationToken ct) =>
    await db.ParolDesigns.AsNoTracking().Where(d => d.IsEnabled)
        .OrderBy(d => d.RequiredFriends)
        .Select(d => new { d.DesignKey, d.Name, d.AssetKey, d.RequiredFriends })
        .ToListAsync(ct));

app.MapGet("/api/growth-stages", async (ApplicationDbContext db, CancellationToken ct) =>
    await db.GrowthStages.AsNoTracking().OrderBy(s => s.SortOrder)
        .Select(s => new { s.StageKey, s.Name, s.RequiredFriends })
        .ToListAsync(ct));

app.MapGet("/api/my/lanterns/{id:guid}/messages",
    async (Guid id, ClaimsPrincipal principal, ApplicationDbContext db, CancellationToken ct) =>
{
    var ownerIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(ownerIdValue, out var ownerId)) return Results.Unauthorized();

    var lantern = await db.Lanterns.AsNoTracking()
        .FirstOrDefaultAsync(l => l.Id == id && l.OwnerUserId == ownerId, ct);
    if (lantern is null) return Results.NotFound();

    var unlocked = ChristmasUnlockPolicy.CanRead(DateTime.UtcNow, lantern.UnlockAtUtc);
    var messages = await db.Messages.AsNoTracking()
        .Where(m => m.Contribution.LanternId == id && m.Contribution.RemovedAtUtc == null)
        .OrderBy(m => m.CreatedAtUtc)
        .Select(m => new
        {
            m.Id,
            m.Contribution.DisplayName,
            m.CreatedAtUtc,
            IsLocked = !unlocked,
            Body = unlocked ? m.Body : null
        }).ToListAsync(ct);
    return Results.Ok(new { unlocked, unlockAtUtc = lantern.UnlockAtUtc, messages });
}).RequireAuthorization();

app.Run();

public partial class Program { }
