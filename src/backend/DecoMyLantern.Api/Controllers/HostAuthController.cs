using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DecoMyLantern.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class HostAuthController(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    IAntiforgery antiforgery) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("csrf")]
    public IActionResult Csrf() =>
        Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new HostAuthDto(user.Id, user.Email ?? ""));
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterHostRequest request)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh the page and try again." });

        var email = request.Email.Trim();
        var user = new ApplicationUser { UserName = email, Email = email };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(error => error.Description)) });

        await signIn.SignInAsync(user, isPersistent: false);
        return Ok(new HostAuthDto(user.Id, user.Email ?? ""));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginHostRequest request)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh the page and try again." });

        var result = await signIn.PasswordSignInAsync(request.Email.Trim(), request.Password,
            isPersistent: false, lockoutOnFailure: true);

        if (result.IsLockedOut) return StatusCode(StatusCodes.Status423Locked, new { message = "Account temporarily locked. Please try again later." });
        if (!result.Succeeded) return Unauthorized(new { message = "Invalid email or password." });

        var user = await users.FindByEmailAsync(request.Email.Trim());
        return user is null ? Unauthorized() : Ok(new HostAuthDto(user.Id, user.Email ?? ""));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh the page and try again." });
        await signIn.SignOutAsync();
        return NoContent();
    }

    private async Task<bool> ValidCsrfAsync()
    {
        try
        {
            await antiforgery.ValidateRequestAsync(HttpContext);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }
}
