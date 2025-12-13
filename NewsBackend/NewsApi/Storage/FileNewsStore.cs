using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using NewsApi.Services;

namespace NewsApi.Storage
{
    public sealed class FileNewsStore : INewsStore
    {
        private sealed class NewsCacheFile
        {
            public CachedList? LatestList { get; set; }
            public Dictionary<string, CachedDetail> DetailsByUrl { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        }

        private readonly string _fullPath;
        private readonly int _maxDetails;
        private readonly SemaphoreSlim _gate = new(1, 1);
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        public FileNewsStore(IHostEnvironment env, IOptions<NewsCacheOptions> options)
        {
            _maxDetails = Math.Max(1, options.Value.MaxDetails);
            _fullPath = Path.IsPathRooted(options.Value.Path)
                ? options.Value.Path
                : Path.Combine(env.ContentRootPath, options.Value.Path);
        }

        public async Task<CachedList?> GetLatestListAsync(CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var cache = await ReadAsync(cancellationToken);
                return cache.LatestList;
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task SaveLatestListAsync(List<HaberOzet> items, DateTimeOffset fetchedAtUtc, CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var cache = await ReadAsync(cancellationToken);
                cache.LatestList = new CachedList { FetchedAtUtc = fetchedAtUtc, Items = items };
                await WriteAsync(cache, cancellationToken);
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task<CachedDetail?> GetDetailAsync(string url, CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var cache = await ReadAsync(cancellationToken);
                cache.DetailsByUrl.TryGetValue(url, out var detail);
                return detail;
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task SaveDetailAsync(string url, HaberDetay detail, DateTimeOffset fetchedAtUtc, float[]? embedding, CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var cache = await ReadAsync(cancellationToken);
                cache.DetailsByUrl[url] = new CachedDetail
                {
                    FetchedAtUtc = fetchedAtUtc,
                    Detail = detail,
                    Embedding = embedding
                };
                PruneIfNeeded(cache);
                await WriteAsync(cache, cancellationToken);
            }
            finally
            {
                _gate.Release();
            }
        }

        private void PruneIfNeeded(NewsCacheFile cache)
        {
            if (cache.DetailsByUrl.Count <= _maxDetails) return;

            var toRemove = cache.DetailsByUrl
                .OrderBy(kv => kv.Value.FetchedAtUtc)
                .Take(cache.DetailsByUrl.Count - _maxDetails)
                .Select(kv => kv.Key)
                .ToList();

            foreach (var key in toRemove)
            {
                cache.DetailsByUrl.Remove(key);
            }
        }

        private async Task<NewsCacheFile> ReadAsync(CancellationToken cancellationToken)
        {
            try
            {
                if (!File.Exists(_fullPath)) return new NewsCacheFile();
                var json = await File.ReadAllTextAsync(_fullPath, cancellationToken);
                if (string.IsNullOrWhiteSpace(json)) return new NewsCacheFile();
                return JsonSerializer.Deserialize<NewsCacheFile>(json, _jsonOptions) ?? new NewsCacheFile();
            }
            catch
            {
                return new NewsCacheFile();
            }
        }

        private async Task WriteAsync(NewsCacheFile cache, CancellationToken cancellationToken)
        {
            var dir = Path.GetDirectoryName(_fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(cache, _jsonOptions);
            var tempPath = _fullPath + ".tmp";
            await File.WriteAllTextAsync(tempPath, json, cancellationToken);
            File.Move(tempPath, _fullPath, overwrite: true);
        }
    }
}
