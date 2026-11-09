using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using DecoMyLantern.Api.Models.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DecoMyLantern.Api.IntegrationTests;

/// <summary>
/// Tests real ASP.NET middleware, CSRF/cookies, Identity, EF migrations and SQL Server.
/// Every fixture creates its own database; it never points at production.
/// </summary>
public sealed class SqlServerApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string databaseName = "BeMyParol_IT_" + Guid.NewGuid().ToString("N");
    private readonly string databaseConnection;
    private readonly string adminConnection;

    public SqlServerApiFixture()
    {
        var supplied = Environment.GetEnvironmentVariable("BEMYPAROL_TEST_SQL");
        if (string.IsNullOrWhiteSpace(supplied))
            throw new InvalidOperationException(
                "BEMYPAROL_TEST_SQL is required. Use an isolated local/CI SQL Server, never a production connection.");

        var admin = new SqlConnectionStringBuilder(supplied)
        {
            InitialCatalog = "master",
            ConnectTimeout = 3
        };
        adminConnection = admin.ConnectionString;
        admin.InitialCatalog = databaseName;
        admin.ConnectTimeout = 15;
        databaseConnection = admin.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = databaseConnection,
                ["Invitations:EncryptionKey"] = Convert.ToBase64String(
                    Enumerable.Range(1, 32).Select(n => (byte)n).ToArray()),
                ["StoryRenderer:SharedSecret"] = "integration-test-only-renderer-key",
            });
        });
    }

    public async Task InitializeAsync()
    {
        // SQL Server container readiness is asynchronous; retry only the test
        // infrastructure connection, not application transactions.
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                await using var connection = new SqlConnection(adminConnection);
                await connection.OpenAsync();
                break;
            }
            catch (SqlException) when (attempt < 59)
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        try
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureDeletedAsync();
        }
        finally
        {
            SqlConnection.ClearAllPools();
            Dispose();
        }
    }

    public HttpClient NewBrowser() => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("http://localhost"),
        HandleCookies = true,
        AllowAutoRedirect = false
    });

    public async Task<(int Contributions, int Messages, int DistinctSlots)> CountsForAsync(Guid ownerId)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lanternId = await db.Lanterns.Where(x => x.OwnerUserId == ownerId)
            .Select(x => x.Id).SingleAsync();
        var contributions = await db.Contributions.Where(x => x.LanternId == lanternId)
            .Select(x => new { x.Id, x.SlotIndex }).ToListAsync();
        var messages = await db.Messages.CountAsync(x => x.Contribution.LanternId == lanternId);
        return (contributions.Count, messages, contributions.Select(x => x.SlotIndex).Distinct().Count());
    }

    public async Task<int> LanternCountAsync(Guid ownerId)
    {
        using var scope = Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()
            .Lanterns.CountAsync(x => x.OwnerUserId == ownerId);
    }
}

public sealed class OwnerGuestSqlServerFlows(SqlServerApiFixture fixture)
    : IClassFixture<SqlServerApiFixture>
{
    private sealed record Owner(HttpClient Browser, Guid Id, string RecoveryCode, string Csrf);

    private static async Task<string> CsrfAsync(HttpClient browser, string path)
    {
        using var response = await browser.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        return data.GetProperty("token").GetString()!;
    }

    private static async Task<HttpResponseMessage> PostAsync(
        HttpClient browser, string path, string csrf, object? data = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(data ?? new { })
        };
        request.Headers.TryAddWithoutValidation("X-CSRF-TOKEN", csrf);
        return await browser.SendAsync(request);
    }

    private async Task<Owner> CreateOwnerAsync()
    {
        var browser = fixture.NewBrowser();
        try
        {
            var anonymousCsrf = await CsrfAsync(browser, "/api/owner/csrf");
            using var creation = await PostAsync(browser, "/api/owner/create", anonymousCsrf);
            Assert.Equal(HttpStatusCode.Created, creation.StatusCode);
            var payload = await creation.Content.ReadFromJsonAsync<JsonElement>();
            var ownerId = payload.GetProperty("owner").GetProperty("id").GetGuid();
            var recovery = payload.GetProperty("recoveryCode").GetString()!;
            Assert.Equal(22, recovery.Length);
            var authenticatedCsrf = await CsrfAsync(browser, "/api/owner/csrf");
            return new Owner(browser, ownerId, recovery, authenticatedCsrf);
        }
        catch
        {
            browser.Dispose();
            throw;
        }
    }

    private static async Task<string> OfficialTokenAsync(Owner owner)
    {
        using var first = await PostAsync(owner.Browser,
            "/api/my/lantern/invitations", owner.Csrf);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var payload = await first.Content.ReadFromJsonAsync<JsonElement>();
        var token = payload.GetProperty("token").GetString()!;
        Assert.Equal(16, token.Length);
        return token;
    }

    [Fact]
    public async Task Owner_creation_stable_invitation_guest_message_and_recovery_work_together()
    {
        var owner = await CreateOwnerAsync();
        using var ownerBrowser = owner.Browser;
        Assert.Equal(1, await fixture.LanternCountAsync(owner.Id));

        var token = await OfficialTokenAsync(owner);
        Assert.Equal(token, await OfficialTokenAsync(owner));

        using var guest = fixture.NewBrowser();
        var guestCsrf = await CsrfAsync(guest, "/api/invitations/csrf");
        using var contribution = await PostAsync(guest, "/api/invitations/contribute",
            guestCsrf, new { token, displayName = "Integration Friend", message = "Private Christmas wish 123" });
        Assert.Equal(HttpStatusCode.Created, contribution.StatusCode);
        var created = await contribution.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, created.GetProperty("slotIndex").GetInt32());
        Assert.True(created.GetProperty("messageSaved").GetBoolean());

        using var preview = await PostAsync(guest, "/api/invitations/preview",
            guestCsrf, new { token });
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        var publicJson = await preview.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Private Christmas wish 123", publicJson);
        using var previewDocument = JsonDocument.Parse(publicJson);
        Assert.Equal(1, previewDocument.RootElement.GetProperty("acceptedFriends").GetInt32());
        Assert.True(previewDocument.RootElement.GetProperty("alreadyContributed").GetBoolean());
        Assert.Equal((1, 1, 1), await fixture.CountsForAsync(owner.Id));

        using var recoveryBrowser = fixture.NewBrowser();
        var recoveryCsrf = await CsrfAsync(recoveryBrowser, "/api/owner/csrf");
        using var recovered = await PostAsync(recoveryBrowser, "/api/owner/recover",
            recoveryCsrf, new { recoveryCode = owner.RecoveryCode });
        Assert.Equal(HttpStatusCode.OK, recovered.StatusCode);
        var recoveredOwner = await recovered.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(owner.Id, recoveredOwner.GetProperty("owner").GetProperty("id").GetGuid());

        // Recovery rotates only the bearer session, preserving the parol and link.
        using var oldSession = await ownerBrowser.GetAsync("/api/owner/me");
        Assert.Equal(HttpStatusCode.Unauthorized, oldSession.StatusCode);
        using var newSession = await recoveryBrowser.GetAsync("/api/owner/me");
        Assert.Equal(HttpStatusCode.OK, newSession.StatusCode);
        Assert.Equal(1, await fixture.LanternCountAsync(owner.Id));
        Assert.Equal((1, 1, 1), await fixture.CountsForAsync(owner.Id));
    }

    [Fact]
    public async Task Parallel_guests_get_unique_slots_and_persist_every_message()
    {
        var owner = await CreateOwnerAsync();
        using var ownerBrowser = owner.Browser;
        var token = await OfficialTokenAsync(owner);

        const int friendCount = 12;
        var browsers = Enumerable.Range(0, friendCount)
            .Select(_ => fixture.NewBrowser()).ToArray();
        try
        {
            var csrf = await Task.WhenAll(browsers.Select(browser =>
                CsrfAsync(browser, "/api/invitations/csrf")));
            var requests = browsers.Select((browser, index) =>
                PostAsync(browser, "/api/invitations/contribute", csrf[index],
                    new { token, displayName = "Friend " + index, message = "Message " + index }));
            var responses = await Task.WhenAll(requests);
            try
            {
                foreach (var response in responses)
                    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
                var slots = new List<int>();
                foreach (var response in responses)
                {
                    var json = await response.Content.ReadFromJsonAsync<JsonElement>();
                    slots.Add(json.GetProperty("slotIndex").GetInt32());
                }
                Assert.Equal(Enumerable.Range(0, friendCount).ToArray(),
                    slots.OrderBy(index => index).ToArray());
                Assert.Equal((friendCount, friendCount, friendCount),
                    await fixture.CountsForAsync(owner.Id));
            }
            finally
            {
                foreach (var response in responses) response.Dispose();
            }
        }
        finally
        {
            foreach (var browser in browsers) browser.Dispose();
        }
    }

    [Fact]
    public async Task Same_guest_cannot_contribute_twice_to_one_parol()
    {
        var owner = await CreateOwnerAsync();
        using var ownerBrowser = owner.Browser;
        var token = await OfficialTokenAsync(owner);
        using var guest = fixture.NewBrowser();
        var csrf = await CsrfAsync(guest, "/api/invitations/csrf");

        using var first = await PostAsync(guest, "/api/invitations/contribute",
            csrf, new { token, displayName = "One light", message = "First" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        using var repeat = await PostAsync(guest, "/api/invitations/contribute",
            csrf, new { token, displayName = "Duplicate", message = "Second" });
        Assert.Equal(HttpStatusCode.Conflict, repeat.StatusCode);
        Assert.Equal((1, 1, 1), await fixture.CountsForAsync(owner.Id));
    }

    [Fact]
    public async Task Creation_requires_csrf_and_pending_owner_can_cancel_atomically()
    {
        using var anonymous = fixture.NewBrowser();
        using var rejected = await anonymous.PostAsJsonAsync("/api/owner/create", new { });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        var owner = await CreateOwnerAsync();
        using var ownerBrowser = owner.Browser;
        using var cancel = await PostAsync(ownerBrowser, "/api/owner/cancel-creation", owner.Csrf);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        Assert.Equal(0, await fixture.LanternCountAsync(owner.Id));
        using var after = await ownerBrowser.GetAsync("/api/owner/me");
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
    }

    [Fact]
    public async Task Liveness_is_independent_and_sql_readiness_is_reported_safely()
    {
        using var browser = fixture.NewBrowser();
        using var live = await browser.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        var liveReport = await live.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", liveReport.GetProperty("status").GetString());
        Assert.Equal("no-store", live.Headers.CacheControl?.ToString());

        using var ready = await browser.GetAsync("/api/health/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);
        var report = await ready.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ready", report.GetProperty("components")
            .GetProperty("database").GetString());
        Assert.Contains(report.GetProperty("status").GetString(), new[] {"ready", "degraded"});
        Assert.Equal("no-store", ready.Headers.CacheControl?.ToString());
        var responseText = report.GetRawText();
        Assert.DoesNotContain("ConnectionString", responseText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password", responseText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("EncryptionKey", responseText, StringComparison.OrdinalIgnoreCase);
    }

}
