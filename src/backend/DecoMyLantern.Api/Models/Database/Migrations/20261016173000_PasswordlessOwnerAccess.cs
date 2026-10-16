using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DecoMyLantern.Api.Models.Database.Migrations;

public partial class PasswordlessOwnerAccess : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "OwnerCredentials",
            columns: table => new
            {
                OwnerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TokenHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                RecoveryHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                SessionExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                RecoveryExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_OwnerCredentials", x => x.OwnerUserId);
                table.ForeignKey(
                    name: "FK_OwnerCredentials_AspNetUsers_OwnerUserId",
                    column: x => x.OwnerUserId,
                    principalTable: "AspNetUsers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_OwnerCredentials_TokenHash",
            table: "OwnerCredentials",
            column: "TokenHash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_OwnerCredentials_RecoveryHash",
            table: "OwnerCredentials",
            column: "RecoveryHash",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "OwnerCredentials");
    }
}
