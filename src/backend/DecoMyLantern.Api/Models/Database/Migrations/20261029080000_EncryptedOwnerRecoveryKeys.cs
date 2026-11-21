using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

/// <summary>
/// Add nullable encrypted recovery code storage. Existing recovery hashes are
/// untouched; older owners can explicitly replace an undisplayable key.
/// </summary>
[DbContext(typeof(ApplicationDbContext))]
[Migration("20261029080000_EncryptedOwnerRecoveryKeys")]
public partial class EncryptedOwnerRecoveryKeys : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "EncryptedRecoveryCode",
            table: "OwnerCredentials",
            type: "varchar(160)",
            unicode: false,
            maxLength: 160,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "RecoveryIssuedAtUtc",
            table: "OwnerCredentials",
            type: "datetime2",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "EncryptedRecoveryCode", table: "OwnerCredentials");
        migrationBuilder.DropColumn(name: "RecoveryIssuedAtUtc", table: "OwnerCredentials");
    }
}
