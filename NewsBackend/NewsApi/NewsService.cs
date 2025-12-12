using HtmlAgilityPack;
using System.Net.Http;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Net; 

namespace NewsApi.Services
{
    public class HaberServisi
    {
        private readonly HttpClient _httpClient;

        public HaberServisi()
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");
        }

        public async Task<List<string>> HaberleriGetir()
        {
            var haberListesi = new List<string>();
            
            string url = "https://www.bbc.com/turkce"; 

            try
            {
                var response = await _httpClient.GetStringAsync(url);
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(response);

                var basliklar = htmlDoc.DocumentNode.SelectNodes("//h2 | //h3");

                if (basliklar != null)
                {
                    foreach (var baslik in basliklar)
                    {

                        string temizBaslik = WebUtility.HtmlDecode(baslik.InnerText.Trim());

                        if (!string.IsNullOrWhiteSpace(temizBaslik) && temizBaslik.Length > 15)
                        {
                            // Aynı haberden iki tane eklememek için kontrol
                            if (!haberListesi.Contains(temizBaslik))
                            {
                                haberListesi.Add(temizBaslik);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                haberListesi.Add("Hata: " + ex.Message);
            }

            return haberListesi;
        }
    }
}