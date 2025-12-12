import { useEffect, useState } from 'react';

function App() {
  const [haberler, setHaberler] = useState<string[]>([]);
  const [hata, setHata] = useState<string>("");
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);

  useEffect(() => {
    // DİKKAT: Buradaki 5234 yerine kendi C# port numaranızı yazın!
    // Örnek: http://localhost:5056/api/news
    fetch('http://localhost:5284/api/news') 
      .then(res => {
        if (!res.ok) throw new Error("Sunucudan veri alınamadı.");
        return res.json();
      })
      .then(data => {
        setHaberler(data);
        setYukleniyor(false);
      })
      .catch(err => {
        console.error(err);
        setHata("Haberler yüklenemedi. Backend terminali açık mı?");
        setYukleniyor(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-red-600 p-6">
          <h1 className="text-3xl font-bold text-white">Son Dakika Haberleri</h1>
          <p className="text-red-100 mt-2">Canlı haber akışı</p>
        </div>
        
        <div className="p-6">
          {hata && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mb-4">
              {hata}
            </div>
          )}

          {yukleniyor ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-lg animate-pulse">Haberler yükleniyor...</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {haberler.map((baslik, index) => (
                <li key={index} className="py-4 hover:bg-gray-50 transition-colors px-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 bg-red-100 text-red-600 font-bold h-8 w-8 flex items-center justify-center rounded-full mr-4 text-sm">
                      {index + 1}
                    </span>
                    <span className="text-gray-800 text-lg font-medium leading-snug">
                      {baslik}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;