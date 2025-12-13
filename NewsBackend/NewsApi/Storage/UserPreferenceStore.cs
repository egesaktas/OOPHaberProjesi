using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace NewsApi.Storage
{
    public sealed class UserPreference
    {
        public string UserId { get; set; } = string.Empty;
        public string NewsUrl { get; set; } = string.Empty;
        /// <summary>
        /// 1 = like, -1 = dislike
        /// </summary>
        public int Value { get; set; }
        public DateTimeOffset CreatedAtUtc { get; set; }
    }

    public interface IUserPreferenceStore
    {
        Task SaveAsync(UserPreference preference, CancellationToken cancellationToken);
        Task<List<UserPreference>> GetByUserAsync(string userId, CancellationToken cancellationToken);
    }

    public sealed class FileUserPreferenceStore : IUserPreferenceStore
    {
        private sealed class PreferenceFile
        {
            public List<UserPreference> Items { get; set; } = new();
        }

        private readonly string _fullPath;
        private readonly SemaphoreSlim _gate = new(1, 1);
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        public FileUserPreferenceStore()
        {
            var baseDir = AppContext.BaseDirectory;
            _fullPath = Path.Combine(baseDir, "App_Data", "user-preferences.json");
        }

        public async Task SaveAsync(UserPreference preference, CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var file = await ReadAsync(cancellationToken);

                var existing = file.Items.FirstOrDefault(x =>
                    string.Equals(x.UserId, preference.UserId, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(x.NewsUrl, preference.NewsUrl, StringComparison.OrdinalIgnoreCase));

                if (existing == null)
                {
                    preference.CreatedAtUtc = DateTimeOffset.UtcNow;
                    file.Items.Add(preference);
                }
                else
                {
                    existing.Value = preference.Value;
                    existing.CreatedAtUtc = DateTimeOffset.UtcNow;
                }

                await WriteAsync(file, cancellationToken);
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task<List<UserPreference>> GetByUserAsync(string userId, CancellationToken cancellationToken)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var file = await ReadAsync(cancellationToken);
                return file.Items
                    .Where(x => string.Equals(x.UserId, userId, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .ToList();
            }
            finally
            {
                _gate.Release();
            }
        }

        private async Task<PreferenceFile> ReadAsync(CancellationToken cancellationToken)
        {
            try
            {
                if (!File.Exists(_fullPath)) return new PreferenceFile();
                var json = await File.ReadAllTextAsync(_fullPath, cancellationToken);
                if (string.IsNullOrWhiteSpace(json)) return new PreferenceFile();
                return JsonSerializer.Deserialize<PreferenceFile>(json, _jsonOptions) ?? new PreferenceFile();
            }
            catch
            {
                return new PreferenceFile();
            }
        }

        private async Task WriteAsync(PreferenceFile file, CancellationToken cancellationToken)
        {
            var dir = Path.GetDirectoryName(_fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(file, _jsonOptions);
            var tempPath = _fullPath + ".tmp";
            await File.WriteAllTextAsync(tempPath, json, cancellationToken);
            File.Move(tempPath, _fullPath, overwrite: true);
        }
    }
}

