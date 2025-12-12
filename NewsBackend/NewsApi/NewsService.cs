using HtmlAgilityPack;
using System.Net.Http;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Net;
using System.Linq;
using System.Text;

namespace NewsApi.Services
{
    public class HaberOzet
    {
        public string Baslik { get; set; } = "";
        public string Link { get; set; } = "";
    }

    public class HaberDetay : HaberOzet
    {
        public string Icerik { get; set; } = ""; 
        public string ResimUrl { get; set; } = ""; 
    }

    public class HaberServisi
    {
        private readonly HttpClient _httpClient;

        public HaberServisi()
        {
            _httpClient = new HttpClient();
            // Standart bir tarayıcı gibi görünüyoruz
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        }

        // --- LİSTELEME (AKILLI FİLTRE EKLENDİ) ---
        public async Task<List<HaberOzet>> HaberleriGetir()
        {
            var haberListesi = new List<HaberOzet>();
            string baseUrl = "https://www.bbc.com";
            string url = "https://www.bbc.com/turkce";

            try
            {
                var response = await _httpClient.GetStringAsync(url);
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(response);

                var basliklar = htmlDoc.DocumentNode.SelectNodes("//h2 | //h3"); // h3'leri de kapsayalım

                if (basliklar != null)
                {
                    foreach (var baslikNode in basliklar)
                    {
                        string temizBaslik = WebUtility.HtmlDecode(baslikNode.InnerText.Trim());
                        
                        // Linki bul
                        var linkNode = baslikNode.SelectSingleNode(".//a");
                        if (linkNode == null && baslikNode.ParentNode.Name == "a")
                            linkNode = baslikNode.ParentNode;

                        string link = linkNode?.GetAttributeValue("href", "") ?? "";

                        // Linki tamamla
                        if (!string.IsNullOrEmpty(link) && !link.StartsWith("http")) 
                            link = baseUrl + link;

                        // --- KRİTİK FİLTRELEME ---
                        // Sadece gerçek haber linklerini alıyoruz.
                        // Konu sayfalarını (/topics/) ve video sayfalarını (/avaz/) eliyoruz.
                        bool gercekHaberMi = link.Contains("/haberler/") || link.Contains("/articles/");
                        
                        if (gercekHaberMi && !string.IsNullOrWhiteSpace(temizBaslik) && temizBaslik.Length > 15)
                        {
                            if (!haberListesi.Any(x => x.Baslik == temizBaslik))
                            {
                                haberListesi.Add(new HaberOzet { Baslik = temizBaslik, Link = link });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                haberListesi.Add(new HaberOzet { Baslik = "Hata: " + ex.Message });
            }
            return haberListesi;
        }

        // --- DETAY ÇEKME (AGRESİF TARAMA) ---
        public async Task<HaberDetay> HaberinDetayiniGetir(string haberUrl)
        {
            var detay = new HaberDetay { Link = haberUrl };

            try
            {
                var response = await _httpClient.GetStringAsync(haberUrl);
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(response);

                // 1. Başlık
                var h1 = htmlDoc.DocumentNode.SelectSingleNode("//h1");
                detay.Baslik = h1 != null ? WebUtility.HtmlDecode(h1.InnerText.Trim()) : "Başlık Alınamadı";

                // 2. Resim (og:image en garantisidir)
                var metaImg = htmlDoc.DocumentNode.SelectSingleNode("//meta[@property='og:image']");
                if (metaImg != null)
                    detay.ResimUrl = metaImg.GetAttributeValue("content", "");

                // 3. İçerik - BRUTE FORCE (Kaba Kuvvet) Yöntemi
                // Belirli bir div aramak yerine, sayfadaki TÜM paragrafları tarayıp mantıklı olanları alıyoruz.
                var tumParagraflar = htmlDoc.DocumentNode.SelectNodes("//p");
                var sb = new StringBuilder();

                if (tumParagraflar != null)
                {
                    foreach (var p in tumParagraflar)
                    {
                        string text = WebUtility.HtmlDecode(p.InnerText.Trim());

                        // Filtre: Çok kısa yazıları, menüleri, footer yazılarını alma
                        if (!string.IsNullOrEmpty(text) && text.Length > 25)
                        {
                            // Yasaklı kelimeler (Reklam vb.)
                            if (!text.Contains("BBC News") && 
                                !text.Contains("Telif hakkı") && 
                                !text.Contains("Gizlilik Politikası"))
                            {
                                sb.AppendLine(text);
                                sb.AppendLine(); 
                            }
                        }
                    }
                }

                if (sb.Length > 0)
                {
                    detay.Icerik = sb.ToString();
                }
                else
                {
                    // Hiçbir şey bulamazsa Meta Description'ı getir
                    var metaDesc = htmlDoc.DocumentNode.SelectSingleNode("//meta[@name='description']");
                    detay.Icerik = metaDesc != null 
                        ? WebUtility.HtmlDecode(metaDesc.GetAttributeValue("content", "")) 
                        : "İçerik formatı desteklenmiyor, lütfen kaynağa gidin.";
                }
            }
            catch (Exception ex)
            {
                detay.Icerik = "Hata oluştu: " + ex.Message;
            }

            return detay;
        }
    }
}