using HtmlAgilityPack;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Net;
using System.Linq;
using System.Text;
using System.Xml.Linq; // RSS okumak için gerekli
using Microsoft.Extensions.Options;
using NewsApi.Storage;

namespace NewsApi.Services
{
    public class HaberOzet
    {
        public string Baslik { get; set; } = "";
        public string Link { get; set; } = "";
        public string ResimUrl { get; set; } = "";
        public string Kaynak { get; set; } = "";
        public string Kategori { get; set; } = "";
        public string Zaman { get; set; } = "";
        public DateTimeOffset? YayinTarihi { get; set; }
    }

    public class HaberDetay : HaberOzet
    {
        public string Icerik { get; set; } = "";
    }

    public class HaberServisi
    {
        private readonly HttpClient _httpClient;
        private readonly INewsStore _newsStore;
        private readonly TimeSpan _listTtl;
        private readonly IEmbeddingService _embeddingService;

        public HaberServisi(HttpClient httpClient, INewsStore newsStore, IEmbeddingService embeddingService, IOptions<NewsCacheOptions> options)
        {
            _httpClient = httpClient;
            _newsStore = newsStore;
            _embeddingService = embeddingService;
            _listTtl = TimeSpan.FromSeconds(Math.Max(0, options.Value.ListTtlSeconds));
        }

        // --- RSS İLE GARANTİLİ LİSTELEME ---
        public async Task<List<HaberOzet>> HaberleriGetir()
        {
            var cached = await _newsStore.GetLatestListAsync(CancellationToken.None);
            if (cached != null && _listTtl > TimeSpan.Zero && (DateTimeOffset.UtcNow - cached.FetchedAtUtc) <= _listTtl)
            {
                return cached.Items;
            }

            var haberListesi = new List<HaberOzet>();

            Console.WriteLine("Haberler çekiliyor...");

            try
            {
                await RssCek("BBC Türkçe", "http://feeds.bbci.co.uk/turkce/rss.xml", "Gündem", haberListesi);
                await RssCek("CNN Türk", "https://www.cnnturk.com/feed/rss/all/news", "Gündem", haberListesi);

                await RssCek("CNN Spor", "https://www.cnnturk.com/feed/rss/spor/news", "Spor", haberListesi);
                await RssCek("CNN Ekonomi", "https://www.cnnturk.com/feed/rss/ekonomi/news", "Ekonomi", haberListesi);
                await RssCek("CNN Magazin", "https://www.cnnturk.com/feed/rss/magazin/news", "Magazin", haberListesi);
                await RssCek("CNN Teknoloji", "https://www.cnnturk.com/feed/rss/bilim-teknoloji/news", "Teknoloji", haberListesi);
                await RssCek("CNN Dünya", "https://www.cnnturk.com/feed/rss/dunya/news", "Dünya", haberListesi);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"HATA (RSS genel): {ex.Message}");
            }

            Console.WriteLine($"Toplam {haberListesi.Count} haber çekildi.");

            if (haberListesi.Count > 0)
            {
                haberListesi = haberListesi
                    .OrderByDescending(x => x.YayinTarihi ?? DateTimeOffset.MinValue)
                    .ThenBy(x => x.Kaynak)
                    .ToList();
                await _newsStore.SaveLatestListAsync(haberListesi, DateTimeOffset.UtcNow, CancellationToken.None);
                return haberListesi;
            }

            if (cached != null) return cached.Items;
            return haberListesi;
        }

        private async Task RssCek(string kaynakAdi, string rssUrl, string sabitKategori, List<HaberOzet> liste)
        {
            try
            {
                var response = await _httpClient.GetStringAsync(rssUrl);
                var xmlDoc = XDocument.Parse(response);

                var items = xmlDoc.Descendants("item").Take(15);

                foreach (var item in items)
                {
                    string baslik = item.Element("title")?.Value.Trim() ?? "";
                    string link = item.Element("link")?.Value.Trim() ?? "";
                    string zamanHam = item.Element("pubDate")?.Value ?? "";

                    string zaman = "Yeni";
                    DateTimeOffset? yayinTarihi = null;
                    if (DateTimeOffset.TryParse(zamanHam, out var dateValue))
                    {
                        yayinTarihi = dateValue;
                        zaman = dateValue.ToLocalTime().ToString("HH:mm");
                    }

                    string resim = "";
                    var imageEl = item.Element("image");
                    if (imageEl != null) resim = imageEl.Element("url")?.Value ?? "";

                    if (string.IsNullOrEmpty(resim))
                    {
                        XNamespace media = "http://search.yahoo.com/mrss/";
                        var mediaContent = item.Element(media + "content");
                        if (mediaContent != null) resim = mediaContent.Attribute("url")?.Value ?? "";
                    }

                    if (!string.IsNullOrEmpty(baslik) && !string.IsNullOrEmpty(link))
                    {
                        if (!liste.Any(x => x.Baslik == baslik))
                        {
                            liste.Add(new HaberOzet
                            {
                                Baslik = baslik,
                                Link = link,
                                Kaynak = kaynakAdi,
                                Kategori = sabitKategori,
                                Zaman = zaman,
                                ResimUrl = resim ?? "",
                                YayinTarihi = yayinTarihi
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"HATA ({kaynakAdi}): {ex.Message}");
            }
        }

        // --- DETAY ÇEKME (HTML Agility Pack) ---
        public async Task<HaberDetay> HaberinDetayiniGetir(string haberUrl)
        {
            var cached = await _newsStore.GetDetailAsync(haberUrl, CancellationToken.None);
            if (cached?.Detail != null && !string.IsNullOrWhiteSpace(cached.Detail.Icerik) &&
                !cached.Detail.Icerik.StartsWith("İçerik yüklenirken hata:", StringComparison.OrdinalIgnoreCase))
            {
                return cached.Detail;
            }

            var detay = new HaberDetay { Link = haberUrl };
            try
            {
                var response = await _httpClient.GetStringAsync(haberUrl);
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(response);

                var h1 = htmlDoc.DocumentNode.SelectSingleNode("//h1");
                detay.Baslik = h1 != null ? WebUtility.HtmlDecode(h1.InnerText.Trim()) : "Başlık yükleniyor...";

                var metaImg = htmlDoc.DocumentNode.SelectSingleNode("//meta[@property='og:image']");
                if (metaImg != null) detay.ResimUrl = metaImg.GetAttributeValue("content", "");

                var sb = new StringBuilder();
                var paragraflar = htmlDoc.DocumentNode.SelectNodes("//p");

                if (paragraflar != null)
                {
                    foreach (var p in paragraflar)
                    {
                        string text = WebUtility.HtmlDecode(p.InnerText.Trim());
                        if (!string.IsNullOrEmpty(text) && text.Length > 30 &&
                            !text.Contains("BBC News", StringComparison.OrdinalIgnoreCase) &&
                            !text.Contains("copyright", StringComparison.OrdinalIgnoreCase))
                        {
                            sb.AppendLine(text);
                            sb.AppendLine();
                        }
                    }
                }
                detay.Icerik = sb.Length > 0 ? sb.ToString() : "Haberin detayına giderek okuyabilirsiniz.";
            }
            catch (Exception ex)
            {
                detay.Icerik = "İçerik yüklenirken hata: " + ex.Message;
            }

            float[]? embedding = null;
            try
            {
                var contentForEmbedding = detay.Icerik;
                if (!string.IsNullOrWhiteSpace(contentForEmbedding))
                {
                    if (contentForEmbedding.Length > 2000)
                    {
                        contentForEmbedding = contentForEmbedding.Substring(0, 2000);
                    }
                    embedding = await _embeddingService.EmbedAsync(contentForEmbedding, CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Embedding hatası: {ex.Message}");
            }

            await _newsStore.SaveDetailAsync(haberUrl, detay, DateTimeOffset.UtcNow, embedding, CancellationToken.None);
            return detay;
        }
    }
}

