using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

/// <summary>
/// Data-only, non-destructive migration. Preserves existing design IDs,
/// user selections, parols, invitations, friends and sealed letters.
/// </summary>
[DbContext(typeof(ApplicationDbContext))]
[Migration("20261017230000_LivingParolDesigns")]
public partial class LivingParolDesigns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3012"),
            column: "RequiredFriends", value: 3);
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3013"),
            column: "RequiredFriends", value: 10);

        migrationBuilder.InsertData(
            table: "ParolDesigns",
            columns: new[] { "Id", "AssetKey", "DesignKey", "IsEnabled", "Name", "RequiredFriends" },
            values: new object[,]
            {
                { new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3014"), "celestial", "celestial", true, "Celestial Lace", 23 },
                { new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3015"), "fiesta", "fiesta", true, "Radiant Fiesta", 40 },
                { new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3016"), "sampaguita", "sampaguita", true, "Sampaguita Glow", 50 }
            });

        // Reuse existing five stage IDs; introduce only the new sixth row.
        // All unique keys and counts are new values, so updates cannot collide.
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 1,
            column: "Name", value: "Classic Gold");
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 2,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Floral Bloom", 3, "floral" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 3,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Festival Lights", 10, "festival" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 4,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Celestial Lace", 23, "celestial" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 5,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Radiant Fiesta", 40, "fiesta" });
        migrationBuilder.InsertData(
            table: "GrowthStages",
            columns: new[] { "Id", "Name", "RequiredFriends", "SortOrder", "StageKey" },
            values: new object[] { 6, "Sampaguita Glow", 50, 6, "sampaguita" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Rolling back selected new designs may be blocked by Lanterns FK;
        // do not forcibly remove any existing owner's saved parol.
        migrationBuilder.DeleteData(table: "GrowthStages", keyColumn: "Id", keyValue: 6);
        foreach (var designId in new[] {
            "c54deae0-8e9c-4a63-ae19-88989b0f3014",
            "c54deae0-8e9c-4a63-ae19-88989b0f3015",
            "c54deae0-8e9c-4a63-ae19-88989b0f3016",
        })
            migrationBuilder.DeleteData(table: "ParolDesigns", keyColumn: "Id", keyValue: new Guid(designId));

        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 1,
            column: "Name", value: "Complete Base");
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 2,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Added Lights", 1, "lights" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 3,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "More Details", 6, "details" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 4,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Fuller Layers", 16, "fuller" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 5,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Grand Parol", 31, "grand" });
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3012"),
            column: "RequiredFriends", value: 0);
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3013"),
            column: "RequiredFriends", value: 0);
    }
}
