using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

public partial class ProgressiveParolGrowth : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Designs are no longer unlocked by friend counts; preserve their IDs and existing selections.
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3012"),
            column: "RequiredFriends", value: 0);
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3013"),
            column: "RequiredFriends", value: 0);

        // Ranges describe visual density only, not prerequisites for any feature.
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
        migrationBuilder.InsertData(
            table: "GrowthStages",
            columns: new[] { "Id", "Name", "RequiredFriends", "SortOrder", "StageKey" },
            values: new object[] { 5, "Grand Parol", 31, 5, "grand" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DeleteData(table: "GrowthStages", keyColumn: "Id", keyValue: 5);
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 4,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Grand Parol", 30, "grand" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 3,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Radiant Parol", 15, "radiant" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 2,
            columns: new[] { "Name", "RequiredFriends", "StageKey" },
            values: new object[] { "Glowing Star", 5, "enhanced" });
        migrationBuilder.UpdateData(
            table: "GrowthStages", keyColumn: "Id", keyValue: 1,
            column: "Name", value: "First Light");

        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3012"),
            column: "RequiredFriends", value: 5);
        migrationBuilder.UpdateData(
            table: "ParolDesigns", keyColumn: "Id",
            keyValue: new Guid("c54deae0-8e9c-4a63-ae19-88989b0f3013"),
            column: "RequiredFriends", value: 15);
    }
}
