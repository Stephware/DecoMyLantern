using System.Reflection;
using DecoMyLantern.Api.Models.Database.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerRecoveryMigrationTests
{
    [Fact]
    public void Recovery_key_redisplay_migration_only_adds_two_nullable_columns()
    {
        var migration = new EncryptedOwnerRecoveryKeys();
        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        var up = typeof(EncryptedOwnerRecoveryKeys).GetMethod(
            "Up", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.NotNull(up);
        up!.Invoke(migration, [builder]);

        Assert.Equal(2, builder.Operations.Count);
        var columns = builder.Operations
            .Select(op => Assert.IsType<AddColumnOperation>(op))
            .ToDictionary(op => op.Name, StringComparer.Ordinal);

        Assert.Equal(2, columns.Count);
        Assert.Equal("OwnerCredentials", columns["EncryptedRecoveryCode"].Table);
        Assert.True(columns["EncryptedRecoveryCode"].IsNullable);
        Assert.Equal("OwnerCredentials", columns["RecoveryIssuedAtUtc"].Table);
        Assert.True(columns["RecoveryIssuedAtUtc"].IsNullable);
    }
}
