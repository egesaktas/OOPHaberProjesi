using Microsoft.AspNetCore.Mvc;
using NewsApi.Services;
using NewsApi.Storage;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace NewsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NewsController : ControllerBase
    {
        private readonly HaberServisi _haberServisi;
        private readonly IUserPreferenceStore _preferenceStore;
        private readonly INewsStore _newsStore;

        public NewsController(HaberServisi haberServisi, IUserPreferenceStore preferenceStore, INewsStore newsStore)
        {
            _haberServisi = haberServisi;
            _preferenceStore = preferenceStore;
            _newsStore = newsStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetNews()
        {
            var haberler = await _haberServisi.HaberleriGetir();
            return Ok(haberler);
        }

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
                return BadRequest("URL formatı hatalı.");
            }
        }

        [HttpPost("feedback")]
        public async Task<IActionResult> PostFeedback([FromBody] FeedbackRequest request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.NewsUrl))
            {
                return BadRequest("UserId ve NewsUrl zorunlu.");
            }

            if (request.Value != 1 && request.Value != -1)
            {
                return BadRequest("Value 1 (like) veya -1 (dislike) olmalıdır.");
            }

            var pref = new UserPreference
            {
                UserId = request.UserId,
                NewsUrl = request.NewsUrl,
                Value = request.Value
            };

            await _preferenceStore.SaveAsync(pref, cancellationToken);
            return Ok();
        }

        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromQuery] string userId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest("userId zorunlu.");
            }

            var allNews = await _haberServisi.HaberleriGetir();
            var preferences = await _preferenceStore.GetByUserAsync(userId, cancellationToken);
            var likes = preferences.Where(p => p.Value > 0).ToList();

            if (likes.Count == 0)
            {
                var latest = allNews.Take(10).ToList();
                return Ok(latest);
            }

            var likeEmbeddings = new List<float[]>();

            foreach (var pref in likes)
            {
                var detail = await _newsStore.GetDetailAsync(pref.NewsUrl, cancellationToken);
                if (detail?.Embedding != null && detail.Embedding.Length > 0)
                {
                    likeEmbeddings.Add(detail.Embedding);
                }
            }

            if (likeEmbeddings.Count == 0)
            {
                var likedCategories = new HashSet<string>(
                    likes
                        .Select(l => allNews.FirstOrDefault(n => n.Link == l.NewsUrl)?.Kategori)
                        .Where(c => !string.IsNullOrWhiteSpace(c))!
                        .Cast<string>(),
                    StringComparer.OrdinalIgnoreCase);

                var byCategory = allNews
                    .Where(n => likedCategories.Contains(n.Kategori))
                    .Take(10)
                    .ToList();

                if (byCategory.Count > 0) return Ok(byCategory);

                return Ok(allNews.Take(10).ToList());
            }

            var userEmbedding = AverageEmbedding(likeEmbeddings);
            var scored = new List<(HaberOzet News, double Score)>();

            foreach (var news in allNews)
            {
                if (likes.Any(l => string.Equals(l.NewsUrl, news.Link, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                var detail = await _newsStore.GetDetailAsync(news.Link, cancellationToken);
                if (detail?.Embedding == null || detail.Embedding.Length != userEmbedding.Length)
                {
                    continue;
                }

                var score = CosineSimilarity(userEmbedding, detail.Embedding);
                scored.Add((news, score));
            }

            var best = scored
                .OrderByDescending(x => x.Score)
                .Take(10)
                .Select(x => x.News)
                .ToList();

            if (best.Count == 0)
            {
                return Ok(allNews.Take(10).ToList());
            }

            return Ok(best);
        }

        private static string DecodeUrlFromBase64(string input)
        {
            var normalized = input.Trim().Replace(' ', '+');
            normalized = normalized.Replace('-', '+').Replace('_', '/');
            var pad = normalized.Length % 4;
            if (pad != 0)
            {
                normalized = normalized.PadRight(normalized.Length + (4 - pad), '=');
            }

            byte[] data = Convert.FromBase64String(normalized);
            return Encoding.UTF8.GetString(data);
        }

        private static float[] AverageEmbedding(List<float[]> embeddings)
        {
            if (embeddings.Count == 0) return Array.Empty<float>();

            var length = embeddings[0].Length;
            var result = new float[length];

            foreach (var emb in embeddings)
            {
                for (int i = 0; i < length; i++)
                {
                    result[i] += emb[i];
                }
            }

            for (int i = 0; i < length; i++)
            {
                result[i] /= embeddings.Count;
            }

            return result;
        }

        private static double CosineSimilarity(float[] a, float[] b)
        {
            if (a.Length != b.Length) return 0;

            double dot = 0;
            double normA = 0;
            double normB = 0;

            for (int i = 0; i < a.Length; i++)
            {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }

            if (normA == 0 || normB == 0) return 0;
            return dot / (Math.Sqrt(normA) * Math.Sqrt(normB));
        }

        public sealed class FeedbackRequest
        {
            public string UserId { get; set; } = string.Empty;
            public string NewsUrl { get; set; } = string.Empty;
            public int Value { get; set; }
        }
    }
}

