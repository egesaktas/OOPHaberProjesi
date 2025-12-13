using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NewsApi.Services;

namespace NewsApi.Storage
{
    public sealed class CachedList
    {
        public DateTimeOffset FetchedAtUtc { get; set; }
        public List<HaberOzet> Items { get; set; } = new();
    }

    public sealed class CachedDetail
    {
        public DateTimeOffset FetchedAtUtc { get; set; }
        public HaberDetay Detail { get; set; } = new();
        public float[]? Embedding { get; set; }
    }

    public interface INewsStore
    {
        Task<CachedList?> GetLatestListAsync(CancellationToken cancellationToken);
        Task SaveLatestListAsync(List<HaberOzet> items, DateTimeOffset fetchedAtUtc, CancellationToken cancellationToken);

        Task<CachedDetail?> GetDetailAsync(string url, CancellationToken cancellationToken);
        Task SaveDetailAsync(string url, HaberDetay detail, DateTimeOffset fetchedAtUtc, float[]? embedding, CancellationToken cancellationToken);

        Task<Dictionary<string, CachedDetail>> GetDetailsAsync(IEnumerable<string> urls, CancellationToken cancellationToken);
    }
}
