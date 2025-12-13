using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NewsApi.Storage;

namespace NewsApi.Services
{
    public sealed class ThumbnailPrefetchBackgroundService : BackgroundService
    {
        private readonly HaberServisi _haberServisi;
        private readonly INewsStore _newsStore;
        private readonly ThumbnailPrefetchOptions _options;
        private readonly ILogger<ThumbnailPrefetchBackgroundService> _logger;

        public ThumbnailPrefetchBackgroundService(
            HaberServisi haberServisi,
            INewsStore newsStore,
            IOptions<ThumbnailPrefetchOptions> options,
            ILogger<ThumbnailPrefetchBackgroundService> logger)
        {
            _haberServisi = haberServisi;
            _newsStore = newsStore;
            _options = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled) return;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await PrefetchOnce(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Thumbnail prefetch failed");
                }

                var delay = TimeSpan.FromSeconds(Math.Max(10, _options.IntervalSeconds));
                try
                {
                    await Task.Delay(delay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // ignore
                }
            }
        }

        private async Task PrefetchOnce(CancellationToken stoppingToken)
        {
            var all = await _haberServisi.HaberleriGetir();
            if (all.Count == 0) return;

            var urls = all.Select(x => x.Link).Where(x => !string.IsNullOrWhiteSpace(x)).Take(_options.MaxPerRun).ToList();
            var cached = await _newsStore.GetDetailsAsync(urls, stoppingToken);

            var missing = urls.Where(u =>
            {
                if (!cached.TryGetValue(u, out var d)) return true;
                return string.IsNullOrWhiteSpace(d.Detail?.ResimUrl);
            }).Take(_options.MaxPerRun).ToList();

            if (missing.Count == 0) return;

            using var throttler = new SemaphoreSlim(Math.Max(1, _options.Concurrency), Math.Max(1, _options.Concurrency));
            var tasks = missing.Select(async url =>
            {
                await throttler.WaitAsync(stoppingToken);
                try
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                    cts.CancelAfter(TimeSpan.FromSeconds(Math.Max(2, _options.TimeoutSeconds)));
                    await _haberServisi.HaberinResminiGetir(url, cts.Token);
                }
                catch
                {
                    // best effort
                }
                finally
                {
                    throttler.Release();
                }
            });

            await Task.WhenAll(tasks);
        }
    }
}

