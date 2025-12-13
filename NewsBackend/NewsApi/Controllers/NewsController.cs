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
        public async Task<IActionResult> GetNews(
            [FromQuery] int skip = 0,
            [FromQuery] int take = 20,
            [FromQuery] string? category = null,
            [FromQuery] string? q = null,
            CancellationToken cancellationToken = default)
        {
            var haberler = await _haberServisi.HaberleriGetir();

            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalized = category.Trim();
                haberler = haberler
                    .Where(h => string.Equals(h.Kategori, normalized, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var needle = q.Trim();
                haberler = haberler
                    .Where(h =>
                        (!string.IsNullOrEmpty(h.Baslik) && h.Baslik.Contains(needle, StringComparison.OrdinalIgnoreCase)) ||
                        (!string.IsNullOrEmpty(h.Kaynak) && h.Kaynak.Contains(needle, StringComparison.OrdinalIgnoreCase)))
                    .ToList();
            }

            skip = Math.Max(0, skip);
            take = Math.Clamp(take, 1, 50);

            var page = haberler.Skip(skip).Take(take).ToList();
            await PopulateImagesAsync(page, cancellationToken);
            Response.Headers["X-Total-Count"] = haberler.Count.ToString();
            Response.Headers["X-Skip"] = skip.ToString();
            Response.Headers["X-Take"] = take.ToString();
            return Ok(page);
        }

        private async Task PopulateImagesAsync(List<HaberOzet> page, CancellationToken cancellationToken)
        {
            if (page.Count == 0) return;

            var cached = await _newsStore.GetDetailsAsync(page.Select(x => x.Link), cancellationToken);
            foreach (var item in page)
            {
                if (!string.IsNullOrWhiteSpace(item.ResimUrl)) continue;
                if (cached.TryGetValue(item.Link, out var cachedDetail))
                {
                    var cachedImage = cachedDetail.Detail?.ResimUrl;
                    if (!string.IsNullOrWhiteSpace(cachedImage))
                    {
                        item.ResimUrl = cachedImage;
                    }
                }
            }

            var missing = page.Where(x => string.IsNullOrWhiteSpace(x.ResimUrl)).Take(10).ToList();
            if (missing.Count == 0) return;

            using var throttler = new SemaphoreSlim(4, 4);
            var tasks = missing.Select(async item =>
            {
                if (string.IsNullOrWhiteSpace(item.Link)) return;

                await throttler.WaitAsync(cancellationToken);
                try
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    cts.CancelAfter(TimeSpan.FromSeconds(6));
                    var image = await _haberServisi.HaberinResminiGetir(item.Link, cts.Token);
                    if (!string.IsNullOrWhiteSpace(image)) item.ResimUrl = image;
                }
                catch
                {
                    // best-effort
                }
                finally
                {
                    throttler.Release();
                }
            });

            await Task.WhenAll(tasks);
        }

        [HttpGet("detail")]
        public async Task<IActionResult> GetNewsDetail([FromQuery] string url, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest("URL boş olamaz");

            try
            {
                string decodedUrl = DecodeUrlFromBase64(url);
                var detay = await _haberServisi.HaberinDetayiniGetir(decodedUrl, cancellationToken);
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
                // No embeddings yet (e.g. AI key not configured) – fall back to a
                // mix of categories instead of locking completely to one topic.
                var likedCategories = new HashSet<string>(
                    likes
                        .Select(l => allNews.FirstOrDefault(n => n.Link == l.NewsUrl)?.Kategori)
                        .Where(c => !string.IsNullOrWhiteSpace(c))!
                        .Cast<string>(),
                    StringComparer.OrdinalIgnoreCase);

                // If we don't even know liked categories, just return the latest items
                if (likedCategories.Count == 0)
                {
                    return Ok(allNews.Take(10).ToList());
                }

                // Prefer a few items from liked categories, then fill the rest
                // with other categories to keep the feed diverse.
                var preferred = allNews
                    .Where(n => likedCategories.Contains(n.Kategori))
                    .Take(5)
                    .ToList();

                var remainingSlots = Math.Max(0, 10 - preferred.Count);

                var others = allNews
                    .Where(n => !likedCategories.Contains(n.Kategori))
                    .Take(remainingSlots)
                    .ToList();

                var mixed = preferred.Concat(others).Take(10).ToList();
                return Ok(mixed);
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
