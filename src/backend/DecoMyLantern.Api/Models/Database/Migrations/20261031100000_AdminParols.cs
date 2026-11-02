using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

/// <summary>Existing and newly created parols remain regular unless explicitly promoted.</summary>
[DbContext(typeof(ApplicationDbContext))]
[Migration("20261031100000_AdminParols")]
public partial class AdminParols : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsAdmin",
            table: "Lanterns",
            type: "bit",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "IsAdmin", table: "Lanterns");
    }
}
