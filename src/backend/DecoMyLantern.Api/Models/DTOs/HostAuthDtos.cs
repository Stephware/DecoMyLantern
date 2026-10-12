using System.ComponentModel.DataAnnotations;

namespace DecoMyLantern.Api.Models.DTOs;

public sealed class RegisterHostRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; init; } = "";

    [Required]
    public string Password { get; init; } = "";
}

public sealed class LoginHostRequest
{
    [Required, EmailAddress]
    public string Email { get; init; } = "";

    [Required]
    public string Password { get; init; } = "";
}

public sealed record HostAuthDto(Guid Id, string Email);
