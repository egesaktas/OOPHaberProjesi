using Microsoft.AspNetCore.Mvc;
using NewsApi.Services;
using System.Threading.Tasks;
using System.Text; // Base64 çözmek için gerekli kütüphane

namespace NewsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NewsController : ControllerBase
    {
        private readonly HaberServisi _haberServisi;

        public NewsController(HaberServisi haberServisi)
        {
            _haberServisi = haberServisi;
        }

        [HttpGet]
        public async Task<IActionResult> GetNews()
        {
            var haberler = await _haberServisi.HaberleriGetir();
            return Ok(haberler);
        }

        // GÜNCELLENEN KISIM BURASI
        [HttpGet("detail")]
        public async Task<IActionResult> GetNewsDetail([FromQuery] string url)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest("URL boş olamaz");

            try 
            {
                // 1. Frontend'den gelen Base64 string'i normal linke çeviriyoruz
                byte[] data = Convert.FromBase64String(url);
                string decodedUrl = Encoding.UTF8.GetString(data);

                var detay = await _haberServisi.HaberinDetayiniGetir(decodedUrl);
                return Ok(detay);
            }
            catch
            {
                // Eğer şifreleme bozuksa veya hata olursa
                return BadRequest("URL formatı hatalı.");
            }
        }
    }
}