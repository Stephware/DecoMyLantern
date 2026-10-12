using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Repository.Designs;
using DecoMyLantern.Api.Repository.GrowthStages;
using DecoMyLantern.Api.Repository.Messages;
using DecoMyLantern.Api.Services.Designs;
using DecoMyLantern.Api.Services.GrowthStages;
using DecoMyLantern.Api.Services.Messages;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.AddScoped<IDesignRepository, DesignRepository>();
builder.Services.AddScoped<IGrowthStageRepository, GrowthStageRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IDesignService, DesignService>();
builder.Services.AddScoped<IGrowthStageService, GrowthStageService>();
builder.Services.AddScoped<IMessageService, MessageService>();

var app = builder.Build();
if (!app.Environment.IsDevelopment()) { app.UseExceptionHandler(); app.UseHsts(); }
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();
app.Run();
public partial class Program { }
