namespace NewsApi.Storage
{
    public class NewsCacheOptions
    {
        public string Path { get; set; } = "App_Data/news-cache.json";
        public int ListTtlSeconds { get; set; } = 300;
        public int MaxDetails { get; set; } = 1000;
    }
}

