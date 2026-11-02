using System.ComponentModel.DataAnnotations;
using DecoMyLantern.Api.Controllers;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class ParolImageScaleTests
{
    private static bool IsValid(ParolImageRequest model)
    {
        var results = new List<ValidationResult>();
        return Validator.TryValidateObject(model, new ValidationContext(model), results, true);
    }

    [Fact]
    public void Normal_snapshot_defaults_to_existing_one_x_resolution()
    {
        var request = new ParolImageRequest();
        Assert.Equal("webp", request.Format);
        Assert.Equal(1, request.Scale);
        Assert.True(IsValid(request));
    }

    [Fact]
    public void Only_one_two_and_three_x_scales_are_valid_for_parol_image_requests()
    {
        Assert.True(IsValid(new ParolImageRequest { Scale = 1 }));
        Assert.True(IsValid(new ParolImageRequest { Scale = 2 }));
        Assert.True(IsValid(new ParolImageRequest { Scale = 3 }));
        Assert.False(IsValid(new ParolImageRequest { Scale = 0 }));
        Assert.False(IsValid(new ParolImageRequest { Scale = 4 }));
        Assert.False(IsValid(new ParolImageRequest { Scale = -2 }));
    }

    [Fact]
    public void Guest_requests_keep_the_same_safe_scale_validation()
    {
        Assert.True(IsValid(new GuestParolImageRequest {
            Format = "webp", Scale = 2, Token = new string('A', 16),
        }));
        Assert.True(IsValid(new GuestParolImageRequest {
            Format = "webp", Scale = 3, Token = new string('A', 16),
        }));
        Assert.False(IsValid(new GuestParolImageRequest {
            Format = "webp", Scale = 4, Token = new string('A', 16),
        }));
    }
}
