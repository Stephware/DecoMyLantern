-- Execute against master. Creates the empty database only.
-- Tables, indexes and seed data are created by EF migrations or database/schema.sql.
IF DB_ID(N'DecoMyLanternDb') IS NULL
    EXEC(N'CREATE DATABASE [DecoMyLanternDb]');
GO
