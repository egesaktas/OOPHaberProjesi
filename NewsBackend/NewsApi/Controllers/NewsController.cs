using Microsoft.AspNetCore.Mvc;
using NewsApi.Services;
using System.Threading.Tasks;

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
    }
}
