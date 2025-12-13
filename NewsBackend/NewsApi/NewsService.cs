using HtmlAgilityPack;
using System.Net.Http;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Net;
using System.Linq;
using System.Text;
using System.Xml.Linq; // RSS okumak için gerekli

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

        public HaberServisi()
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        }

        // --- RSS İLE GARANTİLİ LİSTELEME ---
        public async Task<List<HaberOzet>> HaberleriGetir()
        {
            var haberListesi = new List<HaberOzet>();

            // Konsola bilgi yazalım (Terminalden takip edebilirsin)
            Console.WriteLine("Haberler çekiliyor...");

            // 1. GÜNDEM (BBC ve CNN Karışık)
            await RssCek("BBC Türkçe", "http://feeds.bbci.co.uk/turkce/rss.xml", "Gündem", haberListesi);
            await RssCek("CNN Türk", "https://www.cnnturk.com/feed/rss/all/news", "Gündem", haberListesi);

            // 2. SPOR
            await RssCek("CNN Spor", "https://www.cnnturk.com/feed/rss/spor/news", "Spor", haberListesi);

            // 3. EKONOMİ
            await RssCek("CNN Ekonomi", "https://www.cnnturk.com/feed/rss/ekonomi/news", "Ekonomi", haberListesi);

            // 4. MAGAZİN
            await RssCek("CNN Magazin", "https://www.cnnturk.com/feed/rss/magazin/news", "Magazin", haberListesi);

            // 5. TEKNOLOJİ
            await RssCek("CNN Teknoloji", "https://www.cnnturk.com/feed/rss/bilim-teknoloji/news", "Teknoloji", haberListesi);

            // 6. DÜNYA
            await RssCek("CNN Dünya", "https://www.cnnturk.com/feed/rss/dunya/news", "Dünya", haberListesi);

            Console.WriteLine($"Toplam {haberListesi.Count} haber çekildi.");
            return haberListesi;
        }

        // RSS Okuma Fonksiyonu (XML Parser)
        private async Task RssCek(string kaynakAdi, string rssUrl, string sabitKategori, List<HaberOzet> liste)
        {
            try
            {
                var response = await _httpClient.GetStringAsync(rssUrl);
                var xmlDoc = XDocument.Parse(response);

                // RSS içindeki <item> etiketlerini bul
                var items = xmlDoc.Descendants("item").Take(15); // Her kategoriden en fazla 15 haber

                foreach (var item in items)
                {
                    string baslik = item.Element("title")?.Value.Trim() ?? "";
                    string link = item.Element("link")?.Value.Trim() ?? "";
                    string zamanHam = item.Element("pubDate")?.Value ?? "";
                    
                    // Zamanı güzelleştir (Örn: "Sat, 12 Dec..." -> "12:30")
                    string zaman = "Yeni";
                    DateTimeOffset? yayinTarihi = null;
                    if (DateTimeOffset.TryParse(zamanHam, out var dateValue))
                    {
                        yayinTarihi = dateValue;
                        zaman = dateValue.ToLocalTime().ToString("HH:mm");
                    }

                    // Resim bulmaya çalış (RSS'te bazen 'image', bazen 'enclosure' olur)
                    string resim = "";
                    var imageEl = item.Element("image");
                    if (imageEl != null) resim = imageEl.Element("url")?.Value ?? "";
                    
                    if (string.IsNullOrEmpty(resim))
                    {
                        // Media content kontrolü (CNN genelde buraya koyar)
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
                                ResimUrl = resim ?? "", // Resim yoksa boş kalsın
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

        // --- DETAY ÇEKME (Burası HTML Agility Pack ile devam ediyor çünkü detay sayfası RSS'te yok) ---
        public async Task<HaberDetay> HaberinDetayiniGetir(string haberUrl)
        {
            var detay = new HaberDetay { Link = haberUrl };
            try
            {
                // HTML'i indir
                var response = await _httpClient.GetStringAsync(haberUrl);
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(response);

                // Başlığı al
                var h1 = htmlDoc.DocumentNode.SelectSingleNode("//h1");
                detay.Baslik = h1 != null ? WebUtility.HtmlDecode(h1.InnerText.Trim()) : "Başlık yükleniyor...";

                // Resmi al (Büyük resim)
                var metaImg = htmlDoc.DocumentNode.SelectSingleNode("//meta[@property='og:image']");
                if (metaImg != null) detay.ResimUrl = metaImg.GetAttributeValue("content", "");

                // İçeriği al (Paragrafları topla)
                var sb = new StringBuilder();
                var paragraflar = htmlDoc.DocumentNode.SelectNodes("//p"); // Sayfadaki tüm paragraflar

                if (paragraflar != null)
                {
                    foreach (var p in paragraflar)
                    {
                        string text = WebUtility.HtmlDecode(p.InnerText.Trim());
                        // Filtreleme: Çok kısa yazıları ve reklamları atla
                        if (!string.IsNullOrEmpty(text) && text.Length > 30 && 
                            !text.Contains("BBC News") && 
                            !text.Contains("copyright") && 
                            !text.Contains("BİST"))
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
            return detay;
        }
    }
}
