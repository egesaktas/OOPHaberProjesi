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
                string decodedUrl = DecodeUrlFromBase64(url);

                var detay = await _haberServisi.HaberinDetayiniGetir(decodedUrl);
                return Ok(detay);
            }
            catch
            {
                // Eğer şifreleme bozuksa veya hata olursa
                return BadRequest("URL formatı hatalı.");
            }
        }

        private static string DecodeUrlFromBase64(string input)
        {
            // Querystring'te '+' boşluğa dönüşebiliyor; geri al.
            var normalized = input.Trim().Replace(' ', '+');

            // base64url desteği: '-' -> '+', '_' -> '/', padding ekle.
            normalized = normalized.Replace('-', '+').Replace('_', '/');
            var pad = normalized.Length % 4;
            if (pad != 0)
            {
                normalized = normalized.PadRight(normalized.Length + (4 - pad), '=');
            }

            byte[] data = Convert.FromBase64String(normalized);
            return Encoding.UTF8.GetString(data);
        }
    }
}
