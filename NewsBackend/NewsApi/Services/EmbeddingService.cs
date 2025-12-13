using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace NewsApi.Services
{
    public interface IEmbeddingService
    {
        Task<float[]?> EmbedAsync(string text, CancellationToken cancellationToken);
    }

    public sealed class OpenAiEmbeddingService : IEmbeddingService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _model;

        private sealed class EmbeddingRequest
        {
            public string Model { get; set; } = string.Empty;
            public List<string> Input { get; set; } = new();
        }

        private sealed class EmbeddingResponse
        {
            public List<EmbeddingData> Data { get; set; } = new();
        }

        private sealed class EmbeddingData
        {
            public List<float> Embedding { get; set; } = new();
        }

        public OpenAiEmbeddingService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["OpenAi:ApiKey"] ?? string.Empty;
            _model = configuration["OpenAi:EmbeddingModel"] ?? "text-embedding-3-small";
        }

        public async Task<float[]?> EmbedAsync(string text, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                return null;
            }

            var request = new EmbeddingRequest
            {
                Model = _model,
                Input = new List<string> { text }
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings");
            httpRequest.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var embeddingResponse = await JsonSerializer.DeserializeAsync<EmbeddingResponse>(stream, cancellationToken: cancellationToken);

            var data = embeddingResponse?.Data;
            if (data == null || data.Count == 0) return null;

            return data[0].Embedding.ToArray();
        }
    }
}

