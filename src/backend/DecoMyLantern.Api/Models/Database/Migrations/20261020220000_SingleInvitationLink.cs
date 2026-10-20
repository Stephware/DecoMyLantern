using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

/// <summary>
/// Retains historical ShareLinks and contributions while retiring old URLs.
/// Only newly issued encrypted official links can be used for contributions.
/// </summary>
[DbContext(typeof(ApplicationDbContext))]
[Migration("20261020220000_SingleInvitationLink")]
public partial class SingleInvitationLink : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsOfficial",
            table: "ShareLinks",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "EncryptedToken",
            table: "ShareLinks",
            type: "varchar(128)",
            unicode: false,
            maxLength: 128,
            nullable: true);

        // Existing rows default to false: their URLs cease to validate, while
        // existing Contributions and Messages continue to reference the rows.
        migrationBuilder.DropIndex(
            name: "IX_ShareLinks_LanternId", table: "ShareLinks");

        migrationBuilder.CreateIndex(
            name: "IX_ShareLinks_LanternId",
            table: "ShareLinks",
            column: "LanternId",
            unique: true,
            filter: "[IsOfficial] = 1");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_ShareLinks_LanternId", table: "ShareLinks");
        migrationBuilder.DropColumn(name: "IsOfficial", table: "ShareLinks");
        migrationBuilder.DropColumn(name: "EncryptedToken", table: "ShareLinks");
        migrationBuilder.CreateIndex(
            name: "IX_ShareLinks_LanternId", table: "ShareLinks", column: "LanternId");
    }
}
