IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] uniqueidentifier NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [GrowthStages] (
        [Id] int NOT NULL IDENTITY,
        [StageKey] nvarchar(64) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [RequiredFriends] int NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_GrowthStages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [GuestVisitors] (
        [Id] uniqueidentifier NOT NULL,
        [TokenHash] varchar(64) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_GuestVisitors] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [ParolDesigns] (
        [Id] uniqueidentifier NOT NULL,
        [DesignKey] nvarchar(64) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [AssetKey] nvarchar(120) NOT NULL,
        [RequiredFriends] int NOT NULL,
        [IsEnabled] bit NOT NULL,
        CONSTRAINT [PK_ParolDesigns] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] uniqueidentifier NOT NULL,
        [RoleId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] uniqueidentifier NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [Lanterns] (
        [Id] uniqueidentifier NOT NULL,
        [OwnerUserId] uniqueidentifier NOT NULL,
        [SeasonYear] int NOT NULL,
        [SelectedDesignId] uniqueidentifier NOT NULL,
        [PaletteKey] nvarchar(60) NOT NULL,
        [PatternKey] nvarchar(60) NOT NULL,
        [NextSlotIndex] int NOT NULL,
        [UnlockAtUtc] datetime2 NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Lanterns] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Lanterns_AspNetUsers_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Lanterns_ParolDesigns_SelectedDesignId] FOREIGN KEY ([SelectedDesignId]) REFERENCES [ParolDesigns] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [ShareLinks] (
        [Id] uniqueidentifier NOT NULL,
        [LanternId] uniqueidentifier NOT NULL,
        [TokenHash] varchar(64) NOT NULL,
        [ExpiresAtUtc] datetime2 NULL,
        [RevokedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_ShareLinks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShareLinks_Lanterns_LanternId] FOREIGN KEY ([LanternId]) REFERENCES [Lanterns] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [Contributions] (
        [Id] uniqueidentifier NOT NULL,
        [LanternId] uniqueidentifier NOT NULL,
        [GuestVisitorId] uniqueidentifier NOT NULL,
        [ShareLinkId] uniqueidentifier NOT NULL,
        [DisplayName] nvarchar(80) NOT NULL,
        [SlotIndex] int NOT NULL,
        [AcceptedAtUtc] datetime2 NOT NULL,
        [RemovedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_Contributions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Contributions_GuestVisitors_GuestVisitorId] FOREIGN KEY ([GuestVisitorId]) REFERENCES [GuestVisitors] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Contributions_Lanterns_LanternId] FOREIGN KEY ([LanternId]) REFERENCES [Lanterns] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Contributions_ShareLinks_ShareLinkId] FOREIGN KEY ([ShareLinkId]) REFERENCES [ShareLinks] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [Messages] (
        [Id] uniqueidentifier NOT NULL,
        [ContributionId] uniqueidentifier NOT NULL,
        [Body] nvarchar(500) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [OpenedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_Messages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Messages_Contributions_ContributionId] FOREIGN KEY ([ContributionId]) REFERENCES [Contributions] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE TABLE [MessageReports] (
        [Id] uniqueidentifier NOT NULL,
        [MessageId] uniqueidentifier NOT NULL,
        [ReporterUserId] uniqueidentifier NOT NULL,
        [Reason] nvarchar(500) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_MessageReports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MessageReports_AspNetUsers_ReporterUserId] FOREIGN KEY ([ReporterUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_MessageReports_Messages_MessageId] FOREIGN KEY ([MessageId]) REFERENCES [Messages] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Name', N'RequiredFriends', N'SortOrder', N'StageKey') AND [object_id] = OBJECT_ID(N'[GrowthStages]'))
        SET IDENTITY_INSERT [GrowthStages] ON;
    EXEC(N'INSERT INTO [GrowthStages] ([Id], [Name], [RequiredFriends], [SortOrder], [StageKey])
    VALUES (1, N''First Light'', 0, 1, N''base''),
    (2, N''Glowing Star'', 5, 2, N''enhanced''),
    (3, N''Radiant Parol'', 15, 3, N''radiant''),
    (4, N''Grand Parol'', 30, 4, N''grand'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Name', N'RequiredFriends', N'SortOrder', N'StageKey') AND [object_id] = OBJECT_ID(N'[GrowthStages]'))
        SET IDENTITY_INSERT [GrowthStages] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AssetKey', N'DesignKey', N'IsEnabled', N'Name', N'RequiredFriends') AND [object_id] = OBJECT_ID(N'[ParolDesigns]'))
        SET IDENTITY_INSERT [ParolDesigns] ON;
    EXEC(N'INSERT INTO [ParolDesigns] ([Id], [AssetKey], [DesignKey], [IsEnabled], [Name], [RequiredFriends])
    VALUES (''c54deae0-8e9c-4a63-ae19-88989b0f3011'', N''classic'', N''classic'', CAST(1 AS bit), N''Classic Gold'', 0),
    (''c54deae0-8e9c-4a63-ae19-88989b0f3012'', N''floral'', N''floral'', CAST(1 AS bit), N''Floral Bloom'', 5),
    (''c54deae0-8e9c-4a63-ae19-88989b0f3013'', N''festival'', N''festival'', CAST(1 AS bit), N''Festival Lights'', 15)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AssetKey', N'DesignKey', N'IsEnabled', N'Name', N'RequiredFriends') AND [object_id] = OBJECT_ID(N'[ParolDesigns]'))
        SET IDENTITY_INSERT [ParolDesigns] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contributions_GuestVisitorId] ON [Contributions] ([GuestVisitorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Contributions_LanternId_GuestVisitorId] ON [Contributions] ([LanternId], [GuestVisitorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Contributions_LanternId_SlotIndex] ON [Contributions] ([LanternId], [SlotIndex]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contributions_ShareLinkId] ON [Contributions] ([ShareLinkId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_GrowthStages_RequiredFriends] ON [GrowthStages] ([RequiredFriends]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_GrowthStages_StageKey] ON [GrowthStages] ([StageKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_GuestVisitors_TokenHash] ON [GuestVisitors] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Lanterns_OwnerUserId_SeasonYear] ON [Lanterns] ([OwnerUserId], [SeasonYear]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Lanterns_SelectedDesignId] ON [Lanterns] ([SelectedDesignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_MessageReports_MessageId] ON [MessageReports] ([MessageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_MessageReports_ReporterUserId] ON [MessageReports] ([ReporterUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Messages_ContributionId] ON [Messages] ([ContributionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ParolDesigns_DesignKey] ON [ParolDesigns] ([DesignKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ShareLinks_LanternId] ON [ShareLinks] ([LanternId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ShareLinks_TokenHash] ON [ShareLinks] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012181617_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261012181617_InitialCreate', N'10.0.4');
END;

COMMIT;
GO


-- Data-only BeMyParol progressive-growth migration (idempotent, matching EF Core migration).
-- EF migration remains the source of truth; regenerate this SQL with database/bootstrap.sh
-- after verifying the migration using the local .NET SDK.
BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016160000_ProgressiveParolGrowth'
)
BEGIN
    UPDATE [ParolDesigns] SET [RequiredFriends] = 0
    WHERE [Id] = 'c54deae0-8e9c-4a63-ae19-88989b0f3012';
    UPDATE [ParolDesigns] SET [RequiredFriends] = 0
    WHERE [Id] = 'c54deae0-8e9c-4a63-ae19-88989b0f3013';

    UPDATE [GrowthStages] SET [Name] = N'Complete Base' WHERE [Id] = 1;
    UPDATE [GrowthStages] SET [Name] = N'Added Lights', [RequiredFriends] = 1, [StageKey] = N'lights' WHERE [Id] = 2;
    UPDATE [GrowthStages] SET [Name] = N'More Details', [RequiredFriends] = 6, [StageKey] = N'details' WHERE [Id] = 3;
    UPDATE [GrowthStages] SET [Name] = N'Fuller Layers', [RequiredFriends] = 16, [StageKey] = N'fuller' WHERE [Id] = 4;

    SET IDENTITY_INSERT [GrowthStages] ON;
    INSERT INTO [GrowthStages] ([Id], [Name], [RequiredFriends], [SortOrder], [StageKey])
    VALUES (5, N'Grand Parol', 31, 5, N'grand');
    SET IDENTITY_INSERT [GrowthStages] OFF;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016160000_ProgressiveParolGrowth', N'10.0.4');
END;
COMMIT;
GO

-- Task 2: hashed passwordless owner sessions and recovery keys.
BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016173000_PasswordlessOwnerAccess'
)
BEGIN
    CREATE TABLE [OwnerCredentials] (
        [OwnerUserId] uniqueidentifier NOT NULL,
        [TokenHash] varchar(64) NOT NULL,
        [RecoveryHash] varchar(64) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [SessionExpiresAtUtc] datetime2 NOT NULL,
        [RecoveryExpiresAtUtc] datetime2 NOT NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OwnerCredentials] PRIMARY KEY ([OwnerUserId]),
        CONSTRAINT [FK_OwnerCredentials_AspNetUsers_OwnerUserId] FOREIGN KEY ([OwnerUserId])
            REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
    CREATE UNIQUE INDEX [IX_OwnerCredentials_TokenHash] ON [OwnerCredentials] ([TokenHash]);
    CREATE UNIQUE INDEX [IX_OwnerCredentials_RecoveryHash] ON [OwnerCredentials] ([RecoveryHash]);
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016173000_PasswordlessOwnerAccess', N'10.0.4');
END;
COMMIT;
GO
