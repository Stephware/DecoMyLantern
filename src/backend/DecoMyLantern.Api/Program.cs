using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Repository.Designs;
using DecoMyLantern.Api.Repository.GrowthStages;
using DecoMyLantern.Api.Repository.Lanterns;
using DecoMyLantern.Api.Repository.Messages;
using DecoMyLantern.Api.Services.Designs;
using DecoMyLantern.Api.Services.GrowthStages;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Messages;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<ApplicationUser>(options =>
    {
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
        options.Lockout.MaxFailedAccessAttempts = 5;
    })
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

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "Deco.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
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

var app = builder.Build();
if (!app.Environment.IsDevelopment()) { app.UseExceptionHandler(); app.UseHsts(); }
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
public partial class Program { }
