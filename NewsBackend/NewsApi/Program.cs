using NewsApi.Services; // HaberServisi'nin olduğu yer
using NewsApi.Controllers;

var builder = WebApplication.CreateBuilder(args);

// 1. Servisleri ekliyoruz
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// BURASI ÖNEMLİ: Servisi burada tanıtıyoruz
// Eğer namespace'iniz farklıysa "NewsApi.Services" kısmını düzeltmeniz gerekebilir.
builder.Services.AddScoped<HaberServisi>(); 

var app = builder.Build();

// 2. Uygulama ayarları
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS ayarı (React ile konuşması için) - Şimdilik en geniş izni veriyoruz
app.UseCors(x => x
    .AllowAnyMethod()
    .AllowAnyHeader()
    .SetIsOriginAllowed(origin => true) // localhost'a izin ver
    .AllowCredentials());

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();