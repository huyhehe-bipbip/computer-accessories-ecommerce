
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. ĐĂNG KÝ CONTROLLER
// ==========================================
builder.Services.AddControllers();

// ==========================================
// 2. KẾT NỐI SQL SERVER
// ==========================================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// ==========================================
// 3. CẤU HÌNH JWT
// ==========================================
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey) ||
    Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key phai co it nhat 32 byte."
    );
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtIssuer) ||
    string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new InvalidOperationException(
        "Thieu cau hinh Jwt:Issuer hoac Jwt:Audience."
    );
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultChallengeScheme =
        JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        ),

        ClockSkew = TimeSpan.Zero
    };

    // GHI NHẬN KẾT QUẢ XÁC THỰC JWT
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (builder.Environment.IsDevelopment())
            {
                Console.WriteLine(
                    "JWT AUTHENTICATION ERROR: " +
                    context.Exception.Message
                );
            }

            return Task.CompletedTask;
        },

        OnTokenValidated = context =>
        {
            if (builder.Environment.IsDevelopment())
            {
                Console.WriteLine(
                    "JWT TOKEN VALIDATED SUCCESSFULLY"
                );
            }

            return Task.CompletedTask;
        }
    };
});

// ==========================================
// 4. PHÂN QUYỀN
// ==========================================
builder.Services.AddAuthorization();

// ==========================================
// 5. OPEN API
// ==========================================
builder.Services.AddOpenApi();

// ==========================================
// 6. KHỞI TẠO ỨNG DỤNG
// ==========================================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ==========================================
// 7. MIDDLEWARE
// ==========================================
app.UseHttpsRedirection();

// CHO PHÉP HIỂN THỊ HÌNH ẢNH TỪ WWWROOT
app.UseStaticFiles();

// XÁC THỰC JWT
app.UseAuthentication();

// PHÂN QUYỀN
app.UseAuthorization();

// ==========================================
// 8. ĐỊNH TUYẾN CONTROLLER
// ==========================================
app.MapControllers();

app.Run();
