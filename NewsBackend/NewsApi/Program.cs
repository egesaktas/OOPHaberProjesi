using NewsApi.Services; // HaberServisi'nin olduğu yer
using NewsApi.Controllers;
using NewsApi.Storage;

var builder = WebApplication.CreateBuilder(args);

// 1. Servisleri ekliyoruz
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors();
builder.Services.Configure<NewsCacheOptions>(builder.Configuration.GetSection("NewsCache"));
builder.Services.AddSingleton<INewsStore, FileNewsStore>();

// BURASI ÖNEMLİ: Servisi burada tanıtıyoruz
// Eğer namespace'iniz farklıysa "NewsApi.Services" kısmını düzeltmeniz gerekebilir.
builder.Services.AddHttpClient<HaberServisi>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
});

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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthorization();
app.MapControllers();

app.Run();
