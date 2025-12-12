import { useEffect, useState } from 'react';

interface HaberOzet {
  baslik: string;
  link: string;
}

interface HaberDetay extends HaberOzet {
  icerik: string;
  resimUrl: string;
}

function App() {
  const [haberler, setHaberler] = useState<HaberOzet[]>([]);
  const [hata, setHata] = useState<string>("");
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);
  
  const [seciliHaber, setSeciliHaber] = useState<HaberDetay | null>(null);
  const [detayYukleniyor, setDetayYukleniyor] = useState<boolean>(false);

  // SENİN PORT NUMARAN (Bunu terminalden kontrol et)
  const PORT = 5284; 

  useEffect(() => {
    fetch(`http://localhost:${PORT}/api/news`) 
      .then(res => {
        if (!res.ok) throw new Error("Sunucuya ulaşılamadı.");
        return res.json();
      })
      .then(data => {
        setHaberler(data);
        setYukleniyor(false);
      })
      .catch(err => {
        console.error(err);
        setHata(`Hata: Backend terminali açık mı? Port ${PORT} doğru mu?`);
        setYukleniyor(false);
      });
  }, []);

  const haberiAc = async (ozet: HaberOzet) => {
    setDetayYukleniyor(true);
    setSeciliHaber({ ...ozet, icerik: "", resimUrl: "" }); 

    try {
      // GÜNCELLENEN KISIM: Base64 Şifreleme (btoa) kullanıyoruz
      // Bu sayede link içindeki : // ? gibi karakterler sunucuyu bozmaz.
      const encodedUrl = btoa(ozet.link);
      
      const response = await fetch(`http://localhost:${PORT}/api/news/detail?url=${encodedUrl}`);
      
      if (!response.ok) throw new Error("Backend hatası");
      
      const data = await response.json();
      setSeciliHaber(data);
    } catch (error) {
      console.error("Detay hatası:", error);
      setSeciliHaber({ ...ozet, icerik: "İçerik yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.", resimUrl: "" });
    } finally {
      setDetayYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      
      {/* ANA EKRAN */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-[#D32F2F] p-6">
          <h1 className="text-3xl font-bold text-white">Son Dakika Haberleri</h1>
          <p className="text-red-100 mt-2 text-sm">BBC Türkçe Akışı</p>
        </div>
        
        <div className="p-6">
          {hata && <div className="bg-red-50 text-red-700 p-4 rounded mb-4">{hata}</div>}

          {yukleniyor ? (
            <div className="text-center py-10 animate-pulse text-gray-500">Haberler yükleniyor...</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {haberler.map((item, index) => (
                <li key={index} className="group hover:bg-gray-50 transition-colors rounded-lg">
                  <button 
                    onClick={() => haberiAc(item)}
                    className="flex items-start gap-4 p-4 w-full text-left"
                  >
                    <span className="flex-shrink-0 bg-red-100 text-[#D32F2F] font-bold h-8 w-8 flex items-center justify-center rounded-full text-sm group-hover:bg-[#D32F2F] group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-gray-800 text-lg font-medium leading-snug group-hover:text-[#D32F2F]">
                        {item.baslik}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">Oku &rarr;</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* DETAY PENCERESİ (MODAL) */}
      {seciliHaber && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up">
            
            <button 
              onClick={() => setSeciliHaber(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl transition-colors z-10"
            >
              &times;
            </button>

            <div className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pr-10 leading-tight">
                {seciliHaber.baslik}
              </h2>

              {detayYukleniyor ? (
                <div className="flex flex-col items-center py-20 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                  <p className="text-gray-500">İçerik hazırlanıyor...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {seciliHaber.resimUrl && (
                    <img 
                      src={seciliHaber.resimUrl} 
                      alt="Haber" 
                      className="w-full h-64 md:h-96 object-cover rounded-lg shadow-md"
                    />
                  )}

                  <div className="prose max-w-none text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {seciliHaber.icerik}
                  </div>

                  <div className="pt-6 border-t mt-8">
                    <a 
                      href={seciliHaber.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                    >
                      Kaynak sitede görüntüle (BBC) &rarr;
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;