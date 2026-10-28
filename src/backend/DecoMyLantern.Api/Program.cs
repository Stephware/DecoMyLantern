using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Repository.Designs;
using DecoMyLantern.Api.Repository.GrowthStages;
using DecoMyLantern.Api.Repository.Lanterns;
using DecoMyLantern.Api.Repository.Messages;
using DecoMyLantern.Api.Services.Designs;
using DecoMyLantern.Api.Services.GrowthStages;
using DecoMyLantern.Api.Services.Invitations;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Messages;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("StoryRenderer", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["StoryRenderer:Url"] ?? "http://127.0.0.1:7070");
    client.Timeout = TimeSpan.FromMinutes(5);
});
var trustedProxyNetwork = builder.Configuration["ReverseProxy:KnownNetwork"];
if (!string.IsNullOrWhiteSpace(trustedProxyNetwork))
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(trustedProxyNetwork));
    });
}
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthorization(options =>
{
    // Identity's scheme name is static readonly, so use a named policy in
    // controller attributes while keeping the framework's scheme value here.
    options.AddPolicy(OwnerSession.LegacyUpgradePolicy, policy =>
        policy.AddAuthenticationSchemes(IdentityConstants.ApplicationScheme)
            .RequireAuthenticatedUser());
});

// Keep Identity's data model and cookie validation only for a one-time upgrade
// of existing logged-in parol owners. Do NOT map any registration/login endpoints.
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "Deco.Host";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// Owner tokens, not Identity sessions, authorize all /api/my/* routes.
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = OwnerSession.Scheme;
    options.DefaultChallengeScheme = OwnerSession.Scheme;
}).AddScheme<AuthenticationSchemeOptions, OwnerTokenHandler>(OwnerSession.Scheme, _ => { });

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "BeMyParol.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("owner-create", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 6, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    // This now retrieves the same link on dashboard visits instead of
    // creating a new invitation each time.
    options.AddPolicy("invitation-create", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("invitation-preview", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120, Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("invitation-contribute", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 80, Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0, AutoReplenishment = true
        }));
    // Snapshot requests are read-only but cold images are expensive to render.
    // Limits are per-process; renderer caches duplicate visual states.
    options.AddPolicy("design-showcase", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 36, Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("parol-image-owner", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60, Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("parol-image-guest", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60, Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("story-owner", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("story-guest", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 12, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("owner-recovery-display", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 18, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("owner-recovery-replace", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3, Window = TimeSpan.FromHours(1),
            QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("owner-recover", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 6, Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0, AutoReplenishment = true
        }));
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IDesignRepository, DesignRepository>();
builder.Services.AddScoped<IGrowthStageRepository, GrowthStageRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<ILanternRepository, LanternRepository>();
builder.Services.AddScoped<IDesignService, DesignService>();
builder.Services.AddScoped<IGrowthStageService, GrowthStageService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<ILanternService, LanternService>();
builder.Services.AddSingleton<InvitationTokenCipher>();
builder.Services.AddSingleton<OwnerRecoveryCipher>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IOwnerAccessService, OwnerAccessService>();

var app = builder.Build();
if (!string.IsNullOrWhiteSpace(trustedProxyNetwork))
    app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}
app.UseRouting();
// Never allow owner profiles, private letters, bearer cookie responses or
// CSRF tokens to be stored by a browser/proxy cache.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/owner") ||
        context.Request.Path.StartsWithSegments("/api/my") ||
        context.Request.Path.StartsWithSegments("/api/invitations"))
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers.Pragma = "no-cache";
            return Task.CompletedTask;
        });
    }
    await next();
});
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.Run();
public partial class Program { }
