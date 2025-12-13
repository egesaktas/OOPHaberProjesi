namespace NewsApi.Services
{
    public sealed class ThumbnailPrefetchOptions
    {
        public bool Enabled { get; set; } = true;
        public int IntervalSeconds { get; set; } = 180;
        public int MaxPerRun { get; set; } = 40;
        public int Concurrency { get; set; } = 4;
        public int TimeoutSeconds { get; set; } = 10;
    }
}

